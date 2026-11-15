import { randomUUID } from 'node:crypto';
import { assertSameOrigin, AuthHttpError, errorResponse, json } from '@/lib/auth/http';
import { AVATAR_BUCKET, avatarPath, normalizeProfile, PROFILE_COLUMNS } from '@/lib/profile';
import { ownProfile, profileDatabaseError, profileSession } from '@/lib/profile-server';
import { avatarStorageError, readAvatar } from '@/lib/profile-avatar';

async function change(request: Request, remove: boolean) {
  try {
    assertSameOrigin(request);
    const { client, user } = await profileSession();
    const previous = await ownProfile(client, user.id);
    const storage = client.storage.from(AVATAR_BUCKET);
    let uploaded: string | null = null;
    if (!remove) {
      const bytes = await readAvatar(request);
      uploaded = user.id + '/' + randomUUID() + '.webp';
      const result = await storage.upload(uploaded, bytes, { contentType: 'image/webp', cacheControl: '0', upsert: false });
      avatarStorageError(result.error);
    }
    let result;
    try {
      result = await client.from('profiles').update({ avatar_url: uploaded ? '/api/profile/avatar/' + uploaded : null, updated_at: new Date().toISOString() })
        .eq('id', user.id).eq('updated_at', previous.updated_at).select(PROFILE_COLUMNS).single();
    } catch {
      // The write may have committed; retaining the new object avoids a broken profile image.
      throw new AuthHttpError(503, 'Chưa xác nhận được ảnh đã lưu. Tải lại hồ sơ trước khi thử lại.');
    }
    if (result.error || !result.data) {
      if (uploaded && ['PGRST116', '42501', '23514', '22P02', '22023'].includes(result.error?.code || '')) await storage.remove([uploaded]).catch(() => {});
      profileDatabaseError(result.error);
      throw new AuthHttpError(409, 'Hồ sơ vừa thay đổi. Tải lại trước khi cập nhật ảnh.');
    }
    const old = avatarPath(previous.avatar_url, user.id);
    if (old && old !== uploaded) await storage.remove([old]).catch(() => {});
    return json({ profile: normalizeProfile(result.data), message: remove ? 'Đã gỡ ảnh đại diện.' : 'Đã lưu ảnh đại diện.' });
  } catch (error) { return errorResponse(error); }
}
export function POST(request: Request) { return change(request, false); }
export function DELETE(request: Request) { return change(request, true); }
