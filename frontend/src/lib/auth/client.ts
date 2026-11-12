'use client';
import type { AuthUser } from '@/types/auth';

export class AuthRequestError extends Error {
  constructor(message: string, public status: number, public retryAfter = 0) {
    super(message); this.name = 'AuthRequestError';
  }
}

function retrySeconds(header: string | null) {
  if (!header) return 60;
  const seconds = Number(header);
  const delay = Number.isFinite(seconds) ? seconds : (Date.parse(header) - Date.now()) / 1000;
  return Number.isFinite(delay) ? Math.max(1, Math.ceil(delay)) : 60;
}

export async function authRequest(action: string, body: unknown) {
  let response: Response;
  try { response = await fetch('/api/auth/' + action, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }); } catch { throw new Error('Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.'); }
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.');
  if (!response.ok) throw new AuthRequestError(
    typeof data.message === 'string' ? data.message : 'Không thể thực hiện yêu cầu. Vui lòng thử lại.',
    response.status, response.status === 429 ? retrySeconds(response.headers.get('retry-after')) : 0,
  );
  return data as { message?: string; redirect?: string; user?: AuthUser; url?: string; id?: string; qrCode?: string; secret?: string; recoveryFactors?: { id: string; friendlyName?: string }[] };
}

export async function logout() {
  try {
    await authRequest('logout', {});
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('cliniccare-auth');
      channel.postMessage('signed-out'); channel.close();
    }
    window.location.replace('/login');
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Không thể đăng xuất. Vui lòng thử lại.');
  }
}
