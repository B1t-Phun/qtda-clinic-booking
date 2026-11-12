import 'server-only';
import { createHash } from 'node:crypto';
import { AuthHttpError } from './http';

// SHA-1 is only for the HIBP range query, never for storing passwords.
// Only five hash characters leave the server; suffix comparison stays local.
export async function assertPasswordNotLeaked(password: string) {
  const hash = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  let response: Response;
  let text: string;
  try {
    response = await fetch('https://api.pwnedpasswords.com/range/' + hash.slice(0, 5), {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'ClinicCare-Password-Security' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Password check unavailable');
    text = await response.text();
    if (text.length > 512 * 1024) throw new Error('Unexpected range response');
  } catch {
    throw new AuthHttpError(503, 'Chưa thể kiểm tra độ an toàn của mật khẩu. Vui lòng thử lại sau.');
  }
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length || lines.some(line => !/^[A-F0-9]{35}:\d+$/i.test(line))) {
    throw new AuthHttpError(503, 'Chưa thể kiểm tra độ an toàn của mật khẩu. Vui lòng thử lại sau.');
  }
  const suffix = hash.slice(5);
  if (lines.some(line => {
    const [candidate, count] = line.split(':');
    return candidate.toUpperCase() === suffix && Number(count) > 0;
  })) throw new AuthHttpError(400, 'Mật khẩu này đã xuất hiện trong dữ liệu rò rỉ. Vui lòng chọn mật khẩu khác.');
}
