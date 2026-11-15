import { createServerSupabase, readIdentity } from '@/lib/auth/server';
import { assertSameOrigin, AuthHttpError, errorResponse, json, readBody } from '@/lib/auth/http';
import { databaseError, normalize, loadDoctorSnapshot } from '@/lib/doctor/snapshot';
import type { DoctorAction } from '@/modules/doctor/data';

type Context = { params: Promise<{ action: string }> };
type Client = Awaited<ReturnType<typeof createServerSupabase>>;
const actions: DoctorAction[] = ['confirm', 'check_in', 'start', 'complete', 'cancel', 'no_show', 'save_note', 'reschedule'];
const slotFields = 'id,doctor_id,slot_date,start_time,end_time,is_booked,created_at';
async function identity(client: Client) {
  const state = await readIdentity(client);
  if (state.needsMfa) throw new AuthHttpError(403, 'Vui lòng hoàn tất MFA.', undefined, 'mfa_required');
  if (!state.user) throw new AuthHttpError(401, 'Vui lòng đăng nhập lại.');
  if (state.user.role !== 'doctor') throw new AuthHttpError(403, 'Chức năng chỉ dành cho bác sĩ.');
  const { data, error } = await client.from('doctors').select('*').eq('profile_id', state.user.id).eq('is_active', true).single();
  databaseError(error);
  if (!data) throw new AuthHttpError(403, 'Tài khoản bác sĩ chưa hoạt động.');
  return { user: state.user, doctor: data };
}
function id(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{0,18}$/.test(value) && (value.length < 19 || value <= '9223372036854775807');
}
function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export async function GET(request: Request, context: Context) {
  try {
    const { action } = await context.params;
    const client = await createServerSupabase(true);
    const { user, doctor } = await identity(client);
    if (action === 'history') {
      const appointmentId = new URL(request.url).searchParams.get('appointmentId');
      if (!id(appointmentId)) throw new AuthHttpError(400, 'Mã lịch hẹn không hợp lệ.');
      const { data: appointment, error: appointmentError } = await client.from('appointments').select('id')
        .eq('doctor_id', doctor.id).eq('id', appointmentId).single();
      databaseError(appointmentError);
      if (!appointment) throw new AuthHttpError(404, 'Không tìm thấy lịch hẹn của bạn.');
      const { data, error } = await client.from('appointment_events').select('*')
        .eq('doctor_id', doctor.id).eq('appointment_id', appointmentId).order('id', { ascending: false }).limit(100);
      databaseError(error);
      return json({ events: normalize(data || []) });
    }
    if (action !== 'snapshot') return json({ message: 'Không tìm thấy.' }, 404);
    return json(await loadDoctorSnapshot(client, user, doctor));
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const { action } = await context.params;
    const client = await createServerSupabase(true);
    const { user, doctor } = await identity(client);
    if (action === 'appointment') {
      const body = await readBody(request, ['appointmentId', 'action', 'expectedUpdatedAt', 'note', 'reason', 'slotId'], 65_536);
      if (!id(body.appointmentId) || !actions.includes(body.action as DoctorAction) ||
        typeof body.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(body.expectedUpdatedAt)) ||
        (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 10_000)) ||
        (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 1000)) ||
        (body.slotId !== undefined && !id(body.slotId))) throw new AuthHttpError(400, 'Thông tin xử lý lịch hẹn không hợp lệ.');
      const { data, error } = await client.rpc('doctor_manage_appointment', {
        p_appointment_id: body.appointmentId, p_action: body.action, p_expected_updated_at: body.expectedUpdatedAt,
        p_note: body.note ?? null, p_reason: body.reason ?? null, p_slot_id: body.slotId ?? null,
      });
      databaseError(error);
      return json({ appointment: normalize(data) });
    }
    if (action === 'slots') {
      const body = await readBody(request, ['slots']);
      if (!Array.isArray(body.slots) || !body.slots.length || body.slots.length > 40) throw new AuthHttpError(400, 'Mỗi lần tạo từ 1 đến 40 khung giờ.');
      const slots = body.slots.map((value: unknown) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AuthHttpError(400, 'Khung giờ không hợp lệ.');
        const row = value as Record<string, unknown>;
        if (Object.keys(row).some(key => !['slot_date', 'start_time', 'end_time'].includes(key)) ||
          !validDate(row.slot_date) || typeof row.start_time !== 'string' || typeof row.end_time !== 'string' ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.start_time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.end_time) ||
          row.end_time <= row.start_time || Date.parse(row.slot_date + 'T' + row.start_time + ':00+07:00') <= Date.now()) {
          throw new AuthHttpError(400, 'Khung giờ phải hợp lệ, kết thúc sau bắt đầu và nằm trong tương lai.');
        }
        return { doctor_id: doctor.id, slot_date: row.slot_date, start_time: row.start_time, end_time: row.end_time, is_booked: false };
      }).sort((a, b) => (a.slot_date + a.start_time).localeCompare(b.slot_date + b.start_time));
      if (slots.some((slot, index) => index > 0 && slot.slot_date === slots[index - 1].slot_date && slot.start_time < slots[index - 1].end_time)) {
        throw new AuthHttpError(400, 'Các khung giờ trong lần tạo này bị trùng hoặc chồng lấn.');
      }
      const { data, error } = await client.from('time_slots').insert(slots).select(slotFields);
      databaseError(error);
      return json({ message: 'Đã tạo ' + slots.length + ' khung giờ.', slots: normalize(data || []) });
    }
    if (action === 'delete-slot') {
      const body = await readBody(request, ['slotId']);
      if (!id(body.slotId)) throw new AuthHttpError(400, 'Mã khung giờ không hợp lệ.');
      const { data, error } = await client.from('time_slots').delete().eq('id', body.slotId).eq('doctor_id', doctor.id).select('id');
      databaseError(error);
      if (!data?.length) throw new AuthHttpError(404, 'Không tìm thấy khung giờ của bạn.');
      return json({ message: 'Đã xóa khung giờ.' });
    }
    if (action === 'profile') {
      const body = await readBody(request, ['full_name', 'phone', 'date_of_birth', 'gender', 'address', 'avatar_url']);
      if (typeof body.full_name !== 'string' || body.full_name.trim().length < 2 || body.full_name.length > 100 ||
        typeof body.phone !== 'string' || (body.phone && !/^0\d{9}$/.test(body.phone)) ||
        !['', 'male', 'female', 'other'].includes(String(body.gender)) ||
        typeof body.address !== 'string' || body.address.length > 500 ||
        typeof body.avatar_url !== 'string' || body.avatar_url.length > 2048 ||
        (body.avatar_url && !/^https:\/\/[^\s]+$/.test(body.avatar_url)) ||
        (body.date_of_birth !== '' && (!validDate(body.date_of_birth) || body.date_of_birth < '1900-01-01' || Date.parse(body.date_of_birth) > Date.now()))) {
        throw new AuthHttpError(400, 'Kiểm tra họ tên, điện thoại, ngày sinh và liên kết ảnh HTTPS.');
      }
      const { data, error } = await client.from('profiles').update({ ...body, full_name: body.full_name.trim(), phone: body.phone || null, date_of_birth: body.date_of_birth || null, gender: body.gender || null, address: body.address || null, avatar_url: body.avatar_url || null }).eq('id', user.id).select('*').single();
      databaseError(error);
      return json({ profile: normalize(data), message: 'Đã lưu hồ sơ.' });
    }
    if (action === 'professional') {
      const body = await readBody(request, ['bio', 'room', 'consultation_fee']);
      if (typeof body.bio !== 'string' || body.bio.length > 4000 || typeof body.room !== 'string' || body.room.length > 100 ||
        (body.consultation_fee !== null && (typeof body.consultation_fee !== 'number' || !Number.isSafeInteger(body.consultation_fee) ||
          body.consultation_fee < 0 || body.consultation_fee > 999_999_999_999))) {
        throw new AuthHttpError(400, 'Giới thiệu tối đa 4000 ký tự; phòng tối đa 100 ký tự; giá khám là số nguyên không âm.');
      }
      const { data, error } = await client.from('doctors').update(body).eq('id', doctor.id).eq('profile_id', user.id).select('*').single();
      databaseError(error);
      return json({ doctor: normalize(data), message: 'Đã lưu thông tin chuyên môn.' });
    }
    return json({ message: 'Không tìm thấy.' }, 404);
  } catch (error) { return errorResponse(error); }
}
