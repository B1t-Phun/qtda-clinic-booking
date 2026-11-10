'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  CalendarRange,
  Check,
  Clock,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Search,
  Settings,
  UserCheck,
  Users,
} from 'lucide-react';
import { AppointmentDetailModal } from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { initials } from '../utils';
import LoginView from '../views/LoginView';

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

const NAV_ITEMS = [
  { href: '/doctor', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { href: '/doctor/schedule', label: 'Lịch khám', icon: CalendarRange },
  { href: '/doctor/appointments', label: 'Danh sách lịch hẹn', icon: CalendarDays },
  { href: '/doctor/appointments?tab=queue', label: 'Hàng đợi hôm nay', icon: Users },
  { href: '/doctor/patients', label: 'Danh sách bệnh nhân', icon: UserCheck },
  { href: '/doctor/appointments?tab=records', label: 'Kết quả cận lâm sàng', icon: Activity },
  { href: '/doctor/schedule?tab=work', label: 'Lịch làm việc', icon: Clock },
  { href: '/doctor/notifications', label: 'Thông báo', icon: Bell, badge: 4 },
  { href: '/doctor/reports', label: 'Báo cáo cá nhân', icon: BarChart3 },
  { href: '/doctor/profile', label: 'Hồ sơ & cài đặt', icon: Settings },
];

function getFormattedDate() {
  const d = new Date();
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = days[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
}

function NotificationDropdown() {
  const [open, setOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(4);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const items = [
    {
      id: '1',
      title: 'Bệnh nhân đã đến phòng chờ',
      desc: 'Trần Thị Lan (BN-00128) đã hoàn tất thủ tục tiếp đón tại quầy lúc 09:05.',
      time: '10 phút trước',
      type: 'checkin',
      link: '/doctor/appointments',
    },
    {
      id: '2',
      title: 'Lịch hẹn mới cần xác nhận',
      desc: 'Lê Quốc Bảo đặt lịch khám lúc 09:30 hôm nay. Lý do: Ho kéo dài.',
      time: '25 phút trước',
      type: 'appointment',
      link: '/doctor/appointments',
    },
    {
      id: '3',
      title: 'Có kết quả cận lâm sàng mới',
      desc: 'Kết quả điện tâm đồ (ECG) của bệnh nhân Nguyễn Văn Hùng đã sẵn sàng.',
      time: '1 giờ trước',
      type: 'lab',
      link: '/doctor/appointments?tab=records',
    },
    {
      id: '4',
      title: 'Bệnh nhân yêu cầu dời lịch',
      desc: 'Phạm Ngọc Lan xin dời lịch từ 14:00 sang 15:30 chiều nay.',
      time: '2 giờ trước',
      type: 'appointment',
      link: '/doctor/appointments',
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-[#dfe7e7] bg-white px-3 py-1.5 text-[12px] font-medium text-[#087f72] hover:bg-[#f4f7f7] transition-colors"
      >
        <Bell className="size-4 text-[#087f72]" />
        <span>Thông báo {unread > 0 ? `· ${unread}` : ''}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-96 rounded-2xl border border-[#dfe7e7] bg-white p-3 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#dfe7e7] pb-2.5 px-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#103f3d]">
              <span>Thông báo</span>
              {unread > 0 && (
                <span className="rounded-full bg-[#e8f5f0] text-[#087f72] text-[10px] px-2 py-0.5 font-semibold">
                  {unread} mới
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => setUnread(0)}
                className="text-[11px] font-medium text-[#087f72] hover:underline"
              >
                Đã đọc tất cả
              </button>
            )}
          </div>

          <div className="divide-y divide-[#f4f7f7] max-h-80 overflow-y-auto my-1">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.link}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#f4f7f7] transition-colors text-left no-underline block"
              >
                <div className="size-2 rounded-full bg-[#087f72] mt-1.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-[#193638] truncate">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-[#65797d] line-clamp-2 mt-0.5">
                    {item.desc}
                  </div>
                  <div className="text-[10px] text-[#8a9b9e] font-mono mt-1">
                    {item.time}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="border-t border-[#dfe7e7] pt-2 text-center">
            <Link
              href="/doctor/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-[#087f72] hover:underline block py-1"
            >
              Xem tất cả thông báo →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function DoctorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isClient = useIsClient();

  const {
    profile,
    doctor,
    appointments,
    logout,
    loggedIn,
    selectedAppointment,
    setSelectedAppointment,
    toasts,
  } = useDoctorStore();

  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#f4f7f7] flex items-center justify-center text-sm text-[#65797d]">
        Đang tải ClinicBooking Doctor...
      </div>
    );
  }

  if (!loggedIn) {
    return <LoginView />;
  }

  const currentDateStr = getFormattedDate();

  return (
    <div className="min-h-screen bg-[#f4f7f7] text-[#193638]">
      {/* ── Sidebar desktop ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[224px] flex-col bg-[#fcfcfa] border-r border-[#dfe7e7] md:flex print:hidden">
        {/* Brand */}
        <div className="flex h-[72px] items-center px-4 gap-2.5">
          <div className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-[#087f72] text-white shadow-sm font-black text-lg">
            ✚
          </div>
          <div className="text-[19px] font-bold tracking-tight text-[#103f3d] font-sans">
            ClinicBooking
          </div>
        </div>

        {/* Clinic info block */}
        <div className="mx-3 mb-2 p-2.5 rounded-xl bg-[#f4f7f7] border border-[#dfe7e7]">
          <div className="text-[12px] font-semibold text-[#193638] truncate">
            Phòng khám ClinicBooking
          </div>
          <div className="text-[11px] text-[#65797d] truncate mt-0.5">
            Không gian dành cho bác sĩ
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 flex flex-col gap-1" aria-label="Điều hướng bác sĩ">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href.split('?')[0]);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] transition-colors duration-150 no-underline ${
                  isActive
                    ? 'bg-[#e8f5f0] text-[#087f72] font-semibold'
                    : 'text-[#65797d] hover:bg-[#f4f7f7] hover:text-[#193638] font-medium'
                }`}
              >
                <item.icon className={`size-[18px] shrink-0 ${isActive ? 'text-[#087f72]' : 'text-[#65797d]'}`} strokeWidth={1.8} />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto rounded-full bg-[#087f72] text-white text-[10px] font-bold px-2 py-0.5">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Support & footer */}
        <div className="p-3 border-t border-[#dfe7e7] space-y-2">
          <button
            type="button"
            className="w-full flex items-center gap-2 text-left text-[11.5px] text-[#65797d] hover:text-[#193638] transition-colors"
          >
            <HelpCircle className="size-4 shrink-0 text-[#65797d]" />
            <span>Trung tâm trợ giúp</span>
          </button>
          <div className="text-[10px] text-[#8a9b9e] px-0.5">
            ClinicBooking · Cổng Bác sĩ
          </div>
        </div>
      </aside>

      {/* ── Content Area with Top Bar ── */}
      <div className="md:pl-[224px] print:!pl-0">
        {/* Top Bar Desktop */}
        <header className="sticky top-0 z-20 hidden md:flex h-[76px] items-center justify-between border-b border-[#dfe7e7] bg-white px-6">
          {/* Global search */}
          <div className="relative w-[360px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8a9b9e]" />
            <input
              type="text"
              placeholder="⌕   Tìm bệnh nhân, lịch hẹn...                ⌘ K"
              className="h-10 w-full rounded-xl border border-[#dfe7e7] bg-[#f4f7f7] pl-9 pr-3 text-[12px] text-[#193638] placeholder:text-[#8a9b9e] focus:border-[#087f72] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            <span className="text-[12px] font-medium text-[#65797d]">
              {currentDateStr}
            </span>

            {/* Notification button with Popup Dropdown */}
            <NotificationDropdown />

            {/* Doctor account info */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#dfe7e7]">
              <Link href="/doctor/profile" className="flex items-center gap-2.5 no-underline">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e8f5f0] text-[#087f72] text-xs font-bold border border-[#dfe7e7]">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{initials(profile.full_name)}</span>
                  )}
                </div>
                <div className="text-left leading-tight">
                  <div className="text-[12.5px] font-semibold text-[#193638]">
                    {profile.full_name.startsWith('BS.') ? profile.full_name : `BS. ${profile.full_name}`}
                  </div>
                  <div className="text-[11px] text-[#65797d]">
                    {doctor.room || 'Phòng 201'} · Tim mạch
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={logout}
                title="Đăng xuất"
                className="size-8 flex items-center justify-center rounded-lg text-[#65797d] hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile top header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#dfe7e7] bg-white px-4 md:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#087f72] text-white font-bold">
            ✚
          </div>
          <strong className="text-sm font-semibold text-[#193638]">ClinicBooking Doctor</strong>
          <button
            type="button"
            aria-label="Thêm tùy chọn"
            className="flex size-8 items-center justify-center rounded-lg hover:bg-slate-100"
          >
            <MoreHorizontal className="size-5 text-slate-500" />
          </button>
        </header>

        {/* Main page content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto pb-24 md:pb-12">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid md:hidden print:hidden border-t border-[#dfe7e7] bg-white pb-[env(safe-area-inset-bottom)]"
        style={{ gridTemplateColumns: `repeat(5, 1fr)` }}
        aria-label="Điều hướng"
      >
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href.split('?')[0]);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium no-underline ${
                isActive ? 'text-[#087f72]' : 'text-[#65797d]'
              }`}
            >
              <item.icon className="size-5" strokeWidth={isActive ? 2 : 1.75} />
              <span className="truncate max-w-[60px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Appointment Detail Modal ── */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}

      {/* ── Toast stack ── */}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <Check />
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
