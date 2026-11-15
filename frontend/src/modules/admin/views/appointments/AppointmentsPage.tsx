'use client';
import { useMemo, useState } from 'react'
import { CalendarDays, CalendarPlus, CheckCheck, ChevronLeft, ChevronRight, Download, List } from 'lucide-react'
import { useStore, type ApptView } from '@/modules/admin/store/store'
import type { Status } from '@/modules/admin/store/types'
import { addDays, cx, downloadCSV, fmtDate, fmtDateTime, normalize, STATUS_META, STATUSES, startOfWeek, todayISO } from '@/lib/format'
import { Button, Card, PageHeader, PersonCell, Segmented, StatusBadge } from '@/components/ui/core'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Input, MultiSelect, SearchInput, Select } from '@/components/ui/form'
import { FilterBar, FilterItem, TimeGridCalendar } from '@/components/ui/widgets'
import { useAppointmentUI } from './AppointmentUI'
import { useToast } from '@/components/ui/overlay'

export default function AppointmentsPage() {
  const { appts, db, doctorViews, loading, error, reload } = useStore()
  const { open, create, actions } = useAppointmentUI()
  const toast = useToast()
  const [view, setView] = useState<'table' | 'calendar'>('table')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [doctor, setDoctor] = useState('')
  const [spec, setSpec] = useState('')
  const [statuses, setStatuses] = useState<Status[]>([])
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [weekStart, setWeekStart] = useState(startOfWeek(todayISO()))
  const [day, setDay] = useState(todayISO())

  const active = [q, from, to, doctor, spec].filter(Boolean).length + (statuses.length ? 1 : 0)
  const clear = () => { setQ(''); setFrom(''); setTo(''); setDoctor(''); setSpec(''); setStatuses([]) }
  const filtered = useMemo(() => {
    const n = normalize(q.trim().replace(/^#/, ''))
    return appts.filter((a) =>
      (!n || normalize(a.patient.full_name).includes(n) || (a.patient.phone ?? '').includes(n) || String(a.id).includes(n)) &&
      (!from || a.slot.slot_date >= from) && (!to || a.slot.slot_date <= to) &&
      (!doctor || a.doctor.id === doctor) && (!spec || a.specialty.id === spec) && (!statuses.length || statuses.includes(a.status)))
  }, [appts, q, from, to, doctor, spec, statuses])
  const selectedPending = [...selected].filter((id) => appts.find((a) => a.id === id)?.status === 'pending') as number[]

  const columns: Column<ApptView>[] = [
    { id: 'id', header: 'Mã', cell: (a) => <span className="num font-bold text-primary">#{a.id}</span>, sort: (a) => a.id, width: 80 },
    { id: 'patient', header: 'Bệnh nhân', cell: (a) => <PersonCell name={a.patient.full_name} url={a.patient.avatar_url} sub={<span className="num">{a.patient.phone}</span>} />, sort: (a) => a.patient.full_name },
    { id: 'doctor', header: 'Bác sĩ', cell: (a) => <PersonCell name={a.doctorProfile.full_name} url={a.doctorProfile.avatar_url} sub={a.specialty.name} />, sort: (a) => a.doctorProfile.full_name },
    { id: 'date', header: 'Ngày', cell: (a) => <span className="num font-semibold whitespace-nowrap">{fmtDate(a.slot.slot_date)}</span>, sort: (a) => a.slot.slot_date + a.slot.start_time },
    { id: 'time', header: 'Giờ', cell: (a) => <span className="num whitespace-nowrap">{a.slot.start_time}–{a.slot.end_time}</span>, sort: (a) => a.slot.start_time },
    { id: 'room', header: 'Phòng', cell: (a) => a.doctor.room ?? '—', sort: (a) => a.doctor.room ?? '', className: 'hidden lg:table-cell' },
    { id: 'status', header: 'Trạng thái', cell: (a) => <StatusBadge status={a.status} />, sort: (a) => STATUSES.indexOf(a.status) },
    { id: 'reason', header: 'Lý do khám', cell: (a) => <span className="line-clamp-2 max-w-[160px] min-w-[110px] text-slate-600">{a.reason ?? '—'}</span>, className: 'hidden xl:table-cell' },
    { id: 'created', header: 'Ngày tạo', cell: (a) => <span className="num text-13 whitespace-nowrap text-muted">{fmtDateTime(a.created_at)}</span>, sort: (a) => a.created_at, className: 'hidden 2xl:table-cell' },
  ]

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const events = filtered
    .filter((a) => a.status !== 'cancelled' || statuses.includes('cancelled'))
    .map((a) => ({
      id: String(a.id), date: a.slot.slot_date, start: a.slot.start_time, end: a.slot.end_time, title: a.patient.full_name, sub: `BS. ${a.doctorProfile.full_name.split(' ').slice(-1)}`,
      color: STATUS_META[a.status].text, bg: `${STATUS_META[a.status].color}1f`, onClick: () => open(a.id),
    }))

  const exportCsv = () => {
    downloadCSV(`lich-hen-${todayISO()}.csv`, [
      ['Mã', 'Bệnh nhân', 'SĐT', 'Bác sĩ', 'Chuyên khoa', 'Ngày', 'Giờ', 'Phòng', 'Trạng thái', 'Lý do khám', 'Ngày tạo'],
      ...filtered.map((a) => [a.id, a.patient.full_name, a.patient.phone ?? '', a.doctorProfile.full_name, a.specialty.name, fmtDate(a.slot.slot_date), `${a.slot.start_time}-${a.slot.end_time}`, a.doctor.room ?? '', STATUS_META[a.status].label, a.reason ?? '', fmtDateTime(a.created_at)]),
    ])
    toast({ tone: 'success', title: `Đã xuất ${filtered.length} lịch hẹn ra CSV` })
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Lịch hẹn"
        description={<><span className="num font-semibold text-ink">{appts.length}</span> lịch hẹn · <span className="num font-semibold text-[#B45309]">{appts.filter((a) => a.status === 'pending').length}</span> chờ duyệt</>}
        actions={<>
          <Segmented value={view} onChange={setView} options={[{ id: 'table', label: 'Bảng', icon: <List className="size-4" /> }, { id: 'calendar', label: 'Lịch', icon: <CalendarDays className="size-4" /> }]} />
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={exportCsv}><span className="hidden sm:inline">Xuất CSV</span></Button>
          <Button icon={<CalendarPlus className="size-4" />} onClick={create}>Tạo lịch hẹn</Button>
        </>}
      />
      <Card className="overflow-hidden">
        <FilterBar activeCount={active} onClear={clear} search={<SearchInput value={q} onChange={setQ} placeholder="Tên, SĐT, mã #" />}>
          <FilterItem label="Từ ngày" className="min-w-[140px]"><Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></FilterItem>
          <FilterItem label="Đến ngày" className="min-w-[140px]"><Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></FilterItem>
          <FilterItem label="Chuyên khoa"><Select value={spec} onChange={(e) => { setSpec(e.target.value); setDoctor('') }}><option value="">Tất cả</option>{db.specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></FilterItem>
          <FilterItem label="Bác sĩ" className="min-w-[180px]"><Select value={doctor} onChange={(e) => setDoctor(e.target.value)}><option value="">Tất cả</option>{doctorViews.filter((d) => !spec || d.specialty_id === spec).map((d) => <option key={d.id} value={d.id}>BS. {d.profile.full_name}</option>)}</Select></FilterItem>
          <FilterItem label="Trạng thái" className="min-w-[150px]"><MultiSelect placeholder="Tất cả" value={statuses} onChange={setStatuses} options={STATUSES.map((s) => ({ id: s, label: STATUS_META[s].label }))} renderOption={(s) => <StatusBadge status={s} />} /></FilterItem>
        </FilterBar>

        {view === 'table' ? (
          <>
            {selected.size > 0 && (
              <div className="flex flex-wrap items-center gap-3 border-b border-line bg-blue-50/70 px-4 py-2.5 text-sm animate-fade-in">
                <span><b className="num">{selected.size}</b> đã chọn</span>
                <Button size="sm" variant="success" icon={<CheckCheck className="size-4" />} disabled={!selectedPending.length} onClick={() => { actions.askConfirmMany(selectedPending); setSelected(new Set()) }}>
                  Xác nhận {selectedPending.length} lịch chờ duyệt
                </Button>
                <button className="text-13 font-medium text-muted hover:text-ink" onClick={() => setSelected(new Set())}>Bỏ chọn</button>
              </div>
            )}
            <DataTable
              rows={filtered}
              rowKey={(a) => a.id}
              columns={columns}
              defaultSort={{ id: 'date', dir: 'desc' }}
              selectable
              isSelectable={(a) => a.status === 'pending'}
              selected={selected}
              onSelectedChange={setSelected}
              onRowClick={(a) => open(a.id)}
              loading={loading}
              error={error}
              onRetry={reload}
              filtered={active > 0}
              onClearFilters={clear}
              emptyTitle="Chưa có lịch hẹn"
              emptyDescription="Tạo lịch hẹn đầu tiên cho bệnh nhân."
              emptyAction={<Button onClick={create}>Tạo lịch hẹn</Button>}
              mobileCard={(a) => (
                <div className="pr-6">
                  <div className="flex items-center justify-between gap-2">
                    <span className="num text-13 font-bold text-primary">#{a.id}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="mt-2"><PersonCell name={a.patient.full_name} url={a.patient.avatar_url} sub={<span className="num">{a.patient.phone}</span>} /></div>
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-13 text-slate-600">
                    <span className="num font-semibold text-ink">{fmtDate(a.slot.slot_date)} · {a.slot.start_time}–{a.slot.end_time}</span>
                    <span>BS. {a.doctorProfile.full_name}</span>
                    <span>{a.specialty.name} · {a.doctor.room}</span>
                  </div>
                </div>
              )}
            />
          </>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <Button size="sm" variant="secondary" onClick={() => { setWeekStart(startOfWeek(todayISO())); setDay(todayISO()) }}>Hôm nay</Button>
              <button aria-label="Trước" onClick={() => { setWeekStart(addDays(weekStart, -7)); setDay(addDays(day, -1)) }} className="hidden size-8 items-center justify-center rounded-md border border-line hover:bg-slate-50 md:flex"><ChevronLeft className="size-4" /></button>
              <button aria-label="Sau" onClick={() => { setWeekStart(addDays(weekStart, 7)); setDay(addDays(day, 1)) }} className="hidden size-8 items-center justify-center rounded-md border border-line hover:bg-slate-50 md:flex"><ChevronRight className="size-4" /></button>
              <span className="num hidden text-sm font-semibold md:inline">{fmtDate(days[0])} – {fmtDate(days[6])}</span>
              <div className="flex items-center gap-1 md:hidden">
                <button aria-label="Ngày trước" onClick={() => setDay(addDays(day, -1))} className="flex size-8 items-center justify-center rounded-md border border-line"><ChevronLeft className="size-4" /></button>
                <span className="num px-2 text-sm font-semibold">{fmtDate(day)}</span>
                <button aria-label="Ngày sau" onClick={() => setDay(addDays(day, 1))} className="flex size-8 items-center justify-center rounded-md border border-line"><ChevronRight className="size-4" /></button>
              </div>
              <div className="ml-auto hidden flex-wrap gap-3 lg:flex">
                {STATUSES.filter((s) => s !== 'cancelled' || statuses.includes('cancelled')).map((s) => <span key={s} className="flex items-center gap-1.5 text-xs text-muted"><span className="size-2 rounded-full" style={{ backgroundColor: STATUS_META[s].color }} />{STATUS_META[s].label}</span>)}
              </div>
            </div>
            <div className={cx('max-h-[680px] overflow-y-auto', loading && 'opacity-50')}>
              <div className="hidden md:block"><TimeGridCalendar days={days} events={events} emptyHint="Không có lịch hẹn trong tuần này" /></div>
              <div className="md:hidden"><TimeGridCalendar days={[day]} events={events} emptyHint="Không có lịch hẹn trong ngày" /></div>
            </div>
            <p className="border-t border-line px-4 py-2.5 text-xs text-muted">Lịch đã hủy được ẩn khỏi lịch, chọn trạng thái “Đã hủy” trong bộ lọc để hiển thị.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
