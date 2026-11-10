'use client';
import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarPlus, ChevronLeft, ChevronRight, Lock, Trash2 } from 'lucide-react'
import { useStore } from '@/modules/admin/store/store'
import type { TimeSlot } from '@/modules/admin/store/types'
import { addDays, cx, diffDays, fmtDate, fromMin, startOfWeek, todayISO, toMin, weekday, WEEKDAYS } from '@/lib/format'
import { Button, Card, Chip, PageHeader, Segmented, Skeleton } from '@/components/ui/core'
import { Field, Input, Select } from '@/components/ui/form'
import { ConfirmDialog, Modal, useToast } from '@/components/ui/overlay'
import { TimeGridCalendar, type CalEvent } from '@/components/ui/widgets'
import { useAppointmentUI } from './appointments/AppointmentUI'
import { ErrorState } from '@/components/ui/core'

export function SlotBoard({ doctorId, showDoctor }: { doctorId: string | null; showDoctor?: boolean }) {
  const { db, appts, maps, doctorViews, deleteSlots, slotLock, loading, error, reload } = useStore()
  const { open } = useAppointmentUI()
  const toast = useToast()
  const [mode, setMode] = useState<'week' | 'day'>('week')
  const [anchor, setAnchor] = useState(todayISO())
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [confirmDel, setConfirmDel] = useState(false)
  const [gen, setGen] = useState(false)
  const days = mode === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)) : [anchor]
  const slots = db.time_slots.filter((s) => (!doctorId || s.doctor_id === doctorId) && s.slot_date >= days[0] && s.slot_date <= days[days.length - 1])
  const liveAppt = useMemo(() => new Map(appts.filter((a) => a.status !== 'cancelled').map((a) => [a.slot_id, a])), [appts])
  const events: CalEvent[] = slots.map((s) => {
    const a = liveAppt.get(s.id)
    const lock = slotLock(s)
    const docName = maps.profiles.get(maps.doctors.get(s.doctor_id)!.profile_id)!.full_name.split(' ').slice(-1)[0]
    const on = sel.has(s.id)
    return {
      id: s.id, date: s.slot_date, start: s.start_time, end: s.end_time,
      title: a ? a.patient.full_name : on ? 'Đã chọn để xóa' : 'Trống',
      sub: showDoctor ? `BS. ${docName}` : a ? a.reason ?? '' : undefined,
      color: on ? '#DC2626' : s.is_booked ? '#1E3A8A' : '#0F766E', bg: on ? '#FEE2E2' : s.is_booked ? '#DBEAFE' : '#F0FDFA', dashed: !s.is_booked && !on,
      locked: lock ?? undefined,
      onClick: () => {
        if (a) return open(a.id)
        if (lock) return toast({ tone: 'info', title: 'Khung giờ bị khóa', description: lock })
        setSel((x) => { const n = new Set(x); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n })
      },
    }
  })
  const booked = slots.filter((s) => s.is_booked).length
  const shift = (n: number) => setAnchor(addDays(anchor, mode === 'week' ? n * 7 : n))

  if (error) return <ErrorState onRetry={reload} />
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <Segmented value={mode} onChange={setMode} options={[{ id: 'day', label: 'Ngày' }, { id: 'week', label: 'Tuần' }]} />
        <Button size="sm" variant="secondary" onClick={() => setAnchor(todayISO())}>Hôm nay</Button>
        <button aria-label="Trước" onClick={() => shift(-1)} className="flex size-8 items-center justify-center rounded-md border border-line hover:bg-slate-50"><ChevronLeft className="size-4" /></button>
        <button aria-label="Sau" onClick={() => shift(1)} className="flex size-8 items-center justify-center rounded-md border border-line hover:bg-slate-50"><ChevronRight className="size-4" /></button>
        <span className="num text-sm font-semibold">{mode === 'week' ? `${fmtDate(days[0])} – ${fmtDate(days[6])}` : `${WEEKDAYS[weekday(anchor)]}, ${fmtDate(anchor)}`}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Chip tone="blue"><span className="num">{booked}</span> đã đặt</Chip>
          <Chip tone="teal"><span className="num">{slots.length - booked}</span> trống</Chip>
          {sel.size > 0 && <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" />} onClick={() => setConfirmDel(true)}>Xóa {sel.size}</Button>}
          <Button size="sm" icon={<CalendarPlus className="size-3.5" />} onClick={() => setGen(true)} disabled={doctorViews.length === 0}>Tạo khung giờ</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 border-b border-line bg-slate-50/60 px-4 py-2 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-dashed border-teal-700 bg-teal-50" />Trống, bấm để chọn xóa</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-blue-100" /><Lock className="size-3" />Đã đặt, bị khóa</span>
      </div>
      {loading ? <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : (
        <div className="max-h-[680px] overflow-y-auto">
          <TimeGridCalendar days={days} events={events} emptyHint="Chưa có khung giờ trong khoảng này. Bấm “Tạo khung giờ” để thêm." />
        </div>
      )}
      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        tone="danger"
        title="Xóa khung giờ trống"
        confirmLabel={`Xóa ${sel.size} khung giờ`}
        message={<>Xóa <b className="num text-ink">{sel.size}</b> khung giờ trống đã chọn? Bệnh nhân sẽ không thể đặt các khung giờ này.</>}
        onConfirm={() => {
          const r = deleteSlots([...sel])
          toast({ tone: 'success', title: `Đã xóa ${r.deleted} khung giờ`, description: r.skipped ? `${r.skipped} khung giờ bị khóa được giữ lại.` : undefined })
          setSel(new Set()); setConfirmDel(false)
        }}
      />
      {gen && <SlotGenerator defaultDoctor={doctorId} onClose={() => setGen(false)} />}
    </div>
  )
}

