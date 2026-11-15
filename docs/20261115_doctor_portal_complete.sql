-- ClinicCare doctor portal and admin-doctor SQL bundle.
-- Run database_schema.sql and auth_security.sql first, then execute this file in Supabase SQL Editor.
-- Includes appointment workflow/audit, doctor profile updates, role synchronization, and admin doctor CRUD.

-- Source: 20261113_doctor_workflow.sql
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


-- Source: 20261115_doctor_module_hardening.sql
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


-- Source: 20261115_admin_account_roles.sql
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


-- Source: 20261115_admin_doctor_crud.sql
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

