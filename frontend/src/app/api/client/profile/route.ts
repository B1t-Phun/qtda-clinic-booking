import { createServerSupabase, readIdentity } from '@/lib/auth/server';
import { assertSameOrigin, AuthHttpError, errorResponse, json, readBody } from '@/lib/auth/http';

const PROFILE_FIELDS = 'id,email,full_name,phone,role,date_of_birth,gender,address,avatar_url,created_at,updated_at';
const GENDERS = ['', 'male', 'female', 'other'];

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) &&
    new Date(value + 'T00:00:00.000Z').toISOString().slice(0, 10) === value;
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readBody(request, ['full_name', 'phone', 'date_of_birth', 'gender', 'address', 'avatar_url']);
    const client = await createServerSupabase(true);
    const state = await readIdentity(client);
    if (state.needsMfa) throw new AuthHttpError(403, 'Vui lòng hoàn tất xác thực hai bước.');
    if (!state.user) throw new AuthHttpError(401, 'Vui lòng đăng nhập lại.');
    if (state.user.role !== 'patient') throw new AuthHttpError(403, 'Chức năng này chỉ dành cho bệnh nhân.');

    const { full_name, phone, date_of_birth, gender, address, avatar_url } = body;
    const todayParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const todayValues = Object.fromEntries(todayParts.map(({ type, value }) => [type, value]));
    const today = `${todayValues.year}-${todayValues.month}-${todayValues.day}`;
    if (typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.trim().length > 100 ||
      typeof phone !== 'string' || (phone !== '' && !/^0\d{9}$/.test(phone)) ||
      typeof date_of_birth !== 'string' || (date_of_birth !== '' && (!validDate(date_of_birth) || date_of_birth < '1900-01-01' || date_of_birth > today)) ||
      typeof gender !== 'string' || !GENDERS.includes(gender) ||
      typeof address !== 'string' || address.length > 500 ||
      typeof avatar_url !== 'string' || avatar_url.length > 2048 || (avatar_url !== '' && !/^https:\/\/[^\s]+$/.test(avatar_url))) {
      throw new AuthHttpError(400, 'Kiểm tra lại họ tên, điện thoại, ngày sinh, giới tính, địa chỉ và liên kết ảnh.');
    }

    const { data, error } = await client.from('profiles').update({
      full_name: full_name.trim(), phone: phone || null, date_of_birth: date_of_birth || null,
      gender: gender || null, address: address.trim() || null, avatar_url: avatar_url || null,
    }).eq('id', state.user.id).select(PROFILE_FIELDS).single();
    if (error) {
      if (error.code === '42501') throw new AuthHttpError(403, 'Bạn không có quyền cập nhật hồ sơ này.');
      if (error.code === 'PGRST116') throw new AuthHttpError(404, 'Không tìm thấy hồ sơ bệnh nhân.');
      throw error;
    }
    return json({ profile: data });
  } catch (error) { return errorResponse(error); }
}