function SlotGenerator({ defaultDoctor, onClose }: { defaultDoctor: string | null; onClose: () => void }) {
  const { doctorViews, slotConflicts, addSlots } = useStore()
  const toast = useToast()
  const t = todayISO()
  const [f, setF] = useState({ doctor: defaultDoctor ?? doctorViews.find((d) => d.is_active)?.id ?? '', from: addDays(t, 1), to: addDays(t, 7), days: [1, 2, 3, 4, 5], start: '08:00', end: '11:30', len: 30, brk: 0 })
  const [touched, setTouched] = useState(false)
  const errs = {
    doctor: !f.doctor ? 'Chọn bác sĩ' : '',
    range: !f.from || !f.to ? 'Chọn khoảng ngày' : f.to < f.from ? 'Ngày kết thúc phải sau ngày bắt đầu' : f.from < t ? 'Không tạo khung giờ trong quá khứ' : diffDays(f.to, f.from) > 62 ? 'Tối đa 2 tháng mỗi lần' : '',
    time: toMin(f.end) <= toMin(f.start) ? 'Giờ kết thúc phải sau giờ bắt đầu' : toMin(f.end) - toMin(f.start) < f.len ? 'Khoảng thời gian ngắn hơn độ dài khung' : '',
    days: f.days.length === 0 ? 'Chọn ít nhất 1 ngày' : '',
    len: f.len < 10 || f.len > 240 ? 'Từ 10 đến 240 phút' : '',
  }
  const preview = useMemo(() => {
    if (errs.range || errs.time || errs.len || !f.doctor) return []
    const out: { slot_date: string; start_time: string; end_time: string; conflict: TimeSlot[] }[] = []
    for (let d = f.from; d <= f.to; d = addDays(d, 1)) {
      if (!f.days.includes(weekday(d))) continue
      for (let m = toMin(f.start); m + f.len <= toMin(f.end); m += f.len + f.brk) {
        const st = fromMin(m), en = fromMin(m + f.len)
        out.push({ slot_date: d, start_time: st, end_time: en, conflict: slotConflicts(f.doctor, d, st, en) })
      }
    }
    return out
  }, [f, errs.range, errs.time, errs.len, slotConflicts])
  const conflicts = preview.filter((p) => p.conflict.length)
  const ok = preview.filter((p) => !p.conflict.length)
  const byDate = [...new Set(preview.map((p) => p.slot_date))]
  const submit = () => {
    setTouched(true)
    if (Object.values(errs).some(Boolean) || ok.length === 0) return
    addSlots(ok.map((p) => ({ doctor_id: f.doctor, slot_date: p.slot_date, start_time: p.start_time, end_time: p.end_time })))
    toast({ tone: 'success', title: `Đã tạo ${ok.length} khung giờ`, description: conflicts.length ? `Bỏ qua ${conflicts.length} khung giờ trùng.` : undefined })
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="xl" fullscreenMobile title="Tạo khung giờ hàng loạt"
      footer={<><span className="mr-auto self-center text-13 text-muted">Sẽ tạo <b className="num text-ink">{ok.length}</b> khung giờ{conflicts.length > 0 && <>, bỏ qua <b className="num text-[#B91C1C]">{conflicts.length}</b> trùng</>}</span><Button variant="secondary" onClick={onClose}>Hủy bỏ</Button><Button onClick={submit} disabled={touched && ok.length === 0}>Tạo {ok.length} khung giờ</Button></>}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <Field label="Bác sĩ" required error={touched ? errs.doctor : ''}>
            <Select value={f.doctor} onChange={(e) => setF({ ...f, doctor: e.target.value })}>
              <option value="">Chọn bác sĩ…</option>
              {doctorViews.map((d) => <option key={d.id} value={d.id}>BS. {d.profile.full_name} · {d.specialty.name}{d.is_active ? '' : ' (ngừng hoạt động)'}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Từ ngày" required><Input type="date" min={t} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} invalid={!!errs.range} /></Field>
            <Field label="Đến ngày" required><Input type="date" min={f.from} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} invalid={!!errs.range} /></Field>
            {errs.range && <p className="col-span-2 -mt-2 text-xs font-medium text-[#B91C1C]">{errs.range}</p>}
          </div>
          <div>
            <div className="mb-1.5 text-13 font-medium text-slate-700">Ngày trong tuần <span className="text-[#DC2626]">*</span></div>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const on = f.days.includes(d)
                return <button key={d} type="button" aria-pressed={on} onClick={() => setF({ ...f, days: on ? f.days.filter((x) => x !== d) : [...f.days, d] })} className={cx('h-9 w-11 rounded-lg border text-13 font-semibold transition-colors', on ? 'border-primary bg-primary text-white' : 'border-line hover:bg-slate-50')}>{WEEKDAYS[d]}</button>
              })}
            </div>
            {errs.days && <p className="mt-1 text-xs font-medium text-[#B91C1C]">{errs.days}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Giờ bắt đầu" required><Input type="time" step={300} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} invalid={!!errs.time} /></Field>
            <Field label="Giờ kết thúc" required><Input type="time" step={300} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} invalid={!!errs.time} /></Field>
            {errs.time && <p className="col-span-2 -mt-2 text-xs font-medium text-[#B91C1C]">{errs.time}</p>}
            <Field label="Độ dài khung (phút)" error={errs.len}>
              <Select value={f.len} onChange={(e) => setF({ ...f, len: Number(e.target.value) })}>{[15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n} phút</option>)}</Select>
            </Field>
            <Field label="Nghỉ giữa các khung">
              <Select value={f.brk} onChange={(e) => setF({ ...f, brk: Number(e.target.value) })}>{[0, 5, 10, 15].map((n) => <option key={n} value={n}>{n === 0 ? 'Không nghỉ' : `${n} phút`}</option>)}</Select>
            </Field>
          </div>
        </div>
        <div className="flex min-h-0 flex-col rounded-xl border border-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold">Xem trước</span>
            <span className="text-13 text-muted"><b className="num text-ink">{preview.length}</b> khung · <b className="num text-ink">{byDate.length}</b> ngày</span>
          </div>
          {conflicts.length > 0 && (
            <div className="flex gap-2 border-b border-line bg-amber-50 px-4 py-2.5 text-13 text-[#92400E]" role="alert">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span><b className="num">{conflicts.length}</b> khung giờ chồng lấn hoặc trùng giờ bắt đầu với khung đã có và sẽ được bỏ qua.</span>
            </div>
          )}
          <div className="max-h-[380px] flex-1 space-y-3 overflow-y-auto p-4">
            {preview.length === 0 && <p className="py-8 text-center text-13 text-muted">Điền thông tin để xem trước khung giờ.</p>}
            {byDate.map((d) => (
              <div key={d}>
                <div className="mb-1.5 text-xs font-semibold text-muted"><span className="num">{WEEKDAYS[weekday(d)]} · {fmtDate(d)}</span></div>
                <div className="flex flex-wrap gap-1.5">
                  {preview.filter((p) => p.slot_date === d).map((p) => (
                    <span key={p.start_time} title={p.conflict.length ? `Trùng với ${p.conflict.map((c) => `${c.start_time}–${c.end_time}`).join(', ')}` : undefined}
                      className={cx('num rounded-md border px-2 py-1 text-xs font-bold', p.conflict.length ? 'border-red-200 bg-red-50 text-[#B91C1C] line-through' : 'border-teal-200 bg-teal-50 text-teal-800')}>
                      {p.start_time}–{p.end_time}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function SlotsPage() {
  const { doctorViews } = useStore()
  const [doctor, setDoctor] = useState<string>(doctorViews.find((d) => d.is_active)?.id ?? '')
  return (
    <div className="animate-fade-in">
      <PageHeader title="Khung giờ" description="Quản lý khung giờ khám của bác sĩ. Khung giờ đã đặt bị khóa; khung trống có thể xóa." actions={
        <Select className="w-full sm:w-72" value={doctor} onChange={(e) => setDoctor(e.target.value)} aria-label="Chọn bác sĩ">
          <option value="">Tất cả bác sĩ</option>
          {doctorViews.map((d) => <option key={d.id} value={d.id}>BS. {d.profile.full_name}{d.is_active ? '' : ' (ngừng)'}</option>)}
        </Select>
      } />
      <Card className="overflow-hidden"><SlotBoard key={doctor} doctorId={doctor || null} showDoctor={!doctor} /></Card>
    </div>
  )
}
