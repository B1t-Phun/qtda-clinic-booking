'use client';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { CalendarClock, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, DoorOpen, Plus, UserX, X, XCircle } from 'lucide-react'
import { useStore, type ApptView } from '@/modules/admin/store/store'
import { CANCEL_REASONS } from '@/modules/admin/store/seed'
import type { Gender, Status } from '@/modules/admin/store/types'
import { addDays, age, cx, fmtDate, fmtDateTime, fmtVND, GENDER_LABEL, normalize, STATUS_META, todayISO, WEEKDAYS } from '@/lib/format'
import { navigate } from '@/lib/router'
import { Avatar, Button, Chip, EmptyState, PersonCell, StatusBadge } from '@/components/ui/core'
import { Field, Input, SearchInput, Select, Textarea } from '@/components/ui/form'
import { ConfirmDialog, Drawer, Modal, useToast } from '@/components/ui/overlay'

const isFutureSlot = (date: string, start: string) => {
  const t = todayISO()
  if (date > t) return true
  if (date < t) return false
  const n = new Date()
  return start > `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

type Ctx = { open: (id: number) => void; create: () => void; actions: ReturnType<typeof useActionsInternal> }
const C = createContext<Ctx | null>(null)
export const useAppointmentUI = () => useContext(C)!

function useActionsInternal() {
  const store = useStore()
  const toast = useToast()
  const [cancelFor, setCancelFor] = useState<ApptView | null>(null)
  const [confirmMany, setConfirmMany] = useState<number[] | null>(null)
  const askCancel = (a: ApptView) => setCancelFor(a)
  const confirmOne = (a: ApptView) => {
    store.confirm([a.id])
    toast({ tone: 'success', title: `Đã xác nhận lịch hẹn #${a.id}`, description: `${a.patient.full_name} · ${fmtDate(a.slot.slot_date)} ${a.slot.start_time}` })
  }
  const askConfirmMany = (ids: number[]) => setConfirmMany(ids)
  return { askCancel, confirmOne, askConfirmMany, cancelFor, setCancelFor, confirmMany, setConfirmMany }
}

export function AppointmentUIProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const actions = useActionsInternal()
  const store = useStore()
  const toast = useToast()
  return (
    <C.Provider value={{ open: setOpenId, create: () => setCreating(true), actions }}>
      {children}
      <AppointmentDrawer id={openId} onClose={() => setOpenId(null)} />
      {creating && <CreateAppointment onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setOpenId(id) }} />}
      <CancelDialog appt={actions.cancelFor} onClose={() => actions.setCancelFor(null)} />
      <ConfirmDialog
        open={!!actions.confirmMany}
        onClose={() => actions.setConfirmMany(null)}
        title="Xác nhận hàng loạt"
        confirmLabel={`Xác nhận ${actions.confirmMany?.length ?? 0} lịch hẹn`}
        message={<>Bạn sắp xác nhận <b className="num text-ink">{actions.confirmMany?.length}</b> lịch hẹn đang chờ duyệt. Bệnh nhân sẽ thấy trạng thái “Đã xác nhận”.</>}
        onConfirm={() => {
          store.confirm(actions.confirmMany!)
          toast({ tone: 'success', title: `Đã xác nhận ${actions.confirmMany!.length} lịch hẹn` })
          actions.setConfirmMany(null)
        }}
      />
    </C.Provider>
  )
}

