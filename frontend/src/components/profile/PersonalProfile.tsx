'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CalendarDays, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';
import { Avatar, Button, Card, PageHeader } from '@/components/ui/core';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { useToast } from '@/components/ui/overlay';
import { todayISO } from '@/lib/format';
import type { PersonalProfile } from '@/lib/profile-server';

type Draft = {
  full_name: string;
  phone: string;
  date_of_birth: string;
  gender: '' | 'male' | 'female' | 'other';
  address: string;
  avatar_url: string;
};

function profileDraft(profile: PersonalProfile): Draft {
  return {
    full_name: profile.full_name || '', phone: profile.phone || '', date_of_birth: profile.date_of_birth || '',
    gender: profile.gender || '', address: profile.address || '', avatar_url: profile.avatar_url || '',
  };
}

export function PersonalProfilePanel({ initialProfile }: { initialProfile: PersonalProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(() => profileDraft(initialProfile));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const dirty = JSON.stringify(draft) !== JSON.stringify(profileDraft(profile));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !dirty) return;
    const values = {
      ...draft,
      full_name: draft.full_name.trim(), phone: draft.phone.trim(), address: draft.address.trim(), avatar_url: draft.avatar_url.trim(),
    };
    if (values.full_name.length < 2 || values.full_name.length > 100) {
      setError('Họ tên cần có từ 2 đến 100 ký tự.'); return;
    }
    if (values.phone && !/^0\d{9}$/.test(values.phone)) {
      setError('Số điện thoại cần gồm 10 chữ số và bắt đầu bằng 0.'); return;
    }
    if (values.date_of_birth && (values.date_of_birth < '1900-01-01' || values.date_of_birth > todayISO())) {
      setError('Ngày sinh không hợp lệ.'); return;
    }
    if (values.address.length > 500 || values.avatar_url.length > 2048 ||
      (values.avatar_url && !/^https:\/\/[^\s]+$/.test(values.avatar_url))) {
      setError('Địa chỉ tối đa 500 ký tự; ảnh đại diện cần là liên kết HTTPS hợp lệ.'); return;
    }

    setBusy(true); setError('');
    try {
      const response = await fetch('/api/client/profile', {
        method: 'PATCH', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'Không thể lưu hồ sơ.');
      const next = result?.profile as PersonalProfile | undefined;
      if (!next || next.id !== profile.id) throw new Error('Phản hồi hồ sơ không hợp lệ. Vui lòng tải lại trang.');
      setProfile(next); setDraft(profileDraft(next));
      toast({ tone: 'success', title: 'Đã cập nhật hồ sơ cá nhân.' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } finally { setBusy(false); }
  }

  function reset() { setDraft(profileDraft(profile)); setError(''); }

  return <div className="space-y-6">
    <PageHeader title="Hồ sơ cá nhân" description="Quản lý thông tin liên hệ và hồ sơ khám bệnh của bạn." />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-4 border-b border-line pb-5">
          <Avatar name={profile.full_name || 'Bệnh nhân'} url={draft.avatar_url || null} size={64} />
          <div className="min-w-0"><h2 className="truncate text-lg font-bold text-ink">{profile.full_name || 'Bệnh nhân'}</h2>
            <p className="truncate text-sm text-muted">{profile.email}</p><span className="mt-1 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">Bệnh nhân</span></div>
        </div>
        <form onSubmit={save} className="space-y-5">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ và tên" required><Input autoComplete="name" required minLength={2} maxLength={100} value={draft.full_name} onChange={e => setDraft({ ...draft, full_name: e.target.value })} /></Field>
            <Field label="Email đăng nhập" hint="Email được quản lý trong phần bảo mật tài khoản."><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input type="email" value={profile.email} readOnly className="pl-9" /></div></Field>
            <Field label="Số điện thoại"><Input type="tel" autoComplete="tel" inputMode="numeric" pattern="0[0-9]{9}" maxLength={10} value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></Field>
            <Field label="Ngày sinh"><Input type="date" min="1900-01-01" max={todayISO()} value={draft.date_of_birth} onChange={e => setDraft({ ...draft, date_of_birth: e.target.value })} /></Field>
            <Field label="Giới tính"><Select value={draft.gender} onChange={e => setDraft({ ...draft, gender: e.target.value as Draft['gender'] })}>
              <option value="">Chưa cập nhật</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option>
            </Select></Field>
            <Field label="Ảnh đại diện (liên kết HTTPS)"><Input type="url" autoComplete="url" placeholder="https://…" maxLength={2048} value={draft.avatar_url} onChange={e => setDraft({ ...draft, avatar_url: e.target.value })} /></Field>
            <Field label="Địa chỉ" className="sm:col-span-2"><Textarea autoComplete="street-address" rows={3} maxLength={500} value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} /></Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <span className="text-xs text-muted">{dirty ? 'Có thay đổi chưa lưu' : 'Thông tin đã đồng bộ'}</span>
            <div className="flex gap-2"><Button type="button" variant="secondary" disabled={!dirty || busy} onClick={reset}>Bỏ thay đổi</Button>
              <Button type="submit" loading={busy} disabled={!dirty} icon={<Save className="size-4" />}>Lưu hồ sơ</Button></div>
          </div>
        </form>
      </Card>
      <aside className="space-y-4">
        <Card className="p-5"><div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-50 text-primary"><UserRound className="size-5" /></div>
          <h2 className="font-semibold text-ink">Thông tin tài khoản</h2><p className="mt-1 text-sm text-muted">Hồ sơ được liên kết với tài khoản đang đăng nhập và chỉ bạn có thể cập nhật thông tin cá nhân.</p></Card>
        <Card className="p-5"><div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><CalendarDays className="size-5" /></div>
          <h2 className="font-semibold text-ink">Ngày tham gia</h2><p className="mt-1 text-sm text-muted">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(profile.created_at))}</p>
          <Link href="/account/security" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="size-4" />Bảo mật tài khoản</Link></Card>
      </aside>
    </div>
  </div>;
}
