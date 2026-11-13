'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HeartPulse,
  Menu,
  X,
  Stethoscope,
  CalendarPlus,
  ClipboardList,
  Home,
  Layers,
  LogOut,
  LogIn,
  Phone,
  Clock,
  MapPin,
  User,
} from 'lucide-react';
import { ToastProvider } from '@/components/ui/overlay';
import { Button, Avatar } from '@/components/ui/core';
import { createClient } from '@/lib/supabase/client';
import { cx } from '@/lib/format';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/client', label: 'Trang chủ', icon: Home },
  { href: '/client/doctors', label: 'Bác sĩ', icon: Stethoscope },
  { href: '/client/specialties', label: 'Chuyên khoa', icon: Layers },
  { href: '/client/booking', label: 'Đặt lịch', icon: CalendarPlus },
  { href: '/client/appointments', label: 'Lịch hẹn', icon: ClipboardList },
];

function ClientHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; full_name?: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

          setCurrentUser({
            id: user.id,
            email: user.email,
            full_name: profile?.full_name || user.email?.split('@')[0] || 'Bệnh nhân',
          });
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Error loading current user:', err);
      } finally {
        setLoadingUser(false);
      }
    }

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUser();
      } else {
        setCurrentUser(null);
      }
    });

    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ full_name?: string }>;
      if (customEvent.detail?.full_name) {
        setCurrentUser((prev) =>
          prev ? { ...prev, full_name: customEvent.detail.full_name } : prev
        );
      } else {
        loadUser();
      }
    };

    window.addEventListener('cliniccare:profile-updated', handleProfileUpdate);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('cliniccare:profile-updated', handleProfileUpdate);
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setCurrentUser(null);
    setMobileMenuOpen(false);
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/client') {
      return pathname === '/client';
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link href="/client" className="flex items-center gap-2.5 group">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-blue-500 text-white shadow-sm shadow-primary/30 transition-transform group-hover:scale-105">
            <HeartPulse className="size-5" strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold tracking-tight text-ink">Clinic</span>
              <span className="text-lg font-black tracking-tight text-primary">Care</span>
            </div>
            <p className="text-[11px] font-medium text-muted -mt-0.5">Đặt lịch khám bệnh</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-blue-50 text-primary font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-ink'
                )}
              >
                <Icon className={cx('size-4', active ? 'text-primary' : 'text-slate-400')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right CTA / User profile */}
        <div className="hidden sm:flex items-center gap-3">
          {loadingUser ? (
            <div className="size-9 rounded-full bg-slate-100 animate-pulse" />
          ) : currentUser ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-line">
              <Link
                href="/client/profile"
                className="flex items-center gap-2 group p-1 -m-1 rounded-lg hover:bg-slate-50 transition-colors"
                title="Hồ sơ cá nhân của bạn"
              >
                <Avatar name={currentUser.full_name || 'Bệnh nhân'} size={32} />
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-semibold text-ink leading-tight max-w-[120px] truncate group-hover:text-primary transition-colors">
                    {currentUser.full_name}
                  </p>
                  <p className="text-[11px] text-muted leading-tight truncate max-w-[120px]">
                    {currentUser.email}
                  </p>
                </div>
              </Link>

              <Link href="/client/profile">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<User className="size-3.5" />}
                  title="Xem và chỉnh sửa thông tin cá nhân"
                  className="h-8 px-2.5 text-xs text-slate-700 hover:text-primary"
                >
                  <span className="hidden xl:inline">Hồ sơ</span>
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                icon={<LogOut className="size-4" />}
                onClick={handleLogout}
                title="Đăng xuất"
                className="text-slate-500 hover:text-red-600 h-8 px-2.5"
              >
                <span className="hidden xl:inline">Thoát</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="secondary" size="sm" icon={<LogIn className="size-4" />}>
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/client/booking">
                <Button variant="primary" size="sm" icon={<CalendarPlus className="size-4" />}>
                  Đặt lịch ngay
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu hamburger button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Mở menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer / dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-line bg-white px-4 pt-2 pb-5 md:hidden animate-fade-in">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-50 text-primary font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-ink'
                  )}
                >
                  <Icon className={cx('size-4', active ? 'text-primary' : 'text-slate-400')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 pt-4 border-t border-line">
            {currentUser ? (
              <div className="flex flex-col gap-3">
                <Link
                  href="/client/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={currentUser.full_name || 'Bệnh nhân'} size={36} />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-ink leading-tight">{currentUser.full_name}</p>
                      <p className="text-xs text-muted truncate max-w-[180px]">{currentUser.email}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary">Xem hồ sơ &rarr;</span>
                </Link>

                <div className="flex items-center justify-between pt-1">
                  <Link
                    href="/client/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs font-medium text-slate-700 hover:text-primary flex items-center gap-1.5"
                  >
                    <User className="size-3.5" />
                    Chỉnh sửa thông tin
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<LogOut className="size-4 text-red-500" />}
                    onClick={handleLogout}
                  >
                    Thoát
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" size="md" className="w-full" icon={<LogIn className="size-4" />}>
                    Đăng nhập tài khoản
                  </Button>
                </Link>
                <Link href="/client/booking" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full" icon={<CalendarPlus className="size-4" />}>
                    Đặt lịch khám ngay
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function ClientFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Col 1: Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
                <HeartPulse className="size-4" />
              </div>
              <span className="text-lg font-bold text-ink">
                Clinic<span className="text-primary">Care</span>
              </span>
            </div>
            <p className="text-13 text-muted max-w-md">
              Hệ thống phòng khám đa khoa tiêu chuẩn quốc tế. Cung cấp dịch vụ đặt lịch hẹn trực tuyến nhanh chóng,
              tiện lợi, giúp bệnh nhân chủ động chăm sóc sức khỏe toàn diện.
            </p>
          </div>

          {/* Col 2: Liên hệ */}
          <div>
            <h4 className="text-sm font-semibold text-ink mb-3">Thông tin liên hệ</h4>
            <ul className="space-y-2 text-13 text-slate-600">
              <li className="flex items-start gap-2">
                <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                <span>123 Nguyễn Thị Minh Khai, Quận 1, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-primary shrink-0" />
                <span>Hotline: 1900 1234 (24/7)</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="size-4 text-primary shrink-0" />
                <span>Thứ 2 - Chủ Nhật: 07:30 - 20:00</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Liên kết nhanh */}
          <div>
            <h4 className="text-sm font-semibold text-ink mb-3">Liên kết nhanh</h4>
            <ul className="space-y-2 text-13">
              <li>
                <Link href="/client/doctors" className="text-slate-600 hover:text-primary transition-colors">
                  Đội ngũ Bác sĩ
                </Link>
              </li>
              <li>
                <Link href="/client/specialties" className="text-slate-600 hover:text-primary transition-colors">
                  Chuyên khoa khám
                </Link>
              </li>
              <li>
                <Link href="/client/booking" className="text-slate-600 hover:text-primary transition-colors">
                  Đặt lịch khám bệnh
                </Link>
              </li>
              <li>
                <Link href="/client/appointments" className="text-slate-600 hover:text-primary transition-colors">
                  Lịch hẹn của tôi
                </Link>
              </li>
              <li>
                <Link href="/client/profile" className="text-slate-600 hover:text-primary transition-colors">
                  Thông tin cá nhân
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between text-xs text-muted gap-2">
          <p>© 2026 ClinicCare. Bảo lưu mọi quyền.</p>
          <p>Nền tảng Quản trị & Đặt lịch Khám thông minh</p>
        </div>
      </div>
    </footer>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="client-layout min-h-screen flex flex-col bg-[#f8fafc] text-ink antialiased">
        <ClientHeader />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
        <ClientFooter />
      </div>
    </ToastProvider>
  );
}
