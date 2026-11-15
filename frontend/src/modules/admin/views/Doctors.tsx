'use client';
import { useMemo, useState } from 'react'
import { ArrowLeft, Award, Banknote, CalendarCheck, DoorOpen, LayoutGrid, List, Mail, Pencil, Phone, Plus, Power, Trash2, UserX, Wallet, XCircle } from 'lucide-react'
import { useStore, type DoctorView } from '@/modules/admin/store/store'
import { cx, fmtDate, fmtNum, fmtPct, fmtVND, normalize, todayISO } from '@/lib/format'
import { navigate } from '@/lib/router'
import { Avatar, Button, Card, Chip, EmptyState, ErrorState, PageHeader, PersonCell, Segmented, Skeleton, StatusBadge, Switch, Tabs, Tooltip } from '@/components/ui/core'
import { DataTable } from '@/components/ui/DataTable'
import { Field, Input, SearchInput, Select, Textarea } from '@/components/ui/form'
import { ConfirmDialog, Modal, useToast } from '@/components/ui/overlay'
import { FilterBar, FilterItem, KpiCard } from '@/components/ui/widgets'
import { ApptHistory } from './appointments/ApptHistory'
import { SlotBoard } from './Slots'
import { rate, revenue, statusCounts } from '@/lib/analytics'

function useUpcoming() {
  const { appts } = useStore()
  const t = todayISO()
  return useMemo(() => {
    const m = new Map<string, number>()
    appts.forEach((a) => { if ((a.status === 'pending' || a.status === 'confirmed') && a.slot.slot_date >= t) m.set(a.doctor.id, (m.get(a.doctor.id) ?? 0) + 1) })
    return m
  }, [appts, t])
}

function useToggleActive() {
  const { setDoctorActive } = useStore()
  const toast = useToast()
  const [pending, setPending] = useState<DoctorView | null>(null)
  const toggle = (d: DoctorView, v: boolean) => {
    if (!v) return setPending(d)
    setDoctorActive(d.id, true)
    toast({ tone: 'success', title: `Đã kích hoạt BS. ${d.profile.full_name}` })
  }
  const dialog = (
    <ConfirmDialog open={!!pending} onClose={() => setPending(null)} tone="danger" title="Ngừng hoạt động bác sĩ" confirmLabel="Ngừng hoạt động"
      message={<>BS. <b className="text-ink">{pending?.profile.full_name}</b> sẽ không còn xuất hiện khi đặt lịch mới. Lịch hẹn hiện có vẫn được giữ nguyên.</>}
      onConfirm={() => { setDoctorActive(pending!.id, false); toast({ tone: 'success', title: `Đã ngừng hoạt động BS. ${pending!.profile.full_name}` }); setPending(null) }} />
  )
  return { toggle, dialog }
}

