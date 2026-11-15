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
    const avatar = uploaded ? '/api/profile/avatar/' + uploaded : null;
    const update = client.from('profiles').update({ avatar_url: avatar, updated_at: new Date().toISOString() })
      .eq('id', user.id).eq('updated_at', previous.updated_at).select(PROFILE_COLUMNS).single();
    let result;
    try { result = await update; }
    catch {
      // The profile write may have committed before the connection failed. Keep the image until its state is known.
      throw new AuthHttpError(503, 'Chưa xác nhận được ảnh đã lưu. Tải lại hồ sơ trước khi thử lại.');
    }
    if (result.error || !result.data) {
      if (uploaded) await storage.remove([uploaded]).catch(() => {});
      profileDatabaseError(result.error);
      throw new AuthHttpError(409, 'Hồ sơ đã thay đổi. Tải lại trước khi cập nhật ảnh.');
    }
    const old = avatarPath(previous.avatar_url, user.id);
    // Remove only a file owned by this user, after the profile update succeeds.
    if (old && old !== uploaded) await storage.remove([old]).catch(() => {});
    return json({ profile: normalizeProfile(result.data), message: remove ? 'Đã gỡ ảnh đại diện.' : 'Đã cập nhật ảnh đại diện.' });
  } catch (error) { return errorResponse(error); }
}
export function POST(request: Request) { return change(request, false); }
export function DELETE(request: Request) { return change(request, true); }
