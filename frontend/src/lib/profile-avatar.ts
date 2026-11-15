import 'server-only';
import sharp from 'sharp';
import { AuthHttpError } from '@/lib/auth/http';
import { AVATAR_TYPES, MAX_AVATAR_BYTES } from '@/lib/profile';

export async function readAvatar(request: Request) {
  if (!AVATAR_TYPES.includes(request.headers.get('content-type')?.split(';')[0] || '')) throw new AuthHttpError(415, 'Chỉ nhận ảnh JPG, PNG hoặc WebP.');
  if (Number(request.headers.get('content-length') || 0) > MAX_AVATAR_BYTES) throw new AuthHttpError(413, 'Ảnh tối đa 5 MB.');
  const reader = request.body?.getReader();
  if (!reader) throw new AuthHttpError(400, 'Chưa có ảnh được chọn.');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > MAX_AVATAR_BYTES) { await reader.cancel(); throw new AuthHttpError(413, 'Ảnh tối đa 5 MB.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (!length) throw new AuthHttpError(400, 'Ảnh trống hoặc không đọc được.');
  try {
    const image = sharp(Buffer.concat(chunks), { limitInputPixels: 25_000_000, failOn: 'error' });
    const meta = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(meta.format || '') || (meta.pages || 1) > 1) throw new Error('Unsupported image');
    return await image.rotate().resize(512, 512, { fit: 'cover', position: 'centre', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch { throw new AuthHttpError(400, 'Ảnh không hợp lệ. Chọn JPG, PNG hoặc WebP tĩnh, tối đa 25 triệu điểm ảnh.'); }
}
export function avatarStorageError(error: { message?: string; statusCode?: string } | null) {
  if (!error) return;
  if (error.statusCode === '404' || /bucket not found/i.test(error.message || '')) throw new AuthHttpError(503, 'Kho ảnh chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
  if (error.statusCode === '403' || /row.level security|unauthorized/i.test(error.message || '')) throw new AuthHttpError(403, 'Không có quyền lưu ảnh. Vui lòng liên hệ quản trị viên kiểm tra kho ảnh.');
  throw new AuthHttpError(503, 'Không lưu được ảnh lúc này. Hồ sơ cũ vẫn được giữ nguyên.');
}
