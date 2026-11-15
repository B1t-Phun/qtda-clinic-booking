'use client';
import { useMemo, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '@/modules/admin/store/store'
import { addDays, cx, downloadCSV, fmtCompactVND, fmtDate, fmtNum, fmtPct, fmtShort, fmtVND, STATUS_META, STATUSES, todayISO } from '@/lib/format'
import { byDay, inRange, rate, revenue, statusCounts } from '@/lib/analytics'
import { Button, Card, EmptyState, ErrorState, PageHeader } from '@/components/ui/core'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/form'
import { ChartCard, tooltipStyle } from '@/components/ui/widgets'
import { useToast } from '@/components/ui/overlay'

const PRESETS = [
  { id: '7', label: '7 ngày qua', range: (t: string) => [addDays(t, -6), t] },
  { id: '30', label: '30 ngày qua', range: (t: string) => [addDays(t, -29), t] },
  { id: 'next14', label: '14 ngày tới', range: (t: string) => [t, addDays(t, 13)] },
  { id: 'all', label: 'Toàn bộ', range: (t: string) => [addDays(t, -30), addDays(t, 14)] },
]

export default function ReportsPage() {
  const { appts, db, doctorViews, loading, error, reload } = useStore()
  const toast = useToast()
  const t = todayISO()
  const [preset, setPreset] = useState('30')
  const [from, setFrom] = useState(addDays(t, -29))
  const [to, setTo] = useState(t)
  const pick = (id: string) => { const p = PRESETS.find((x) => x.id === id)!; const [a, b] = p.range(t); setPreset(id); setFrom(a); setTo(b) }
  const list = useMemo(() => appts.filter((a) => inRange(a, from, to)), [appts, from, to])
  const c = statusCounts(list)
  const days = useMemo(() => (from && to && from <= to ? byDay(list, from, to).map((d) => ({ ...d, label: fmtShort(d.date) })) : []), [list, from, to])
  const docRows = doctorViews.map((d) => {
    const l = list.filter((a) => a.doctor.id === d.id)
    const s = statusCounts(l)
    return { id: d.id, name: d.profile.full_name, spec: d.specialty.name, fee: d.consultation_fee, total: l.length, ...s, cancelRate: rate(s.cancelled, l.length), rev: revenue(l) }
  })
  const specRows = db.specialties.map((sp) => {
    const l = list.filter((a) => a.specialty.id === sp.id)
    const s = statusCounts(l)
    return { id: sp.id, name: sp.name, total: l.length, ...s, rev: revenue(l) }
  })
  const reasons = useMemo(() => {
    const m = new Map<string, number>()
    list.filter((a) => a.status === 'cancelled').forEach((a) => m.set(a.cancel_reason ?? '(Không ghi lý do)', (m.get(a.cancel_reason ?? '(Không ghi lý do)') ?? 0) + 1))
    return [...m.entries()].map(([reason, count]) => ({ reason, count }))
  }, [list])
  const totalRev = revenue(list)

  const exportCsv = () => {
    downloadCSV(`bao-cao-${from}_${to}.csv`, [
      ['Báo cáo ClinicBooking', `${fmtDate(from)} - ${fmtDate(to)}`], [],
      ['Theo trạng thái'], ...STATUSES.map((s) => [STATUS_META[s].label, c[s]]), [],
      ['Theo ngày', 'Tổng', 'Hoàn thành', 'Đã hủy'], ...days.map((d) => [fmtDate(d.date), d.total, d.completed, d.cancelled]), [],
      ['Bác sĩ', 'Chuyên khoa', 'Tổng', 'Hoàn thành', 'Hủy', 'Vắng mặt', 'Doanh thu ước tính (VND)'], ...docRows.map((r) => [r.name, r.spec, r.total, r.completed, r.cancelled, r.no_show, r.rev]), [],
      ['Chuyên khoa', 'Tổng', 'Hoàn thành', 'Hủy', 'Vắng mặt', 'Doanh thu ước tính (VND)'], ...specRows.map((r) => [r.name, r.total, r.completed, r.cancelled, r.no_show, r.rev]), [],
      ['Lý do hủy', 'Số lượt'], ...reasons.map((r) => [r.reason, r.count]),
    ])
    toast({ tone: 'success', title: 'Đã xuất báo cáo CSV' })
  }
  const exportPdf = () => { toast({ tone: 'info', title: 'Mở hộp thoại in', description: 'Chọn “Lưu dưới dạng PDF” để xuất file.' }); setTimeout(() => window.print(), 300) }

  if (error) return <Card><ErrorState onRetry={reload} /></Card>
  const L = loading
  const rangeInvalid = from > to
  return (
    <div className="animate-fade-in">
      <PageHeader title="Báo cáo" description={<>Theo ngày khám từ <span className="num font-semibold text-ink">{fmtDate(from)}</span> đến <span className="num font-semibold text-ink">{fmtDate(to)}</span></>}
        actions={<div className="flex gap-2 print:hidden"><Button variant="secondary" icon={<Download className="size-4" />} onClick={exportCsv}>Xuất CSV</Button><Button variant="secondary" icon={<FileText className="size-4" />} onClick={exportPdf}>Xuất PDF</Button></div>} />
      <Card className="mb-4 flex flex-wrap items-end gap-3 p-3 sm:p-4 print:hidden">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => <button key={p.id} onClick={() => pick(p.id)} className={cx('h-9 rounded-lg border px-3 text-13 font-medium transition-colors', preset === p.id ? 'border-primary bg-blue-50 text-primary' : 'border-line hover:bg-slate-50')}>{p.label}</button>)}
        </div>
        <div className="flex items-end gap-2">
          <label><span className="mb-1 block text-xs text-muted">Từ ngày</span><Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset('') }} invalid={rangeInvalid} /></label>
          <label><span className="mb-1 block text-xs text-muted">Đến ngày</span><Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset('') }} invalid={rangeInvalid} /></label>
        </div>
        {rangeInvalid && <p className="text-xs font-medium text-[#B91C1C]">Ngày bắt đầu phải trước ngày kết thúc</p>}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          ['Tổng lịch hẹn', fmtNum(list.length), ''],
          ['Hoàn thành', fmtNum(c.completed), fmtPct(rate(c.completed, list.length))],
          ['Tỷ lệ hủy', fmtPct(rate(c.cancelled, list.length)), `${c.cancelled} lượt`],
          ['Doanh thu ước tính', fmtCompactVND(totalRev), 'phí khám × lượt hoàn thành'],
        ].map(([l, v, s]) => (
          <Card key={l} className="p-4"><div className="text-13 text-muted">{l}</div><div className="num mt-1 text-2xl font-bold">{L ? '…' : v}</div>{s && <div className="mt-0.5 text-xs text-muted">{s}</div>}</Card>
        ))}
      </div>

      {list.length === 0 && !L ? <Card className="mt-4"><EmptyState kind="search" title="Không có lịch hẹn trong khoảng thời gian này" description="Chọn khoảng ngày khác để xem báo cáo." /></Card> : (
        <>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <ChartCard loading={L} className="xl:col-span-2" title="Lịch hẹn theo ngày" subtitle="Tổng và hoàn thành">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={days} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF2F7" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#F1F5F9' }} />
                  <Bar dataKey="total" name="Tổng" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Hoàn thành" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard loading={L} title="Theo trạng thái">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={STATUSES.map((s) => ({ name: STATUS_META[s].label, value: c[s], color: STATUS_META[s].color }))} layout="vertical" margin={{ left: 0, right: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 12, fill: '#334155' }} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#F1F5F9' }} />
                  <Bar dataKey="value" name="Lịch hẹn" radius={[0, 6, 6, 0]} barSize={20}>
                    {STATUSES.map((s) => <Cell key={s} fill={STATUS_META[s].color} />)}
                    <LabelList dataKey="value" position="right" style={{ fontSize: 12, fontWeight: 700, fill: '#0F172A', fontFamily: 'Plus Jakarta Sans' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard loading={L} title="Doanh thu ước tính theo bác sĩ" subtitle="Ước tính = phí khám × lượt hoàn thành" height={280}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={[...docRows].sort((a, b) => b.rev - a.rev).map((r) => ({ ...r, short: r.name.split(' ').slice(-2).join(' ') }))} layout="vertical" margin={{ left: 0, right: 64 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="short" width={110} tick={{ fontSize: 12, fill: '#334155' }} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#F1F5F9' }} formatter={(v) => fmtVND(Number(v))} />
                  <Bar dataKey="rev" name="Doanh thu ước tính" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={16}>
                    <LabelList dataKey="rev" position="right" formatter={(v) => fmtCompactVND(Number(v))} style={{ fontSize: 11.5, fontWeight: 700, fill: '#0F172A', fontFamily: 'Plus Jakarta Sans' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard loading={L} title="Doanh thu ước tính theo chuyên khoa" subtitle="Ước tính = phí khám × lượt hoàn thành" height={280}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={[...specRows].sort((a, b) => b.rev - a.rev)} layout="vertical" margin={{ left: 0, right: 64 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: '#334155' }} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#F1F5F9' }} formatter={(v) => fmtVND(Number(v))} />
                  <Bar dataKey="rev" name="Doanh thu ước tính" fill="#14B8A6" radius={[0, 6, 6, 0]} barSize={18}>
                    <LabelList dataKey="rev" position="right" formatter={(v) => fmtCompactVND(Number(v))} style={{ fontSize: 11.5, fontWeight: 700, fill: '#0F172A', fontFamily: 'Plus Jakarta Sans' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <Card className="mt-4 overflow-hidden">
            <div className="border-b border-line px-5 py-4"><h3 className="font-semibold">Theo bác sĩ</h3></div>
            <DataTable rows={docRows} rowKey={(r) => r.id} loading={L} defaultSort={{ id: 'total', dir: 'desc' }} maxHeight={480}
              columns={[
                { id: 'name', header: 'Bác sĩ', cell: (r) => <div><div className="font-medium">BS. {r.name}</div><div className="text-xs text-muted">{r.spec}</div></div>, sort: (r) => r.name },
                { id: 'total', header: 'Tổng', align: 'right', cell: (r) => <span className="num font-semibold">{r.total}</span>, sort: (r) => r.total },
                { id: 'completed', header: 'Hoàn thành', align: 'right', cell: (r) => <span className="num">{r.completed}</span>, sort: (r) => r.completed },
                { id: 'cancelled', header: 'Hủy', align: 'right', cell: (r) => <span className="num">{r.cancelled}</span>, sort: (r) => r.cancelled, className: 'hidden lg:table-cell' },
                { id: 'ns', header: 'Vắng mặt', align: 'right', cell: (r) => <span className="num">{r.no_show}</span>, sort: (r) => r.no_show, className: 'hidden lg:table-cell' },
                { id: 'cr', header: 'Tỷ lệ hủy', align: 'right', cell: (r) => <span className="num">{fmtPct(r.cancelRate)}</span>, sort: (r) => r.cancelRate, className: 'hidden xl:table-cell' },
                { id: 'rev', header: 'DT ước tính', align: 'right', cell: (r) => <span className="num font-semibold">{fmtVND(r.rev)}</span>, sort: (r) => r.rev },
              ]}
              mobileCard={(r) => <div className="flex items-center justify-between gap-2"><div><div className="font-medium">BS. {r.name}</div><div className="text-xs text-muted">{r.total} lịch · {r.completed} hoàn thành · {r.cancelled} hủy</div></div><span className="num text-sm font-bold">{fmtCompactVND(r.rev)}</span></div>} />
          </Card>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="border-b border-line px-5 py-4"><h3 className="font-semibold">Theo chuyên khoa</h3></div>
              <DataTable rows={specRows} rowKey={(r) => r.id} loading={L} defaultSort={{ id: 'total', dir: 'desc' }}
                columns={[
                  { id: 'name', header: 'Chuyên khoa', cell: (r) => <span className="font-medium">{r.name}</span>, sort: (r) => r.name },
                  { id: 'total', header: 'Tổng', align: 'right', cell: (r) => <span className="num font-semibold">{r.total}</span>, sort: (r) => r.total },
                  { id: 'completed', header: 'Hoàn thành', align: 'right', cell: (r) => <span className="num">{r.completed}</span>, sort: (r) => r.completed },
                  { id: 'rev', header: 'DT ước tính', align: 'right', cell: (r) => <span className="num font-semibold">{fmtVND(r.rev)}</span>, sort: (r) => r.rev },
                ]} />
            </Card>
            <Card className="overflow-hidden">
              <div className="border-b border-line px-5 py-4"><h3 className="font-semibold">Lý do hủy</h3><p className="text-13 text-muted">Từ trường cancel_reason của <span className="num">{c.cancelled}</span> lịch đã hủy</p></div>
              <DataTable rows={reasons} rowKey={(r) => r.reason} loading={L} defaultSort={{ id: 'count', dir: 'desc' }} emptyTitle="Không có lịch hủy trong khoảng này"
                columns={[
                  { id: 'reason', header: 'Lý do', cell: (r) => r.reason, sort: (r) => r.reason },
                  { id: 'count', header: 'Số lượt', align: 'right', cell: (r) => <span className="num font-semibold">{r.count}</span>, sort: (r) => r.count },
                  { id: 'pct', header: 'Tỷ trọng', align: 'right', cell: (r) => (
                    <div className="flex items-center justify-end gap-2"><div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 sm:block"><div className="h-full rounded-full bg-[#DC2626]" style={{ width: `${rate(r.count, c.cancelled) * 100}%` }} /></div><span className="num w-12">{fmtPct(rate(r.count, c.cancelled))}</span></div>
                  ), sort: (r) => r.count },
                ]} />
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
