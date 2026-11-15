-- Run after database_schema.sql and auth_security.sql in Supabase SQL Editor.
-- Admin-only, transactional doctor create/edit and soft-deactivation operations.
begin;

create or replace function public.admin_save_doctor(
  p_doctor_id uuid,
  p_profile_id uuid,
  p_full_name text,
  p_phone text,
  p_avatar_url text,
  p_specialty_id bigint,
  p_room text,
  p_years_experience smallint,
  p_consultation_fee numeric,
  p_bio text,
  p_is_active boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target_profile public.profiles;
  target_doctor public.doctors;
  result_id uuid;
begin
  if not public.is_admin() or not public.has_required_aal() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_full_name is null or length(trim(p_full_name)) not between 2 and 100 or
     p_specialty_id is null or p_room is null or length(trim(p_room)) not between 1 and 100 or
     p_years_experience is null or p_years_experience not between 0 and 60 or
     p_consultation_fee is null or p_consultation_fee < 1000 or p_consultation_fee > 999999999999 or
     p_is_active is null or
     (p_phone is not null and p_phone !~ '^0[0-9]{9}$') or
     (p_avatar_url is not null and (p_avatar_url !~ '^https?://' or length(p_avatar_url) > 2048)) then
    raise exception 'Invalid doctor data' using errcode = '22023';
  end if;
  if not exists(select 1 from public.specialties where id = p_specialty_id) then
    raise exception 'Specialty not found' using errcode = '22023';
  end if;

  if p_doctor_id is null then
    if p_profile_id is null or p_profile_id = auth.uid() then
      raise exception 'Invalid target account' using errcode = '22023';
    end if;
    select * into target_profile from public.profiles where id = p_profile_id for update;
    if not found then raise exception 'Account not found' using errcode = '22023'; end if;
    if not exists(select 1 from auth.users where id = p_profile_id) then
      raise exception 'Doctor account must exist in Supabase Auth before a doctor profile can be created' using errcode = '22023';
    end if;
    if target_profile.role not in ('patient', 'doctor') then
      raise exception 'Only a patient or an incomplete doctor account can be linked' using errcode = '22023';
    end if;
    if exists(select 1 from public.doctors where profile_id = p_profile_id) then
      raise exception 'Doctor profile already exists' using errcode = '23505';
    end if;
    if exists(select 1 from public.appointments where patient_id = p_profile_id) then
      raise exception 'Account has appointments and cannot be converted to a doctor' using errcode = '22023';
    end if;

    update public.profiles
      set full_name = trim(p_full_name), phone = p_phone, avatar_url = p_avatar_url,
          role = 'doctor', updated_at = now()
      where id = p_profile_id;
    insert into public.doctors(profile_id, specialty_id, room, years_experience, consultation_fee, bio, is_active)
      values(p_profile_id, p_specialty_id, trim(p_room), p_years_experience,
             p_consultation_fee, nullif(trim(p_bio), ''), p_is_active)
      returning id into result_id;
    return result_id;
  end if;

  select * into target_doctor from public.doctors where id = p_doctor_id for update;
  if not found then raise exception 'Doctor not found' using errcode = '22023'; end if;
  select * into target_profile from public.profiles where id = target_doctor.profile_id for update;
  if not found or target_profile.role <> 'doctor' then
    raise exception 'Linked doctor account is invalid' using errcode = '22023';
  end if;
  update public.profiles
    set full_name = trim(p_full_name), phone = p_phone, avatar_url = p_avatar_url, updated_at = now()
    where id = target_profile.id;
  update public.doctors
    set specialty_id = p_specialty_id, room = trim(p_room), years_experience = p_years_experience,
        consultation_fee = p_consultation_fee, bio = nullif(trim(p_bio), ''), is_active = p_is_active
    where id = p_doctor_id;
  return p_doctor_id;
end;
$$;

create or replace function public.admin_set_doctor_active(p_doctor_id uuid, p_is_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() or not public.has_required_aal() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_is_active is null then raise exception 'Active status is required' using errcode = '22023'; end if;
  update public.doctors set is_active = p_is_active where id = p_doctor_id;
  if not found then raise exception 'Doctor not found' using errcode = '22023'; end if;
end;
$$;

create or replace function public.admin_delete_doctor(p_doctor_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target_profile_id uuid;
begin
  if not public.is_admin() or not public.has_required_aal() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_doctor_id is null then raise exception 'Doctor id is required' using errcode = '22023'; end if;

  select profile_id into target_profile_id from public.doctors where id = p_doctor_id for update;
  if not found then raise exception 'Doctor not found' using errcode = '22023'; end if;
  if not exists(select 1 from public.profiles where id = target_profile_id and role = 'doctor') then
    raise exception 'Linked doctor account is invalid' using errcode = '22023';
  end if;
  -- The role RPC owns downgrade rules and removes the doctor row and cascading slots.
  perform public.admin_set_user_role(target_profile_id, 'patient'::public.user_role);
end;
$$;

revoke all on function public.admin_save_doctor(uuid,uuid,text,text,text,bigint,text,smallint,numeric,text,boolean) from public, anon;
grant execute on function public.admin_save_doctor(uuid,uuid,text,text,text,bigint,text,smallint,numeric,text,boolean) to authenticated;
revoke all on function public.admin_set_doctor_active(uuid,boolean) from public, anon;
grant execute on function public.admin_set_doctor_active(uuid,boolean) to authenticated;
revoke all on function public.admin_delete_doctor(uuid) from public, anon;
grant execute on function public.admin_delete_doctor(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
