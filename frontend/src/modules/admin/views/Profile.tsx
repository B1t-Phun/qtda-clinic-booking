'use client';
import { useState } from 'react'
import { KeyRound, LogOut, RotateCcw } from 'lucide-react'
import { useStore } from '@/modules/admin/store/store'
import type { Gender } from '@/modules/admin/store/types'
import { fmtDateTime, GENDER_LABEL, todayISO } from '@/lib/format'
import { Avatar, Button, Card, PageHeader } from '@/components/ui/core'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { ConfirmDialog, useToast } from '@/components/ui/overlay'

export default function ProfilePage() {
  const { me, saveProfile, emailTaken, logout, resetData } = useStore()
  const toast = useToast()
  const [f, setF] = useState({ full_name: me.full_name, email: me.email, phone: me.phone ?? '', gender: me.gender ?? '', date_of_birth: me.date_of_birth ?? '', address: me.address ?? '', avatar_url: me.avatar_url ?? '' })
  const [touched, setTouched] = useState(false)
  const [pw, setPw] = useState({ cur: '', next: '', again: '' })
  const [pwTouched, setPwTouched] = useState(false)
  const [reset, setReset] = useState(false)
  const e = {
    full_name: f.full_name.trim().length < 2 ? 'Nhập họ và tên' : '',
    email: !/^\S+@\S+\.\S+$/.test(f.email) ? 'Email không hợp lệ' : emailTaken(f.email, me.id) ? 'Email đã được sử dụng' : '',
    phone: f.phone && !/^0\d{9}$/.test(f.phone) ? 'Số điện thoại gồm 10 số, bắt đầu bằng 0' : '',
    avatar_url: f.avatar_url && !/^https?:\/\//.test(f.avatar_url) ? 'URL phải bắt đầu bằng http(s)://' : '',
  }
  const pe = {
    cur: !pw.cur ? 'Nhập mật khẩu hiện tại' : '',
    next: pw.next.length < 8 ? 'Tối thiểu 8 ký tự' : !/\d/.test(pw.next) || !/[A-Za-z]/.test(pw.next) ? 'Gồm cả chữ và số' : pw.next === pw.cur ? 'Mật khẩu mới phải khác mật khẩu hiện tại' : '',
    again: pw.again !== pw.next ? 'Mật khẩu nhập lại không khớp' : '',
  }
  const set = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: ev.target.value })
  const err = (k: keyof typeof e) => (touched ? e[k] : '')
  return (
    <div className="animate-fade-in">
      <PageHeader title="Hồ sơ cá nhân" description={<>Cập nhật lần cuối <span className="num">{fmtDateTime(me.updated_at)}</span></>} actions={<Button variant="secondary" className="text-[#B91C1C]" icon={<LogOut className="size-4" />} onClick={logout}>Đăng xuất</Button>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-4">
            <Avatar name={f.full_name || '?'} url={!e.avatar_url ? f.avatar_url || null : null} size={64} />
            <div><div className="font-semibold">{me.full_name}</div><div className="text-13 text-muted">Quản trị viên · {me.email}</div></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ và tên" required error={err('full_name')}><Input value={f.full_name} onChange={set('full_name')} invalid={!!err('full_name')} /></Field>
            <Field label="Email" required error={err('email')}><Input type="email" value={f.email} onChange={set('email')} invalid={!!err('email')} /></Field>
            <Field label="Số điện thoại" error={err('phone')}><Input value={f.phone} onChange={set('phone')} invalid={!!err('phone')} /></Field>
            <Field label="Giới tính"><Select value={f.gender} onChange={set('gender')}><option value="">Chọn…</option>{(['male', 'female', 'other'] as Gender[]).map((g) => <option key={g} value={g}>{GENDER_LABEL[g]}</option>)}</Select></Field>
            <Field label="Ngày sinh"><Input type="date" max={todayISO()} value={f.date_of_birth} onChange={set('date_of_birth')} /></Field>
            <Field label="Ảnh đại diện (URL)" error={err('avatar_url')}><Input value={f.avatar_url} onChange={set('avatar_url')} placeholder="https://…" /></Field>
            <Field label="Địa chỉ" className="sm:col-span-2"><Textarea rows={2} value={f.address} onChange={set('address')} /></Field>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => {
              setTouched(true)
              if (Object.values(e).some(Boolean)) return
              saveProfile({ id: me.id, full_name: f.full_name.trim(), email: f.email.trim(), phone: f.phone || null, gender: (f.gender || null) as Gender | null, date_of_birth: f.date_of_birth || null, address: f.address.trim() || null, avatar_url: f.avatar_url || null })
              toast({ tone: 'success', title: 'Đã lưu hồ sơ' })
            }}>Lưu thay đổi</Button>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold"><KeyRound className="size-4 text-primary" />Đổi mật khẩu</h2>
            <div className="mt-4 space-y-3">
              <Field label="Mật khẩu hiện tại" required error={pwTouched ? pe.cur : ''}><Input type="password" autoComplete="current-password" value={pw.cur} onChange={(ev) => setPw({ ...pw, cur: ev.target.value })} /></Field>
              <Field label="Mật khẩu mới" required error={pwTouched ? pe.next : ''} hint="Tối thiểu 8 ký tự, gồm chữ và số"><Input type="password" autoComplete="new-password" value={pw.next} onChange={(ev) => setPw({ ...pw, next: ev.target.value })} /></Field>
              <Field label="Nhập lại mật khẩu mới" required error={pwTouched ? pe.again : ''}><Input type="password" autoComplete="new-password" value={pw.again} onChange={(ev) => setPw({ ...pw, again: ev.target.value })} /></Field>
            </div>
            <Button className="mt-4 w-full" onClick={() => {
              setPwTouched(true)
              if (Object.values(pe).some(Boolean)) return
              setPw({ cur: '', next: '', again: '' }); setPwTouched(false)
              toast({ tone: 'success', title: 'Đã đổi mật khẩu' })
            }}>Cập nhật mật khẩu</Button>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Dữ liệu mẫu</h2>
            <p className="mt-1 text-13 text-muted">Khôi phục dữ liệu mẫu ban đầu của bản prototype.</p>
            <Button variant="secondary" className="mt-3" icon={<RotateCcw className="size-4" />} onClick={() => setReset(true)}>Khôi phục dữ liệu mẫu</Button>
          </Card>
        </div>
      </div>
      <ConfirmDialog open={reset} onClose={() => setReset(false)} tone="danger" title="Khôi phục dữ liệu mẫu" confirmLabel="Khôi phục" message="Mọi thay đổi bạn đã thực hiện sẽ bị xóa." onConfirm={() => { resetData(); setReset(false); toast({ tone: 'success', title: 'Đã khôi phục dữ liệu mẫu' }) }} />
    </div>
  )
}
