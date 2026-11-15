import 'server-only';
import type { createServerSupabase } from '@/lib/auth/server';
import { AuthHttpError } from '@/lib/auth/http';
import type { Appointment, TimeSlot, Doctor, DoctorSnapshot } from '@/modules/doctor/data';

type Client = Awaited<ReturnType<typeof createServerSupabase>>;
const profileFields = 'id,email,full_name,phone,role,date_of_birth,gender,address,avatar_url,created_at,updated_at';
const appointmentFields = 'id,patient_id,doctor_id,slot_id,status,reason,doctor_note,cancel_reason,checked_in_at,started_at,completed_at,created_at,updated_at';
const slotFields = 'id,doctor_id,slot_date,start_time,end_time,is_booked,created_at';

export function databaseError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === '40001') throw new AuthHttpError(409, 'Lịch hẹn đã thay đổi. Tải lại dữ liệu và kiểm tra ghi chú trước khi lưu lại.');
  if (['23505', '23P01'].includes(error.code || '')) throw new AuthHttpError(409, 'Khung giờ hoặc ca khám đã được sử dụng. Vui lòng tải lại.');
  if (error.code === '23503') throw new AuthHttpError(409, 'Khung giờ có lịch sử đặt khám nên không thể xóa.');
  if (error.code === '42501') throw new AuthHttpError(403, 'Bạn không có quyền thực hiện thao tác này. Kiểm tra đăng nhập hoặc MFA.');
  if (error.code === 'P0002' || error.code === 'PGRST116') throw new AuthHttpError(404, 'Không tìm thấy dữ liệu của bạn.');
  if (['22023', '23514', '22P02'].includes(error.code || '')) throw new AuthHttpError(400, error.code === '22023' ? error.message || 'Dữ liệu không hợp lệ.' : 'Dữ liệu không hợp lệ.');
  throw new Error('Doctor data service unavailable');
}
export function normalize<T>(value: T): T {
  if (Array.isArray(value)) return value.map(normalize) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key, key === 'id' || key.endsWith('_id') ? item == null ? item : String(item) : normalize(item),
  ])) as T;
}
async function doctorRows(client: Client, table: 'appointments', doctorId: string): Promise<Appointment[]>;
async function doctorRows(client: Client, table: 'time_slots', doctorId: string): Promise<TimeSlot[]>;
async function doctorRows(client: Client, table: 'appointments' | 'time_slots', doctorId: string): Promise<(Appointment | TimeSlot)[]> {
  const rows: (Appointment | TimeSlot)[] = [];
  for (let offset = 0; offset < 20_000; offset += 500) {
    const fields: string = table === 'appointments' ? appointmentFields : slotFields;
    const { data, error } = await client.from(table).select(fields)
      .eq('doctor_id', doctorId).order('id').range(offset, offset + 499);
    databaseError(error);
    rows.push(...((data || []) as unknown as (Appointment | TimeSlot)[]));
    if (!data || data.length < 500) return rows;
  }
  throw new AuthHttpError(413, 'Danh sách quá lớn. Liên hệ quản trị để phân trang dữ liệu.');
}
export async function loadDoctorSnapshot(client: Client, user: { id: string }, doctor: Doctor): Promise<DoctorSnapshot> {
  const [appointments, slots, profile, specialty, recent] = await Promise.all([
    doctorRows(client, 'appointments', doctor.id), doctorRows(client, 'time_slots', doctor.id),
    client.from('profiles').select(profileFields).eq('id', user.id).single(),
    client.from('specialties').select('id,name,description,created_at').eq('id', doctor.specialty_id).single(),
    client.from('appointment_events').select('*').eq('doctor_id', doctor.id).order('id', { ascending: false }).limit(100),
  ]);
  databaseError(profile.error); databaseError(specialty.error); databaseError(recent.error);
  const ids = [...new Set(appointments.map(a => a.patient_id))];
  const patients = [];
  for (let start = 0; start < ids.length; start += 100) {
    const result = await client.from('profiles').select(profileFields).in('id', ids.slice(start, start + 100));
    databaseError(result.error); patients.push(...(result.data || []));
  }
  return normalize({
    profile: profile.data, specialty: specialty.data, doctor, patients, appointments, slots,
    events: recent.data || [], loadedAt: new Date().toISOString(),
  }) as unknown as DoctorSnapshot;
}
