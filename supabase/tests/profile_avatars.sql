-- Uses existing profile-avatars bucket. All fixtures and changes are rolled back.
begin;
create temporary table avatar_check(key text primary key,value text);
grant select on avatar_check to authenticated;
do $$
declare p uuid:=gen_random_uuid(); q uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); d uuid; sp bigint; slot bigint;
begin
  if not exists(select 1 from storage.buckets where id='profile-avatars' and not public)then raise exception 'Private profile-avatars bucket is required';end if;
  insert into auth.users(id,email,raw_user_meta_data)values
    (p,p::text||'@avatar-check.invalid','{"full_name":"Avatar owner"}'),(q,q::text||'@avatar-check.invalid','{"full_name":"Other patient"}'),
    (u,u::text||'@avatar-check.invalid','{"full_name":"Treating doctor"}'),(v,v::text||'@avatar-check.invalid','{"full_name":"Other doctor"}');
  update public.profiles set role='doctor' where id in(u,v);
  select id into sp from public.specialties limit 1;
  insert into public.doctors(profile_id,specialty_id)values(u,sp)returning id into d;
  insert into public.doctors(profile_id,specialty_id)values(v,sp);
  insert into public.time_slots(doctor_id,slot_date,start_time,end_time)values(d,(now()at time zone'Asia/Ho_Chi_Minh')::date+1,'12:00','12:30')returning id into slot;
  insert into public.appointments(patient_id,doctor_id,slot_id,status)values(p,d,slot,'confirmed');
  insert into avatar_check values('patient',p::text),('other',q::text),('doctor',u::text),('other_doctor',v::text),
    ('portrait',p::text||'/'||gen_random_uuid()::text||'.webp'),('doctor_portrait',u::text||'/'||gen_random_uuid()::text||'.webp');
  insert into storage.objects(bucket_id,name)select 'profile-avatars',value from avatar_check where key in('portrait','doctor_portrait');
end $$;
set local role authenticated;
do $$
declare uid uuid; portrait text; doc_photo text; changed integer; k text;
begin
  select value::uuid into uid from avatar_check where key='patient';
  select value into portrait from avatar_check where key='portrait';
  select value into doc_photo from avatar_check where key='doctor_portrait';
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated','aal','aal1')::text,true);
  if not exists(select 1 from storage.objects where bucket_id='profile-avatars'and name=portrait)then raise exception 'Owner cannot read portrait';end if;
  insert into storage.objects(bucket_id,name)values('profile-avatars',uid::text||'/'||gen_random_uuid()::text||'.webp');
  update public.profiles set full_name='Updated own profile',phone='0912345678',avatar_url='/api/profile/avatar/'||portrait where id=uid;
  if not exists(select 1 from public.profiles where id=uid and avatar_url='/api/profile/avatar/'||portrait)then raise exception 'Own avatar link was not saved';end if;
  begin
    insert into storage.objects(bucket_id,name)select 'profile-avatars',value||'/'||gen_random_uuid()::text||'.webp'from avatar_check where key='other';
    raise exception 'Cross-account upload accepted';
  exception when insufficient_privilege then null;end;
  update storage.objects set name=uid::text||'/'||gen_random_uuid()::text||'.webp'where bucket_id='profile-avatars'and name=portrait;
  get diagnostics changed=row_count;
  if changed<>0 then raise exception 'Immutable image overwritten';end if;
  foreach k in array array['other','other_doctor']loop
    select value::uuid into uid from avatar_check where key=k;
    perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated','aal','aal1')::text,true);
    if exists(select 1 from storage.objects where bucket_id='profile-avatars'and name=portrait)then raise exception 'Unrelated viewer reads patient image';end if;
    begin
      delete from storage.objects where bucket_id='profile-avatars'and name=portrait;
      get diagnostics changed=row_count;
      if changed<>0 then raise exception 'Unrelated viewer deleted image';end if;
    exception when insufficient_privilege then null;end;
  end loop;
  select value::uuid into uid from avatar_check where key='other';
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated','aal','aal1')::text,true);
  if not exists(select 1 from storage.objects where bucket_id='profile-avatars'and name=doc_photo)then raise exception 'Doctor portrait unavailable to patient';end if;
  select value::uuid into uid from avatar_check where key='doctor';
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated','aal','aal1')::text,true);
  if not exists(select 1 from storage.objects where bucket_id='profile-avatars'and name=portrait)then raise exception 'Treating doctor cannot read patient portrait';end if;
end $$;
reset role;
insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,created_at,updated_at,secret)
select gen_random_uuid(),value::uuid,'Rollback avatar MFA','totp','verified',now(),now(),'ROLLBACK-ONLY'from avatar_check where key='patient';
set local role authenticated;
do $$
declare uid uuid; portrait text;
begin
  select value::uuid into uid from avatar_check where key='patient';
  select value into portrait from avatar_check where key='portrait';
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated','aal','aal1')::text,true);
  if exists(select 1 from storage.objects where bucket_id='profile-avatars'and name=portrait)then raise exception 'MFA bypass on image read';end if;
  begin
    insert into storage.objects(bucket_id,name)values('profile-avatars',uid::text||'/'||gen_random_uuid()::text||'.webp');
    raise exception 'MFA bypass on upload';
  exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated','aal','aal2')::text,true);
  if not exists(select 1 from storage.objects where bucket_id='profile-avatars'and name=portrait)then raise exception 'AAL2 unable to read own image';end if;
end $$;
reset role;
select 'Profile/avatar ownership, protected edits, treating-doctor visibility, immutable files, cross-account denials and MFA passed as authenticated. All fixtures rolled back.'as result;
rollback;
