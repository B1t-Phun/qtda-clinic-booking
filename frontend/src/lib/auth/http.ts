import 'server-only';
import { NextResponse } from 'next/server';

export class AuthHttpError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) { super(message); }
}

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export function errorResponse(error: unknown) {
  if (error instanceof AuthHttpError) {
    const response = json({ message: error.message }, error.status);
    if (error.status === 429) response.headers.set('Retry-After', String(error.retryAfter || 60));
    return response;
  }
  return json({ message: 'Dịch vụ xác thực tạm thời không khả dụng. Vui lòng thử lại sau.' }, 503);
}

export function appOrigin(request: Request) {
  const configured = process.env.APP_URL;
  if (!configured && process.env.NODE_ENV === 'production') throw new Error('APP_URL is required');
  return new URL(configured || request.url).origin;
}

export function assertSameOrigin(request: Request) {
  if (request.headers.get('origin') !== appOrigin(request) ||
      request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new AuthHttpError(403, 'Yêu cầu không hợp lệ.');
  }
}

export async function readBody(request: Request, keys: readonly string[]) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw new AuthHttpError(415, 'Chỉ chấp nhận dữ liệu JSON.');
  }
  if (Number(request.headers.get('content-length') || 0) > 8192) throw new AuthHttpError(413, 'Dữ liệu quá lớn.');
  // Bound streamed requests too, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new AuthHttpError(400, 'Dữ liệu không hợp lệ.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    length += item.value.byteLength;
    if (length > 8192) { await reader.cancel(); throw new AuthHttpError(413, 'Dữ liệu quá lớn.'); }
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
