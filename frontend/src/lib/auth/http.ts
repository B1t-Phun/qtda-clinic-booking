import 'server-only';
import { NextResponse } from 'next/server';

export class AuthHttpError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number, public code?: string) { super(message); }
}

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export function errorResponse(error: unknown) {
  if (error instanceof AuthHttpError) {
    const response = json({ message: error.message, ...(error.code ? { code: error.code } : {}) }, error.status);
    if (error.status === 429) response.headers.set('Retry-After', String(error.retryAfter || 60));
    return response;
  }
  return json({ message: 'Dịch vụ xác thực tạm thời không khả dụng. Vui lòng thử lại sau.' }, 503);
}

function isLoopback(url: URL) {
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password &&
    (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.localhost'));
}

function sameLocalOrigin(left: URL, right: URL) {
  return isLoopback(left) && isLoopback(right) && left.protocol === right.protocol && left.port === right.port;
}

export function appOrigin(request: Request) {
  const configured = process.env.APP_URL;
  if (!configured && process.env.NODE_ENV === 'production') throw new Error('APP_URL is required');
  const expected = new URL(configured || request.url);
  // In development, retain the browser local alias after it passes the loopback check.
  if (process.env.NODE_ENV === 'development' && isLoopback(expected)) {
    const browserOrigin = request.headers.get('origin');
    if (browserOrigin) {
      try {
        const browser = new URL(browserOrigin);
        if (sameLocalOrigin(browser, expected)) return browser.origin;
      } catch { /* Keep configured origin. */ }
    }
  }
  return expected.origin;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  let accepted = origin === appOrigin(request);
  if (!accepted && process.env.NODE_ENV === 'development' && origin) {
    try { accepted = sameLocalOrigin(new URL(origin), new URL(process.env.APP_URL || request.url)); }
    catch { accepted = false; }
  }
  if (!accepted || request.headers.get('sec-fetch-site') === 'cross-site') throw new AuthHttpError(403, 'Địa chỉ truy cập không khớp cấu hình ứng dụng. Tải lại trang từ địa chỉ đang chạy rồi thử lại.', undefined, 'origin_mismatch');
}
export async function readBody(request: Request, keys: readonly string[], maxBytes = 8192) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw new AuthHttpError(415, 'Chỉ chấp nhận dữ liệu JSON.');
  }
  if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new AuthHttpError(413, 'Dữ liệu quá lớn.');
  // Bound streamed requests too, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new AuthHttpError(400, 'Dữ liệu không hợp lệ.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    length += item.value.byteLength;
    if (length > maxBytes) { await reader.cancel(); throw new AuthHttpError(413, 'Dữ liệu quá lớn.'); }
    chunks.push(item.value);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new AuthHttpError(400, 'Dữ liệu không hợp lệ.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some((key) => !keys.includes(key))) {
    throw new AuthHttpError(400, 'Dữ liệu không hợp lệ.');
  }
  return body as Record<string, unknown>;
}

export function checkAuthError(error: { status?: number; code?: string } | null, fallback: string, status = 400) {
  if (!error) return;
  if (error.status === 429 || error.code?.includes('rate_limit')) {
    throw new AuthHttpError(429, 'Quá nhiều yêu cầu. Vui lòng chờ và thử lại sau.', 60);
  }
  if (error.code === 'captcha_failed') throw new AuthHttpError(400, 'CAPTCHA không hợp lệ hoặc đã hết hạn. Vui lòng xác minh lại.');
  if (error.code === 'weak_password') throw new AuthHttpError(400, 'Mật khẩu quá yếu hoặc đã bị rò rỉ. Vui lòng chọn mật khẩu khác.');
  if ((error.status || 0) >= 500) throw new Error('Auth service unavailable');
  throw new AuthHttpError(status, fallback);
}

export function captchaToken(body: Record<string, unknown>) {
  const token = body.captchaToken;
  if (token !== undefined && (typeof token !== 'string' || token.length > 8192)) {
    throw new AuthHttpError(400, 'CAPTCHA không hợp lệ.');
  }
  if (process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY && !token) {
    throw new AuthHttpError(400, 'Vui lòng hoàn thành CAPTCHA.');
  }
  return token as string | undefined;
}