export default function DoctorsPage() {
  const { doctorViews, db, loading, error, reload } = useStore()
  const upcoming = useUpcoming()
  const { toggle, dialog } = useToggleActive()
  const [view, setView] = useState<'card' | 'table'>('card')
  const [q, setQ] = useState('')
  const [spec, setSpec] = useState('')
  const [act, setAct] = useState('')
  const [form, setForm] = useState<DoctorView | 'new' | null>(null)
  const active = [q, spec, act].filter(Boolean).length
  const clear = () => { setQ(''); setSpec(''); setAct('') }
  const list = doctorViews
    .filter((d) => (!q || normalize(d.profile.full_name).includes(normalize(q)) || normalize(d.room ?? '').includes(normalize(q))) && (!spec || d.specialty_id === spec) && (!act || String(d.is_active) === act))
    .sort((a, b) => a.profile.full_name.localeCompare(b.profile.full_name, 'vi'))

  return (
    <div className="animate-fade-in">
      <PageHeader title="Bác sĩ" description={<><span className="num font-semibold text-ink">{doctorViews.filter((d) => d.is_active).length}</span> đang hoạt động / <span className="num">{doctorViews.length}</span> bác sĩ</>}
        actions={<><Segmented value={view} onChange={setView} options={[{ id: 'card', label: 'Thẻ', icon: <LayoutGrid className="size-4" /> }, { id: 'table', label: 'Bảng', icon: <List className="size-4" /> }]} /><Button icon={<Plus className="size-4" />} onClick={() => setForm('new')}>Thêm bác sĩ</Button></>} />
      <Card className="overflow-hidden">
        <FilterBar activeCount={active} onClear={clear} search={<SearchInput value={q} onChange={setQ} placeholder="Tìm tên bác sĩ hoặc phòng" />}>
          <FilterItem label="Chuyên khoa"><Select value={spec} onChange={(e) => setSpec(e.target.value)}><option value="">Tất cả</option>{db.specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></FilterItem>
          <FilterItem label="Trạng thái"><Select value={act} onChange={(e) => setAct(e.target.value)}><option value="">Tất cả</option><option value="true">Đang hoạt động</option><option value="false">Ngừng hoạt động</option></Select></FilterItem>
        </FilterBar>
        {view === 'card' ? (
          error ? <ErrorState onRetry={reload} /> : loading ? (
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
          ) : list.length === 0 ? (
            active ? <EmptyState kind="search" title="Không tìm thấy bác sĩ" action={<Button variant="secondary" onClick={clear}>Xóa bộ lọc</Button>} /> : <EmptyState title="Chưa có bác sĩ" action={<Button onClick={() => setForm('new')}>Thêm bác sĩ</Button>} />
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {list.map((d) => (
                <div key={d.id} onClick={() => navigate(`/doctors/${d.id}`)} className={cx('group cursor-pointer rounded-xl border border-line bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:shadow-soft', !d.is_active && 'bg-slate-50')}>
                  <div className="flex items-start gap-3">
                    <Avatar name={d.profile.full_name} url={d.profile.avatar_url} size={52} className={cx(!d.is_active && 'grayscale')} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold group-hover:text-primary">BS. {d.profile.full_name}</div>
                      <Chip tone="blue" className="mt-1">{d.specialty.name}</Chip>
                    </div>
                    <Switch label="Đang hoạt động" checked={d.is_active} onChange={(v) => toggle(d, v)} />
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                    <div><dt className="text-[11px] text-muted">Phòng</dt><dd className="num text-sm font-bold">{d.room ?? '—'}</dd></div>
                    <div><dt className="text-[11px] text-muted">Kinh nghiệm</dt><dd className="num text-sm font-bold">{d.years_experience} năm</dd></div>
                    <div><dt className="text-[11px] text-muted">Sắp tới</dt><dd className="num text-sm font-bold text-primary">{upcoming.get(d.id) ?? 0}</dd></div>
                  </dl>
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-13">
                    <span className="text-muted">Phí khám</span>
                    <span className="num font-bold">{fmtVND(d.consultation_fee)}</span>
                  </div>
                  {!d.is_active && <div className="mt-2 text-xs font-medium text-muted">Ngừng hoạt động</div>}
                </div>
              ))}
            </div>
          )
        ) : (
          <DataTable rows={list} rowKey={(d) => d.id} loading={loading} error={error} onRetry={reload} filtered={active > 0} onClearFilters={clear} defaultSort={{ id: 'name', dir: 'asc' }} onRowClick={(d) => navigate(`/doctors/${d.id}`)}
            columns={[
              { id: 'name', header: 'Bác sĩ', cell: (d) => <PersonCell name={`BS. ${d.profile.full_name}`} url={d.profile.avatar_url} sub={d.profile.email} />, sort: (d) => d.profile.full_name },
              { id: 'spec', header: 'Chuyên khoa', cell: (d) => d.specialty.name, sort: (d) => d.specialty.name },
              { id: 'room', header: 'Phòng', cell: (d) => <span className="num">{d.room ?? '—'}</span>, sort: (d) => d.room ?? '', className: 'hidden lg:table-cell' },
              { id: 'years', header: 'Kinh nghiệm', align: 'right', cell: (d) => <span className="num">{d.years_experience} năm</span>, sort: (d) => d.years_experience, className: 'hidden lg:table-cell' },
              { id: 'fee', header: 'Phí khám', align: 'right', cell: (d) => <span className="num font-semibold">{fmtVND(d.consultation_fee)}</span>, sort: (d) => d.consultation_fee },
              { id: 'up', header: 'Lịch sắp tới', align: 'right', cell: (d) => <span className="num font-bold text-primary">{upcoming.get(d.id) ?? 0}</span>, sort: (d) => upcoming.get(d.id) ?? 0 },
              { id: 'active', header: 'Hoạt động', align: 'center', cell: (d) => <Switch label="Đang hoạt động" checked={d.is_active} onChange={(v) => toggle(d, v)} /> },
            ]}
            mobileCard={(d) => (
              <div className="flex items-center gap-3">
                <PersonCell name={`BS. ${d.profile.full_name}`} url={d.profile.avatar_url} sub={`${d.specialty.name} · ${d.room}`} size={40} />
                <div className="ml-auto" onClick={(e) => e.stopPropagation()}><Switch label="Đang hoạt động" checked={d.is_active} onChange={(v) => toggle(d, v)} /></div>
              </div>
            )} />
        )}
      </Card>
      {dialog}
      {form && <DoctorForm doctor={form === 'new' ? null : form} onClose={() => setForm(null)} />}
    </div>
  )
}

export function DoctorForm({ doctor, onClose }: { doctor: DoctorView | null; onClose: () => void }) {
  const { db, saveDoctor, emailTaken } = useStore()
  const toast = useToast()
  const [f, setF] = useState({
    email: doctor?.profile.email ?? '', full_name: doctor?.profile.full_name ?? '', phone: doctor?.profile.phone ?? '', avatar_url: doctor?.profile.avatar_url ?? '',
    specialty_id: doctor?.specialty_id ?? '', room: doctor?.room ?? '', years_experience: String(doctor?.years_experience ?? ''), consultation_fee: String(doctor?.consultation_fee ?? ''), bio: doctor?.bio ?? '', is_active: doctor?.is_active ?? true,
  })
  const [touched, setTouched] = useState(false)
  const e = {
    email: !/^\S+@\S+\.\S+$/.test(f.email) ? 'Email không hợp lệ' : emailTaken(f.email, doctor?.profile_id) ? 'Email đã được sử dụng' : '',
    full_name: f.full_name.trim().length < 2 ? 'Nhập họ và tên' : '',
    phone: f.phone && !/^0\d{9}$/.test(f.phone) ? 'Số điện thoại gồm 10 số, bắt đầu bằng 0' : '',
    avatar_url: f.avatar_url && !/^https?:\/\//.test(f.avatar_url) ? 'URL phải bắt đầu bằng http(s)://' : '',
    specialty_id: !f.specialty_id ? 'Chọn chuyên khoa' : '',
    room: !f.room.trim() ? 'Nhập phòng khám, ví dụ P.101' : '',
    years_experience: f.years_experience === '' || !/^\d+$/.test(f.years_experience) || Number(f.years_experience) > 60 ? 'Số năm từ 0 đến 60' : '',
    consultation_fee: !/^\d+$/.test(f.consultation_fee.replace(/\./g, '')) || Number(f.consultation_fee.replace(/\./g, '')) < 1000 ? 'Nhập phí khám (VND)' : '',
  }
  const err = (k: keyof typeof e) => (touched ? e[k] : '')
  const set = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: ev.target.value })
  const submit = () => {
    setTouched(true)
    if (Object.values(e).some(Boolean)) return
    const id = saveDoctor(
      { email: f.email.trim(), full_name: f.full_name.trim(), phone: f.phone || null, avatar_url: f.avatar_url || null },
      { specialty_id: f.specialty_id, room: f.room.trim(), years_experience: Number(f.years_experience), consultation_fee: Number(f.consultation_fee.replace(/\./g, '')), bio: f.bio.trim() || null, is_active: f.is_active },
      doctor?.id,
    )
    toast({ tone: 'success', title: doctor ? 'Đã cập nhật bác sĩ' : 'Đã thêm bác sĩ', description: `BS. ${f.full_name.trim()}` })
    onClose()
    if (!doctor) navigate(`/doctors/${id}`)
  }
  const fee = Number(f.consultation_fee.replace(/\./g, ''))
  return (
    <Modal open onClose={onClose} size="lg" fullscreenMobile title={doctor ? 'Chỉnh sửa bác sĩ' : 'Thêm bác sĩ'} footer={<><Button variant="secondary" onClick={onClose}>Hủy bỏ</Button><Button onClick={submit}>{doctor ? 'Lưu thay đổi' : 'Thêm bác sĩ'}</Button></>}>
      <section>
        <h3 className="mb-3 text-sm font-semibold">Tài khoản</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên" required error={err('full_name')}><Input value={f.full_name} onChange={set('full_name')} invalid={!!err('full_name')} /></Field>
          <Field label="Email" required error={err('email')}><Input type="email" value={f.email} onChange={set('email')} invalid={!!err('email')} /></Field>
          <Field label="Số điện thoại" error={err('phone')}><Input inputMode="tel" value={f.phone} onChange={set('phone')} invalid={!!err('phone')} /></Field>
          <Field label="Ảnh đại diện (URL)" error={err('avatar_url')}>
            <div className="flex items-center gap-2"><Avatar name={f.full_name || '?'} url={!e.avatar_url ? f.avatar_url || null : null} size={40} /><Input value={f.avatar_url} onChange={set('avatar_url')} placeholder="https://…" invalid={!!err('avatar_url')} /></div>
          </Field>
        </div>
      </section>
      <section className="mt-6 border-t border-line pt-5">
        <h3 className="mb-3 text-sm font-semibold">Chuyên môn</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Chuyên khoa" required error={err('specialty_id')}><Select value={f.specialty_id} onChange={set('specialty_id')} invalid={!!err('specialty_id')}><option value="">Chọn chuyên khoa…</option>{db.specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Phòng" required error={err('room')}><Input value={f.room} onChange={set('room')} placeholder="P.101" invalid={!!err('room')} /></Field>
          <Field label="Số năm kinh nghiệm" required error={err('years_experience')}><Input inputMode="numeric" value={f.years_experience} onChange={set('years_experience')} invalid={!!err('years_experience')} /></Field>
          <Field label="Phí khám (VND)" required error={err('consultation_fee')} hint={fee ? fmtVND(fee) : undefined}><Input inputMode="numeric" value={f.consultation_fee} onChange={set('consultation_fee')} placeholder="300000" invalid={!!err('consultation_fee')} /></Field>
          <Field label="Giới thiệu" className="sm:col-span-2"><Textarea value={f.bio} onChange={set('bio')} rows={3} /></Field>
          <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 sm:col-span-2">
            <div><div className="text-sm font-medium">Đang hoạt động</div><div className="text-xs text-muted">Bác sĩ ngừng hoạt động không nhận lịch mới</div></div>
            <Switch label="Đang hoạt động" checked={f.is_active} onChange={(v) => setF({ ...f, is_active: v })} />
          </div>
        </div>
      </section>
    </Modal>
  )
}

