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
