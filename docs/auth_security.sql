-- Run AFTER docs/database_schema.sql in Supabase SQL Editor.
begin;

alter table public.profiles alter column role set default 'patient';

-- Auth creates patient profiles only; client metadata never grants a role.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare dob date;
begin
  begin
    dob := (new.raw_user_meta_data->>'date_of_birth')::date;
    if dob < date '1900-01-01' or dob > current_date then dob := null; end if;
  exception when others then dob := null;
  end;
  insert into public.profiles(id, email, full_name, phone, date_of_birth, gender, avatar_url, role)
  values (
    new.id, new.email, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 100),
    case when new.raw_user_meta_data->>'phone' ~ '^0[0-9]{9}$' then new.raw_user_meta_data->>'phone' end,
    dob,
    case when new.raw_user_meta_data->>'gender' in ('male','female','other')
      then (new.raw_user_meta_data->>'gender')::public.gender_type end,
    case when new.raw_user_meta_data->>'avatar_url' ~ '^https://' then left(new.raw_user_meta_data->>'avatar_url', 2048) end,
    'patient'
  ) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill accounts created before the signup trigger was installed.
insert into public.profiles(id, email, full_name, role)
select id, email, left(coalesce(raw_user_meta_data->>'full_name', ''), 100), 'patient'
from auth.users on conflict (id) do nothing;

create or replace function public.current_doctor_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select d.id from public.doctors d join public.profiles p on p.id = d.profile_id
  where p.id = auth.uid() and p.role = 'doctor' and d.is_active;
$$;

-- Explicit roles also apply to direct PostgREST calls, not only the web gateway.
create or replace function public.is_patient()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'patient');
$$;
revoke execute on function public.is_patient() from public, anon;
grant execute on function public.is_patient() to authenticated;

drop policy if exists a_select on public.appointments;
create policy a_select on public.appointments for select to authenticated
using ((public.is_patient() and patient_id = auth.uid()) or
       doctor_id = public.current_doctor_id() or public.is_admin());
drop policy if exists a_insert on public.appointments;
create policy a_insert on public.appointments for insert to authenticated
with check ((public.is_patient() and patient_id = auth.uid() and status = 'pending') or public.is_admin());
drop policy if exists a_update_patient on public.appointments;
create policy a_update_patient on public.appointments for update to authenticated
using (public.is_patient() and patient_id = auth.uid() and status in ('pending', 'confirmed'))
with check (public.is_patient() and patient_id = auth.uid() and status = 'cancelled');

-- Supabase owns MFA secrets. Once a verified factor exists, every data policy requires AAL2.
create or replace function public.has_required_aal()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.jwt()->>'aal' = 'aal2' or not exists(
    select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified'
  );
$$;
revoke execute on function public.has_required_aal() from public, anon;
grant execute on function public.has_required_aal() to authenticated;
do $$
declare tbl text;
begin
  foreach tbl in array array['profiles','specialties','doctors','time_slots','appointments'] loop
    execute format('drop policy if exists auth_mfa_required on public.%I', tbl);
    execute format('create policy auth_mfa_required on public.%I as restrictive for all to authenticated using (public.has_required_aal()) with check (public.has_required_aal())', tbl);
  end loop;
end $$;

-- Row ownership alone does not protect the role column.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update(full_name, phone, date_of_birth, gender, address, avatar_url, updated_at)
  on public.profiles to authenticated;

create or replace function public.guard_profile_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() and
     (new.id is distinct from old.id or new.role is distinct from old.role or new.email is distinct from old.email) then
    raise exception 'Profile identity cannot be changed' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists guard_profile_identity on public.profiles;
create trigger guard_profile_identity before update on public.profiles
for each row execute function public.guard_profile_identity();

-- Keep verified Auth email as the source of truth.
create or replace function public.sync_auth_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;
drop trigger if exists on_auth_email_updated on auth.users;
create trigger on_auth_email_updated after update of email on auth.users
for each row execute function public.sync_auth_email();

