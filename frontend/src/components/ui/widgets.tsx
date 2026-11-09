'use client';
import { useState, type ReactNode } from 'react'
import { SlidersHorizontal, TrendingDown, TrendingUp, Minus, Lock } from 'lucide-react'
import { cx, fmtShort, parseISODate, todayISO, toMin, WEEKDAYS } from '@/lib/format'
import { Button, Card, Skeleton } from './core'
import { BottomSheet } from './overlay'

export function KpiCard({ label, value, icon, trend, trendLabel, goodWhenUp = true, loading, hint, accent = 'primary' }: {
  label: string; value: ReactNode; icon: ReactNode; trend?: { delta: number; unit: '%' | 'pt' | '' } | null; trendLabel?: string; goodWhenUp?: boolean; loading?: boolean; hint?: string; accent?: 'primary' | 'accent' | 'amber' | 'red' | 'violet'
}) {
  const tint = { primary: 'bg-blue-50 text-primary', accent: 'bg-teal-50 text-teal-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600', violet: 'bg-violet-50 text-violet-600' }[accent]
  const d = trend?.delta ?? 0
  const flat = !trend || Math.abs(d) < 0.05
  const good = flat ? null : d > 0 === goodWhenUp
  const Icon = flat ? Minus : d > 0 ? TrendingUp : TrendingDown
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-13 font-medium leading-snug text-muted">{label}</div>
        <div className={cx('flex size-8 shrink-0 items-center justify-center rounded-lg', tint)}>{icon}</div>
      </div>
      {loading ? (
        <><Skeleton className="mt-2 h-8 w-24" /><Skeleton className="mt-3 h-3 w-32" /></>
      ) : (
        <>
          <div className="num mt-1 text-[28px] leading-tight font-bold tracking-tight text-ink">{value}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            {trend !== undefined && (
              <span className={cx('num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold', good === null ? 'bg-slate-100 text-slate-600' : good ? 'bg-green-50 text-[#15803D]' : 'bg-red-50 text-[#B91C1C]')}>
                <Icon className="size-3" strokeWidth={2.5} />
                {trend ? `${d > 0 ? '+' : ''}${d.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}${trend.unit}` : '—'}
              </span>
            )}
            <span className="text-muted">{trendLabel}</span>
          </div>
          {hint && <div className="mt-1 text-[11.5px] text-slate-500 italic">{hint}</div>}
        </>
      )}
    </Card>
  )
}

export function ChartCard({ title, subtitle, actions, children, loading, className, height = 260 }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; loading?: boolean; className?: string; height?: number }) {
  return (
    <Card className={cx('flex flex-col p-4 sm:p-5', className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-13 text-muted">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {loading ? <Skeleton className="w-full flex-1" /> : <div className="min-w-0 flex-1" style={{ minHeight: height }}>{children}</div>}
    </Card>
  )
}

export const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,.08)', fontSize: 13, fontFamily: 'Be Vietnam Pro' },
  labelStyle: { fontWeight: 600, color: '#0F172A' },
}

/** Inline filters on tablet/desktop; a bottom sheet on mobile. */
export function FilterBar({ children, search, activeCount, onClear }: { children: ReactNode; search?: ReactNode; activeCount: number; onClear: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-line p-3 sm:p-4">
      <div className="flex gap-2 md:hidden">
        <div className="min-w-0 flex-1">{search}</div>
        <Button variant="secondary" icon={<SlidersHorizontal className="size-4" />} onClick={() => setOpen(true)} aria-label="Bộ lọc">
          {activeCount > 0 && <span className="num rounded-full bg-primary px-1.5 text-[11px] text-white">{activeCount}</span>}
        </Button>
      </div>
      <div className="hidden flex-wrap items-end gap-3 md:flex">
        {search && <div className="w-full max-w-[280px] min-w-[200px] flex-1">{search}</div>}
        {children}
        {activeCount > 0 && <Button variant="ghost" onClick={onClear}>Xóa bộ lọc</Button>}
      </div>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Bộ lọc"
        footer={<><Button variant="secondary" className="flex-1" onClick={onClear}>Xóa bộ lọc</Button><Button className="flex-1" onClick={() => setOpen(false)}>Áp dụng</Button></>}
      >
        <div className="flex flex-col gap-4 [&>*]:w-full">{children}</div>
      </BottomSheet>
    </div>
  )
}

