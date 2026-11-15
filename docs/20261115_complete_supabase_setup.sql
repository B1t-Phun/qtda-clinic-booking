-- ClinicCare complete Supabase setup for a fresh project.
-- Execute this file once in Supabase SQL Editor with the postgres role.
-- Creates schema, auth/RLS, walk-in patients, admin CRUD, appointments, doctor portal workflow and audit log.
-- No demo/synthetic rows are inserted. Add specialties from Admin after setup.
-- Existing production projects should apply reviewed migrations individually instead of rerunning this bootstrap.

-- 1. Base tables and policies (database_schema.sql, with sample specialty inserts omitted)
-- =====================================================================
-- 5 BẢNG CỐT LÕI: profiles, specialties, doctors, time_slots, appointments
-- Chạy trực tiếp trong Supabase SQL Editor. Có thể chạy lại nhiều lần.
-- =====================================================================

create extension if not exists btree_gist;

do $$ begin create type public.user_role as enum ('admin', 'doctor', 'patient');
exception when duplicate_object then null; end $$;
do $$ begin create type public.gender_type as enum ('male', 'female', 'other');
exception when duplicate_object then null; end $$;
do $$ begin create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

-- 1. PROFILES (mở rộng auth.users của Supabase) ------------------------
create table if not exists public.profiles (
  -- Auth users and walk-in patients share this profile table; guest ids need not exist in auth.users.
  id            uuid primary key,
  email         text,
  full_name     text not null default '',
  phone         text,
  role          public.user_role not null default 'patient',
  date_of_birth date,
  gender        public.gender_type,
  address       text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. SPECIALTIES (chuyên khoa) ------------------------------------------
create table if not exists public.specialties (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

-- 3. DOCTORS -------------------------------------------------------------
create table if not exists public.doctors (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null unique references public.profiles(id) on delete cascade,
  specialty_id     bigint not null references public.specialties(id) on delete restrict,
  bio              text,
  room             text,
  years_experience smallint check (years_experience >= 0),
  consultation_fee numeric(12,0) check (consultation_fee >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists idx_doctors_specialty on public.doctors(specialty_id);

-- 4. TIME_SLOTS (khung giờ khám) ----------------------------------------
create table if not exists public.time_slots (
  id         bigint generated always as identity primary key,
  doctor_id  uuid not null references public.doctors(id) on delete cascade,
  slot_date  date not null,
  start_time time not null,
  end_time   time not null,
  is_booked  boolean not null default false,
  created_at timestamptz not null default now(),
  constraint time_slots_time_chk check (end_time > start_time),
  constraint time_slots_unique unique (doctor_id, slot_date, start_time),
  constraint time_slots_id_doctor_uq unique (id, doctor_id),
  -- 1 bác sĩ không có 2 khung giờ chồng nhau
  constraint time_slots_no_overlap exclude using gist (
    doctor_id with =,
    tsrange((slot_date + start_time), (slot_date + end_time)) with &&
  )
);
create index if not exists idx_time_slots_date on public.time_slots(slot_date, is_booked);

-- 5. APPOINTMENTS (lịch hẹn) --------------------------------------------
create table if not exists public.appointments (
  id            bigint generated always as identity primary key,
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  doctor_id     uuid not null references public.doctors(id) on delete restrict,
  slot_id       bigint not null,
  status        public.appointment_status not null default 'pending',
  reason        text,
  doctor_note   text,
  cancel_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- doctor_id bắt buộc khớp với bác sĩ của khung giờ
  constraint appointments_slot_fk foreign key (slot_id, doctor_id)
    references public.time_slots(id, doctor_id) on delete restrict
);
create index if not exists idx_appt_patient on public.appointments(patient_id, status);
create index if not exists idx_appt_doctor  on public.appointments(doctor_id, status);

-- CHỐNG ĐẶT TRÙNG: 1 khung giờ chỉ có 1 lịch đang hiệu lực
create unique index if not exists uq_appt_active_slot
  on public.appointments(slot_id) where status in ('pending', 'confirmed');

-- ---------------------------------------------------------------------
-- TỰ ĐỘNG HÓA TỐI THIỂU
-- ---------------------------------------------------------------------

-- Tạo profile khi user đăng ký
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Đồng bộ time_slots.is_booked theo lịch hẹn
create or replace function public.sync_slot_booked()
returns trigger language plpgsql security definer set search_path = public as $$
declare sid bigint := coalesce(new.slot_id, old.slot_id);
begin
  update public.time_slots set is_booked = exists (
    select 1 from public.appointments a
    where a.slot_id = sid and a.status in ('pending', 'confirmed'))
  where id = sid;
  return null;
end $$;

drop trigger if exists trg_sync_slot_booked on public.appointments;
create trigger trg_sync_slot_booked
  after insert or update of status, slot_id or delete on public.appointments
  for each row execute function public.sync_slot_booked();

-- ---------------------------------------------------------------------
-- RLS CƠ BẢN
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.current_doctor_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.doctors where profile_id = auth.uid();
$$;

alter table public.profiles     enable row level security;
alter table public.specialties  enable row level security;
alter table public.doctors      enable row level security;
alter table public.time_slots   enable row level security;
alter table public.appointments enable row level security;

-- profiles
drop policy if exists p_select on public.profiles;
create policy p_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin()
         or exists (select 1 from public.doctors d where d.profile_id = profiles.id)
         or exists (select 1 from public.appointments a
                    where a.patient_id = profiles.id and a.doctor_id = public.current_doctor_id()));
drop policy if exists p_update on public.profiles;
create policy p_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- specialties, doctors, time_slots: ai cũng xem; admin (và bác sĩ với slot của mình) quản lý
drop policy if exists s_select on public.specialties;
create policy s_select on public.specialties for select to anon, authenticated using (true);
drop policy if exists s_admin on public.specialties;
create policy s_admin on public.specialties for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists d_select on public.doctors;
create policy d_select on public.doctors for select to anon, authenticated using (true);
drop policy if exists d_admin on public.doctors;
create policy d_admin on public.doctors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists t_select on public.time_slots;
create policy t_select on public.time_slots for select to anon, authenticated using (true);
drop policy if exists t_manage on public.time_slots;
create policy t_manage on public.time_slots for all to authenticated
  using (doctor_id = public.current_doctor_id() or public.is_admin())
  with check (doctor_id = public.current_doctor_id() or public.is_admin());

-- appointments
drop policy if exists a_select on public.appointments;
create policy a_select on public.appointments for select to authenticated
  using (patient_id = auth.uid() or doctor_id = public.current_doctor_id() or public.is_admin());
drop policy if exists a_insert on public.appointments;
create policy a_insert on public.appointments for insert to authenticated
  with check ((patient_id = auth.uid() and status = 'pending') or public.is_admin());
drop policy if exists a_update_patient on public.appointments;
create policy a_update_patient on public.appointments for update to authenticated
  using (patient_id = auth.uid() and status in ('pending', 'confirmed'))
  with check (patient_id = auth.uid() and status = 'cancelled');
drop policy if exists a_update_doctor on public.appointments;
create policy a_update_doctor on public.appointments for update to authenticated
  using (doctor_id = public.current_doctor_id()) with check (doctor_id = public.current_doctor_id());
drop policy if exists a_admin on public.appointments;
create policy a_admin on public.appointments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Quyền
grant usage on schema public to anon, authenticated;
grant select on public.specialties, public.doctors, public.time_slots to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.specialties, public.doctors,
      public.time_slots, public.appointments to authenticated;
grant usage, select on all sequences in schema public to authenticated;


-- 2. Auth roles, MFA and identity protection
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
  if p_role in ('doctor', 'admin') and not exists(select 1 from auth.users where id = p_profile_id) then
    raise exception 'An authenticated account is required for doctor or admin roles' using errcode = '22023';
  end if;
  select * into linked_doctor from public.doctors where profile_id = p_profile_id;
  if linked_doctor.id is not null and p_role <> 'doctor' and
     exists(select 1 from public.appointments where doctor_id = linked_doctor.id) then
    raise exception 'Doctor has appointments; deactivate instead of changing the role' using errcode = '22023';
  end if;
  if target.role = 'patient' and p_role <> 'patient' and exists(select 1 from public.appointments where patient_id = p_profile_id) then
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
  elsif p_role <> 'doctor' and linked_doctor.id is not null then
    -- No appointments reference this doctor (checked above), so remove the profile.
    -- Associated time slots are removed by their ON DELETE CASCADE relationship.
    delete from public.doctors where id = linked_doctor.id;
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


-- 3. Walk-in patient records and role-safe account handling
-- Run after database_schema.sql and auth_security.sql.
-- Allows admin-created walk-in patient profiles without a Supabase Auth account.
begin;

do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and confrelid = 'auth.users'::regclass
      and contype = 'f'
  loop
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end loop;
end;
$$;

-- Remove earlier drafts/overloads so PostgREST sees one unambiguous RPC signature.
do $$
declare signature text;
begin
  for signature in
    select pg_get_function_identity_arguments(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'admin_create_patient'
  loop
    execute format('drop function public.admin_create_patient(%s)', signature);
  end loop;
end;
$$;

create or replace function public.admin_create_patient(
  p_full_name text,
  p_email text,
  p_phone text,
  p_gender text,
  p_date_of_birth date,
  p_address text,
  p_avatar_url text
)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare created_profile public.profiles;
begin
  if not public.is_admin() or not public.has_required_aal() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_full_name is null or length(trim(p_full_name)) not between 2 and 100 or
     p_phone is null or p_phone !~ '^0[0-9]{9}$' or
     (p_gender is not null and p_gender not in ('male', 'female', 'other')) or
     (p_date_of_birth is not null and (p_date_of_birth < date '1900-01-01' or p_date_of_birth > current_date)) or
     (p_email is not null and length(trim(p_email)) > 254) or
     (nullif(trim(p_email), '') is not null and trim(p_email) !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$') or
     (p_address is not null and length(p_address) > 500) or
     (p_avatar_url is not null and (p_avatar_url !~ '^https?://' or length(p_avatar_url) > 2048)) then
    raise exception 'Invalid patient data' using errcode = '22023';
  end if;
  if nullif(trim(p_email), '') is not null and exists (
    select 1 from public.profiles where lower(email) = lower(trim(p_email))
  ) then
    raise exception 'Email is already used by another profile' using errcode = '23505';
  end if;

  insert into public.profiles(id, email, full_name, phone, role, date_of_birth, gender, address, avatar_url)
  values (
    gen_random_uuid(), coalesce(nullif(lower(trim(p_email)), ''), ''), trim(p_full_name), p_phone,
    'patient', p_date_of_birth, nullif(p_gender, '')::public.gender_type,
    nullif(trim(p_address), ''), nullif(trim(p_avatar_url), '')
  ) returning * into created_profile;
  return created_profile;
end;
$$;

revoke all on function public.admin_create_patient(text,text,text,text,date,text,text) from public, anon;
grant execute on function public.admin_create_patient(text,text,text,text,date,text,text) to authenticated;

notify pgrst, 'reload schema';

commit;


-- 4. Doctor appointments, queue, schedule, patient history and activity log
begin;
alter table public.appointments add column if not exists checked_in_at timestamptz;
alter table public.appointments add column if not exists started_at timestamptz;
alter table public.appointments add column if not exists completed_at timestamptz;

create table if not exists public.appointment_events (
  id bigint generated always as identity primary key,
  appointment_id bigint not null references public.appointments(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id),
  patient_id uuid not null references public.profiles(id),
  actor_id uuid references public.profiles(id),
  action text not null,
  old_status text,
  new_status text not null,
  old_slot_id bigint,
  new_slot_id bigint not null,
  reason text,
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists appointment_events_doctor_idx on public.appointment_events(doctor_id, id desc);
create index if not exists appointment_events_appointment_idx on public.appointment_events(appointment_id, id desc);
alter table public.appointment_events enable row level security;
drop policy if exists appointment_events_read on public.appointment_events;
create policy appointment_events_read on public.appointment_events for select to authenticated
using (public.has_required_aal() and (doctor_id=public.current_doctor_id() or patient_id=auth.uid() or public.is_admin()));
revoke all on public.appointment_events from anon, authenticated;
grant select on public.appointment_events to authenticated;
create unique index if not exists appointment_one_exam_per_doctor on public.appointments(doctor_id)
where status='confirmed' and started_at is not null;
create unique index if not exists appointment_reserved_slot on public.appointments(slot_id)
where status in ('pending','confirmed','completed');

create or replace function public.sync_slot_booked()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op <> 'DELETE' then
    update public.time_slots s set is_booked=exists(
      select 1 from public.appointments a where a.slot_id=s.id and a.status in ('pending','confirmed','completed')
    ) where s.id=new.slot_id;
  end if;
  if tg_op='DELETE' or (tg_op='UPDATE' and old.slot_id is distinct from new.slot_id) then
    update public.time_slots s set is_booked=exists(
      select 1 from public.appointments a where a.slot_id=s.id and a.status in ('pending','confirmed','completed')
    ) where s.id=old.slot_id;
  end if;
  return null;
end $$;
update public.time_slots s set is_booked=exists(
  select 1 from public.appointments a where a.slot_id=s.id and a.status in ('pending','confirmed','completed')
) where s.is_booked is distinct from exists(
  select 1 from public.appointments a where a.slot_id=s.id and a.status in ('pending','confirmed','completed')
);

create or replace function public.guard_appointment_identity()
returns trigger language plpgsql set search_path='' as $$
declare slot public.time_slots; doc uuid := public.current_doctor_id();
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if not public.has_required_aal() then raise exception 'Vui lòng hoàn tất MFA.' using errcode='42501'; end if;
  if tg_op='INSERT' then
    if new.patient_id <> auth.uid() or new.status <> 'pending' or new.doctor_note is not null
       or new.checked_in_at is not null or new.started_at is not null or new.completed_at is not null
       or not public.is_patient() then
      raise exception 'Không có quyền tạo lịch hẹn này.' using errcode='42501';
    end if;
    select * into slot from public.time_slots where id=new.slot_id;
    if not exists (
      select 1 from public.doctors d
      join public.profiles p on p.id=d.profile_id
      where d.id=new.doctor_id and d.is_active and p.role='doctor'
    ) then
      raise exception 'Bác sĩ hiện không nhận lịch hẹn mới.' using errcode='22023';
    end if;
    if (slot.slot_date+slot.start_time) at time zone 'Asia/Ho_Chi_Minh' <= now() then
      raise exception 'Không thể đặt khung giờ đã qua.' using errcode='22023';
    end if;
  else
    if row(new.id,new.patient_id,new.doctor_id,new.created_at) is distinct from row(old.id,old.patient_id,old.doctor_id,old.created_at) then
      raise exception 'Không được đổi chủ sở hữu lịch hẹn.' using errcode='42501';
    end if;
    if doc is not null and old.doctor_id=doc then
      if current_user not in ('postgres','supabase_admin') or coalesce(current_setting('clinic.doctor_action',true),'')=''
      then raise exception 'Vui lòng dùng thao tác xử lý lịch hẹn.' using errcode='42501'; end if;
    else
      if new.slot_id is distinct from old.slot_id or
        row(new.checked_in_at,new.started_at,new.completed_at) is distinct from row(old.checked_in_at,old.started_at,old.completed_at)
        or new.status<>'cancelled' or old.status not in ('pending','confirmed') or old.started_at is not null
        or new.doctor_note is distinct from old.doctor_note or new.reason is distinct from old.reason
      then raise exception 'Bệnh nhân chỉ được hủy lịch chưa bắt đầu khám.' using errcode='42501'; end if;
    end if;
  end if;
  new.updated_at=clock_timestamp();
  return new;
end $$;

create or replace function public.record_appointment_event()
returns trigger language plpgsql security definer set search_path='' as $$
declare act text;
begin
  if tg_op='INSERT' then act='created';
  elsif new.slot_id is distinct from old.slot_id then act='reschedule';
  elsif new.status is distinct from old.status then
    act=case new.status when 'confirmed' then 'confirm' when 'completed' then 'complete'
      when 'cancelled' then 'cancel' when 'no_show' then 'no_show' else 'status' end;
  elsif new.started_at is distinct from old.started_at then act='start';
  elsif new.checked_in_at is distinct from old.checked_in_at then act='check_in';
  elsif new.doctor_note is distinct from old.doctor_note then act='save_note';
  else return null;
  end if;
  insert into public.appointment_events(appointment_id,doctor_id,patient_id,actor_id,action,old_status,new_status,old_slot_id,new_slot_id,reason)
  values(new.id,new.doctor_id,new.patient_id,auth.uid(),act,
    case when tg_op='UPDATE' then old.status::text end,new.status::text,
    case when tg_op='UPDATE' then old.slot_id end,new.slot_id,
    case when act='cancel' then new.cancel_reason when act='reschedule' then nullif(current_setting('clinic.doctor_reason',true),'') end);
  return null;
end $$;
drop trigger if exists appointment_event_log on public.appointments;
create trigger appointment_event_log after insert or update on public.appointments
for each row execute function public.record_appointment_event();

create or replace function public.doctor_manage_appointment(
  p_appointment_id bigint, p_action text, p_expected_updated_at timestamptz,
  p_note text default null, p_reason text default null, p_slot_id bigint default null
) returns public.appointments language plpgsql security definer set search_path='' as $$
declare a public.appointments; slot public.time_slots; target public.time_slots; doc uuid; today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  doc=public.current_doctor_id();
  if doc is null or not public.has_required_aal() then raise exception 'Không có quyền xử lý lịch hẹn.' using errcode='42501'; end if;
  if p_action is null or p_action not in ('confirm','check_in','start','complete','cancel','no_show','save_note','reschedule')
    then raise exception 'Thao tác không hợp lệ.' using errcode='22023'; end if;
  -- Serialize a doctor's actions to prevent two simultaneous examinations.
  perform pg_advisory_xact_lock(hashtextextended(doc::text,0));
  select * into a from public.appointments where id=p_appointment_id and doctor_id=doc for update;
  if not found then raise exception 'Không tìm thấy lịch hẹn của bạn.' using errcode='P0002'; end if;
  if p_expected_updated_at is null or a.updated_at is distinct from p_expected_updated_at
    then raise exception 'Lịch hẹn đã thay đổi. Vui lòng tải lại và thử lại.' using errcode='40001'; end if;
  if p_note is not null and length(p_note)>10000 then raise exception 'Ghi chú tối đa 10000 ký tự.' using errcode='22023'; end if;
  if p_reason is not null and length(p_reason)>1000 then raise exception 'Lý do tối đa 1000 ký tự.' using errcode='22023'; end if;
  select * into slot from public.time_slots where id=a.slot_id;
  if p_action='save_note' then
    if p_note is null then raise exception 'Thiếu ghi chú.' using errcode='22023'; end if;
    a.doctor_note=p_note;
  elsif p_action='confirm' then
    if a.status<>'pending' then raise exception 'Chỉ xác nhận lịch đang chờ.' using errcode='22023'; end if;
    if (slot.slot_date+slot.end_time) at time zone 'Asia/Ho_Chi_Minh' <= now() then raise exception 'Lịch hẹn đã quá giờ khám.' using errcode='22023'; end if;
    a.status='confirmed';
  elsif p_action='check_in' then
    if a.status<>'confirmed' or a.checked_in_at is not null or slot.slot_date<>today then
      raise exception 'Chỉ tiếp nhận lịch đã xác nhận trong hôm nay.' using errcode='22023'; end if;
    a.checked_in_at=clock_timestamp();
  elsif p_action='start' then
    if a.status<>'confirmed' or a.checked_in_at is null or a.started_at is not null or slot.slot_date<>today
      then raise exception 'Bệnh nhân cần được tiếp nhận trong hôm nay trước khi khám.' using errcode='22023'; end if;
    if exists(select 1 from public.appointments where doctor_id=doc and status='confirmed' and started_at is not null)
      then raise exception 'Hãy hoàn thành ca đang khám trước.' using errcode='22023'; end if;
    a.started_at=clock_timestamp();
  elsif p_action='complete' then
    if a.status<>'confirmed' or a.started_at is null then raise exception 'Cần bắt đầu khám trước khi hoàn thành.' using errcode='22023'; end if;
    if nullif(trim(coalesce(p_note,a.doctor_note,'')),'') is null then raise exception 'Nhập kết luận hoặc ghi chú trước khi hoàn thành.' using errcode='22023'; end if;
    a.doctor_note=coalesce(p_note,a.doctor_note); a.status='completed'; a.completed_at=clock_timestamp();
  elsif p_action='cancel' then
    if a.status not in ('pending','confirmed') or a.started_at is not null then raise exception 'Không thể hủy lịch đã bắt đầu hoặc đã kết thúc.' using errcode='22023'; end if;
    if nullif(trim(p_reason),'') is null then raise exception 'Cần nhập lý do hủy.' using errcode='22023'; end if;
    a.status='cancelled'; a.cancel_reason=trim(p_reason);
  elsif p_action='no_show' then
    if a.status<>'confirmed' or a.checked_in_at is not null or a.started_at is not null
      or (slot.slot_date+slot.start_time) at time zone 'Asia/Ho_Chi_Minh' > now()
      then raise exception 'Chỉ đánh dấu vắng khi đã đến giờ và bệnh nhân chưa đến.' using errcode='22023'; end if;
    a.status='no_show';
  elsif p_action='reschedule' then
    if a.status not in ('pending','confirmed') or a.checked_in_at is not null or a.started_at is not null
      then raise exception 'Chỉ dời lịch chưa tiếp nhận và chưa kết thúc.' using errcode='22023'; end if;
    if nullif(trim(p_reason),'') is null then raise exception 'Cần nhập lý do dời lịch.' using errcode='22023'; end if;
    select * into target from public.time_slots where id=p_slot_id and doctor_id=doc for update;
    if not found or target.id=a.slot_id or target.is_booked
      or (target.slot_date+target.start_time) at time zone 'Asia/Ho_Chi_Minh' <= now()
      or exists(select 1 from public.appointments where slot_id=p_slot_id and status in ('pending','confirmed','completed'))
      then raise exception 'Khung giờ mới không còn trống hoặc đã qua.' using errcode='22023'; end if;
    a.slot_id=target.id;
  end if;
  perform set_config('clinic.doctor_action',p_action,true);
  perform set_config('clinic.doctor_reason',coalesce(p_reason,''),true);
  update public.appointments set status=a.status,slot_id=a.slot_id,doctor_note=a.doctor_note,cancel_reason=a.cancel_reason,
    checked_in_at=a.checked_in_at,started_at=a.started_at,completed_at=a.completed_at,updated_at=clock_timestamp()
    where id=a.id returning * into a;
  return a;
end $$;
revoke all on function public.doctor_manage_appointment(bigint,text,timestamptz,text,text,bigint) from public,anon;
grant execute on function public.doctor_manage_appointment(bigint,text,timestamptz,text,text,bigint) to authenticated;
revoke execute on function public.record_appointment_event() from public,anon,authenticated;
revoke execute on function public.sync_slot_booked() from public,anon,authenticated;

create or replace function public.guard_doctor_slot()
returns trigger language plpgsql set search_path='' as $$
begin
  if auth.uid() is null or public.is_admin() or current_user in ('postgres','supabase_admin') then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_op='UPDATE' then raise exception 'Không sửa trực tiếp khung giờ; hãy xóa khung trống và tạo lại.' using errcode='42501'; end if;
  if tg_op='DELETE' then
    if old.doctor_id<>public.current_doctor_id() or old.is_booked or
      exists(select 1 from public.appointments where slot_id=old.id) or
      (old.slot_date+old.start_time) at time zone 'Asia/Ho_Chi_Minh' <= now()
      then raise exception 'Không xóa khung giờ đã qua hoặc có lịch sử đặt khám.' using errcode='22023'; end if;
    return old;
  end if;
  if new.doctor_id<>public.current_doctor_id() or new.is_booked or
    (new.slot_date+new.start_time) at time zone 'Asia/Ho_Chi_Minh' <= now()
    then raise exception 'Khung giờ phải thuộc bác sĩ hiện tại và nằm trong tương lai.' using errcode='22023'; end if;
  return new;
end $$;
drop trigger if exists guard_doctor_slot on public.time_slots;
create trigger guard_doctor_slot before insert or update or delete on public.time_slots for each row execute function public.guard_doctor_slot();
revoke execute on function public.guard_doctor_slot() from public,anon,authenticated;


-- A patient cannot hold two active appointments whose times overlap, even with different doctors.
create or replace function public.guard_patient_appointment_time()
returns trigger language plpgsql security definer set search_path='' as $$
declare target public.time_slots;
begin
  if new.status not in ('pending','confirmed') then return new; end if;
  if tg_op='UPDATE' then
    if new.slot_id is not distinct from old.slot_id and old.status in ('pending','confirmed') then return new; end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('patient:'||new.patient_id::text,0));
  select * into target from public.time_slots where id=new.slot_id;
  if exists(
    select 1 from public.appointments a join public.time_slots s on s.id=a.slot_id
    where a.patient_id=new.patient_id and a.id is distinct from new.id and a.status in ('pending','confirmed')
      and tsrange(s.slot_date+s.start_time,s.slot_date+s.end_time)
          && tsrange(target.slot_date+target.start_time,target.slot_date+target.end_time)
  ) then raise exception 'Bệnh nhân đã có lịch khác trong khoảng giờ này.' using errcode='22023'; end if;
  return new;
end $$;
drop trigger if exists patient_appointment_time on public.appointments;
create trigger patient_appointment_time before insert or update of slot_id,status on public.appointments
for each row execute function public.guard_patient_appointment_time();
revoke execute on function public.guard_patient_appointment_time() from public,anon,authenticated;

notify pgrst, 'reload schema';
commit;


-- 5. Doctor profile update permissions and validation
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


-- 6. Admin account roles synchronized with doctor records
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


-- 7. Admin doctor create/edit/deactivate/delete operations
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


-- 8. Admin specialty create/edit
-- Run after database_schema.sql and auth_security.sql in Supabase SQL Editor.
-- Admin-only transactional specialty create/edit RPC.
begin;

create or replace function public.admin_save_specialty(
  p_specialty_id bigint,
  p_name text,
  p_description text
)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  target_specialty public.specialties;
  result_id bigint;
begin
  if not public.is_admin() or not public.has_required_aal() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) not between 2 and 100 or
     (p_description is not null and length(trim(p_description)) > 1000) then
    raise exception 'Invalid specialty data' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.specialties
    where lower(name) = lower(trim(p_name))
      and (p_specialty_id is null or id <> p_specialty_id)
  ) then
    raise exception 'Specialty name is already used' using errcode = '23505';
  end if;

  if p_specialty_id is null then
    insert into public.specialties(name, description)
    values(trim(p_name), nullif(trim(p_description), ''))
    returning id into result_id;
    return result_id;
  end if;

  select * into target_specialty
  from public.specialties where id = p_specialty_id for update;
  if not found then raise exception 'Specialty not found' using errcode = '22023'; end if;

  update public.specialties
    set name = trim(p_name), description = nullif(trim(p_description), '')
    where id = p_specialty_id
    returning id into result_id;
  return result_id;
end;
$$;

revoke all on function public.admin_save_specialty(bigint,text,text) from public, anon;
grant execute on function public.admin_save_specialty(bigint,text,text) to authenticated;

notify pgrst, 'reload schema';

commit;


-- 9. Admin appointment creation
-- Run after database_schema.sql and auth_security.sql in Supabase SQL Editor.
-- Creates admin appointments transactionally with current patient/doctor/slot validation.
begin;

create or replace function public.admin_create_appointment(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_slot_id bigint,
  p_reason text,
  p_status text
)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  target_slot public.time_slots;
  result_id bigint;
begin
  if not public.is_admin() or not public.has_required_aal() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_patient_id is null or p_doctor_id is null or p_slot_id is null or
     p_status is null or p_status not in ('pending', 'confirmed') or p_reason is null or
     length(trim(p_reason)) not between 1 and 1000 then
    raise exception 'Invalid appointment data' using errcode = '22023';
  end if;
  if not exists(select 1 from public.profiles where id = p_patient_id and role = 'patient') then
    raise exception 'Patient profile not found' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.doctors d
    join public.profiles p on p.id = d.profile_id
    where d.id = p_doctor_id and d.is_active and p.role = 'doctor'
  ) then
    raise exception 'Active doctor profile not found' using errcode = '22023';
  end if;

  select * into target_slot
  from public.time_slots
  where id = p_slot_id and doctor_id = p_doctor_id
  for update;
  if not found then raise exception 'Time slot not found for this doctor' using errcode = '22023'; end if;
  if target_slot.is_booked or exists (
    select 1 from public.appointments
    where slot_id = p_slot_id and status in ('pending', 'confirmed', 'completed')
  ) then
    raise exception 'Time slot is already booked' using errcode = '23505';
  end if;
  if (target_slot.slot_date + target_slot.start_time) at time zone 'Asia/Ho_Chi_Minh' <= now() then
    raise exception 'Cannot book a time slot in the past' using errcode = '22023';
  end if;

  insert into public.appointments(patient_id, doctor_id, slot_id, reason, status)
  values (p_patient_id, p_doctor_id, p_slot_id, trim(p_reason), p_status::public.appointment_status)
  returning id into result_id;
  return result_id;
end;
$$;

revoke all on function public.admin_create_appointment(uuid,uuid,bigint,text,text) from public, anon;
grant execute on function public.admin_create_appointment(uuid,uuid,bigint,text,text) to authenticated;

notify pgrst, 'reload schema';

commit;


notify pgrst, 'reload schema';
