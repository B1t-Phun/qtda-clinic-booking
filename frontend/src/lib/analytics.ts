import type { ApptView } from '@/modules/admin/store/store'
import type { Status, TimeSlot } from '@/modules/admin/store/types'
import { addDays, STATUSES } from './format'

export const inRange = (a: ApptView, from: string, to: string) => a.slot.slot_date >= from && a.slot.slot_date <= to
export const rate = (num: number, den: number) => (den ? num / den : 0)
export const pctChange = (cur: number, prev: number) => (prev ? ((cur - prev) / prev) * 100 : cur ? 100 : 0)

export function statusCounts(list: ApptView[]) {
  const m = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>
  list.forEach((a) => m[a.status]++)
  return m
}
export function byDay(list: ApptView[], from: string, to: string) {
  const out: { date: string; total: number; completed: number; cancelled: number }[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push({ date: d, total: 0, completed: 0, cancelled: 0 })
  const idx = new Map(out.map((o, i) => [o.date, i]))
  list.forEach((a) => {
    const i = idx.get(a.slot.slot_date)
    if (i === undefined) return
    out[i].total++
    if (a.status === 'completed') out[i].completed++
    if (a.status === 'cancelled') out[i].cancelled++
  })
  return out
}
export const revenue = (list: ApptView[]) => list.filter((a) => a.status === 'completed').reduce((s, a) => s + a.doctor.consultation_fee, 0)
export const fillRate = (slots: TimeSlot[], from: string, to: string) => {
  const s = slots.filter((x) => x.slot_date >= from && x.slot_date <= to)
  return { rate: rate(s.filter((x) => x.is_booked).length, s.length), total: s.length, booked: s.filter((x) => x.is_booked).length }
}
export function groupBy<K extends string>(list: ApptView[], key: (a: ApptView) => K) {
  const m = new Map<K, ApptView[]>()
  list.forEach((a) => m.set(key(a), [...(m.get(key(a)) ?? []), a]))
  return m
}