export function FilterItem({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx('min-w-[140px]', className)}>
      <div className="mb-1 text-xs font-medium text-muted">{label}</div>
      {children}
    </div>
  )
}

// ---------- Week / day calendar ----------
export interface CalEvent { id: string; date: string; start: string; end: string; title: string; sub?: string; color: string; bg: string; locked?: string; onClick?: () => void; dashed?: boolean }
const HOUR = 52
export function TimeGridCalendar({ days, events, startHour = 7, endHour = 18, emptyHint }: { days: string[]; events: CalEvent[]; startHour?: number; endHour?: number; emptyHint?: string }) {
  const today = todayISO()
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const layout = (list: CalEvent[]) => {
    const sorted = [...list].sort((a, b) => toMin(a.start) - toMin(b.start))
    const out: { e: CalEvent; lane: number; lanes: number }[] = []
    let cluster: { e: CalEvent; lane: number }[] = []
    let clusterEnd = -1
    const flush = () => {
      const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1))
      cluster.forEach((c) => out.push({ ...c, lanes }))
      cluster = []
    }
    for (const e of sorted) {
      if (toMin(e.start) >= clusterEnd) { flush(); clusterEnd = -1 }
      const laneEnds: number[] = []
      cluster.forEach((c) => (laneEnds[c.lane] = Math.max(laneEnds[c.lane] ?? 0, toMin(c.e.end))))
      let lane = laneEnds.findIndex((end) => end <= toMin(e.start))
      if (lane === -1) lane = laneEnds.length
      cluster.push({ e, lane })
      clusterEnd = Math.max(clusterEnd, toMin(e.end))
    }
    flush()
    return out
  }
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: days.length > 1 ? 760 : 0 }}>
        <div className="sticky top-0 z-10 grid border-b border-line bg-white" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map((d) => (
            <div key={d} className={cx('border-l border-line px-2 py-2 text-center', d === today && 'bg-blue-50/60')}>
              <div className="text-xs font-medium text-muted">{WEEKDAYS[parseISODate(d).getDay()]}</div>
              <div className={cx('num text-base font-bold', d === today ? 'text-primary' : 'text-ink')}>{fmtShort(d)}</div>
            </div>
          ))}
        </div>
        <div className="relative grid pt-2" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div>
            {hours.map((h) => (
              <div key={h} className="num relative text-right text-[11px] font-semibold text-slate-400" style={{ height: HOUR }}>
                <span className="absolute -top-2 right-2">{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          {days.map((d) => {
            const list = events.filter((e) => e.date === d)
            return (
              <div key={d} className={cx('relative border-l border-line', d === today && 'bg-blue-50/30')}>
                {hours.map((h) => <div key={h} className="border-b border-dashed border-slate-200" style={{ height: HOUR }} />)}
                {layout(list).map(({ e, lane, lanes }) => {
                  const top = ((toMin(e.start) - startHour * 60) / 60) * HOUR
                  const h = Math.max(22, ((toMin(e.end) - toMin(e.start)) / 60) * HOUR - 2)
                  return (
                    <button
                      key={e.id}
                      onClick={e.onClick}
                      title={e.locked ?? `${e.start}–${e.end} · ${e.title}${e.sub ? ' · ' + e.sub : ''}`}
                      className={cx('absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11.5px] leading-tight transition-shadow duration-150 hover:z-10 hover:shadow-md', e.dashed && 'border border-dashed')}
                      style={{ top, height: h, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)`, backgroundColor: e.bg, borderLeftColor: e.color, color: '#0F172A', borderColor: e.dashed ? e.color : undefined }}
                    >
                      <div className="num flex items-center gap-1 font-bold" style={{ color: e.color }}>
                        {e.locked && <Lock className="size-2.5 shrink-0" />}
                        {e.start}
                      </div>
                      {h > 30 && <div className="truncate font-medium">{e.title}</div>}
                      {h > 46 && e.sub && <div className="truncate text-slate-500">{e.sub}</div>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
        {events.length === 0 && emptyHint && <div className="border-t border-line py-6 text-center text-13 text-muted">{emptyHint}</div>}
      </div>
    </div>
  )
}
