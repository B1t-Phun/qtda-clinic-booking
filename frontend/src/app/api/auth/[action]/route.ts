import { cookies } from 'next/headers';
import { assertPasswordNotLeaked } from '@/lib/auth/password-security';
import { createServerSupabase, readIdentity, verifiedUser, clearSessionCookies, cookieSecurity, authorizePasswordSession, persistAuthenticatedSession } from '@/lib/auth/server';
import { appOrigin, assertSameOrigin, AuthHttpError, checkAuthError, captchaToken, errorResponse, json, readBody } from '@/lib/auth/http';
import { REMEMBER_COOKIE } from '@/lib/auth/cookies';
import { PASSWORD_HINT, safeDestination, validEmail, validPassword, validTokenHash, validAuthCode } from '@/lib/auth/policy';

type Context = { params: Promise<{ action: string }> };
const INVALID_LOGIN = 'Không thể đăng nhập. Vui lòng kiểm tra email, mật khẩu và xác nhận tài khoản.';
const EMAIL_SENT = 'Nếu email phù hợp, bạn sẽ nhận được email hướng dẫn. Vui lòng kiểm tra hộp thư.';

export async function GET(_request: Request, context: Context) {
  try {
    const { action } = await context.params;
    if (action === 'providers') {
      const response = await fetch(new URL('/auth/v1/settings', process.env.NEXT_PUBLIC_SUPABASE_URL), {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! }, cache: 'no-store', signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return json({ providers: [] });
      const settings = await response.json();
      return json({ providers: ['google', 'facebook'].filter(provider => settings?.external?.[provider] === true) });
    }
    const client = await createServerSupabase(true);
    if (action === 'session') return json(await readIdentity(client));
    if (action === 'mfa') {
      const user = await verifiedUser(client);
      if (!user) throw new AuthHttpError(401, 'Vui lòng đăng nhập.');
      const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      checkAuthError(aalError, 'Không thể kiểm tra MFA.');
      const { data: factors, error } = await client.auth.mfa.listFactors();
      checkAuthError(error, 'Không thể tải thiết bị MFA.');
      return json({ currentLevel: aal?.currentLevel, nextLevel: aal?.nextLevel,
        factors: factors?.totp.map(({ id, friendly_name, status }) => ({ id, friendlyName: friendly_name, status })) || [] });
    }
    return json({ message: 'Không tìm thấy.' }, 404);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const { action } = await context.params;
    if (action === 'logout') {
      const client = await createServerSupabase(true);
      const { error } = await client.auth.signOut({ scope: 'global' });
      await clearSessionCookies();
      checkAuthError(error, 'Đã xóa phiên tại đây; chưa thể thu hồi các phiên khác.', 503);
      return json({ message: 'Đã đăng xuất.' });
    }
    if (action === 'login') {
      const body = await readBody(request, ['email', 'password', 'remember', 'next', 'captchaToken']);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!validEmail(email) || typeof body.password !== 'string' || !body.password || body.password.length > 128 ||
          (body.remember !== undefined && typeof body.remember !== 'boolean')) {
        throw new AuthHttpError(400, 'Email hoặc mật khẩu không hợp lệ.');
      }
      const remember = body.remember === true;
      const client = await createServerSupabase(true, false);
      const { error } = await client.auth.signInWithPassword({ email, password: body.password, options: { captchaToken: captchaToken(body) } });
      checkAuthError(error, INVALID_LOGIN, 401);
      await authorizePasswordSession(client);
      const state = await readIdentity(client);
      if (!state.user && !state.needsMfa) {
        await client.auth.signOut({ scope: 'local' });
        await clearSessionCookies();
        throw new AuthHttpError(401, INVALID_LOGIN);
      }
      (await cookies()).set(REMEMBER_COOKIE, remember ? '1' : '0', cookieSecurity);
      if (state.user) await persistAuthenticatedSession(state.user, remember);
      return json({ user: state.user, redirect: state.needsMfa
        ? '/auth/mfa?next=' + encodeURIComponent(typeof body.next === 'string' ? body.next.slice(0, 2048) : '')
        : safeDestination(body.next, state.user!.role) });
    }
    if (action === 'register') {
      const body = await readBody(request, ['fullName', 'email', 'phone', 'dateOfBirth', 'gender', 'password', 'confirmPassword', 'agree', 'captchaToken']);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const gender = body.gender === undefined ? 'other' : body.gender;
      if (!validEmail(email) || typeof body.fullName !== 'string' || body.fullName.trim().length < 2 ||
          body.fullName.length > 100 || /[\u0000-\u001f]/.test(body.fullName) ||
          typeof body.phone !== 'string' || !/^0\d{9}$/.test(body.phone) ||
          !['male', 'female', 'other'].includes(String(gender)) || body.agree !== true) {
        throw new AuthHttpError(400, 'Vui lòng kiểm tra họ tên, email, số điện thoại và điều khoản.');
      }
      if (!validPassword(body.password)) throw new AuthHttpError(400, PASSWORD_HINT);
      if (body.password !== body.confirmPassword) throw new AuthHttpError(400, 'Mật khẩu xác nhận không khớp.');
      const dob = body.dateOfBirth === undefined ? '' : body.dateOfBirth;
      if (dob !== '' && (typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob) ||
          !Number.isFinite(Date.parse(dob)) || new Date(dob).toISOString().slice(0, 10) !== dob ||
          dob > new Date().toISOString().slice(0, 10) || dob < '1900-01-01')) {
        throw new AuthHttpError(400, 'Ngày sinh không hợp lệ.');
      }
      const token = captchaToken(body);
      await assertPasswordNotLeaked(body.password);
      const client = await createServerSupabase(true);
      const { data, error } = await client.auth.signUp({
        email, password: body.password,
        options: { emailRedirectTo: appOrigin(request) + '/auth/callback',
          captchaToken: token,
          data: { full_name: body.fullName.trim(), phone: body.phone, date_of_birth: dob || null, gender },
        },
      });
      // Duplicate-account errors receive the same response as a new registration.
      if (error?.code !== 'user_already_exists' && error?.code !== 'email_exists') checkAuthError(error, 'Không thể đăng ký. Vui lòng thử lại sau.');
      // With email confirmation enabled there is no session yet. Signing out here
      // would remove the verifier required by the email callback.
      if (data?.session) await client.auth.signOut({ scope: 'local' });
      await clearSessionCookies({ preservePkce: !data?.session });
      return json({ message: EMAIL_SENT });
    }
    if (['forgot-password', 'resend', 'magic-link'].includes(action)) {
      const body = await readBody(request, ['email', 'captchaToken']);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!validEmail(email)) throw new AuthHttpError(400, 'Email không hợp lệ.');
      const client = await createServerSupabase(true);
      const token = captchaToken(body);
      let error;
      if (action === 'forgot-password') {
        ({ error } = await client.auth.resetPasswordForEmail(email, { redirectTo: appOrigin(request) + '/reset-password', captchaToken: token }));
      } else if (action === 'resend') {
        ({ error } = await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: appOrigin(request) + '/auth/callback', captchaToken: token } }));
      } else {
        ({ error } = await client.auth.signInWithOtp({ email, options: {
          shouldCreateUser: false, emailRedirectTo: appOrigin(request) + '/auth/callback', captchaToken: token,
        } }));
      }
      if (error?.status === 429 || error?.code?.includes('rate_limit') || error?.code === 'captcha_failed' || (error?.status || 0) >= 500) checkAuthError(error, 'Không thể gửi email.');
      return json({ message: EMAIL_SENT });
    }
    if (action === 'oauth' || action === 'link') {
      const body = await readBody(request, ['provider', 'next', 'remember']);
      if (body.provider !== 'google' && body.provider !== 'facebook') throw new AuthHttpError(400, 'Nhà cung cấp không hợp lệ.');
      if (body.remember !== undefined && typeof body.remember !== 'boolean') throw new AuthHttpError(400, 'Tùy chọn ghi nhớ không hợp lệ.');
      const client = await createServerSupabase(true, action === 'oauth' ? false : undefined);
      if (action === 'link') {
        if (process.env.NEXT_PUBLIC_AUTH_MANUAL_LINKING !== 'true') throw new AuthHttpError(403, 'Liên kết tài khoản chưa được bật.');
        const state = await readIdentity(client);
        if (!state.user || state.needsMfa) throw new AuthHttpError(403, 'Vui lòng hoàn tất xác thực.');
      }
      if (action === 'oauth') await clearSessionCookies();
      const jar = await cookies();
      jar.set('cliniccare-next', typeof body.next === 'string' ? body.next.slice(0, 2048) : '', { ...cookieSecurity, maxAge: 600 });
      if (action === 'oauth') jar.set(REMEMBER_COOKIE, body.remember === true ? '1' : '0', cookieSecurity);
      const credentials = { provider: body.provider, options: {
        redirectTo: appOrigin(request) + '/auth/callback', skipBrowserRedirect: true,
        ...(body.provider === 'facebook' ? { scopes: 'email' } : {}),
      } } as const;
      const result = action === 'link' ? await client.auth.linkIdentity(credentials) : await client.auth.signInWithOAuth(credentials);
      checkAuthError(result.error, 'Không thể kết nối nhà cung cấp. Vui lòng dùng email hoặc thử lại sau.');
      if (!result.data.url) throw new AuthHttpError(400, 'Nhà cung cấp chưa sẵn sàng.');
      return json({ url: result.data.url });
    }
    if (action === 'confirm' || action === 'reset-password') {
      const body = await readBody(request, action === 'confirm' ? ['tokenHash', 'type'] : ['tokenHash', 'code', 'flowId', 'password', 'confirmPassword']);
      const codeRecovery = action === 'reset-password' && validAuthCode(body.code) && !body.tokenHash;
      if (codeRecovery ? (body.flowId !== undefined && (typeof body.flowId !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(body.flowId))) : (!validTokenHash(body.tokenHash) || body.code !== undefined || body.flowId !== undefined)) {
        throw new AuthHttpError(400, 'Liên kết không hợp lệ hoặc đã hết hạn.');
      }
      if (action === 'reset-password') {
        if (!validPassword(body.password)) throw new AuthHttpError(400, PASSWORD_HINT);
        if (body.password !== body.confirmPassword) throw new AuthHttpError(400, 'Mật khẩu xác nhận không khớp.');
        await assertPasswordNotLeaked(body.password);
      }
      const type = action === 'reset-password' ? 'recovery' : body.type;
      if (type !== 'recovery' && type !== 'email' && type !== 'signup' && type !== 'invite' && type !== 'magiclink' && type !== 'email_change') {
        throw new AuthHttpError(400, 'Loại liên kết không hợp lệ.');
      }
      // A recovery token must never create a normal login via the confirmation endpoint.
      if (action === 'confirm' && type === 'recovery') throw new AuthHttpError(400, 'Vui lòng mở trang đặt lại mật khẩu.');
      await clearSessionCookies(codeRecovery ? { preservePkce: true } : undefined);
      const client = await createServerSupabase(true, false);
      if (codeRecovery) {
        const { data, error } = await client.auth.exchangeCodeForSession(body.code as string, typeof body.flowId === 'string' ? { flowId: body.flowId } : undefined);
        checkAuthError(error, 'Liên kết không hợp lệ, đã hết hạn hoặc cần mở trong trình duyệt đã yêu cầu email.');
        if (!data || !('redirectType' in data) || data.redirectType !== 'recovery') {
          await client.auth.signOut({ scope: 'local' }); await clearSessionCookies();
          throw new AuthHttpError(400, 'Liên kết này không dùng để khôi phục mật khẩu.');
        }
      } else {
        const { error } = await client.auth.verifyOtp({ token_hash: body.tokenHash as string, type });
        checkAuthError(error, 'Liên kết không hợp lệ hoặc đã hết hạn.');
      }
      if (action === 'reset-password') {
        const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
        checkAuthError(aalError, 'Không thể kiểm tra MFA.');
        if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
          const { data: factors, error: factorError } = await client.auth.mfa.listFactors();
          checkAuthError(factorError, 'Không thể tải thiết bị.');
          return json({ recoveryFactors: factors!.totp.filter((factor) => factor.status === 'verified').map(({ id, friendly_name }) => ({ id, friendlyName: friendly_name })) });
        }
        const { error: updateError } = await client.auth.updateUser({ password: body.password as string });
        if (updateError) {
          await client.auth.signOut({ scope: 'local' }); await clearSessionCookies();
          checkAuthError(updateError, 'Không thể đổi mật khẩu. Hãy chọn mật khẩu mới và yêu cầu lại liên kết.');
        }
        await client.auth.signOut({ scope: 'global' }); await clearSessionCookies();
        return json({ message: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.' });
      }
      if (type === 'magiclink' || type === 'invite') {
        const state = await readIdentity(client);
        if (state.needsReauthentication) {
          await client.auth.signOut({ scope: 'local' }); await clearSessionCookies();
          return json({ redirect: '/login?reauth=admin' });
        }
        if (state.needsMfa) return json({ redirect: '/auth/mfa' });
        if (state.user) {
          await persistAuthenticatedSession(state.user, false);
          return json({ redirect: safeDestination(null, state.user.role) });
        }
        await client.auth.signOut({ scope: 'local' }); await clearSessionCookies();
        throw new AuthHttpError(403, 'Đã xác thực email nhưng tài khoản chưa thể truy cập. Vui lòng đăng nhập bằng mật khẩu hoặc liên hệ quản trị viên.');
      }
      await client.auth.signOut({ scope: 'local' }); await clearSessionCookies();
      return json({ message: 'Đã xác nhận email. Bạn có thể đăng nhập.' });
    }
    if (action === 'reset-password-mfa') {
      const body = await readBody(request, ['factorId', 'code', 'password', 'confirmPassword']);
      if (!validPassword(body.password) || body.password !== body.confirmPassword) throw new AuthHttpError(400, PASSWORD_HINT);
      if (typeof body.factorId !== 'string' || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new AuthHttpError(400, 'Nhập mã xác thực gồm 6 chữ số.');
      await assertPasswordNotLeaked(body.password);
      const client = await createServerSupabase(true);
      if (!await verifiedUser(client)) throw new AuthHttpError(401, 'Phiên khôi phục đã hết hạn. Hãy yêu cầu email mới.');
      const { data: factors, error: factorError } = await client.auth.mfa.listFactors();
      checkAuthError(factorError, 'Không thể tải thiết bị.');
      if (!factors?.totp.some((factor) => factor.id === body.factorId && factor.status === 'verified')) throw new AuthHttpError(403, 'Thiết bị không hợp lệ.');
      const { error } = await client.auth.mfa.challengeAndVerify({ factorId: body.factorId, code: body.code });
      checkAuthError(error, 'Mã xác thực không đúng hoặc đã hết hạn.');
      const { error: updateError } = await client.auth.updateUser({ password: body.password });
      if (updateError) {
        await client.auth.signOut({ scope: 'local' }); await clearSessionCookies();
        checkAuthError(updateError, 'Không thể đổi mật khẩu. Hãy yêu cầu lại email khôi phục.');
      }
      await client.auth.signOut({ scope: 'global' }); await clearSessionCookies();
      return json({ message: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.' });
    }
    if (action.startsWith('mfa-') || action === 'reauthenticate' || action === 'password') {
      const client = await createServerSupabase(true);
      if (!await verifiedUser(client)) throw new AuthHttpError(401, 'Vui lòng đăng nhập.');
      const state = await readIdentity(client);
      if (!state.user && !state.needsMfa) throw new AuthHttpError(403, 'Không thể truy cập tài khoản.');
      if (action === 'mfa-verify') {
        const body = await readBody(request, ['factorId', 'code', 'next']);
        if (typeof body.factorId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.factorId) ||
            typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new AuthHttpError(400, 'Nhập mã gồm 6 chữ số.');
        const { error } = await client.auth.mfa.challengeAndVerify({ factorId: body.factorId, code: body.code });
        checkAuthError(error, 'Mã xác thực không đúng hoặc đã hết hạn.');
        const completed = await readIdentity(client);
        if (completed.needsReauthentication) {
          await client.auth.signOut({ scope: 'local' }); await clearSessionCookies();
          return json({ redirect: '/login?reauth=admin' });
        }
        if (!completed.user) throw new AuthHttpError(403, 'Tài khoản chưa sẵn sàng.');
        await persistAuthenticatedSession(completed.user, (await cookies()).get(REMEMBER_COOKIE)?.value === '1');
        return json({ message: 'Xác thực thành công.', redirect: safeDestination(body.next, completed.user.role) });
      }
      if (!state.user || state.needsMfa) throw new AuthHttpError(403, 'Vui lòng hoàn tất xác thực MFA.');
      if (action === 'mfa-enroll') {
        const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ClinicCare ' + crypto.randomUUID().slice(0, 8), issuer: 'ClinicCare' });
        checkAuthError(error, 'Không thể thêm thiết bị. Hãy xóa thiết bị chưa xác minh và thử lại.');
        return json({ id: data!.id, qrCode: data!.totp.qr_code, secret: data!.totp.secret });
      }
      if (action === 'mfa-remove') {
        const body = await readBody(request, ['factorId', 'code']);
        if (typeof body.factorId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.factorId)) throw new AuthHttpError(400, 'Thiết bị không hợp lệ.');
        const { data: factors, error: listError } = await client.auth.mfa.listFactors();
        checkAuthError(listError, 'Không thể tải thiết bị.');
        const factor = factors?.totp.find((item) => item.id === body.factorId);
        if (!factor) throw new AuthHttpError(404, 'Không tìm thấy thiết bị.');
        if (factor.status === 'verified') {
          if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new AuthHttpError(400, 'Nhập mã hiện tại của thiết bị để xác thực lại.');
          const { error } = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: body.code });
          checkAuthError(error, 'Mã xác thực không đúng hoặc đã hết hạn.');
        }
        const { error } = await client.auth.mfa.unenroll({ factorId: factor.id });
        checkAuthError(error, 'Không thể xóa thiết bị.');
        return json({ message: 'Đã xóa thiết bị xác thực.' });
      }
      if (action === 'reauthenticate') {
        const { error } = await client.auth.reauthenticate();
        checkAuthError(error, 'Không thể gửi mã xác thực lại.');
        return json({ message: 'Đã gửi mã xác thực lại đến email của bạn.' });
      }
      if (action === 'password') {
        const body = await readBody(request, ['password', 'confirmPassword', 'nonce']);
        if (!validPassword(body.password)) throw new AuthHttpError(400, PASSWORD_HINT);
        if (body.password !== body.confirmPassword) throw new AuthHttpError(400, 'Mật khẩu xác nhận không khớp.');
        if (typeof body.nonce !== 'string' || !/^\d{6,10}$/.test(body.nonce)) throw new AuthHttpError(400, 'Nhập mã xác thực lại được gửi đến email.');
        await assertPasswordNotLeaked(body.password);
        const { error } = await client.auth.updateUser({ password: body.password, nonce: body.nonce });
        checkAuthError(error, 'Không thể đổi mật khẩu. Vui lòng kiểm tra mã và chọn mật khẩu mới.');
        await client.auth.signOut({ scope: 'global' }); await clearSessionCookies();
        return json({ message: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.', redirect: '/login' });
      }
    }
    return json({ message: 'Không tìm thấy.' }, 404);
  } catch (error) { return errorResponse(error); }
}
