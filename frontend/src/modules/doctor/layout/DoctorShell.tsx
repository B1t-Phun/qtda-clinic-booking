'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Activity, BarChart3, CalendarDays, CalendarRange, Check, ClipboardList, LayoutDashboard, LogOut, Menu, RefreshCw, Search, ShieldCheck, Stethoscope, Users, X } from 'lucide-react';
import { AppointmentDetailModal, Avatar } from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { clinicDate } from '../workflow';
import { longDate } from '../utils';

const navigation = [
  { href: '/doctor', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/doctor/appointments', label: 'Lịch hẹn', icon: CalendarDays },
  { href: '/doctor/appointments?tab=queue', label: 'Hàng đợi hôm nay', icon: ClipboardList },
  { href: '/doctor/schedule', label: 'Lịch làm việc', icon: CalendarRange },
  { href: '/doctor/patients', label: 'Bệnh nhân', icon: Users },
  { href: '/doctor/notifications', label: 'Nhật ký hoạt động', icon: Activity },
  { href: '/doctor/reports', label: 'Báo cáo cá nhân', icon: BarChart3 },
  { href: '/doctor/profile', label: 'Hồ sơ bác sĩ', icon: Stethoscope },
];
export function DoctorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(), params = useSearchParams(), router = useRouter();
  const store = useDoctorStore();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState('');
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () => Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a,button:not(:disabled)') || []).filter(item => item.getClientRects().length);
    controls()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
      if (event.key !== 'Tab') return;
      const items = controls(), first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, [menu]);
  const [signingOut, setSigningOut] = useState(false);
  const pending = store.appointments.filter(appointment => appointment.status === 'pending').length;
  const active = (href: string) => {
    if (href.includes('?')) return pathname === href.split('?')[0] && params.get('tab') === 'queue';
    return pathname === href && (href !== '/doctor/appointments' || params.get('tab') !== 'queue');
  };
  async function logout() {
    if (signingOut) return;
    setSigningOut(true);
    await store.logout();
    setSigningOut(false);
  }
  return <div className="doctor-app">
    <a href="#doctor-main" className="skip-link">Đến nội dung chính</a>
    {menu && <button className="nav-backdrop" aria-label="Đóng điều hướng" onClick={() => setMenu(false)} />}
    <aside ref={sidebar} className={'doctor-sidebar' + (menu ? ' open' : '')} aria-label="Điều hướng bác sĩ">
      <Link className="doctor-brand" href="/doctor" onClick={() => setMenu(false)}><span><Stethoscope size={25} /></span><div>ClinicCare<small>Không gian bác sĩ</small></div></Link>
      <button className="icon-button close-menu" onClick={() => setMenu(false)} aria-label="Đóng menu"><X /></button>
      <div className="doctor-identity"><Avatar profile={store.profile} /><div><strong>{store.profile.full_name || 'Bác sĩ'}</strong>
        <small>{store.specialty?.name || 'Chưa có chuyên khoa'}</small><small>{store.doctor.room || 'Chưa bố trí phòng'}</small></div></div>
      <nav>{navigation.map(item => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined}
        onClick={() => setMenu(false)}><item.icon size={19} /><span>{item.label}</span>{item.href === '/doctor/appointments' && pending > 0 && <b>{pending}</b>}</Link>)}</nav>
      <div className="sidebar-footer"><Link href="/account/security"><ShieldCheck size={17} />Bảo mật & MFA</Link>
        <button onClick={() => { void logout(); }} disabled={signingOut}><LogOut size={17} />{signingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</button></div>
    </aside>
    <div className="doctor-workspace">
      <header className="doctor-header"><button className="icon-button mobile-menu" onClick={() => setMenu(true)} aria-expanded={menu} aria-label="Mở điều hướng"><Menu /></button>
        <form className="header-search" role="search" onSubmit={event => { event.preventDefault(); router.push('/doctor/appointments?q=' + encodeURIComponent(search.trim())); }}>
          <Search size={18} /><input aria-label="Tìm lịch hẹn theo bệnh nhân" placeholder="Tìm bệnh nhân, số điện thoại, lịch hẹn…" value={search} onChange={event => setSearch(event.target.value)} />
        </form>
        <span className="header-date">{longDate(clinicDate(store.now))}</span>
        <button className="icon-button" onClick={() => { void store.refresh(); }} disabled={store.refreshing || !!store.pending}
          aria-label="Cập nhật dữ liệu" title="Cập nhật dữ liệu"><RefreshCw size={19} className={store.refreshing ? 'spin' : ''} /></button>
        <Link href="/doctor/profile" className="header-avatar" aria-label="Hồ sơ bác sĩ"><Avatar profile={store.profile} size="sm" /></Link>
      </header>
      <main id="doctor-main" className="doctor-main">
        {store.error && <div className="notice error" role="alert"><p>{store.error}</p><button type="button" onClick={() => { void store.refresh(); }} disabled={store.refreshing}>Thử tải lại</button></div>}
        <span role="status" className="sr-only">{store.refreshing ? 'Đang cập nhật dữ liệu' : ''}</span>
        {children}
      </main>
    </div>
    <nav className="doctor-bottom-nav" aria-label="Truy cập nhanh">{[navigation[0], navigation[1], navigation[3], navigation[4]].map(item =>
      <Link href={item.href} key={item.href} aria-current={active(item.href) ? 'page' : undefined}><item.icon size={20} /><span>{item.label}</span></Link>)}</nav>
    {store.selectedAppointment && <AppointmentDetailModal appointment={store.selectedAppointment} onClose={() => store.setSelectedAppointment(null)} />}
    <div className="toast-stack" aria-live="polite" aria-atomic="false">{store.toasts.map(toast =>
      <div className={'toast' + (toast.error ? ' error' : '')} key={toast.id} role={toast.error ? 'alert' : 'status'}>{toast.error ? <X size={18} /> : <Check size={18} />}<span>{toast.text}</span></div>)}</div>
  </div>;
}
