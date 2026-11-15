import { createServerSupabase, readIdentity } from '@/lib/auth/server';
import { AuthHttpError, errorResponse } from '@/lib/auth/http';
import { AVATAR_BUCKET, avatarPath } from '@/lib/profile';

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const object = avatarPath('/api/profile/avatar/' + path.join('/'));
    if (path.length !== 2 || !object) throw new AuthHttpError(404, 'Không tìm thấy ảnh.');
    const client = await createServerSupabase(true);
    const { user, needsMfa } = await readIdentity(client);
    if (needsMfa) throw new AuthHttpError(403, 'Vui lòng hoàn tất xác thực hai bước.');
    if (!user) throw new AuthHttpError(401, 'Vui lòng đăng nhập.');
    const { data, error } = await client.storage.from(AVATAR_BUCKET).download(object);
    if (error || !data) throw new AuthHttpError(404, 'Không tìm thấy ảnh hoặc bạn không có quyền xem.');
    return new Response(data, { headers: { 'Content-Type': 'image/webp', 'Content-Length': String(data.size),
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
  } catch (error) { return errorResponse(error); }
}