function CancelDialog({ appt, onClose }: { appt: ApptView | null; onClose: () => void }) {
  const { cancel } = useStore()
  const toast = useToast()
  const [preset, setPreset] = useState('')
  const [other, setOther] = useState('')
  const [touched, setTouched] = useState(false)
  const reason = preset === '__other' ? other.trim() : preset
  const close = () => { setPreset(''); setOther(''); setTouched(false); onClose() }
  return (
    <ConfirmDialog
      open={!!appt}
      onClose={close}
      tone="danger"
      title={`Hủy lịch hẹn #${appt?.id ?? ''}`}
      confirmLabel="Hủy lịch hẹn"
      message={appt && <>Lịch của <b className="text-ink">{appt.patient.full_name}</b> lúc <b className="num text-ink">{appt.slot.start_time} {fmtDate(appt.slot.slot_date)}</b> sẽ bị hủy và khung giờ được giải phóng.</>}
      onConfirm={() => {
        setTouched(true)
        if (!reason) return
        cancel(appt!.id, reason)
        toast({ tone: 'success', title: `Đã hủy lịch hẹn #${appt!.id}`, description: 'Khung giờ đã được mở lại để đặt.' })
        close()
      }}
    >
      <div className="space-y-3">
        <Field label="Lý do hủy" required error={touched && !reason ? 'Vui lòng nhập lý do hủy' : undefined}>
          <Select value={preset} onChange={(e) => setPreset(e.target.value)} invalid={touched && !preset}>
            <option value="">Chọn lý do…</option>
            {CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
            <option value="__other">Khác (nhập lý do)</option>
          </Select>
        </Field>
        {preset === '__other' && <Textarea autoFocus placeholder="Nhập lý do hủy…" value={other} onChange={(e) => setOther(e.target.value)} invalid={touched && !other.trim()} />}
      </div>
    </ConfirmDialog>
  )
}

function Timeline({ a }: { a: ApptView }) {
  type Step = { label: string; at?: string; state: 'done' | 'current' | 'todo' | 'bad'; status?: Status }
  const steps: Step[] = [{ label: 'Đặt lịch', at: a.created_at, state: 'done' }]
  if (a.status === 'pending') steps.push({ label: 'Chờ duyệt', state: 'current', status: 'pending' }, { label: 'Xác nhận', state: 'todo' }, { label: 'Hoàn thành / Vắng mặt', state: 'todo' })
  if (a.status === 'confirmed') steps.push({ label: 'Đã xác nhận', at: a.updated_at, state: 'current', status: 'confirmed' }, { label: 'Hoàn thành / Vắng mặt', state: 'todo' })
  if (a.status === 'completed' || a.status === 'no_show') steps.push({ label: 'Đã xác nhận', state: 'done' }, { label: STATUS_META[a.status].label, at: a.updated_at, state: a.status === 'no_show' ? 'bad' : 'current', status: a.status })
  if (a.status === 'cancelled') steps.push({ label: 'Đã hủy', at: a.updated_at, state: 'bad', status: 'cancelled' })
  return (
    <ol className="relative space-y-4 pl-1">
      {steps.map((s, i) => {
        const color = s.status ? STATUS_META[s.status].color : s.state === 'done' ? '#2563EB' : '#CBD5E1'
        return (
          <li key={i} className="relative flex gap-3">
            {i < steps.length - 1 && <span className="absolute left-[9px] top-5 h-[calc(100%)] w-px bg-line" />}
            <span className="relative z-[1] mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full border-2 bg-white" style={{ borderColor: color }}>
              {s.state !== 'todo' && <span className="size-2 rounded-full" style={{ backgroundColor: color }} />}
            </span>
            <div>
              <div className={cx('text-sm font-medium', s.state === 'todo' ? 'text-slate-400' : 'text-ink')}>{s.label}</div>
              {s.at && <div className="num text-xs text-muted">{fmtDateTime(s.at)}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex gap-3 py-2 text-sm">
    <div className="w-32 shrink-0 text-muted">{label}</div>
    <div className="min-w-0 flex-1 font-medium text-ink">{children}</div>
  </div>
)

function AppointmentDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const { actions } = useAppointmentUI()
  const [dialog, setDialog] = useState<null | 'complete' | 'no_show' | 'reschedule'>(null)
  const a = store.appts.find((x) => x.id === id)
  if (!a) return null
  const final = a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show'
  const footer = final ? (
    <div className="flex w-full items-center gap-2 text-13 text-muted"><CheckCircle2 className="size-4" />Lịch hẹn đã ở trạng thái cuối, chỉ có thể xem.</div>
  ) : (
    <>
      <Button variant="ghost" className="mr-auto" icon={<CalendarClock className="size-4" />} onClick={() => setDialog('reschedule')}>Đổi lịch</Button>
      <Button variant="secondary" className="text-[#B91C1C]" icon={<XCircle className="size-4" />} onClick={() => actions.askCancel(a)}>Hủy</Button>
      {a.status === 'pending' && <Button variant="success" icon={<Check className="size-4" />} onClick={() => actions.confirmOne(a)}>Xác nhận</Button>}
      {a.status === 'confirmed' && (
        <>
          <Button variant="secondary" icon={<UserX className="size-4" />} onClick={() => setDialog('no_show')}>Vắng mặt</Button>
          <Button icon={<CheckCircle2 className="size-4" />} onClick={() => setDialog('complete')}>Hoàn thành</Button>
        </>
      )}
    </>
  )
  return (
    <>
      <Drawer open onClose={onClose} title={<span className="flex items-center gap-2.5"><span className="num">Lịch hẹn #{a.id}</span><StatusBadge status={a.status} /></span>} subtitle={`${a.specialty.name} · ${a.doctor.room ?? '—'}`} footer={footer}>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
          {[
            { icon: CalendarClock, label: 'Ngày', v: fmtDate(a.slot.slot_date), sub: WEEKDAYS[new Date(a.slot.slot_date + 'T00:00').getDay()] },
            { icon: Clock, label: 'Giờ', v: `${a.slot.start_time}–${a.slot.end_time}` },
            { icon: DoorOpen, label: 'Phòng', v: a.doctor.room ?? '—' },
          ].map((x) => (
            <div key={x.label} className="rounded-lg bg-white p-2.5">
              <div className="flex items-center gap-1 text-xs text-muted"><x.icon className="size-3.5" />{x.label}</div>
              <div className="num mt-0.5 text-[15px] font-bold">{x.v}</div>
            </div>
          ))}
        </div>

        <section className="mt-5">
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Bệnh nhân</h3>
          <button onClick={() => { onClose(); navigate(`/patients/${a.patient.id}`) }} className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition-colors hover:bg-slate-50">
            <Avatar name={a.patient.full_name} url={a.patient.avatar_url} size={44} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{a.patient.full_name}</div>
              <div className="num text-13 text-muted">{a.patient.phone ?? '—'} · {a.patient.gender ? GENDER_LABEL[a.patient.gender] : '—'}{a.patient.date_of_birth ? ` · ${age(a.patient.date_of_birth)} tuổi` : ''}</div>
              <div className="truncate text-xs text-muted">{a.patient.email}</div>
            </div>
            <ChevronRight className="size-4 text-slate-400" />
          </button>
        </section>
        <section className="mt-4">
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Bác sĩ</h3>
          <button onClick={() => { onClose(); navigate(`/doctors/${a.doctor.id}`) }} className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition-colors hover:bg-slate-50">
            <Avatar name={a.doctorProfile.full_name} url={a.doctorProfile.avatar_url} size={44} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">BS. {a.doctorProfile.full_name}</div>
              <div className="text-13 text-muted">{a.specialty.name} · Phí khám <span className="num font-semibold text-ink">{fmtVND(a.doctor.consultation_fee)}</span></div>
            </div>
            <ChevronRight className="size-4 text-slate-400" />
          </button>
        </section>
        <section className="mt-4 divide-y divide-line">
          <Row label="Lý do khám">{a.reason || <span className="text-slate-400">—</span>}</Row>
          <Row label="Ghi chú bác sĩ">{a.doctor_note || <span className="font-normal text-slate-400">Chưa có ghi chú</span>}</Row>
          {(a.status === 'cancelled' || a.cancel_reason) && <Row label="Lý do hủy"><span className="text-[#B91C1C]">{a.cancel_reason || '—'}</span></Row>}
          <Row label="Ngày tạo"><span className="num">{fmtDateTime(a.created_at)}</span></Row>
          <Row label="Cập nhật lần cuối"><span className="num">{fmtDateTime(a.updated_at)}</span></Row>
        </section>
        <section className="mt-5">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">Tiến trình trạng thái</h3>
          <Timeline a={a} />
        </section>
      </Drawer>
      <ConfirmDialog
        open={dialog === 'complete'}
        onClose={() => setDialog(null)}
        title="Đánh dấu hoàn thành"
        confirmLabel="Hoàn thành"
        message={<>Xác nhận bệnh nhân <b className="text-ink">{a.patient.full_name}</b> đã khám xong lịch #{a.id}?</>}
        onConfirm={() => { store.complete(a.id); toast({ tone: 'success', title: `Lịch hẹn #${a.id} đã hoàn thành` }); setDialog(null) }}
      />
      <ConfirmDialog
        open={dialog === 'no_show'}
        onClose={() => setDialog(null)}
        tone="danger"
        title="Đánh dấu vắng mặt"
        confirmLabel="Đánh dấu vắng mặt"
        message={<>Bệnh nhân <b className="text-ink">{a.patient.full_name}</b> không đến khám? Thao tác này không thể hoàn tác.</>}
        onConfirm={() => { store.noShow(a.id); toast({ tone: 'success', title: `Đã đánh dấu vắng mặt #${a.id}` }); setDialog(null) }}
      />
      {dialog === 'reschedule' && <RescheduleModal a={a} onClose={() => setDialog(null)} />}
    </>
  )
}

function SlotPicker({ doctorId, value, onChange, excludeId }: { doctorId: string; value: string | null; onChange: (id: string) => void; excludeId?: string }) {
  const { db } = useStore()
  const free = db.time_slots.filter((s) => s.doctor_id === doctorId && !s.is_booked && s.id !== excludeId && isFutureSlot(s.slot_date, s.start_time))
  const byDate = useMemo(() => {
    const m = new Map<string, typeof free>()
    free.sort((a, b) => (a.slot_date + a.start_time).localeCompare(b.slot_date + b.start_time)).forEach((s) => m.set(s.slot_date, [...(m.get(s.slot_date) ?? []), s]))
    return [...m.entries()]
  }, [free])
  const [date, setDate] = useState<string | null>(null)
  const active = date ?? byDate[0]?.[0]
  if (byDate.length === 0) return <EmptyState title="Không còn khung giờ trống" description="Bác sĩ chưa có khung giờ trống sắp tới. Hãy tạo thêm ở mục Khung giờ." />
  return (
    <div>
      <div className="text-13 font-medium text-slate-700">Chọn ngày</div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {byDate.map(([d, list]) => (
          <button key={d} type="button" onClick={() => setDate(d)} className={cx('flex min-w-[76px] flex-col items-center rounded-lg border px-3 py-2 transition-colors', active === d ? 'border-primary bg-blue-50 text-primary' : 'border-line hover:border-slate-300')}>
            <span className="text-xs font-medium">{WEEKDAYS[new Date(d + 'T00:00').getDay()]}</span>
            <span className="num text-[15px] font-bold">{fmtDate(d).slice(0, 5)}</span>
            <span className="text-[11px] text-muted">{list.length} trống</span>
          </button>
        ))}
      </div>
      <div className="mt-4 text-13 font-medium text-slate-700">Khung giờ trống</div>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {byDate.find(([d]) => d === active)?.[1].map((s) => (
          <button key={s.id} type="button" onClick={() => onChange(s.id)} className={cx('num rounded-lg border py-2.5 text-sm font-bold transition-colors', value === s.id ? 'border-primary bg-primary text-white' : 'border-line hover:border-primary hover:text-primary')}>
            {s.start_time}–{s.end_time}
          </button>
        ))}
      </div>
    </div>
  )
}

function RescheduleModal({ a, onClose }: { a: ApptView; onClose: () => void }) {
  const { reschedule, maps } = useStore()
  const toast = useToast()
  const [slot, setSlot] = useState<string | null>(null)
  const ns = slot ? maps.slots.get(slot) : null
  return (
    <Modal
      open
      onClose={onClose}
      fullscreenMobile
      title={`Đổi lịch #${a.id}`}
      footer={<><Button variant="secondary" onClick={onClose}>Hủy bỏ</Button><Button disabled={!slot} onClick={() => {
        const r = reschedule(a.id, slot!)
        if (!r.ok) return toast({ tone: 'error', title: r.error })
        toast({ tone: 'success', title: `Đã đổi lịch #${a.id}`, description: `Sang ${ns!.start_time} ${fmtDate(ns!.slot_date)}` })
        onClose()
      }}>Lưu thay đổi</Button></>}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm">
        <span className="text-muted">Hiện tại:</span>
        <span className="num font-bold">{a.slot.start_time}–{a.slot.end_time} · {fmtDate(a.slot.slot_date)}</span>
        {ns && <><ChevronRight className="size-4 text-slate-400" /><span className="num font-bold text-primary">{ns.start_time}–{ns.end_time} · {fmtDate(ns.slot_date)}</span></>}
      </div>
      <p className="mb-3 text-13 text-muted">Chỉ hiển thị khung giờ trống của BS. {a.doctorProfile.full_name}.</p>
      <SlotPicker doctorId={a.doctor.id} value={slot} onChange={setSlot} excludeId={a.slot.id} />
    </Modal>
  )
}

// ---------- Create appointment stepper ----------
const STEPS = ['Bệnh nhân', 'Chuyên khoa', 'Bác sĩ', 'Ngày', 'Khung giờ', 'Lý do', 'Xác nhận']
const phoneOk = (s: string) => /^0\d{9}$/.test(s.trim())
const emailOk = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim())

function CreateAppointment({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const store = useStore()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [newMode, setNewMode] = useState(false)
  const [np, setNp] = useState({ full_name: '', phone: '', email: '', gender: '' as Gender | '', date_of_birth: '' })
  const [npTouched, setNpTouched] = useState(false)
  const [q, setQ] = useState('')
  const [spId, setSpId] = useState<string | null>(null)
  const [docId, setDocId] = useState<string | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [slotId, setSlotId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [reasonTouched, setReasonTouched] = useState(false)
  const [status, setStatus] = useState<Status>('confirmed')

  const patients = store.db.profiles.filter((p) => p.role === 'patient')
  const nq = normalize(q)
  const plist = patients.filter((p) => !nq || normalize(p.full_name).includes(nq) || (p.phone ?? '').includes(nq)).slice(0, 8)
  const docs = store.doctorViews.filter((d) => d.is_active && d.specialty_id === spId)
  const freeSlots = store.db.time_slots.filter((s) => s.doctor_id === docId && !s.is_booked && isFutureSlot(s.slot_date, s.start_time))
  const dates = Array.from({ length: 21 }, (_, i) => addDays(todayISO(), i))
  const npErr = {
    full_name: !np.full_name.trim() ? 'Nhập họ tên' : '',
    phone: !phoneOk(np.phone) ? 'Số điện thoại gồm 10 số, bắt đầu bằng 0' : '',
    email: !emailOk(np.email) ? 'Email không hợp lệ' : store.emailTaken(np.email) ? 'Email đã được sử dụng' : '',
  }
  const patient = patientId ? store.maps.profiles.get(patientId) : null
  const doctor = store.doctorViews.find((d) => d.id === docId)
  const slot = slotId ? store.maps.slots.get(slotId) : null

  const canNext = [
    newMode ? true : !!patientId, !!spId, !!docId, !!date, !!slotId, reason.trim().length > 0, true,
  ][step]
  const next = () => {
    if (step === 0 && newMode) {
      setNpTouched(true)
      if (Object.values(npErr).some(Boolean)) return
      const p = store.saveProfile({ full_name: np.full_name.trim(), phone: np.phone.trim(), email: np.email.trim(), gender: np.gender || null, date_of_birth: np.date_of_birth || null })
      setPatientId(p.id)
      setNewMode(false)
      toast({ tone: 'success', title: 'Đã tạo hồ sơ bệnh nhân', description: p.full_name })
    }
    if (step === 5 && !reason.trim()) return setReasonTouched(true)
    if (step === 6) {
      const id = store.createAppointment({ patient_id: patientId!, doctor_id: docId!, slot_id: slotId!, reason: reason.trim(), status })
      toast({ tone: 'success', title: `Đã tạo lịch hẹn #${id}`, description: `${patient!.full_name} · ${slot!.start_time} ${fmtDate(slot!.slot_date)}` })
      return onCreated(id)
    }
    setStep(step + 1)
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      fullscreenMobile
      title="Tạo lịch hẹn"
      footer={
        <>
          {step > 0 && <Button variant="ghost" className="mr-auto" icon={<ChevronLeft className="size-4" />} onClick={() => setStep(step - 1)}>Quay lại</Button>}
          <Button variant="secondary" onClick={onClose}>Hủy bỏ</Button>
          <Button onClick={next} disabled={!canNext && step !== 5}>{step === 6 ? 'Tạo lịch hẹn' : step === 0 && newMode ? 'Tạo bệnh nhân & tiếp tục' : 'Tiếp tục'}</Button>
        </>
      }
    >
      <ol className="mb-6 flex items-center gap-1" aria-label="Các bước">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col items-center gap-1.5">
            <div className={cx('h-1.5 w-full rounded-full transition-colors duration-200', i <= step ? 'bg-primary' : 'bg-slate-200')} />
            <span className={cx('hidden text-[11.5px] font-medium sm:block', i === step ? 'text-primary' : i < step ? 'text-ink' : 'text-slate-400')}>{s}</span>
          </li>
        ))}
      </ol>
      <div className="mb-4 sm:hidden"><span className="text-xs text-muted">Bước {step + 1}/7 ·</span> <span className="text-sm font-semibold">{STEPS[step]}</span></div>

      {step === 0 && !newMode && (
        <div>
          <div className="flex gap-2">
            <SearchInput className="flex-1" value={q} onChange={setQ} placeholder="Tìm theo tên hoặc số điện thoại" />
            <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setNewMode(true)}>Bệnh nhân mới</Button>
          </div>
          <div className="mt-3 space-y-1.5">
            {plist.length === 0 && <EmptyState kind="search" title="Không tìm thấy bệnh nhân" action={<Button variant="secondary" onClick={() => setNewMode(true)}>Tạo bệnh nhân mới</Button>} />}
            {plist.map((p) => (
              <button key={p.id} onClick={() => setPatientId(p.id)} className={cx('flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors', patientId === p.id ? 'border-primary bg-blue-50' : 'border-line hover:bg-slate-50')}>
                <PersonCell name={p.full_name} url={p.avatar_url} sub={<span className="num">{p.phone}</span>} />
                <span className="ml-auto text-xs text-muted">{p.date_of_birth ? `${age(p.date_of_birth)} tuổi` : ''}</span>
                {patientId === p.id && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 0 && newMode && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên" required error={npTouched ? npErr.full_name : ''} className="sm:col-span-2"><Input value={np.full_name} onChange={(e) => setNp({ ...np, full_name: e.target.value })} invalid={npTouched && !!npErr.full_name} /></Field>
          <Field label="Số điện thoại" required error={npTouched ? npErr.phone : ''}><Input inputMode="tel" value={np.phone} onChange={(e) => setNp({ ...np, phone: e.target.value })} invalid={npTouched && !!npErr.phone} /></Field>
          <Field label="Email" required error={npTouched ? npErr.email : ''}><Input type="email" value={np.email} onChange={(e) => setNp({ ...np, email: e.target.value })} invalid={npTouched && !!npErr.email} /></Field>
          <Field label="Giới tính"><Select value={np.gender} onChange={(e) => setNp({ ...np, gender: e.target.value as Gender })}><option value="">Chọn…</option>{(['male', 'female', 'other'] as Gender[]).map((g) => <option key={g} value={g}>{GENDER_LABEL[g]}</option>)}</Select></Field>
          <Field label="Ngày sinh"><Input type="date" max={todayISO()} value={np.date_of_birth} onChange={(e) => setNp({ ...np, date_of_birth: e.target.value })} /></Field>
          <button onClick={() => setNewMode(false)} className="text-left text-13 font-medium text-primary sm:col-span-2">← Chọn bệnh nhân có sẵn</button>
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {store.db.specialties.map((s) => {
            const n = store.doctorViews.filter((d) => d.is_active && d.specialty_id === s.id).length
            return (
              <button key={s.id} disabled={n === 0} onClick={() => { setSpId(s.id); setDocId(null); setDate(null); setSlotId(null) }} className={cx('rounded-xl border p-3.5 text-left transition-colors disabled:opacity-50', spId === s.id ? 'border-primary bg-blue-50' : 'border-line hover:bg-slate-50')}>
                <div className="font-semibold">{s.name}</div>
                <div className="mt-0.5 text-xs text-muted">{n} bác sĩ đang hoạt động</div>
              </button>
            )
          })}
        </div>
      )}
      {step === 2 && (
        <div className="space-y-2">
          {docs.map((d) => {
            const free = store.db.time_slots.filter((s) => s.doctor_id === d.id && !s.is_booked && isFutureSlot(s.slot_date, s.start_time)).length
            return (
              <button key={d.id} onClick={() => { setDocId(d.id); setDate(null); setSlotId(null) }} className={cx('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors', docId === d.id ? 'border-primary bg-blue-50' : 'border-line hover:bg-slate-50')}>
                <PersonCell size={40} name={`BS. ${d.profile.full_name}`} url={d.profile.avatar_url} sub={`${d.room ?? '—'} · ${d.years_experience} năm kinh nghiệm`} />
                <div className="ml-auto text-right">
                  <div className="num text-sm font-bold">{fmtVND(d.consultation_fee)}</div>
                  <div className={cx('text-xs', free ? 'text-teal-700' : 'text-[#B91C1C]')}>{free} khung trống</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
      {step === 3 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {dates.map((d) => {
            const n = freeSlots.filter((s) => s.slot_date === d).length
            return (
              <button key={d} disabled={n === 0} onClick={() => { setDate(d); setSlotId(null) }} className={cx('flex flex-col items-center rounded-lg border py-2 transition-colors disabled:opacity-40', date === d ? 'border-primary bg-blue-50 text-primary' : 'border-line hover:border-slate-300')}>
                <span className="text-[11px] font-medium">{WEEKDAYS[new Date(d + 'T00:00').getDay()]}</span>
                <span className="num text-sm font-bold">{fmtDate(d).slice(0, 5)}</span>
                <span className={cx('text-[10.5px]', n ? 'text-teal-700' : 'text-slate-400')}>{n ? `${n} trống` : 'Hết'}</span>
              </button>
            )
          })}
        </div>
      )}
      {step === 4 && (
        <div>
          <p className="mb-3 text-13 text-muted">Khung giờ trống ngày <b className="num text-ink">{fmtDate(date)}</b></p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {freeSlots.filter((s) => s.slot_date === date).sort((a, b) => a.start_time.localeCompare(b.start_time)).map((s) => (
              <button key={s.id} onClick={() => setSlotId(s.id)} className={cx('num rounded-lg border py-2.5 text-sm font-bold transition-colors', slotId === s.id ? 'border-primary bg-primary text-white' : 'border-line hover:border-primary hover:text-primary')}>{s.start_time}–{s.end_time}</button>
            ))}
          </div>
        </div>
      )}
      {step === 5 && (
        <Field label="Lý do khám" required error={reasonTouched && !reason.trim() ? 'Vui lòng nhập lý do khám' : undefined}>
          <Textarea autoFocus rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: Sốt, ho kéo dài 3 ngày" invalid={reasonTouched && !reason.trim()} />
        </Field>
      )}
      {step === 6 && patient && doctor && slot && (
        <div className="space-y-4">
          <div className="divide-y divide-line rounded-xl border border-line px-4">
            <Row label="Bệnh nhân">{patient.full_name} <span className="num font-normal text-muted">· {patient.phone}</span></Row>
            <Row label="Chuyên khoa">{doctor.specialty.name}</Row>
            <Row label="Bác sĩ">BS. {doctor.profile.full_name}</Row>
            <Row label="Thời gian"><span className="num">{slot.start_time}–{slot.end_time} · {fmtDate(slot.slot_date)}</span></Row>
            <Row label="Phòng">{doctor.room ?? '—'}</Row>
            <Row label="Phí khám"><span className="num">{fmtVND(doctor.consultation_fee)}</span></Row>
            <Row label="Lý do khám">{reason}</Row>
          </div>
          <Field label="Trạng thái ban đầu">
            <div className="flex gap-2">
              {(['confirmed', 'pending'] as Status[]).map((s) => (
                <button key={s} onClick={() => setStatus(s)} className={cx('flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 transition-colors', status === s ? 'border-primary bg-blue-50' : 'border-line')}>
                  <StatusBadge status={s} />
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}
      {step > 0 && patient && step < 6 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-xs">
          <Chip>{patient.full_name}</Chip>
          {spId && <Chip tone="blue">{store.maps.specialties.get(spId)?.name}</Chip>}
          {doctor && <Chip tone="teal">BS. {doctor.profile.full_name}</Chip>}
          {date && <Chip><span className="num">{fmtDate(date)}</span></Chip>}
          {slot && <Chip><span className="num">{slot.start_time}</span></Chip>}
          <button className="ml-auto text-slate-400 hover:text-ink" aria-label="Bắt đầu lại" onClick={() => { setStep(0); setSpId(null); setDocId(null); setDate(null); setSlotId(null) }}><X className="size-4" /></button>
        </div>
      )}
    </Modal>
  )
}
export { SlotPicker, isFutureSlot }
