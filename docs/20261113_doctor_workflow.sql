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
