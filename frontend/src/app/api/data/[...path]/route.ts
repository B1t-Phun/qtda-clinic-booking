import { createServerSupabase, readIdentity } from '@/lib/auth/server';
import { assertSameOrigin, AuthHttpError, errorResponse, json, readBody } from '@/lib/auth/http';

import { canAccessData } from '@/lib/auth/policy';

type Context = { params: Promise<{ path: string[] }> };
const tables = new Set(['profiles', 'specialties', 'doctors', 'time_slots', 'appointments']);

async function handle(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const table = path.length === 1 && tables.has(path[0]);
    const roleRpc = path.length === 2 && path[0] === 'rpc' && path[1] === 'admin_set_user_role';
    if (!table && !roleRpc) return json({ message: 'Không tìm thấy.' }, 404);
    const mutation = !['GET', 'HEAD'].includes(request.method);
    if (mutation) assertSameOrigin(request);
    if (roleRpc && request.method !== 'POST') throw new AuthHttpError(405, 'Phương thức không hợp lệ.');
    const client = await createServerSupabase(true);
    const { user, needsMfa } = await readIdentity(client);
    if (needsMfa) throw new AuthHttpError(403, 'Vui lòng hoàn tất xác thực MFA.');
    if (!user) throw new AuthHttpError(401, 'Vui lòng đăng nhập lại.');
    if (!canAccessData(user.role, path.join('/'), request.method)) throw new AuthHttpError(403, 'Bạn không có quyền thực hiện.');
    let body: BodyInit | null | undefined = mutation ? request.body : undefined;
    // Identity/role fields are never accepted through general profile updates, even for admins.
    // Role changes must use the separately authorized transactional RPC.
    const allowed = path[0] === 'profiles' && request.method === 'PATCH'
      ? ['full_name', 'phone', 'date_of_birth', 'gender', 'address', 'avatar_url', 'updated_at']
      : user.role === 'doctor' && path[0] === 'doctors' && request.method === 'PATCH'
        ? ['bio', 'room', 'consultation_fee']
        : user.role === 'patient' && path[0] === 'appointments'
          ? request.method === 'POST' ? ['patient_id', 'doctor_id', 'slot_id', 'reason', 'status'] : ['status', 'cancel_reason', 'updated_at']
          : user.role === 'doctor' && path[0] === 'appointments' && request.method === 'PATCH'
            ? ['status', 'doctor_note', 'cancel_reason'] : null;
    if (mutation && allowed) {
      const payload = await readBody(request, allowed);
      if (user.role === 'patient' && path[0] === 'appointments') {
        if (request.method === 'POST') {
          if ((payload.patient_id !== undefined && payload.patient_id !== user.id) ||
              (payload.status !== undefined && payload.status !== 'pending')) throw new AuthHttpError(403, 'Không thể đặt lịch cho tài khoản khác.');
          payload.patient_id = user.id;
          payload.status = 'pending';
        } else {
          if (payload.status !== 'cancelled') throw new AuthHttpError(403, 'Bệnh nhân chỉ được hủy lịch hẹn của mình.');
          payload.updated_at = new Date().toISOString();
        }
      }
      body = JSON.stringify(payload);
    }
    // This session has just been verified with getUser; it is used only to forward the user's JWT.
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new AuthHttpError(401, 'Vui lòng đăng nhập lại.');
    const url = new URL('/rest/v1/' + path.join('/'), process.env.NEXT_PUBLIC_SUPABASE_URL);
    url.search = new URL(request.url).search;
    const headers = new Headers({
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      Authorization: 'Bearer ' + session.access_token,
    });
    for (const name of ['content-type', 'prefer', 'accept', 'range', 'range-unit']) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    // No service key here: Postgres RLS applies to every existing data operation.
    const upstream = await fetch(url, {
      method: request.method, headers, body,
      ...(mutation ? { duplex: 'half' } : {}),
      cache: 'no-store', redirect: 'error',
    } as RequestInit);
    if (upstream.status >= 500) throw new Error('Data service unavailable');
    const outgoing = new Headers({ 'Cache-Control': 'private, no-store' });
    for (const name of ['content-type', 'content-range', 'range-unit', 'preference-applied']) {
      const value = upstream.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: outgoing });
  } catch (error) { return errorResponse(error); }
}

export { handle as GET, handle as HEAD, handle as POST, handle as PATCH, handle as DELETE };
