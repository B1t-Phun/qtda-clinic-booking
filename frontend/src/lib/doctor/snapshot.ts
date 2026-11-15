import 'server-only';
import type { createServerSupabase } from '@/lib/auth/server';
import { AuthHttpError } from '@/lib/auth/http';
import type { Doctor, DoctorSnapshot } from '@/modules/doctor/data';

type Client = Awaited<ReturnType<typeof createServerSupabase>>;
export function databaseError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === '40001') throw new AuthHttpError(409, 'Lịch hẹn đã thay đổi. Vui lòng tải lại rồi thử lại.');
  if (['23505','23P01'].includes(error.code || '')) throw new AuthHttpError(409, 'Khung giờ hoặc ca khám đã được sử dụng. Vui lòng tải lại.');
  if (error.code === '23503') throw new AuthHttpError(409, 'Khung giờ có lịch sử đặt khám nên không thể xóa.');
  if (error.code === '42501') throw new AuthHttpError(403, 'Bạn không có quyền thực hiện thao tác này.');
  if (error.code === 'P0002' || error.code === 'PGRST116') throw new AuthHttpError(404, 'Không tìm thấy dữ liệu của bạn.');
  if (error.code === '22023') throw new AuthHttpError(400, error.message || 'Dữ liệu không hợp lệ.');
  throw new Error('Doctor data service unavailable');
}
export function normalize<T>(value: T): T {
  if (Array.isArray(value)) return value.map(normalize) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key,item]) => [
    key, key === 'id' || key.endsWith('_id') ? item == null ? item : String(item) : normalize(item),
  ])) as T;
}
async function doctorRows(client: Client, table: 'appointments' | 'time_slots', doctorId: string) {
  const rows = [];
  for (let offset = 0; offset < 20000; offset += 500) {
    const { data, error } = await client.from(table).select('*').eq('doctor_id', doctorId).order('id').range(offset, offset+499);
    databaseError(error);
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
  throw new AuthHttpError(413, 'Danh sách quá lớn. Liên hệ quản trị để phân trang dữ liệu.');
}

export async function loadDoctorSnapshot(client: Client, user: { id: string }, doctor: Doctor): Promise<DoctorSnapshot> {
    const [appointments, slots, profile, specialty, recent] = await Promise.all([
      doctorRows(client,'appointments',doctor.id), doctorRows(client,'time_slots',doctor.id),
      client.from('profiles').select('*').eq('id',user.id).single(),
      client.from('specialties').select('*').eq('id',doctor.specialty_id).single(),
      client.from('appointment_events').select('*').eq('doctor_id',doctor.id).order('id',{ascending:false}).limit(100),
    ]);
    databaseError(profile.error); databaseError(specialty.error); databaseError(recent.error);
    const ids = [...new Set(appointments.map(a => a.patient_id))];
    const patients = [];
    for (let start=0; start<ids.length; start+=100) {
      const result=await client.from('profiles').select('*').in('id',ids.slice(start,start+100));
      databaseError(result.error); patients.push(...(result.data || []));
    }
    return normalize({ profile: profile.data, specialty:specialty.data, doctor, patients, appointments, slots, events:recent.data || [] }) as DoctorSnapshot;
}
