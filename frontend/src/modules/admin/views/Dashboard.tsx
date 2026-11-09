'use client';
import { useMemo } from 'react'
import Link from 'next/link'
import { Activity, CalendarCheck2, CalendarDays, Check, Clock3, Hourglass, PercentCircle, Stethoscope, UserX, Users, Wallet, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '@/modules/admin/store/store'
import { addDays, fmtCompactVND, fmtDate, fmtNum, fmtPct, fmtShort, fmtVND, STATUS_META, STATUSES, todayISO, WEEKDAYS_LONG, parseISODate } from '@/lib/format'
import { byDay, fillRate, inRange, pctChange, rate, revenue, statusCounts } from '@/lib/analytics'
import { Avatar, Button, Card, EmptyState, ErrorState, PageHeader, PersonCell, Skeleton, StatusBadge } from '@/components/ui/core'
import { ChartCard, KpiCard, tooltipStyle } from '@/components/ui/widgets'
import { useAppointmentUI } from './appointments/AppointmentUI'

export default function Dashboard() {
  const { appts, db, doctorViews, loading, error, reload } = useStore()
  const { open, actions } = useAppointmentUI()
  const t = todayISO()

  const k = useMemo(() => {
    const live = (a: typeof appts[number]) => a.status !== 'cancelled'
    const today = appts.filter((a) => a.slot.slot_date === t && live(a)).length
    const lastWeek = appts.filter((a) => a.slot.slot_date === addDays(t, -7) && live(a)).length
    const pending = appts.filter((a) => a.status === 'pending')
    const createdIn = (from: number, to: number) => pending.filter((a) => { const d = a.created_at.slice(0, 10); return d > addDays(t, from) && d <= addDays(t, to) }).length
    const cur = appts.filter((a) => inRange(a, addDays(t, -13), t))
    const prev = appts.filter((a) => inRange(a, addDays(t, -27), addDays(t, -14)))
    const cancel = (l: typeof appts) => rate(l.filter((a) => a.status === 'cancelled').length, l.length)
    const noshow = (l: typeof appts) => rate(l.filter((a) => a.status === 'no_show').length, l.filter((a) => a.status === 'no_show' || a.status === 'completed').length)
    const active = doctorViews.filter((d) => d.is_active).length
    const activeBefore = doctorViews.filter((d) => d.is_active && d.created_at.slice(0, 10) <= addDays(t, -30)).length
    const patients = db.profiles.filter((p) => p.role === 'patient')
    const patientsBefore = patients.filter((p) => p.created_at.slice(0, 10) <= addDays(t, -30)).length
    const fillNext = fillRate(db.time_slots, t, addDays(t, 6))
    const fillPrev = fillRate(db.time_slots, addDays(t, -7), addDays(t, -1))
    return {
      today, todayTrend: pctChange(today, lastWeek), pending: pending.length, pendingTrend: pctChange(createdIn(-7, 0), createdIn(-14, -7)),
      active, activeDelta: active - activeBefore, patients: patients.length, patientsTrend: pctChange(patients.length, patientsBefore),
      cancel: cancel(cur), cancelDelta: (cancel(cur) - cancel(prev)) * 100, noshow: noshow(cur), noshowDelta: (noshow(cur) - noshow(prev)) * 100,
      fill: fillNext, fillDelta: (fillNext.rate - fillPrev.rate) * 100, rev: revenue(cur), revTrend: pctChange(revenue(cur), revenue(prev)),
    }
  }, [appts, db, doctorViews, t])

  const series = useMemo(() => byDay(appts, addDays(t, -30), addDays(t, 14)).map((d) => ({ ...d, label: fmtShort(d.date) })), [appts, t])
  const counts = useMemo(() => statusCounts(appts), [appts])
  const donut = STATUSES.map((s) => ({ name: STATUS_META[s].label, value: counts[s], color: STATUS_META[s].color })).filter((x) => x.value)
  const bySpec = db.specialties.map((s) => ({ name: s.name, value: appts.filter((a) => a.specialty.id === s.id).length })).sort((a, b) => b.value - a.value)
  const topDocs = doctorViews
    .map((d) => ({ name: d.profile.full_name.split(' ').slice(-2).join(' '), full: d.profile.full_name, value: appts.filter((a) => a.doctor.id === d.id && a.status === 'completed').length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const pendingList = appts.filter((a) => a.status === 'pending').sort((a, b) => (a.slot.slot_date + a.slot.start_time).localeCompare(b.slot.slot_date + b.slot.start_time))
  const todayList = appts.filter((a) => a.slot.slot_date === t && a.status !== 'cancelled').sort((a, b) => a.slot.start_time.localeCompare(b.slot.start_time))

  if (error) return <Card><ErrorState onRetry={reload} /></Card>
  const L = loading
  return (
    <div className="animate-fade-in">
      <PageHeader title="Tổng quan" description={<>{WEEKDAYS_LONG[parseISODate(t).getDay()]}, {fmtDate(t)} · Dữ liệu theo ngày khám (slot_date)</>} />
      {/* ── 4 Thẻ KPI chuẩn Figma Admin ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          loading={L}
          label="Lịch hẹn hôm nay"
          value={fmtNum(k.today)}
          icon={<CalendarDays className="size-4" />}
          accent="primary"
          trend={{ delta: k.todayTrend, unit: '%' }}
          trendLabel="so với hôm qua"
        />
        <KpiCard
          loading={L}
          label="Chờ duyệt"
          value={fmtNum(k.pending)}
          icon={<Hourglass className="size-4" />}
          accent="amber"
          goodWhenUp={false}
          trend={{ delta: k.pendingTrend, unit: '%' }}
          trendLabel="cần xử lý hôm nay"
        />
        <KpiCard
          loading={L}
          label="Đã xác nhận"
          value={fmtNum(appts.filter((a) => a.status === 'confirmed').length)}
          icon={<Check className="size-4" />}
          accent="accent"
          trend={{ delta: 8, unit: '%' }}
          trendLabel="so với tuần trước"
        />
        <KpiCard
          loading={L}
          label="Hủy / Vắng mặt"
          value={fmtNum(appts.filter((a) => ['cancelled', 'no_show'].includes(a.status)).length)}
          icon={<X className="size-4" />}
          accent="red"
          goodWhenUp={false}
          trend={{ delta: -2, unit: '' }}
          trendLabel="so với tuần trước"
        />
      </div>

      {/* ── Hàng biểu đồ: 7 ngày & Chuyên khoa chuẩn Figma ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard
          loading={L}
          className="lg:col-span-2"
          title="Lịch hẹn 7 ngày gần đây"
          subtitle={`${fmtDate(addDays(t, -6))} – ${fmtDate(t)} · Tổng ${appts.filter(a => inRange(a, addDays(t, -6), t)).length} lịch hẹn`}
          actions={<Legend items={[['Lịch hẹn', '#2563EB'], ['Đã khám', '#14B8A6']]} />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={byDay(appts, addDays(t, -6), t).map((d) => {
                const dayIndex = parseISODate(d.date).getDay()
                const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
                return {
                  ...d,
                  dayName: dayLabels[dayIndex],
                }
              })}
              margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
            >
              <CartesianGrid stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="dayName" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="total" name="Tổng lịch" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={28}>
                <LabelList dataKey="total" position="top" style={{ fontSize: 11, fontWeight: 600, fill: '#64748B' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard loading={L} title="Phân bổ theo chuyên khoa" subtitle="Khối lượng lịch khám">
          <div className="space-y-4 py-2">
            {bySpec.slice(0, 5).map((spec) => {
              const maxVal = Math.max(...bySpec.map((s) => s.value), 1)
              const pct = Math.round((spec.value / maxVal) * 100)
              return (
                <div key={spec.name} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-800">{spec.name}</span>
                    <span className="font-semibold text-slate-900">{spec.value}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      {/* ── Bảng Lịch hẹn chờ duyệt chuẩn Figma ── */}
      <Card className="mt-4">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Activity className="size-4 text-[#F59E0B]" />
              Lịch hẹn chờ duyệt
            </h3>
            <p className="text-13 text-muted">{pendingList.length} lịch hẹn cần xác nhận</p>
          </div>
          <Link href="/admin/appointments" className="text-13 font-semibold text-primary hover:underline">
            Xem tất cả →
          </Link>
        </div>
        {L ? (
          <ListSkeleton />
        ) : pendingList.length === 0 ? (
          <EmptyState title="Không có lịch chờ duyệt" description="Mọi lịch hẹn đã được xử lý." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F1F5F9] text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-line">
                <tr>
                  <th className="px-5 py-3">MÃ</th>
                  <th className="px-5 py-3">BỆNH NHÂN</th>
                  <th className="px-5 py-3">BÁC SĨ</th>
                  <th className="px-5 py-3">THỜI GIAN</th>
                  <th className="px-5 py-3">LÝ DO KHÁM</th>
                  <th className="px-5 py-3 text-right">HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pendingList.slice(0, 8).map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-bold text-primary">#{a.id}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={a.patient.full_name} url={a.patient.avatar_url} size={32} />
                        <div>
                          <div className="font-semibold text-slate-900">{a.patient.full_name}</div>
                          <div className="text-xs text-muted">{a.patient.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">BS. {a.doctorProfile.full_name}</div>
                      <div className="text-xs text-muted">{a.specialty.name}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{fmtDate(a.slot.slot_date)}</div>
                      <div className="text-xs text-muted">{a.slot.start_time} - {a.slot.end_time}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 max-w-xs truncate">{a.reason || 'Khám bệnh'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-[#B91C1C] hover:bg-red-50"
                          onClick={() => actions.askCancel(a)}
                        >
                          Từ chối
                        </Button>
                        <Button
                          size="sm"
                          variant="success"
                          icon={<Check className="size-3.5" />}
                          onClick={() => actions.confirmOne(a)}
                        >
                          Duyệt
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="hidden gap-3 sm:flex">
      {items.map(([l, c]) => <span key={l} className="flex items-center gap-1.5 text-xs text-muted"><span className="h-0.5 w-3 rounded" style={{ backgroundColor: c }} />{l}</span>)}
    </div>
  )
}
export function ListSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3"><Skeleton className="h-10 w-14" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-3 w-1/3" /></div></div>
      ))}
    </div>
  )
}
