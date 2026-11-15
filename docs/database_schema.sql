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
  id            uuid primary key references auth.users(id) on delete cascade,
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

-- Dữ liệu mẫu
insert into public.specialties (name, description) values
  ('Nội tổng quát', 'Khám và điều trị các bệnh nội khoa thường gặp'),
  ('Nhi khoa',      'Chăm sóc sức khỏe trẻ em'),
  ('Tim mạch',      'Chẩn đoán và điều trị bệnh tim, huyết áp'),
  ('Da liễu',       'Các bệnh về da, tóc, móng'),
  ('Tai Mũi Họng',  'Khám và điều trị tai, mũi, họng')
on conflict (name) do nothing;