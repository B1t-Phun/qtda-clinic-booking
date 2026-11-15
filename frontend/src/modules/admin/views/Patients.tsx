'use client';
import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Cake, CalendarPlus, Download, Mail, MapPin, Pencil, Phone, Plus, UserRound } from 'lucide-react'
import { useStore } from '@/modules/admin/store/store'
import type { Gender, Profile } from '@/modules/admin/store/types'
import { age, downloadCSV, fmtDate, fmtNum, GENDER_LABEL, normalize, todayISO } from '@/lib/format'
import { navigate } from '@/lib/router'
import { Avatar, Button, Card, Chip, EmptyState, PageHeader, PersonCell } from '@/components/ui/core'
import { DataTable } from '@/components/ui/DataTable'
import { Field, Input, SearchInput, Select, Textarea } from '@/components/ui/form'
import { Modal, useToast } from '@/components/ui/overlay'
import { FilterBar, FilterItem } from '@/components/ui/widgets'
import { ApptHistory } from './appointments/ApptHistory'
import { Info } from './Doctors'
import { useAppointmentUI } from './appointments/AppointmentUI'

function usePatientStats() {
  const { appts } = useStore()
  const t = todayISO()
  return useMemo(() => {
    const m = new Map<string, { count: number; last: string | null; noShow: number }>()
    appts.forEach((a) => {
      const s = m.get(a.patient_id) ?? { count: 0, last: null, noShow: 0 }
      s.count++
      if (a.status === 'no_show') s.noShow++
      if (a.status === 'completed' && a.slot.slot_date <= t && (!s.last || a.slot.slot_date > s.last)) s.last = a.slot.slot_date
      m.set(a.patient_id, s)
    })
    return m
  }, [appts, t])
}
const NoShowChip = ({ n }: { n: number }) => n >= 2 ? <Chip tone="violet"><AlertTriangle className="size-3" />{n} lần vắng</Chip> : <span className="num">{n}</span>

