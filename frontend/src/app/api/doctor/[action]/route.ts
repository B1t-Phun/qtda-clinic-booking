import { createServerSupabase, readIdentity } from '@/lib/auth/server';
import { assertSameOrigin, AuthHttpError, errorResponse, json, readBody } from '@/lib/auth/http';
import { databaseError, normalize, loadDoctorSnapshot } from '@/lib/doctor/snapshot';
import type { DoctorAction } from '@/modules/doctor/data';

type Context = { params: Promise<{ action: string }> };
type Client = Awaited<ReturnType<typeof createServerSupabase>>;
const actions: DoctorAction[] = ['confirm','check_in','start','complete','cancel','no_show','save_note','reschedule'];
async function identity(client: Client) {
  const state = await readIdentity(client);
  if (state.needsMfa) throw new AuthHttpError(403, 'Vui lòng hoàn tất MFA.');
  if (!state.user) throw new AuthHttpError(401, 'Vui lòng đăng nhập lại.');
  if (state.user.role !== 'doctor') throw new AuthHttpError(403, 'Chức năng chỉ dành cho bác sĩ.');
  const { data, error } = await client.from('doctors').select('*').eq('profile_id', state.user.id).eq('is_active', true).single();
  databaseError(error);
  if (!data) throw new AuthHttpError(403, 'Tài khoản bác sĩ chưa hoạt động.');
  return { user: state.user, doctor: data };
}
function id(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{0,15}$/.test(value);
}
export async function GET(request: Request, context: Context) {
  try {
    const { action } = await context.params;
    const client = await createServerSupabase(true);
    const { user, doctor } = await identity(client);
    if (action === 'history') {
      const appointmentId = new URL(request.url).searchParams.get('appointmentId');
      if (!id(appointmentId)) throw new AuthHttpError(400, 'Mã lịch hẹn không hợp lệ.');
      const { data, error } = await client.from('appointment_events').select('*')
        .eq('doctor_id', doctor.id).eq('appointment_id', appointmentId).order('id', { ascending:false }).limit(100);
      databaseError(error);
      return json({ events: normalize(data || []) });
    }
    if (action !== 'snapshot') return json({ message: 'Không tìm thấy.' },404);
    return json(await loadDoctorSnapshot(client, user, doctor));
  } catch(error) { return errorResponse(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const { action } = await context.params;
    const client = await createServerSupabase(true);
    const { user, doctor } = await identity(client);
    if (action === 'appointment') {
      const body=await readBody(request,['appointmentId','action','expectedUpdatedAt','note','reason','slotId'],65536);
      if (!id(body.appointmentId) || !actions.includes(body.action as DoctorAction) ||
          typeof body.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(body.expectedUpdatedAt)) ||
          (body.note !== undefined && (typeof body.note !== 'string' || body.note.length>10000)) ||
          (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length>1000)) ||
          (body.slotId !== undefined && !id(body.slotId))) throw new AuthHttpError(400,'Thông tin xử lý lịch hẹn không hợp lệ.');
      const { data,error }=await client.rpc('doctor_manage_appointment',{
        p_appointment_id:body.appointmentId,p_action:body.action,p_expected_updated_at:body.expectedUpdatedAt,
        p_note:body.note ?? null,p_reason:body.reason ?? null,p_slot_id:body.slotId ?? null,
      });
      databaseError(error);
      return json({ appointment:normalize(data) });
    }
    if (action === 'slots') {
      const body=await readBody(request,['slots']);
      if (!Array.isArray(body.slots) || !body.slots.length || body.slots.length>40) throw new AuthHttpError(400,'Mỗi lần tạo từ 1 đến 40 khung giờ.');
      const slots=body.slots.map((value: unknown) => {
        if (!value || typeof value!=='object' || Array.isArray(value)) throw new AuthHttpError(400,'Khung giờ không hợp lệ.');
        const row=value as Record<string,unknown>;
        if (Object.keys(row).some(key=>!['slot_date','start_time','end_time'].includes(key)) ||
          typeof row.slot_date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.slot_date) ||
          !Number.isFinite(Date.parse(row.slot_date)) || new Date(row.slot_date).toISOString().slice(0,10)!==row.slot_date ||
          typeof row.start_time!=='string' || typeof row.end_time!=='string' ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.start_time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.end_time) ||
          row.end_time<=row.start_time || new Date(row.slot_date+'T'+row.start_time+':00+07:00').getTime()<=Date.now())
          throw new AuthHttpError(400,'Khung giờ phải hợp lệ, kết thúc sau bắt đầu và nằm trong tương lai.');
        return { doctor_id:doctor.id,slot_date:row.slot_date,start_time:row.start_time,end_time:row.end_time,is_booked:false };
      });
      const { error }=await client.from('time_slots').insert(slots); databaseError(error);
      return json({ message:'Đã tạo '+slots.length+' khung giờ.' });
    }
    if (action === 'delete-slot') {
      const body=await readBody(request,['slotId']);
      if (!id(body.slotId)) throw new AuthHttpError(400,'Mã khung giờ không hợp lệ.');
      const { data,error }=await client.from('time_slots').delete().eq('id',body.slotId).eq('doctor_id',doctor.id).select('id');
      databaseError(error);
      if (!data?.length) throw new AuthHttpError(404,'Không tìm thấy khung giờ của bạn.');
      return json({ message:'Đã xóa khung giờ.' });
    }
    if (action === 'profile') {
      const body=await readBody(request,['full_name','phone','date_of_birth','gender','address','avatar_url']);
      if (typeof body.full_name!=='string' || body.full_name.trim().length<2 || body.full_name.length>100 ||
        typeof body.phone!=='string' || (body.phone && !/^0\d{9}$/.test(body.phone)) ||
        !['male','female','other'].includes(String(body.gender)) ||
        typeof body.address!=='string' || body.address.length>500 ||
        typeof body.avatar_url!=='string' || body.avatar_url.length>2048 ||
        (body.avatar_url && !/^https:\/\/[^\s]+$/.test(body.avatar_url)))
        throw new AuthHttpError(400,'Kiểm tra họ tên, điện thoại, địa chỉ và URL ảnh HTTPS.');
      const dob=body.date_of_birth;
      if (dob && (typeof dob!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob) || !Number.isFinite(Date.parse(dob)) ||
          new Date(dob).toISOString().slice(0,10)!==dob || dob>'2099-01-01' || new Date(dob).getTime()>Date.now()))
        throw new AuthHttpError(400,'Ngày sinh không hợp lệ.');
      const { error }=await client.from('profiles').update({...body,full_name:body.full_name.trim(),date_of_birth:dob || null}).eq('id',user.id);
      databaseError(error);
      return json({ message:'Đã lưu hồ sơ.' });
    }
    return json({message:'Không tìm thấy.'},404);
  } catch(error) { return errorResponse(error); }
}