export function DoctorDetail({ id }: { id: string }) {
  const { doctorViews, appts, loading, deleteDoctor } = useStore()
  const toast = useToast()
  const { toggle, dialog } = useToggleActive()
  const upcoming = useUpcoming()
  const [tab, setTab] = useState<'overview' | 'slots' | 'appts' | 'stats'>('overview')
  const [edit, setEdit] = useState(false)
  const [del, setDel] = useState(false)
  const d = doctorViews.find((x) => x.id === id)
  const list = appts.filter((a) => a.doctor.id === id)
  if (!d) return <Card><EmptyState title="Không tìm thấy bác sĩ" action={<Button variant="secondary" onClick={() => navigate('/doctors')}>Về danh sách</Button>} /></Card>
  const c = statusCounts(list)
  const hasAppts = list.length > 0
  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate('/doctors')} className="mb-3 inline-flex items-center gap-1 text-13 font-medium text-muted hover:text-ink"><ArrowLeft className="size-4" />Bác sĩ</button>
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={d.profile.full_name} url={d.profile.avatar_url} size={72} className={cx(!d.is_active && 'grayscale')} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">BS. {d.profile.full_name}</h1>
              {d.is_active ? <Chip tone="green">Đang hoạt động</Chip> : <Chip>Ngừng hoạt động</Chip>}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-13 text-muted">
              <span className="font-medium text-primary">{d.specialty.name}</span>
              <span className="flex items-center gap-1"><DoorOpen className="size-3.5" />{d.room}</span>
              <span className="flex items-center gap-1"><Award className="size-3.5" />{d.years_experience} năm kinh nghiệm</span>
              <span className="num flex items-center gap-1"><Banknote className="size-3.5" />{fmtVND(d.consultation_fee)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Power className="size-4" />} onClick={() => toggle(d, !d.is_active)}>{d.is_active ? 'Ngừng hoạt động' : 'Kích hoạt'}</Button>
            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEdit(true)}>Chỉnh sửa</Button>
            {hasAppts ? (
              <Tooltip text={`Không thể xóa: bác sĩ có ${list.length} lịch hẹn. Hãy ngừng hoạt động thay thế.`}>
                <Button variant="secondary" disabled icon={<Trash2 className="size-4" />} aria-label="Xóa bác sĩ (bị chặn)">Xóa</Button>
              </Tooltip>
            ) : <Button variant="secondary" className="text-[#B91C1C]" icon={<Trash2 className="size-4" />} onClick={() => setDel(true)}>Xóa</Button>}
          </div>
        </div>
        {hasAppts && <p className="mt-3 text-xs text-muted">Bác sĩ đã có lịch hẹn nên không thể xóa. Ngừng hoạt động để ẩn khỏi đặt lịch mới.</p>}
      </Card>
      <Tabs className="mt-4" value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Tổng quan' }, { id: 'slots', label: 'Khung giờ' }, { id: 'appts', label: 'Lịch hẹn', count: list.length }, { id: 'stats', label: 'Thống kê' }]} />
      <div className="mt-4">
        {tab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h3 className="font-semibold">Giới thiệu</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{d.bio || 'Chưa có giới thiệu.'}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Info icon={<Mail className="size-4" />} label="Email" value={d.profile.email} />
                <Info icon={<Phone className="size-4" />} label="Số điện thoại" value={d.profile.phone ?? '—'} />
                <Info icon={<CalendarCheck className="size-4" />} label="Lịch hẹn sắp tới" value={String(upcoming.get(d.id) ?? 0)} />
                <Info icon={<CalendarCheck className="size-4" />} label="Ngày tham gia" value={fmtDate(d.created_at)} />
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold">Lịch sắp tới</h3>
              <ul className="mt-3 space-y-2">
                {list.filter((a) => (a.status === 'pending' || a.status === 'confirmed') && a.slot.slot_date >= todayISO()).sort((a, b) => (a.slot.slot_date + a.slot.start_time).localeCompare(b.slot.slot_date + b.slot.start_time)).slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
                    <div className="num w-14 text-center"><div className="text-sm font-bold">{a.slot.start_time}</div><div className="text-[11px] text-muted">{fmtDate(a.slot.slot_date).slice(0, 5)}</div></div>
                    <div className="min-w-0 flex-1 truncate text-sm">{a.patient.full_name}</div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
                {(upcoming.get(d.id) ?? 0) === 0 && <p className="text-13 text-muted">Không có lịch sắp tới.</p>}
              </ul>
            </Card>
          </div>
        )}
        {tab === 'slots' && <Card className="overflow-hidden"><SlotBoard doctorId={d.id} /></Card>}
        {tab === 'appts' && <Card className="overflow-hidden"><ApptHistory rows={list} show="patient" loading={loading} /></Card>}
        {tab === 'stats' && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Lượt hoàn thành" value={fmtNum(c.completed)} icon={<CalendarCheck className="size-4" />} accent="accent" hint={`${fmtPct(rate(c.completed, list.length))} tổng lịch hẹn`} />
            <KpiCard label="Lượt hủy" value={fmtNum(c.cancelled)} icon={<XCircle className="size-4" />} accent="red" hint={`Tỷ lệ hủy ${fmtPct(rate(c.cancelled, list.length))}`} />
            <KpiCard label="Lượt vắng mặt" value={fmtNum(c.no_show)} icon={<UserX className="size-4" />} accent="violet" hint={`Tỷ lệ ${fmtPct(rate(c.no_show, c.no_show + c.completed))} trên lượt đã đến hạn`} />
            <KpiCard label="Doanh thu ước tính" value={fmtVND(revenue(list))} icon={<Wallet className="size-4" />} hint={`Ước tính: ${fmtVND(d.consultation_fee)} × ${c.completed} lượt hoàn thành`} />
          </div>
        )}
      </div>
      {dialog}
      {edit && <DoctorForm doctor={d} onClose={() => setEdit(false)} />}
      <ConfirmDialog open={del} onClose={() => setDel(false)} tone="danger" title="Xóa bác sĩ" confirmLabel="Xóa vĩnh viễn"
        message={<>Xóa BS. <b className="text-ink">{d.profile.full_name}</b> cùng tài khoản và khung giờ trống? Thao tác không thể hoàn tác.</>}
        onConfirm={() => { const r = deleteDoctor(d.id); if (!r.ok) return toast({ tone: 'error', title: r.error }); toast({ tone: 'success', title: 'Đã xóa bác sĩ' }); navigate('/doctors') }} />
    </div>
  )
}
function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0"><div className="text-xs text-muted">{label}</div><div className="num truncate text-sm font-medium">{value}</div></div>
    </div>
  )
}
export { Info }
