'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authRequest, logout } from '@/lib/auth/client';

type Factor = { id: string; friendlyName?: string; status: string };
type Status = { factors: Factor[]; currentLevel: string; nextLevel: string };
export function MfaPanel({ manage = false }: { manage?: boolean }) {
  const params = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [enrollment, setEnrollment] = useState<{ id: string; qrCode: string; secret: string } | null>(null);
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/auth/mfa', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setStatus(data);
    setFactorId(data.factors.find((factor: Factor) => factor.status === 'verified')?.id || '');
  }, []);
  useEffect(() => {
    let active = true;
    fetch('/api/auth/mfa', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data as Status;
      })
      .then((data) => {
        if (!active) return;
        setStatus(data); setFactorId(data.factors.find((factor) => factor.status === 'verified')?.id || '');
      }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await authRequest('mfa-verify', { factorId: enrollment?.id || factorId, code, next: manage ? '/account/security' : params.get('next') });
      if (result.redirect) window.location.assign(result.redirect);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể xác thực.'); }
    finally { setBusy(false); setCode(''); }
  }
  async function enroll() {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const data = await authRequest('mfa-enroll', {});
      setEnrollment({ id: data.id!, qrCode: data.qrCode!, secret: data.secret! });
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể thêm thiết bị.'); }
    finally { setBusy(false); }
  }
  async function remove(factor: Factor) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await authRequest('mfa-remove', { factorId: factor.id, code });
      setMessage(result.message || 'Đã xóa.'); setEnrollment(null); setCode('');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể xóa thiết bị.'); }
    finally { setBusy(false); }
  }
  const factors = status?.factors.filter((factor) => factor.status === 'verified') || [];
  return <section className="space-y-4">
    <h1 className="text-xl font-bold">{manage ? 'Xác thực hai bước (MFA)' : 'Xác thực đăng nhập'}</h1>
    <p className="text-sm text-slate-600">{manage ? 'Dùng ứng dụng Authenticator để tăng bảo mật tài khoản.' : 'Nhập mã từ ứng dụng Authenticator để tiếp tục.'}</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {!status && !error && <p>Đang tải thiết bị…</p>}
    {manage && status && <p className="text-sm">Trạng thái: <b>{factors.length ? 'Đang bật' : 'Đang tắt'}</b></p>}
    {enrollment && <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm">Quét mã QR bằng ứng dụng Authenticator, sau đó nhập mã 6 chữ số.</p>
      {/* Supabase returns SVG data; render as an image, never inject SVG markup. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="Mã QR đăng ký Authenticator" className="mx-auto size-52" src={enrollment.qrCode.startsWith('data:') ? enrollment.qrCode : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(enrollment.qrCode)} />
      <details className="text-sm"><summary>Nhập khóa thủ công</summary><code className="break-all">{enrollment.secret}</code></details>
    </div>}
    {(enrollment || factors.length > 0) && <form onSubmit={verify} className="space-y-3">
      {!enrollment && <label className="block text-sm">Thiết bị<select className="mt-1 w-full rounded-lg border p-2" value={factorId} onChange={(e) => setFactorId(e.target.value)} disabled={busy}>{factors.map((factor) => <option key={factor.id} value={factor.id}>{factor.friendlyName || 'Authenticator'}</option>)}</select></label>}
      <label className="block text-sm">Mã xác thực<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required className="mt-1 w-full rounded-lg border p-2" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} disabled={busy} /></label>
      <button disabled={busy || code.length !== 6} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang xử lý…' : 'Xác minh'}</button>
    </form>}
    {manage && status && <>
      <button onClick={enroll} disabled={busy || !!enrollment} className="rounded-lg border border-blue-600 px-4 py-2 text-sm text-blue-600 disabled:opacity-50">Thêm thiết bị Authenticator</button>
      <p className="text-xs text-slate-500">Để hủy thiết bị đã bật, nhập mã hiện tại của chính thiết bị đó rồi nhấn Hủy thiết bị.</p>
      {status.factors.map((factor) => <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm" key={factor.id}><span>{factor.friendlyName || 'Authenticator'} · {factor.status === 'verified' ? 'Đã xác minh' : 'Chưa xác minh'}</span><button disabled={busy} className="text-red-600 disabled:opacity-50" onClick={() => remove(factor)}>Hủy thiết bị</button></div>)}
      {enrollment && !status.factors.some((factor) => factor.id === enrollment.id) && <button disabled={busy} onClick={() => remove({ id: enrollment.id, status: 'unverified' })} className="text-sm text-red-600">Hủy đăng ký thiết bị</button>}
    </>}
    {!manage && <div className="flex gap-4 text-sm"><button onClick={logout} className="text-blue-600">Đăng xuất</button><Link href="/login" className="text-blue-600">Quay lại đăng nhập</Link></div>}
  </section>;
}