create or replace function public.guard_appointment_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.patient_id <> auth.uid() or new.status <> 'pending' or new.doctor_note is not null or
       not exists(select 1 from public.profiles where id = auth.uid() and role = 'patient') then
      raise exception 'Appointment access denied' using errcode = '42501';
    end if;
  else
    if row(new.id, new.patient_id, new.doctor_id, new.slot_id, new.created_at)
       is distinct from row(old.id, old.patient_id, old.doctor_id, old.slot_id, old.created_at) then
      raise exception 'Appointment ownership cannot be changed' using errcode = '42501';
    end if;
    if old.patient_id = auth.uid() and
       (new.status <> 'cancelled' or old.status not in ('pending','confirmed') or
        new.doctor_note is distinct from old.doctor_note or new.reason is distinct from old.reason) then
      raise exception 'Patients may only cancel their own appointments' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_appointment_identity on public.appointments;
create trigger guard_appointment_identity before insert or update on public.appointments
for each row execute function public.guard_appointment_identity();

drop policy if exists d_self_update on public.doctors;
create policy d_self_update on public.doctors for update to authenticated
using (id = public.current_doctor_id()) with check (id = public.current_doctor_id());

create or replace function public.guard_doctor_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() and
     row(new.id, new.profile_id, new.specialty_id, new.is_active, new.years_experience, new.created_at)
     is distinct from row(old.id, old.profile_id, old.specialty_id, old.is_active, old.years_experience, old.created_at) then
    raise exception 'Doctor identity cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists guard_doctor_identity on public.doctors;
create trigger guard_doctor_identity before update on public.doctors
for each row execute function public.guard_doctor_identity();

-- Role changes are transactional and authorized here as well as at the HTTP boundary.
create or replace function public.admin_set_user_role(
  p_profile_id uuid, p_role public.user_role,
  p_specialty_id bigint default null, p_room text default null, p_consultation_fee numeric default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.profiles; linked_doctor public.doctors;
begin
  if not public.is_admin() or not public.has_required_aal() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_profile_id = auth.uid() then raise exception 'Cannot change your own role' using errcode = '42501'; end if;
  select * into target from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'Account not found' using errcode = '22023'; end if;
  if p_role is null then raise exception 'Role is required' using errcode = '22023'; end if;
  if target.role = p_role then return; end if;
  select * into linked_doctor from public.doctors where profile_id = p_profile_id;
  if linked_doctor.id is not null and p_role <> 'doctor' and
     exists(select 1 from public.appointments where doctor_id = linked_doctor.id) then
    raise exception 'Doctor has appointments; deactivate the doctor instead' using errcode = '22023';
  end if;
  if target.role = 'patient' and exists(select 1 from public.appointments where patient_id = p_profile_id) then
    raise exception 'Patient has appointments' using errcode = '22023';
  end if;
  if p_role = 'doctor' and linked_doctor.id is null then
    if p_specialty_id is null or p_room is null or length(trim(p_room)) not between 1 and 100 or
       p_consultation_fee is null or p_consultation_fee < 0 then
      raise exception 'Doctor details required' using errcode = '22023';
    end if;
    insert into public.doctors(profile_id, specialty_id, room, consultation_fee, is_active)
      values(p_profile_id, p_specialty_id, trim(p_room), p_consultation_fee, true);
  elsif p_role = 'doctor' then
    update public.doctors set is_active = true where id = linked_doctor.id;
  elsif p_role <> 'doctor' and linked_doctor.id is not null then
    update public.doctors set is_active = false where id = linked_doctor.id;
  end if;
  update public.profiles set role = p_role where id = p_profile_id;
end $$;
revoke all on function public.admin_set_user_role(uuid, public.user_role, bigint, text, numeric) from public, anon;
grant execute on function public.admin_set_user_role(uuid, public.user_role, bigint, text, numeric) to authenticated;

-- Trigger functions are never callable as arbitrary RPCs.
revoke execute on function public.handle_new_user(), public.guard_profile_identity(),
  public.sync_auth_email(), public.guard_appointment_identity(), public.guard_doctor_identity()
  from public, anon, authenticated;
commit;
