-- Run after database_schema.sql and auth_security.sql in Supabase SQL Editor.
-- Keeps role changes and related doctor records in sync.
begin;

create or replace function public.admin_set_user_role(
  p_profile_id uuid,
  p_role public.user_role,
  p_specialty_id bigint default null,
  p_room text default null,
  p_consultation_fee numeric default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target public.profiles;
  linked_doctor public.doctors;
begin
  if not public.is_admin() or not public.has_required_aal() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_profile_id is null or p_profile_id = auth.uid() then
    raise exception 'Cannot change this account role' using errcode = '42501';
  end if;

  select * into target from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'Account not found' using errcode = '22023'; end if;
  if p_role is null then raise exception 'Role is required' using errcode = '22023'; end if;
  if target.role = p_role then return; end if;
  if p_role in ('doctor', 'admin') and not exists(select 1 from auth.users where id = p_profile_id) then
    raise exception 'An authenticated account is required for doctor or admin roles' using errcode = '22023';
  end if;

  select * into linked_doctor from public.doctors where profile_id = p_profile_id for update;
  if linked_doctor.id is not null and p_role <> 'doctor' and exists (
    select 1 from public.appointments where doctor_id = linked_doctor.id
  ) then
    raise exception 'Doctor has appointments; deactivate instead of changing the role' using errcode = '22023';
  end if;
  if target.role = 'patient' and p_role <> 'patient' and exists (
    select 1 from public.appointments where patient_id = p_profile_id
  ) then
    raise exception 'Patient has appointments' using errcode = '22023';
  end if;

  if p_role = 'doctor' and linked_doctor.id is null then
    if p_specialty_id is null or p_room is null or length(trim(p_room)) not between 1 and 100 or
       p_consultation_fee is null or p_consultation_fee < 1000 or p_consultation_fee > 999999999999 or
       not exists(select 1 from public.specialties where id = p_specialty_id) then
      raise exception 'Doctor details required' using errcode = '22023';
    end if;
    insert into public.doctors(profile_id, specialty_id, room, years_experience, consultation_fee, is_active)
      values(p_profile_id, p_specialty_id, trim(p_room), 0, p_consultation_fee, true);
  elsif p_role = 'doctor' then
    update public.doctors set is_active = true where id = linked_doctor.id;
  elsif linked_doctor.id is not null then
    -- Appointments prevent this path; the linked slots cascade when the doctor row is removed.
    delete from public.doctors where id = linked_doctor.id;
  end if;

  update public.profiles set role = p_role, updated_at = now() where id = p_profile_id;
end;
$$;

revoke all on function public.admin_set_user_role(uuid,public.user_role,bigint,text,numeric) from public, anon;
grant execute on function public.admin_set_user_role(uuid,public.user_role,bigint,text,numeric) to authenticated;

notify pgrst, 'reload schema';

commit;
