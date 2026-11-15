import { assertSameOrigin, AuthHttpError, errorResponse, json, readBody } from '@/lib/auth/http';
import { normalizeProfile, PERSONAL_KEYS, PROFILE_COLUMNS, profileErrors } from '@/lib/profile';
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
    const body = await readBody(request, PERSONAL_KEYS);
    const fields = profileErrors(body);
    if (Object.keys(fields).length) return json({ message: 'Kiểm tra lại thông tin được đánh dấu.', fields }, 400);
    if (typeof body.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) throw new AuthHttpError(400, 'Thiếu phiên bản hồ sơ. Vui lòng tải lại trang.');
    const { data, error } = await client.from('profiles').update({
      full_name: String(body.full_name).trim(), phone: String(body.phone).trim() || null,
      date_of_birth: body.date_of_birth || null, gender: body.gender || null, address: String(body.address).trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id).eq('updated_at', body.expectedUpdatedAt).select(PROFILE_COLUMNS).single();
    profileDatabaseError(error);
    if (!data) throw new AuthHttpError(409, 'Hồ sơ đã thay đổi. Vui lòng tải lại trước khi lưu.');
    return json({ profile: normalizeProfile(data), message: 'Đã lưu thông tin cá nhân.' });
  } catch (error) { return errorResponse(error); }
}
