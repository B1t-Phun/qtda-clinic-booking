-- Add after database_schema.sql, auth_security.sql and 20261113_doctor_workflow.sql.
-- No table/column/enum changes. No data deletion. Existing RLS and MFA stay enabled.
begin;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- SECURITY INVOKER deliberately preserves column grants, row ownership and restrictive MFA policies.
-- Update personal/professional fields in one transaction, including legacy Express requests.
create or replace function public.doctor_update_profile(p_profile jsonb default '{}'::jsonb, p_doctor jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  profile public.profiles;
  doctor public.doctors;
  fields_profile text[] := array['full_name','phone','date_of_birth','gender','address','avatar_url'];
  fields_doctor text[] := array['bio','room','consultation_fee'];
begin
  if auth.uid() is null or not public.has_required_aal() or public.current_doctor_id() is null then
    raise exception 'Tài khoản bác sĩ hoặc MFA không hợp lệ.' using errcode='42501';
  end if;
  if p_profile is null or p_doctor is null or jsonb_typeof(p_profile)<>'object' or jsonb_typeof(p_doctor)<>'object' then
    raise exception 'Thông tin hồ sơ không hợp lệ.' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_object_keys(p_profile) k where not (k=any(fields_profile)))
    or exists(select 1 from jsonb_object_keys(p_doctor) k where not (k=any(fields_doctor))) then
    raise exception 'Không được thay đổi định danh hoặc phân quyền bác sĩ.' using errcode='42501';
  end if;
  if exists(select 1 from jsonb_each(p_profile) field where field.value <> 'null'::jsonb and jsonb_typeof(field.value)<>'string')
    or exists(select 1 from jsonb_each(p_doctor) field where field.key in ('bio','room') and field.value <> 'null'::jsonb and jsonb_typeof(field.value)<>'string')
    or (p_doctor ? 'consultation_fee' and p_doctor->'consultation_fee' <> 'null'::jsonb and jsonb_typeof(p_doctor->'consultation_fee')<>'number') then
    raise exception 'Kiểu dữ liệu hồ sơ không hợp lệ.' using errcode='22023';
  end if;
  select * into profile from public.profiles where id=auth.uid() for update;
  select * into doctor from public.doctors where id=public.current_doctor_id() and profile_id=auth.uid() for update;
  if profile.id is null or doctor.id is null then raise exception 'Không tìm thấy hồ sơ bác sĩ.' using errcode='P0002'; end if;
  -- Empty form values clear nullable fields, without changing values omitted from the request.
  if p_profile ? 'date_of_birth' and p_profile->>'date_of_birth' = '' then p_profile=jsonb_set(p_profile,'{date_of_birth}','null'::jsonb); end if;
  if p_profile ? 'gender' and p_profile->>'gender' = '' then p_profile=jsonb_set(p_profile,'{gender}','null'::jsonb); end if;
  profile=jsonb_populate_record(profile,p_profile);
  doctor=jsonb_populate_record(doctor,p_doctor);
  if length(trim(coalesce(profile.full_name,''))) not between 2 and 100
    or (profile.phone is not null and profile.phone<>'' and profile.phone !~ '^0[0-9]{9}$')
    or (profile.date_of_birth is not null and (profile.date_of_birth < date '1900-01-01' or profile.date_of_birth > (now() at time zone 'Asia/Ho_Chi_Minh')::date))
    or length(coalesce(profile.address,''))>500
    or length(coalesce(profile.avatar_url,''))>2048
    or (coalesce(profile.avatar_url,'')<>'' and profile.avatar_url !~ '^https://[^[:space:]]+$')
    or length(coalesce(doctor.bio,''))>4000 or length(coalesce(doctor.room,''))>100
    or (doctor.consultation_fee is not null and (doctor.consultation_fee<0 or doctor.consultation_fee>999999999999 or doctor.consultation_fee<>trunc(doctor.consultation_fee))) then
    raise exception 'Kiểm tra họ tên, điện thoại, ngày sinh, ảnh HTTPS và giá khám.' using errcode='22023';
  end if;
  if p_profile <> '{}'::jsonb then
    update public.profiles set full_name=trim(profile.full_name),phone=nullif(profile.phone,''),date_of_birth=profile.date_of_birth,
      gender=profile.gender,address=nullif(profile.address,''),avatar_url=nullif(profile.avatar_url,'')
      where id=auth.uid() returning * into profile;
  end if;
  if p_doctor <> '{}'::jsonb then
    update public.doctors set bio=doctor.bio,room=doctor.room,consultation_fee=doctor.consultation_fee
      where id=doctor.id and profile_id=auth.uid() returning * into doctor;
  end if;
  return jsonb_build_object('profile',to_jsonb(profile),'doctor',to_jsonb(doctor));
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
  raise exception 'Dữ liệu hồ sơ không hợp lệ.' using errcode='22023';
end $$;
revoke all on function public.doctor_update_profile(jsonb,jsonb) from public, anon;
grant execute on function public.doctor_update_profile(jsonb,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