export default function PatientsPage() {
  const { db, loading, error, reload } = useStore()
  const stats = usePatientStats()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [gender, setGender] = useState('')
  const [risk, setRisk] = useState('')
  const [form, setForm] = useState<Profile | 'new' | null>(null)
  const patients = db.profiles.filter((p) => p.role === 'patient')
  const active = [q, gender, risk].filter(Boolean).length
  const clear = () => { setQ(''); setGender(''); setRisk('') }
  const n = normalize(q)
  const list = patients.filter((p) => (!n || normalize(p.full_name).includes(n) || (p.phone ?? '').includes(n) || p.email.toLowerCase().includes(n)) && (!gender || p.gender === gender) && (!risk || (stats.get(p.id)?.noShow ?? 0) >= 2))
  const st = (p: Profile) => stats.get(p.id) ?? { count: 0, last: null, noShow: 0 }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Bệnh nhân" description={<><span className="num font-semibold text-ink">{patients.length}</span> hồ sơ bệnh nhân</>} actions={<>
        <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => { downloadCSV('benh-nhan.csv', [['Họ tên', 'SĐT', 'Email', 'Giới tính', 'Ngày sinh', 'Địa chỉ', 'Số lịch hẹn', 'Lần khám gần nhất', 'Vắng mặt'], ...list.map((p) => [p.full_name, p.phone ?? '', p.email, p.gender ? GENDER_LABEL[p.gender] : '', fmtDate(p.date_of_birth), p.address ?? '', st(p).count, fmtDate(st(p).last), st(p).noShow])]); toast({ tone: 'success', title: `Đã xuất ${list.length} bệnh nhân` }) }}><span className="hidden sm:inline">Xuất CSV</span></Button>
        <Button icon={<Plus className="size-4" />} onClick={() => setForm('new')}>Thêm bệnh nhân</Button>
      </>} />
      <Card className="overflow-hidden">
        <FilterBar activeCount={active} onClear={clear} search={<SearchInput value={q} onChange={setQ} placeholder="Tên, SĐT hoặc email" />}>
          <FilterItem label="Giới tính"><Select value={gender} onChange={(e) => setGender(e.target.value)}><option value="">Tất cả</option>{(['male', 'female', 'other'] as Gender[]).map((g) => <option key={g} value={g}>{GENDER_LABEL[g]}</option>)}</Select></FilterItem>
          <FilterItem label="Cảnh báo"><Select value={risk} onChange={(e) => setRisk(e.target.value)}><option value="">Tất cả</option><option value="1">Vắng mặt từ 2 lần</option></Select></FilterItem>
        </FilterBar>
        <DataTable rows={list} rowKey={(p) => p.id} loading={loading} error={error} onRetry={reload} filtered={active > 0} onClearFilters={clear} defaultSort={{ id: 'name', dir: 'asc' }}
          emptyTitle="Chưa có bệnh nhân" emptyAction={<Button onClick={() => setForm('new')}>Thêm bệnh nhân</Button>} onRowClick={(p) => navigate(`/patients/${p.id}`)}
          columns={[
            { id: 'name', header: 'Họ và tên', cell: (p) => <PersonCell name={p.full_name} url={p.avatar_url} sub={<span className="num lg:hidden">{p.phone}</span>} />, sort: (p) => p.full_name.split(' ').slice(-1)[0] + p.full_name },
            { id: 'phone', header: 'Số điện thoại', cell: (p) => <span className="num">{p.phone ?? '—'}</span>, className: 'hidden lg:table-cell' },
            { id: 'email', header: 'Email', cell: (p) => <span className="text-slate-600">{p.email}</span>, sort: (p) => p.email, className: 'hidden 2xl:table-cell' },
            { id: 'gender', header: 'Giới tính', cell: (p) => (p.gender ? GENDER_LABEL[p.gender] : '—'), sort: (p) => p.gender ?? '', className: 'hidden xl:table-cell' },
            { id: 'dob', header: 'Ngày sinh', cell: (p) => <span className="num whitespace-nowrap">{fmtDate(p.date_of_birth)}{p.date_of_birth && <span className="text-muted"> · {age(p.date_of_birth)} tuổi</span>}</span>, sort: (p) => p.date_of_birth ?? '', className: 'hidden lg:table-cell' },
            { id: 'addr', header: 'Địa chỉ', cell: (p) => <span className="line-clamp-1 max-w-[220px] text-slate-600">{p.address ?? '—'}</span>, className: 'hidden 2xl:table-cell' },
            { id: 'count', header: 'Lịch hẹn', align: 'right', cell: (p) => <span className="num font-semibold">{st(p).count}</span>, sort: (p) => st(p).count },
            { id: 'last', header: 'Khám gần nhất', cell: (p) => <span className="num whitespace-nowrap">{fmtDate(st(p).last)}</span>, sort: (p) => st(p).last ?? '' },
            { id: 'ns', header: 'Vắng mặt', align: 'right', cell: (p) => <NoShowChip n={st(p).noShow} />, sort: (p) => st(p).noShow },
          ]}
          mobileCard={(p) => (
            <div>
              <div className="flex items-start justify-between gap-2"><PersonCell name={p.full_name} url={p.avatar_url} sub={<span className="num">{p.phone}</span>} />{st(p).noShow >= 2 && <NoShowChip n={st(p).noShow} />}</div>
              <div className="mt-2 flex flex-wrap gap-x-4 text-13 text-muted">
                <span>{p.gender ? GENDER_LABEL[p.gender] : '—'}{p.date_of_birth && ` · ${age(p.date_of_birth)} tuổi`}</span>
                <span><b className="num text-ink">{st(p).count}</b> lịch hẹn</span>
                <span>Gần nhất <span className="num">{fmtDate(st(p).last)}</span></span>
              </div>
            </div>
          )} />
      </Card>
      {form && <PatientForm patient={form === 'new' ? null : form} onClose={() => setForm(null)} />}
    </div>
  )
}

