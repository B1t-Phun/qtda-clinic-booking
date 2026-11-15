'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { authRequest } from '@/lib/auth/client';
import { ROLE_HOME, PASSWORD_HINT } from '@/lib/auth/policy';
import { MfaPanel } from './MfaPanel';

export function SecurityPanel() {
  const { user, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nonce, setNonce] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function run(action: string, body: unknown) {
    if (busy) return;
    setBusy(true); setMessage(''); setError('');
    try {
      const result = await authRequest(action, body);
      if (result.url) window.location.assign(result.url);
      else if (result.redirect) window.location.assign(result.redirect);
      else setMessage(result.message || 'Đã thực hiện.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể thực hiện.'); }
    finally { setBusy(false); }
  }
  function changePassword(event: FormEvent) { event.preventDefault(); void run('password', { password, confirmPassword, nonce }); }
  return <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 text-slate-800">
    <div className="flex justify-between gap-4"><Link href={ROLE_HOME[user.role]} className="text-blue-600">← Về cổng của bạn</Link><button onClick={logout} className="text-red-600">Đăng xuất</button></div>
    <h1 className="text-2xl font-bold">Bảo mật tài khoản</h1><p>{user.fullName} · {user.email}</p>
    <div className="rounded-2xl border bg-white p-5"><MfaPanel manage /></div>
    <section className="space-y-4 rounded-2xl border bg-white p-5">
      <h2 className="text-lg font-bold">Đổi mật khẩu</h2>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      <button disabled={busy} onClick={() => run('reauthenticate', {})} className="text-sm text-blue-600 disabled:opacity-50">Gửi mã xác thực lại qua email</button>
      <form onSubmit={changePassword} className="space-y-3">
        <fieldset disabled={busy} className="space-y-3">
          <label className="block text-sm">Mã trong email<input required inputMode="numeric" pattern="[0-9]{6,10}" autoComplete="one-time-code" className="mt-1 w-full rounded-lg border p-2" value={nonce} onChange={(e) => setNonce(e.target.value)} /></label>
          <label className="block text-sm">Mật khẩu mới<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" className="mt-1 w-full rounded-lg border p-2" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <p className="text-xs text-slate-500">{PASSWORD_HINT}</p>
          <label className="block text-sm">Xác nhận mật khẩu<input required type="password" autoComplete="new-password" className="mt-1 w-full rounded-lg border p-2" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">Đổi mật khẩu và đăng xuất</button>
        </fieldset>
      </form>
    </section>
    {process.env.NEXT_PUBLIC_AUTH_MANUAL_LINKING === 'true' && <section className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="font-bold">Liên kết tài khoản</h2><p className="text-sm">Xác nhận với nhà cung cấp để liên kết phương thức đăng nhập.</p><div className="flex gap-4">{(['google', 'facebook'] as const).map((provider) => <button disabled={busy} key={provider} className="rounded-lg border px-4 py-2 capitalize" onClick={() => run('link', { provider, next: '/account/security' })}>{provider}</button>)}</div></section>}
  </main>;
}
