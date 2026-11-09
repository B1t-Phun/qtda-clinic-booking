'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, CalendarPlus, ChevronDown, LogOut, MoreHorizontal, Search, ServerCrash, UserRound, X, CalendarDays, LayoutDashboard, Stethoscope, Users } from 'lucide-react'
import { NAV } from './nav'
import { navigate } from '@/lib/router'
import { useStore } from '@/modules/admin/store/store'
import { Avatar, StatusBadge } from '@/components/ui/core'
import { BottomSheet } from '@/components/ui/overlay'
import { cx, fmtDate, normalize } from '@/lib/format'
import { useAppointmentUI } from '@/modules/admin/views/appointments/AppointmentUI'

export function Logo({ compact, light = true }: { compact?: boolean; light?: boolean }) {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#14b8a6] text-white shadow-sm">
        <CalendarPlus className="size-5" strokeWidth={2} />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className={cx('text-[15px] font-bold tracking-tight', light ? 'text-white' : 'text-ink')}>ClinicBooking</div>
          <div className={cx('text-[11px] font-medium', light ? 'text-blue-200' : 'text-muted')}>Cổng quản trị</div>
        </div>
      )}
    </Link>
  )
}

function Sidebar({ path }: { path: string }) {
  const { appts, me, logout } = useStore()
  const pending = appts.filter((a) => a.status === 'pending').length

  const mgmtItems = NAV.filter((n) => n.section === 'QUẢN LÝ')
  const sysItems = NAV.filter((n) => n.section === 'HỆ THỐNG')

  const renderNavGroup = (items: typeof NAV, title: string) => (
    <div className="space-y-1">
      <div className="hidden px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-blue-200/60 uppercase lg:block">
        {title}
      </div>
      {items.map((n) => {
        const active = n.path === '/admin' ? path === '/admin' : path.startsWith(n.path)
        return (
          <Link
            key={n.path}
            href={n.path}
            title={n.label}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'group relative flex h-10 items-center justify-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 lg:justify-start',
              active ? 'bg-white/15 text-white shadow-sm' : 'text-blue-100/80 hover:bg-white/8 hover:text-white',
            )}
          >
            {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-[#14b8a6]" />}
            <n.icon className="size-5 shrink-0" strokeWidth={1.75} />
            <span className="hidden truncate lg:inline">{n.label}</span>
            {n.path === '/admin/appointments' && pending > 0 && (
              <span className="num absolute right-1 top-1 rounded-full bg-[#F59E0B] px-1.5 text-[10px] font-bold text-white lg:static lg:ml-auto lg:text-[11px]">{pending}</span>
            )}
          </Link>
        )
      })}
    </div>
  )

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden print:!hidden w-[72px] flex-col bg-[#1e3a8a] md:flex lg:w-64">
      <div className="flex h-16 items-center justify-center px-4 lg:justify-start lg:px-5 border-b border-white/10">
        <span className="lg:hidden"><Logo compact /></span>
        <span className="hidden lg:block"><Logo /></span>
      </div>
      <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4" aria-label="Điều hướng chính">
        {renderNavGroup(mgmtItems, 'QUẢN LÝ')}
        {renderNavGroup(sysItems, 'HỆ THỐNG')}
      </nav>
      <div className="m-3 flex items-center justify-between rounded-xl bg-white/5 p-2.5 text-white border border-white/10">
        <Link href="/admin/profile" title="Hồ sơ cá nhân" className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-90">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white shadow">
            {me.full_name ? me.full_name.split(' ').map(s => s[0]).slice(-2).join('').toUpperCase() : 'AD'}
          </div>
          <div className="hidden min-w-0 lg:block">
            <div className="truncate text-sm font-semibold">{me.full_name || 'Admin'}</div>
            <div className="truncate text-xs text-blue-200">Quản trị viên</div>
          </div>
        </Link>
        <button
          onClick={logout}
          title="Đăng xuất"
          className="hidden lg:flex size-8 shrink-0 items-center justify-center rounded-lg text-blue-200 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  )
}

function MeAvatar({ size = 34 }: { size?: number }) {
  const { me } = useStore()
  return <Avatar name={me.full_name} url={me.avatar_url} size={size} className="ring-2 ring-white/20" />
}

function GlobalSearch({ onDone }: { onDone?: () => void }) {
  const { db, appts, doctorViews } = useStore()
  const { open: openAppt } = useAppointmentUI()
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setFocus(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const res = useMemo(() => {
    const n = normalize(q.trim().replace(/^#/, ''))
    if (!n) return null
    const patients = db.profiles.filter((p) => p.role === 'patient' && (normalize(p.full_name).includes(n) || (p.phone ?? '').includes(n))).slice(0, 5)
    const doctors = doctorViews.filter((d) => normalize(d.profile.full_name).includes(n)).slice(0, 4)
    const ap = appts.filter((a) => String(a.id).includes(n)).slice(0, 4)
    return { patients, doctors, ap }
  }, [q, db.profiles, doctorViews, appts])
  const go = (fn: () => void) => { fn(); setQ(''); setFocus(false); onDone?.() }
  const total = res ? res.patients.length + res.doctors.length + res.ap.length : 0
  return (
    <div ref={ref} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocus(true)}
        placeholder="Tìm bệnh nhân, bác sĩ, mã lịch hẹn (#1024)…"
        aria-label="Tìm kiếm toàn hệ thống"
        className="h-10 w-full rounded-lg border border-line bg-slate-50 pl-9 pr-3 text-sm transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25"
      />
      {focus && res && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-white p-2 shadow-soft animate-fade-in">
          {total === 0 && <div className="px-3 py-6 text-center text-13 text-muted">Không có kết quả cho “{q}”</div>}
          {res.ap.length > 0 && <div className="px-2 pt-1 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Lịch hẹn</div>}
          {res.ap.map((a) => (
            <button key={a.id} onClick={() => go(() => openAppt(a.id))} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50">
              <span className="num w-14 text-sm font-bold text-primary">#{a.id}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{a.patient.full_name} · <span className="text-muted">{fmtDate(a.slot.slot_date)} {a.slot.start_time}</span></span>
              <StatusBadge status={a.status} />
            </button>
          ))}
          {res.patients.length > 0 && <div className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Bệnh nhân</div>}
          {res.patients.map((p) => (
            <button key={p.id} onClick={() => go(() => navigate(`/patients/${p.id}`))} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50">
              <Avatar name={p.full_name} url={p.avatar_url} size={28} />
              <span className="flex-1 truncate text-sm font-medium">{p.full_name}</span>
              <span className="num text-xs text-muted">{p.phone}</span>
            </button>
          ))}
          {res.doctors.length > 0 && <div className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Bác sĩ</div>}
          {res.doctors.map((d) => (
            <button key={d.id} onClick={() => go(() => navigate(`/doctors/${d.id}`))} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50">
              <Avatar name={d.profile.full_name} url={d.profile.avatar_url} size={28} />
              <span className="flex-1 truncate text-sm font-medium">BS. {d.profile.full_name}</span>
              <span className="text-xs text-muted">{d.specialty.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminNotificationDropdown() {
  const { appts } = useStore()
  const { open: openAppt } = useAppointmentUI()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const pending = appts.filter((a) => a.status === 'pending')

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Thông báo lịch hẹn chờ duyệt"
        className="relative flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <Bell className="size-5" />
        {pending.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[#f59e0b] text-[10px] font-bold text-white shadow-sm">
            {pending.length > 9 ? '9+' : pending.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-96 rounded-2xl border border-line bg-white p-3 shadow-soft animate-fade-in">
          <div className="flex items-center justify-between border-b border-line px-2 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Thông báo chờ duyệt</span>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                {pending.length} lịch hẹn
              </span>
            </div>
            <Link
              href="/admin/appointments"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="my-1 max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {pending.slice(0, 5).map((a) => (
              <div
                key={a.id}
                onClick={() => {
                  openAppt(a.id)
                  setOpen(false)
                }}
                className="flex cursor-pointer items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 transition-colors"
              >
                <div className="size-2 rounded-full bg-[#f59e0b] mt-1.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {a.patient.full_name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {a.slot.start_time}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    BS. {a.doctorProfile.full_name} · {a.specialty.name}
                  </p>
                </div>
              </div>
            ))}

            {pending.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                Không có lịch hẹn nào đang chờ duyệt.
              </div>
            )}
          </div>

          <div className="border-t border-line pt-2 text-center">
            <Link
              href="/admin/appointments"
              onClick={() => setOpen(false)}
              className="block text-xs font-semibold text-primary hover:underline py-1"
            >
              Mở trang quản lý lịch hẹn →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function UserMenu() {
  const { me, logout, simulateError } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative pl-2">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-3 rounded-lg px-2.5 py-1.5 hover:bg-slate-100 transition-colors">
        <Avatar name={me.full_name} url={me.avatar_url} size={34} />
        <span className="hidden text-sm font-semibold text-slate-800 xl:inline">{me.full_name}</span>
        <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-line bg-white p-1.5 shadow-soft animate-fade-in">
          <div className="border-b border-line px-3 py-2.5">
            <div className="text-sm font-semibold">{me.full_name}</div>
            <div className="truncate text-xs text-muted">{me.email}</div>
          </div>
          <button onClick={() => { navigate('/profile'); setOpen(false) }} className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><UserRound className="size-4 text-slate-500" />Hồ sơ cá nhân</button>
          <button onClick={() => { simulateError(); setOpen(false) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><ServerCrash className="size-4 text-slate-500" />Mô phỏng lỗi tải dữ liệu</button>
          <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#B91C1C] hover:bg-red-50"><LogOut className="size-4" />Đăng xuất</button>
        </div>
      )}
    </div>
  )
}

const BOTTOM = [
  { path: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { path: '/admin/appointments', label: 'Lịch hẹn', icon: CalendarDays },
  { path: '/admin/doctors', label: 'Bác sĩ', icon: Stethoscope },
  { path: '/admin/patients', label: 'Bệnh nhân', icon: Users },
]

function BottomNav({ path }: { path: string }) {
  const [more, setMore] = useState(false)
  const inMore = !BOTTOM.some((b) => path.startsWith(b.path))
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 print:hidden grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Điều hướng">
        {BOTTOM.map((b) => {
          const on = path === b.path || (b.path !== '/admin' && path.startsWith(b.path))
          return (
            <Link key={b.path} href={b.path} className={cx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', on ? 'text-primary' : 'text-slate-500')}>
              <b.icon className="size-5" strokeWidth={on ? 2 : 1.75} />
              {b.label}
            </Link>
          )
        })}
        <button onClick={() => setMore(true)} className={cx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', inMore ? 'text-primary' : 'text-slate-500')}>
          <MoreHorizontal className="size-5" />
          Thêm
        </button>
      </nav>
      <BottomSheet open={more} onClose={() => setMore(false)} title="Danh mục">
        <div className="grid grid-cols-3 gap-2 pb-2">
          {[...NAV.filter((n) => !BOTTOM.some((b) => b.path === n.path)), { path: '/admin/profile', label: 'Hồ sơ cá nhân', icon: UserRound }].map((n) => (
            <Link key={n.path} href={n.path} onClick={() => setMore(false)} className={cx('flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-13 font-medium', path.startsWith(n.path) ? 'border-primary bg-blue-50 text-primary' : 'border-line text-slate-700')}>
              <n.icon className="size-5" strokeWidth={1.75} />
              {n.label}
            </Link>
          ))}
        </div>
      </BottomSheet>
    </>
  )
}

export function Shell({ path, children }: { path: string; children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const { create } = useAppointmentUI()
  return (
    <div className="min-h-screen">
      <Sidebar path={path} />
      <div className="overflow-x-clip md:pl-[72px] lg:pl-64 print:!pl-0">
        <header className="sticky top-0 z-20 print:hidden flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 sm:px-6">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="md:hidden"><Logo compact /></div>
            <div className="hidden w-full md:block"><GlobalSearch /></div>
          </div>
          <button aria-label="Tìm kiếm" onClick={() => setSearchOpen(true)} className="flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"><Search className="size-5" /></button>
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            <button onClick={create} className="hidden h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1d4fd8] sm:inline-flex">
              <CalendarPlus className="size-4" />Tạo lịch hẹn
            </button>
            <button onClick={create} aria-label="Tạo lịch hẹn" className="flex size-9 items-center justify-center rounded-lg bg-primary text-white sm:hidden"><CalendarPlus className="size-4" /></button>
            <AdminNotificationDropdown />
            <div className="hidden h-7 w-[1px] bg-slate-200 sm:block" />
            <UserMenu />
          </div>
        </header>
        {searchOpen && (
          <div className="fixed inset-0 z-50 bg-white p-4 animate-fade-in md:hidden">
            <div className="flex items-center gap-2">
              <GlobalSearch onDone={() => setSearchOpen(false)} />
              <button aria-label="Đóng" onClick={() => setSearchOpen(false)} className="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100"><X className="size-5" /></button>
            </div>
          </div>
        )}
        <main className="mx-auto max-w-[1600px] px-4 pt-5 pb-28 sm:px-6 md:pb-10 lg:pt-6">{children}</main>
      </div>
      <BottomNav path={path} />
    </div>
  )
}