export function PatientForm({ patient, onClose }: { patient: Profile | null; onClose: () => void }) {
  const { saveProfile, emailTaken } = useStore()
  const toast = useToast()
  const [f, setF] = useState({ full_name: patient?.full_name ?? '', email: patient?.email ?? '', phone: patient?.phone ?? '', gender: patient?.gender ?? '', date_of_birth: patient?.date_of_birth ?? '', address: patient?.address ?? '', avatar_url: patient?.avatar_url ?? '' })
  const [touched, setTouched] = useState(false)
  const e = {
    full_name: f.full_name.trim().length < 2 ? 'Nhập họ và tên' : '',
    email: !/^\S+@\S+\.\S+$/.test(f.email) ? 'Email không hợp lệ' : emailTaken(f.email, patient?.id) ? 'Email đã được sử dụng' : '',
    phone: !/^0\d{9}$/.test(f.phone) ? 'Số điện thoại gồm 10 số, bắt đầu bằng 0' : '',
    date_of_birth: f.date_of_birth && f.date_of_birth > todayISO() ? 'Ngày sinh không hợp lệ' : '',
    avatar_url: f.avatar_url && !/^https?:\/\//.test(f.avatar_url) ? 'URL phải bắt đầu bằng http(s)://' : '',
  }
  const err = (k: keyof typeof e) => (touched ? e[k] : '')
  const set = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: ev.target.value })
  const submit = () => {
    setTouched(true)
    if (Object.values(e).some(Boolean)) return
    const p = saveProfile({ id: patient?.id, full_name: f.full_name.trim(), email: f.email.trim(), phone: f.phone, gender: (f.gender || null) as Gender | null, date_of_birth: f.date_of_birth || null, address: f.address.trim() || null, avatar_url: f.avatar_url || null })
    toast({ tone: 'success', title: patient ? 'Đã cập nhật hồ sơ' : 'Đã thêm bệnh nhân', description: p.full_name })
    onClose()
    if (!patient) navigate(`/patients/${p.id}`)
  }
  return (
    <Modal open onClose={onClose} fullscreenMobile title={patient ? 'Chỉnh sửa bệnh nhân' : 'Thêm bệnh nhân'} footer={<><Button variant="secondary" onClick={onClose}>Hủy bỏ</Button><Button onClick={submit}>{patient ? 'Lưu thay đổi' : 'Thêm bệnh nhân'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Họ và tên" required error={err('full_name')} className="sm:col-span-2"><Input value={f.full_name} onChange={set('full_name')} invalid={!!err('full_name')} /></Field>
        <Field label="Số điện thoại" required error={err('phone')}><Input inputMode="tel" value={f.phone} onChange={set('phone')} invalid={!!err('phone')} /></Field>
        <Field label="Email" required error={err('email')}><Input type="email" value={f.email} onChange={set('email')} invalid={!!err('email')} /></Field>
        <Field label="Giới tính"><Select value={f.gender} onChange={set('gender')}><option value="">Chọn…</option>{(['male', 'female', 'other'] as Gender[]).map((g) => <option key={g} value={g}>{GENDER_LABEL[g]}</option>)}</Select></Field>
        <Field label="Ngày sinh" error={err('date_of_birth')}><Input type="date" max={todayISO()} value={f.date_of_birth} onChange={set('date_of_birth')} /></Field>
        <Field label="Địa chỉ" className="sm:col-span-2"><Textarea rows={2} value={f.address} onChange={set('address')} /></Field>
        <Field label="Ảnh đại diện (URL)" error={err('avatar_url')} className="sm:col-span-2"><Input value={f.avatar_url} onChange={set('avatar_url')} placeholder="https://…" /></Field>
      </div>
    </Modal>
  )
}

export function PatientDetail({ id }: { id: string }) {
  const { maps, appts, loading } = useStore()
  const stats = usePatientStats()
  const { create } = useAppointmentUI()
  const [edit, setEdit] = useState(false)
  const p = maps.profiles.get(id)
  if (!p || p.role !== 'patient') return <Card><EmptyState title="Không tìm thấy bệnh nhân" action={<Button variant="secondary" onClick={() => navigate('/patients')}>Về danh sách</Button>} /></Card>
  const s = stats.get(id) ?? { count: 0, last: null, noShow: 0 }
  const list = appts.filter((a) => a.patient_id === id)
  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate('/patients')} className="mb-3 inline-flex items-center gap-1 text-13 font-medium text-muted hover:text-ink"><ArrowLeft className="size-4" />Bệnh nhân</button>
      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <Card className="p-5">
          <div className="flex flex-col items-center text-center">
            <Avatar name={p.full_name} url={p.avatar_url} size={80} />
            <h1 className="mt-3 text-lg font-bold">{p.full_name}</h1>
            <div className="text-13 text-muted">Bệnh nhân từ <span className="num">{fmtDate(p.created_at)}</span></div>
            {s.noShow >= 2 && <div className="mt-2"><NoShowChip n={s.noShow} /></div>}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-slate-50 p-2"><div className="num text-lg font-bold">{fmtNum(s.count)}</div><div className="text-[11px] text-muted">Lịch hẹn</div></div>
            <div className="rounded-lg bg-slate-50 p-2"><div className="num text-lg font-bold">{list.filter((a) => a.status === 'completed').length}</div><div className="text-[11px] text-muted">Hoàn thành</div></div>
            <div className="rounded-lg bg-slate-50 p-2"><div className="num text-lg font-bold">{s.noShow}</div><div className="text-[11px] text-muted">Vắng mặt</div></div>
          </div>
          <div className="mt-4 space-y-2">
            <Info icon={<Phone className="size-4" />} label="Số điện thoại" value={p.phone ?? '—'} />
            <Info icon={<Mail className="size-4" />} label="Email" value={p.email} />
            <Info icon={<UserRound className="size-4" />} label="Giới tính" value={p.gender ? GENDER_LABEL[p.gender] : '—'} />
            <Info icon={<Cake className="size-4" />} label="Ngày sinh" value={p.date_of_birth ? `${fmtDate(p.date_of_birth)} · ${age(p.date_of_birth)} tuổi` : '—'} />
            <Info icon={<MapPin className="size-4" />} label="Địa chỉ" value={p.address ?? '—'} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEdit(true)}>Chỉnh sửa</Button>
            <Button icon={<CalendarPlus className="size-4" />} onClick={create}>Đặt lịch</Button>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Lịch sử lịch hẹn</h2>
            <p className="text-13 text-muted">Lần khám gần nhất: <span className="num">{fmtDate(s.last)}</span></p>
          </div>
          <ApptHistory rows={list} show="doctor" loading={loading} />
        </Card>
      </div>
      {edit && <PatientForm patient={p} onClose={() => setEdit(false)} />}
    </div>
  )
}
