begin;
create temporary table doctor_test_ids(key text primary key, value text);
grant select on doctor_test_ids to authenticated;
do $$
declare
  u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); p uuid:=gen_random_uuid();
  d uuid:=gen_random_uuid(); other_d uuid:=gen_random_uuid(); spec bigint; s bigint; a bigint;
  today date:=(now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (u,u::text||'@doctor-workflow.invalid','{"full_name":"Workflow Doctor"}'),
    (v,v::text||'@doctor-workflow.invalid','{"full_name":"Other Doctor"}'),
    (p,p::text||'@doctor-workflow.invalid','{"full_name":"Workflow Patient"}');
  update public.profiles set role='doctor' where id in(u,v);
  select id into spec from public.specialties limit 1;
  if spec is null then insert into public.specialties(name) values('Workflow test') returning id into spec; end if;
  insert into public.doctors(id,profile_id,specialty_id,is_active) values(d,u,spec,true),(other_d,v,spec,true);
  insert into doctor_test_ids values('user',u::text),('other_user',v::text),('patient',p::text),('doctor',d::text);
  insert into public.time_slots(doctor_id,slot_date,start_time,end_time) values(d,today,'00:00','00:10') returning id into s;
  insert into public.appointments(doctor_id,patient_id,slot_id,status) values(d,p,s,'confirmed') returning id into a;
  insert into doctor_test_ids values('exam',a::text),('exam_slot',s::text);
  insert into public.time_slots(doctor_id,slot_date,start_time,end_time) values(d,today,'00:10','00:20') returning id into s;
  insert into public.appointments(doctor_id,patient_id,slot_id,status) values(d,p,s,'confirmed') returning id into a;
  insert into doctor_test_ids values('second_exam',a::text);
  insert into public.time_slots(doctor_id,slot_date,start_time,end_time) values(d,today+1,'08:00','08:30') returning id into s;
  insert into public.appointments(doctor_id,patient_id,slot_id,status) values(d,p,s,'pending') returning id into a;
  insert into doctor_test_ids values('future',a::text),('old_slot',s::text);
  insert into public.time_slots(doctor_id,slot_date,start_time,end_time) values(d,today+1,'09:00','09:30') returning id into s;
  insert into doctor_test_ids values('new_slot',s::text);
  insert into public.time_slots(doctor_id,slot_date,start_time,end_time) values(other_d,today+1,'10:00','10:30') returning id into s;
  insert into public.appointments(doctor_id,patient_id,slot_id,status) values(other_d,p,s,'confirmed');
  insert into public.time_slots(doctor_id,slot_date,start_time,end_time) values(d,today+1,'10:00','10:30') returning id into s;
  insert into doctor_test_ids values('patient_conflict_slot',s::text);
end $$;
set local role authenticated;
do $$
declare
  a public.appointments; b public.appointments; old_version timestamptz;
  uid uuid; other_uid uuid; pid uuid; doctor_id uuid; exam bigint; future bigint; new_slot bigint; old_slot bigint; n bigint;
begin
  select value::uuid into uid from doctor_test_ids where key='user';
  select value::uuid into other_uid from doctor_test_ids where key='other_user';
  select value::uuid into pid from doctor_test_ids where key='patient';
  select value::uuid into doctor_id from doctor_test_ids where key='doctor';
  select value::bigint into exam from doctor_test_ids where key='exam';
  select value::bigint into future from doctor_test_ids where key='future';
  select value::bigint into new_slot from doctor_test_ids where key='new_slot';
  select value::bigint into old_slot from doctor_test_ids where key='old_slot';
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'aal','aal1','role','authenticated')::text,true);
  select * into a from public.appointments where id=exam;
  begin
    perform public.doctor_manage_appointment(a.id,'complete',a.updated_at,'A note');
    raise exception 'FAIL: completed before start';
  exception when sqlstate '22023' then null; end;
  begin
    update public.appointments set status='completed' where id=a.id;
    raise exception 'FAIL: direct doctor PATCH bypassed workflow';
  exception when insufficient_privilege then null; end;
  a=public.doctor_manage_appointment(a.id,'check_in',a.updated_at);
  if a.checked_in_at is null then raise exception 'FAIL: check in not stored'; end if;
  old_version=a.updated_at;
  a=public.doctor_manage_appointment(a.id,'start',a.updated_at);
  if a.started_at is null then raise exception 'FAIL: start not stored'; end if;
  begin
    perform public.doctor_manage_appointment(a.id,'save_note',old_version,'stale');
    raise exception 'FAIL: stale version overwrote current note';
  exception when serialization_failure then null; end;
  select * into b from public.appointments where id=(select value::bigint from doctor_test_ids where key='second_exam');
  b=public.doctor_manage_appointment(b.id,'check_in',b.updated_at);
  begin
    perform public.doctor_manage_appointment(b.id,'start',b.updated_at);
    raise exception 'FAIL: doctor started two examinations';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.doctor_manage_appointment(a.id,'complete',a.updated_at,' ');
    raise exception 'FAIL: empty conclusion completed';
  exception when sqlstate '22023' then null; end;
  a=public.doctor_manage_appointment(a.id,'complete',a.updated_at,'Integration test conclusion');
  if a.status<>'completed' or a.completed_at is null or a.doctor_note<>'Integration test conclusion' then raise exception 'FAIL: completion not persisted atomically'; end if;
  if not (select is_booked from public.time_slots where id=a.slot_id) then raise exception 'FAIL: completed slot reopened'; end if;
  begin
    perform public.doctor_manage_appointment(a.id,'confirm',a.updated_at);
    raise exception 'FAIL: completed appointment reopened';
  exception when sqlstate '22023' then null; end;
  select * into a from public.appointments where id=future;
  a=public.doctor_manage_appointment(a.id,'confirm',a.updated_at);
  begin
    perform public.doctor_manage_appointment(a.id,'check_in',a.updated_at);
    raise exception 'FAIL: future appointment checked in';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.doctor_manage_appointment(a.id,'reschedule',a.updated_at,null,'Check patient overlap',(select value::bigint from doctor_test_ids where key='patient_conflict_slot'));
    raise exception 'FAIL: patient double booked across doctors';
  exception when sqlstate '22023' then null; end;
  a=public.doctor_manage_appointment(a.id,'reschedule',a.updated_at,null,'Patient requested a later time',new_slot);
  if a.slot_id<>new_slot then raise exception 'FAIL: reschedule not saved'; end if;
  if (select is_booked from public.time_slots where id=old_slot) then raise exception 'FAIL: old slot still booked'; end if;
  if not (select is_booked from public.time_slots where id=new_slot) then raise exception 'FAIL: new slot not booked'; end if;
  begin
    delete from public.time_slots where id=new_slot;
    raise exception 'FAIL: booked slot deleted';
  exception when sqlstate '22023' then null; end;
  begin
    insert into public.time_slots(doctor_id,slot_date,start_time,end_time)
    values(doctor_id,(now() at time zone 'Asia/Ho_Chi_Minh')::date+1,'09:10','09:40');
    raise exception 'FAIL: overlapping slot accepted';
  exception when exclusion_violation then null; end;
  select count(*) into n from public.appointment_events where appointment_id=exam and action in('check_in','start','complete');
  if n<>3 then raise exception 'FAIL: event audit incomplete'; end if;
  perform set_config('request.jwt.claims',json_build_object('sub',other_uid,'aal','aal1','role','authenticated')::text,true);
  if exists(select 1 from public.appointments where id=exam) or exists(select 1 from public.appointment_events where appointment_id=exam) then raise exception 'FAIL: another doctor can read records'; end if;
  begin
    perform public.doctor_manage_appointment(a.id,'cancel',a.updated_at,null,'Unauthorized');
    raise exception 'FAIL: another doctor mutated appointment';
  exception when no_data_found then null; end;
  perform set_config('request.jwt.claims',json_build_object('sub',pid,'aal','aal1','role','authenticated')::text,true);
  begin
    perform public.doctor_manage_appointment(a.id,'cancel',a.updated_at,null,'Unauthorized');
    raise exception 'FAIL: patient called doctor action';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Doctor workflow transitions, notes, completion, reschedule, concurrency, slot protection, audit and RLS passed. Fixtures rolled back.' as result;
rollback;
