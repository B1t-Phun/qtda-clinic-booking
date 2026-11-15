import 'server-only';
import { createServerSupabase, readIdentity } from '@/lib/auth/server';
import { AuthHttpError } from '@/lib/auth/http';
import { normalizeProfile, PROFILE_COLUMNS } from '@/lib/profile';
import type { PersonalProfile } from '@/lib/profile';

export async function profileSession() {
  const client = await createServerSupabase(true);
  const { user, needsMfa } = await readIdentity(client);
  if (needsMfa) throw new AuthHttpError(403, 'Vui lòng hoàn tất xác thực hai bước.', undefined, 'mfa_required');
  if (!user) throw new AuthHttpError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  if (!['doctor', 'patient'].includes(user.role)) throw new AuthHttpError(403, 'Trang hồ sơ này dành cho bác sĩ và bệnh nhân.');
  return { client, user };
}
export function profileDatabaseError(error: { code?: string } | null) {
  if (!error) return;
  if (['42501', 'PGRST301'].includes(error.code || '')) throw new AuthHttpError(403, 'Bạn không có quyền cập nhật hồ sơ này.');
  if (error.code === 'PGRST116') throw new AuthHttpError(409, 'Hồ sơ đã thay đổi. Vui lòng tải lại để kiểm tra trước khi lưu.');
  throw new AuthHttpError(503, 'Không thể kết nối hồ sơ lúc này. Vui lòng thử lại.');
}
export async function ownProfile(client: Awaited<ReturnType<typeof createServerSupabase>>, userId: string) {
  const { data, error } = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).single();
  profileDatabaseError(error);
  if (!data) throw new AuthHttpError(404, 'Không tìm thấy hồ sơ của bạn.');
  return normalizeProfile(data as PersonalProfile);
}
