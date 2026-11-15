-- Run transactionally with 20261115_profile_avatars.sql; all fixtures are rolled back.
begin;
create temporary table avatar_test_ids(key text primary key,value text);
grant select on avatar_test_ids to authenticated;
do $$
declare p uuid:=gen_random_uuid(); q uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid();
  d uuid; e uuid; sp bigint; slot bigint;
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (p,p::text||'@avatar-test.invalid','{"full_name":"Avatar owner"}'),
    (q,q::text||'@avatar-test.invalid','{"full_name":"Other patient"}'),
    (u,u::text||'@avatar-test.invalid','{"full_name":"Treating doctor"}'),
    (v,v::text||'@avatar-test.invalid','{"full_name":"Other doctor"}');
  update public.profiles set role='doctor' where id in(u,v);
  select id into sp from public.specialties limit 1;
  if sp is null then raise exception 'An existing specialty is required';end if;
  insert into public.doctors(profile_id,specialty_id)values(u,sp)returning id into d;
  insert into public.doctors(profile_id,specialty_id)values(v,sp)returning id into e;
  insert into public.time_slots(doctor_id,slot_date,start_time,end_time)values(d,(now()at time zone'Asia/Ho_Chi_Minh')::date+1,'12:00','12:30')returning id into slot;
  insert into public.appointments(patient_id,doctor_id,slot_id,status)values(p,d,slot,'confirmed');
  insert into avatar_test_ids values('patient',p::text),('other_patient',q::text),('doctor',u::text),('other_doctor',v::text),
    ('portrait',p::text||'/'||gen_random_uuid()::text||'.webp'),('doctor_portrait',u::text||'/'||gen_random_uuid()::text||'.webp');
  insert into storage.objects(bucket_id,name)select 'profile-avatars',value from avatar_test_ids where key in('portrait','doctor_portrait');
end $$;
set local role authenticated;
do $$
declare owner_uid uuid; other_uid uuid; doctor_uid uuid; other_doc uuid; portrait text; doctor_photo text; changed integer;
begin
  select value::uuid into owner_uid from avatar_test_ids where key='patient';
  select value::uuid into other_uid from avatar_test_ids where key='other_patient';
  select value::uuid into doctor_uid from avatar_test_ids where key='doctor';
  select value::uuid into other_doc from avatar_test_ids where key='other_doctor';
  select value into portrait from avatar_test_ids where key='portrait';
  select value into doctor_photo from avatar_test_ids where key='doctor_portrait';
  perform set_config('request.jwt.claims',json_build_object('sub',owner_uid,'role','authenticated','aal','aal1')::text,true);
  if not exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=portrait)then raise exception 'Owner cannot read own portrait';end if;
  insert into storage.objects(bucket_id,name)values('profile-avatars',owner_uid::text||'/'||gen_random_uuid()::text||'.webp');
  begin
    insert into storage.objects(bucket_id,name)values('profile-avatars',other_uid::text||'/'||gen_random_uuid()::text||'.webp');
    raise exception 'Owner uploaded into another user folder';
  exception when insufficient_privilege then null;end;
  update storage.objects set name=owner_uid::text||'/'||gen_random_uuid()::text||'.webp' where bucket_id='profile-avatars' and name=portrait;
  get diagnostics changed=row_count;
  if changed<>0 then raise exception 'Immutable avatar was overwritten';end if;
  perform set_config('request.jwt.claims',json_build_object('sub',other_uid,'role','authenticated','aal','aal1')::text,true);
  if exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=portrait)then raise exception 'Unrelated patient reads a patient portrait';end if;
  if not exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=doctor_photo)then raise exception 'Patient cannot view doctor portrait';end if;
  perform set_config('request.jwt.claims',json_build_object('sub',other_doc,'role','authenticated','aal','aal1')::text,true);
  if exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=portrait)then raise exception 'Unrelated doctor reads a patient portrait';end if;
  perform set_config('request.jwt.claims',json_build_object('sub',doctor_uid,'role','authenticated','aal','aal1')::text,true);
  if not exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=portrait)then raise exception 'Treating doctor cannot read patient portrait';end if;
end $$;
reset role;
insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,created_at,updated_at,secret)
select gen_random_uuid(),value::uuid,'Rollback avatar MFA','totp','verified',now(),now(),'ROLLBACK-ONLY' from avatar_test_ids where key='patient';
set local role authenticated;
do $$
declare uid uuid; portrait text;
begin
  select value::uuid into uid from avatar_test_ids where key='patient';
  select value into portrait from avatar_test_ids where key='portrait';
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated','aal','aal1')::text,true);
  if exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=portrait)then raise exception 'AAL1 reads portrait despite verified MFA';end if;
  begin
    insert into storage.objects(bucket_id,name)values('profile-avatars',uid::text||'/'||gen_random_uuid()::text||'.webp');
    raise exception 'AAL1 uploads despite verified MFA';
  exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated','aal','aal2')::text,true);
  if not exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=portrait)then raise exception 'AAL2 cannot read own portrait';end if;
end $$;
reset role;
select 'Private avatar policies: owner upload/read, cross-account denial, treating-doctor visibility, immutable filenames and MFA passed. Fixtures and bucket rolled back.' as result;
rollback;
