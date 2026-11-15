-- Uses the three existing doctor accounts. Fixtures exist only within this transaction.
-- RLS assertions run as authenticated, never as service_role. Everything is rolled back.
begin;
create temporary table doctor_audit_ids(label text primary key, user_id uuid, doctor_id uuid, slot_id bigint, appointment_id bigint);
grant select on doctor_audit_ids to authenticated;
do $$
declare patient uuid := gen_random_uuid(); item record; n integer := 0; slot bigint; appointment bigint;
begin
  insert into auth.users(id,email,raw_user_meta_data) values(patient,patient::text||'@doctor-audit.invalid','{"full_name":"Temporary audit patient"}');
  for item in
    select p.id user_id,d.id doctor_id,p.email
    from public.profiles p join public.doctors d on d.profile_id=p.id
    where p.email in ('doctor@clinic.test','doctor2@clinic.test','doctor3@clinic.test') and p.role='doctor' and d.is_active
    order by p.email
  loop
    n=n+1;
    insert into public.time_slots(doctor_id,slot_date,start_time,end_time)
      values(item.doctor_id,(now() at time zone 'Asia/Ho_Chi_Minh')::date+3650+n,'04:00','04:15') returning id into slot;
    insert into public.appointments(doctor_id,patient_id,slot_id,status) values(item.doctor_id,patient,slot,'pending') returning id into appointment;
    insert into doctor_audit_ids values(item.email,item.user_id,item.doctor_id,slot,appointment);
  end loop;
  if n<>3 then raise exception 'Expected three active test doctors; found %',n; end if;
end $$;
set local role authenticated;
do $$
declare own record; other record; changed integer; a public.appointments; result jsonb;
begin
  for own in select * from doctor_audit_ids order by label loop
    perform set_config('request.jwt.claims',json_build_object('sub',own.user_id,'role','authenticated','aal','aal1')::text,true);
    if public.current_doctor_id() is distinct from own.doctor_id then raise exception 'Doctor identity mismatch'; end if;
    if exists(select 1 from public.appointments where doctor_id<>own.doctor_id) then raise exception 'Cross-doctor appointment leak'; end if;
    if exists(select 1 from public.appointment_events where doctor_id<>own.doctor_id) then raise exception 'Cross-doctor event leak'; end if;
    select * into a from public.appointments where id=own.appointment_id;
    if a.id is null then raise exception 'Own appointment unavailable'; end if;
    a=public.doctor_manage_appointment(a.id,'confirm',a.updated_at);
    a=public.doctor_manage_appointment(a.id,'save_note',a.updated_at,'Temporary rollback audit note');
    result=public.doctor_update_profile('{}','{}');
    if result->'doctor'->>'id'<>own.doctor_id::text then raise exception 'Profile RPC identity mismatch'; end if;
    begin
      perform public.doctor_update_profile('{"role":"admin"}','{}');
      raise exception 'Profile RPC accepted a role change';
    exception when insufficient_privilege then null; end;
    for other in select * from doctor_audit_ids where doctor_id<>own.doctor_id loop
      if exists(select 1 from public.appointments where id=other.appointment_id) then raise exception 'Foreign appointment readable'; end if;
      begin
        perform public.doctor_manage_appointment(other.appointment_id,'save_note',now(),'forbidden');
        raise exception 'Foreign note changed';
      exception when no_data_found then null; end;
      update public.appointments set doctor_note='forbidden' where id=other.appointment_id;
      get diagnostics changed=row_count;
      if changed<>0 then raise exception 'Foreign appointment updated'; end if;
      delete from public.time_slots where id=other.slot_id;
      get diagnostics changed=row_count;
      if changed<>0 then raise exception 'Foreign slot deleted'; end if;
      update public.doctors set bio='forbidden' where id=other.doctor_id;
      get diagnostics changed=row_count;
      if changed<>0 then raise exception 'Foreign doctor updated'; end if;
    end loop;
    begin
      update public.appointments set doctor_id=(select doctor_id from doctor_audit_ids where doctor_id<>own.doctor_id limit 1) where id=own.appointment_id;
      raise exception 'Appointment ownership changed';
    exception when insufficient_privilege then null; end;
    begin
      update public.appointments set status='completed' where id=own.appointment_id;
      raise exception 'Direct update bypassed workflow';
    exception when insufficient_privilege then null; end;
  end loop;
  perform set_config('request.jwt.claims','{"role":"authenticated","aal":"aal1"}',true);
  if exists(select 1 from public.appointments) then raise exception 'Cleared identity still sees appointments'; end if;
end $$;
reset role;
-- Add a factor only inside this rollback transaction to exercise the existing AAL2 gate.
insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,created_at,updated_at,secret)
select gen_random_uuid(),user_id,'Temporary rollback MFA test','totp','verified',now(),now(),'ROLLBACK-ONLY'
from doctor_audit_ids where label='doctor@clinic.test';
set local role authenticated;
do $$
declare own doctor_audit_ids; a public.appointments; profile jsonb;
begin
  select * into own from doctor_audit_ids where label='doctor@clinic.test';
  perform set_config('request.jwt.claims',json_build_object('sub',own.user_id,'role','authenticated','aal','aal1')::text,true);
  if public.has_required_aal() then raise exception 'AAL1 bypassed a verified factor'; end if;
  if exists(select 1 from public.appointments where doctor_id=own.doctor_id) then raise exception 'MFA did not restrict SELECT'; end if;
  begin
    perform public.doctor_manage_appointment(own.appointment_id,'save_note',now(),'forbidden');
    raise exception 'AAL1 invoked doctor RPC';
  exception when insufficient_privilege then null; end;
  begin
    perform public.doctor_update_profile('{}','{}');
    raise exception 'AAL1 invoked profile RPC';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',json_build_object('sub',own.user_id,'role','authenticated','aal','aal2')::text,true);
  if not public.has_required_aal() then raise exception 'AAL2 was rejected'; end if;
  select * into a from public.appointments where id=own.appointment_id;
  if a.id is null then raise exception 'AAL2 cannot read own appointment'; end if;
  profile=public.doctor_update_profile('{}','{}');
end $$;
reset role;
select 'Three existing doctors: ownership, cross-account reads/writes, protected identities, notes, slots, profile RPC and MFA pass under authenticated role; all fixtures rolled back.' as result;
rollback;
