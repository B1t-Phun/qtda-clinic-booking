import { assertSameOrigin, AuthHttpError, errorResponse, json, readBody } from '@/lib/auth/http';
import { normalizeProfile, PROFILE_COLUMNS, profileErrors } from '@/lib/profile';
import { ownProfile, profileDatabaseError, profileSession } from '@/lib/profile-server';

export async function GET() {
  try {
    const { client, user } = await profileSession();
    return json({ profile: await ownProfile(client, user.id) });
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const { client, user } = await profileSession();
    const body = await readBody(request, ['full_name', 'phone', 'date_of_birth', 'gender', 'address', 'expectedUpdatedAt']);
    const fields = profileErrors(body);
    if (Object.keys(fields).length) return json({ message: 'Kiểm tra các thông tin được đánh dấu.', fields }, 400);
    if (typeof body.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) throw new AuthHttpError(400, 'Thiếu phiên bản hồ sơ. Tải lại trang rồi thử lại.');
    const { data, error } = await client.from('profiles').update({
      full_name: String(body.full_name).trim(), phone: String(body.phone).trim() || null, gender: body.gender || null,
      date_of_birth: body.date_of_birth || null, address: String(body.address).trim() || null, updated_at: new Date().toISOString(),
    }).eq('id', user.id).eq('updated_at', body.expectedUpdatedAt).select(PROFILE_COLUMNS).single();
    profileDatabaseError(error);
    if (!data) throw new AuthHttpError(409, 'Hồ sơ vừa thay đổi. Tải lại trước khi lưu.');
    return json({ profile: normalizeProfile(data), message: 'Đã lưu thông tin cá nhân.' });
  } catch (error) { return errorResponse(error); }
}
