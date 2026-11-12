'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import type { UserRole } from '@/types/auth';
import { Card, PageHeader } from '@/components/ui/core';
type Account = { id: string; email: string; full_name: string; role: UserRole };
type Specialty = { id: number; name: string };
const labels = { admin: 'Quản trị viên', doctor: 'Bác sĩ', patient: 'Bệnh nhân' };

export default function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [pending, setPending] = useState<{ id: string; role: UserRole } | null>(null);
  const [doctor, setDoctor] = useState({ specialty: '', room: '', fee: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const client = createClient();
      const [profiles, specs] = await Promise.all([
        client.from('profiles').select('id,email,full_name,role').order('created_at', { ascending: false }),
        client.from('specialties').select('id,name').order('name'),
      ]);
      if (profiles.error || specs.error) throw new Error('Không thể tải tài khoản. Vui lòng kiểm tra kết nối và cấu hình quyền.');
      setAccounts(profiles.data || []); setSpecialties(specs.data || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể tải tài khoản.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    const client = createClient();
    Promise.all([
      client.from('profiles').select('id,email,full_name,role').order('created_at', { ascending: false }),
      client.from('specialties').select('id,name').order('name'),
    ]).then(([profiles, specs]) => {
      if (!active) return;
      if (profiles.error || specs.error) throw new Error('Không thể tải tài khoản. Vui lòng kiểm tra kết nối và cấu hình quyền.');
      setAccounts(profiles.data || []); setSpecialties(specs.data || []);
    }).catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!pending || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error } = await createClient().rpc('admin_set_user_role', {
        p_profile_id: pending.id, p_role: pending.role,
        p_specialty_id: pending.role === 'doctor' && doctor.specialty ? Number(doctor.specialty) : null,
        p_room: doctor.room || null,
        p_consultation_fee: doctor.fee ? Number(doctor.fee) : null,
      });
      if (error) throw new Error('Không thể đổi vai trò. Kiểm tra thông tin bác sĩ; tài khoản đã có lịch hẹn có thể bị hạn chế đổi vai trò.');
      setPending(null); setMessage('Đã cập nhật quyền truy cập trên hệ thống.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể đổi vai trò.'); }
    finally { setBusy(false); }
  }
  const rows = accounts.filter((account) => (account.full_name + ' ' + account.email).toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  return <div className="space-y-4">
    <PageHeader title="Tài khoản và vai trò" description="Quản lý quyền truy cập hệ thống ClinicCare" />
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <Card className="overflow-hidden">
      <div className="flex gap-3 border-b p-4"><input aria-label="Tìm tài khoản" placeholder="Tìm theo tên hoặc email" className="w-full max-w-sm rounded-lg border px-3 py-2 text-sm" value={query} onChange={(e) => setQuery(e.target.value)} /><button onClick={load} disabled={busy || loading} className="text-sm text-blue-600">Tải lại</button></div>
      {loading ? <p className="p-4">Đang tải…</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-4">Người dùng</th><th className="p-4">Email</th><th className="p-4">Vai trò</th></tr></thead><tbody>
        {rows.map((account) => <tr key={account.id} className="border-t"><td className="p-4">{account.full_name || 'Chưa cập nhật'}{account.id === user.id && ' (bạn)'}</td><td className="p-4">{account.email}</td><td className="p-4"><select aria-label={'Vai trò của ' + account.full_name} className="rounded-lg border p-2 disabled:opacity-50" disabled={busy || account.id === user.id} value={account.role} onChange={(e) => { setPending({ id: account.id, role: e.target.value as UserRole }); setDoctor({ specialty: '', room: '', fee: '' }); }}>{Object.entries(labels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></td></tr>)}
        {!rows.length && <tr><td colSpan={3} className="p-4 text-center">Không có tài khoản phù hợp.</td></tr>}
      </tbody></table></div>}
    </Card>
    {pending && <form onSubmit={save} className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="font-bold">Xác nhận đổi thành {labels[pending.role]}</h2>
      {pending.role === 'doctor' && <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Chuyên khoa<select required className="mt-1 w-full rounded-lg border p-2" value={doctor.specialty} onChange={(e) => setDoctor({ ...doctor, specialty: e.target.value })}><option value="">Chọn chuyên khoa</option>{specialties.map((spec) => <option key={spec.id} value={spec.id}>{spec.name}</option>)}</select></label>
        <label className="text-sm">Phòng khám<input required maxLength={100} className="mt-1 w-full rounded-lg border p-2" value={doctor.room} onChange={(e) => setDoctor({ ...doctor, room: e.target.value })} /></label>
        <label className="text-sm">Phí khám<input required type="number" min={0} step={1000} className="mt-1 w-full rounded-lg border p-2" value={doctor.fee} onChange={(e) => setDoctor({ ...doctor, fee: e.target.value })} /></label>
      </fieldset>}
      <div className="flex gap-4"><button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? 'Đang lưu…' : 'Xác nhận đổi quyền'}</button><button type="button" disabled={busy} onClick={() => setPending(null)} className="text-sm">Hủy</button></div>
    </form>}
  </div>;
}
