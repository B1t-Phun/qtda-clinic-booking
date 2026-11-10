import type { Gender, Role, Status } from '@/modules/admin/store/types'

const pad = (n: number) => String(n).padStart(2, '0')
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayISO = () => (typeof window === 'undefined' ? '2026-11-09' : toISODate(new Date()))
export const parseISODate = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (s: string, n: number) => {
  const d = parseISODate(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}
export const diffDays = (a: string, b: string) => Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86400000)
export const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—'
  const d = parseISODate(s)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}
export const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const fmtShort = (s: string) => {
  const d = parseISODate(s)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
}
export const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
export const WEEKDAYS_LONG = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
export const weekday = (s: string) => parseISODate(s).getDay()
export const startOfWeek = (s: string) => addDays(s, -((weekday(s) + 6) % 7)) // Monday
export const fmtVND = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`
export const fmtCompactVND = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ ₫`
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr ₫`
  return fmtVND(n)
}
export const fmtNum = (n: number) => n.toLocaleString('vi-VN')
export const fmtPct = (n: number) => `${(n * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`
export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
export const fromMin = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
export const age = (dob: string | null) => {
  if (!dob) return null
  const d = parseISODate(dob)
  const now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--
  return a
}
export const GENDER_LABEL: Record<Gender, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' }
export const ROLE_LABEL: Record<Role, string> = { admin: 'Quản trị viên', doctor: 'Bác sĩ', patient: 'Bệnh nhân' }
export const STATUS_META: Record<Status, { label: string; color: string; text: string }> = {
  pending: { label: 'Chờ duyệt', color: '#F59E0B', text: '#B45309' },
  confirmed: { label: 'Đã xác nhận', color: '#16A34A', text: '#15803D' },
  completed: { label: 'Hoàn thành', color: '#64748B', text: '#475569' },
  cancelled: { label: 'Đã hủy', color: '#DC2626', text: '#B91C1C' },
  no_show: { label: 'Vắng mặt', color: '#7C3AED', text: '#6D28D9' },
}
export const STATUSES: Status[] = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
