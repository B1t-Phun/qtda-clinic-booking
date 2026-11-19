'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  CalendarPlus,
  ClipboardList,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
  UserCheck,
  Calendar,
  Sparkles,
  User,
} from 'lucide-react';
import { Card, Button } from '@/components/ui/core';
import { createClient } from '@/lib/supabase/client';
import { fmtDate } from '@/lib/format';
import {
  type AppointmentItem,
  getAppointmentDoctor,
  getAppointmentSlot,
  getDoctorProfile,
  getDoctorSpecialty,
  PatientStatusBadge,
} from './client-types';

export default function ClientDashboardPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [upcomingAppointment, setUpcomingAppointment] = useState<AppointmentItem | null>(null);
  const [loadingAppt, setLoadingAppt] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

          setUserName(profile?.full_name || user.email?.split('@')[0] || 'Quý khách');

          // Fetch upcoming appointment for current user (pending or confirmed)
          const { data: appts } = await supabase
            .from('appointments')
            .select(`
              id,
              patient_id,
              doctor_id,
              slot_id,
              status,
              reason,
              doctor_note,
              cancel_reason,
              created_at,
              doctor:doctors (
                id,
                room,
                consultation_fee,
                profile:profiles (
                  id,
                  full_name,
                  phone,
                  avatar_url
                ),
                specialty:specialties (
                  id,
                  name
                )
              ),
              slot:time_slots (
                id,
                slot_date,
                start_time,
                end_time
              )
            `)
            .eq('patient_id', user.id)
            .in('status', ['pending', 'confirmed'])
            .order('created_at', { ascending: false })
            .limit(1);

          if (appts && appts.length > 0) {
            setUpcomingAppointment(appts[0] as unknown as AppointmentItem);
          }
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoadingAppt(false);
      }
    }

    loadDashboardData();

    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ full_name?: string }>;
      if (customEvent.detail?.full_name) {
        setUserName(customEvent.detail.full_name);
      } else {
        loadDashboardData();
      }
    };

    window.addEventListener('cliniccare:profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('cliniccare:profile-updated', handleProfileUpdate);
    };
  }, []);

  const upcomingDoctor = upcomingAppointment ? getAppointmentDoctor(upcomingAppointment) : null;
  const upcomingDoctorProfile = upcomingDoctor ? getDoctorProfile(upcomingDoctor) : null;
  const upcomingDoctorSpecialty = upcomingDoctor ? getDoctorSpecialty(upcomingDoctor) : null;
  const upcomingSlot = upcomingAppointment ? getAppointmentSlot(upcomingAppointment) : null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-primary to-indigo-700 p-6 sm:p-10 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md mb-4 text-blue-100">
            <Sparkles className="size-3.5" />
            <span>Nền tảng Y tế Thông minh ClinicCare</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Chào mừng {userName ? <span className="text-amber-300">{userName}</span> : 'bạn'} đến ClinicCare
          </h1>
          <p className="mt-3 text-sm sm:text-base text-blue-100/90 leading-relaxed">
            Đặt lịch khám bệnh trực tuyến nhanh chóng, dễ dàng với đội ngũ bác sĩ chuyên khoa đầu ngành.
            Chủ động chọn thời gian, tiết kiệm thời gian chờ đợi tại phòng khám.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/client/booking">
              <Button
                variant="accent"
                size="lg"
                icon={<CalendarPlus className="size-5" />}
                className="bg-emerald-500 hover:bg-emerald-600 font-semibold shadow-md"
              >
                Đặt lịch khám ngay
              </Button>
            </Link>
            <Link href="/client/doctors">
              <Button
                variant="secondary"
                size="lg"
                icon={<Stethoscope className="size-5 text-primary" />}
                className="bg-white/90 text-slate-800 hover:bg-white border-0 shadow-md"
              >
                Danh sách Bác sĩ
              </Button>
            </Link>
            <Link href="/client/profile">
              <Button
                variant="ghost"
                size="lg"
                icon={<User className="size-5 text-white" />}
                className="bg-white/15 text-white hover:bg-white/25 border-0 shadow-sm"
              >
                Hồ sơ cá nhân
              </Button>
            </Link>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-12 -bottom-16 size-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-12 top-6 size-48 rounded-full bg-accent/20 blur-xl pointer-events-none" />
      </div>

      {/* 2. Upcoming Appointment Banner (if available) */}
      {!loadingAppt && upcomingAppointment && upcomingSlot && (
        <Card className="border-l-4 border-l-primary bg-gradient-to-r from-blue-50/60 to-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-primary">
                <Calendar className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Lịch hẹn sắp tới của bạn
                  </span>
                  <PatientStatusBadge status={upcomingAppointment.status} />
                </div>
                <h3 className="text-base font-bold text-ink">
                  {upcomingDoctorProfile?.full_name || 'Bác sĩ chuyên khoa'}
                  {upcomingDoctorSpecialty && (
                    <span className="font-normal text-muted"> • {upcomingDoctorSpecialty.name}</span>
                  )}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-13 text-slate-600">
                  <span className="flex items-center gap-1 font-medium text-ink">
                    <Clock className="size-3.5 text-primary" />
                    {upcomingSlot.start_time.slice(0, 5)} - {upcomingSlot.end_time.slice(0, 5)}, Ngày {fmtDate(upcomingSlot.slot_date)}
                  </span>
                  {upcomingDoctor?.room && (
                    <span>Phòng khám: <strong>{upcomingDoctor.room}</strong></span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Link href="/client/appointments">
                <Button variant="secondary" size="sm" icon={<ArrowRight className="size-4" />}>
                  Xem chi tiết lịch hẹn
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Quick Action Cards */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight text-ink">Dịch vụ & Thao tác nhanh</h2>
          <p className="text-13 text-muted">Truy cập các tính năng chính chỉ với một thao tác</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Tìm bác sĩ */}
          <Link href="/client/doctors" className="group block focus:outline-none">
            <Card className="h-full p-6 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-blue-200">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <Stethoscope className="size-6" />
              </div>
              <h3 className="mt-4 font-bold text-base text-ink group-hover:text-primary transition-colors">
                Tìm Bác sĩ
              </h3>
              <p className="mt-1.5 text-13 text-muted leading-relaxed">
                Tra cứu thông tin, chuyên môn, kinh nghiệm và bảng giá khám của đội ngũ bác sĩ.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                <span>Xem danh sách</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>

          {/* Card 2: Đặt lịch khám */}
          <Link href="/client/booking" className="group block focus:outline-none">
            <Card className="h-full p-6 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-emerald-200">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <CalendarPlus className="size-6" />
              </div>
              <h3 className="mt-4 font-bold text-base text-ink group-hover:text-emerald-600 transition-colors">
                Đặt lịch khám
              </h3>
              <p className="mt-1.5 text-13 text-muted leading-relaxed">
                Lựa chọn chuyên khoa, bác sĩ và khung giờ trống linh hoạt theo nhu cầu của bạn.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <span>Đặt ngay</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>

          {/* Card 3: Lịch hẹn của tôi */}
          <Link href="/client/appointments" className="group block focus:outline-none">
            <Card className="h-full p-6 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-amber-200">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                <ClipboardList className="size-6" />
              </div>
              <h3 className="mt-4 font-bold text-base text-ink group-hover:text-amber-600 transition-colors">
                Lịch hẹn của tôi
              </h3>
              <p className="mt-1.5 text-13 text-muted leading-relaxed">
                Theo dõi tiến độ, kiểm tra trạng thái xác nhận và quản lý hủy lịch nếu cần.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-600">
                <span>Quản lý lịch hẹn</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>

          {/* Card 4: Danh mục Chuyên khoa */}
          <Link href="/client/specialties" className="group block focus:outline-none">
            <Card className="h-full p-6 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-purple-200">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
                <Layers className="size-6" />
              </div>
              <h3 className="mt-4 font-bold text-base text-ink group-hover:text-purple-600 transition-colors">
                Chuyên khoa
              </h3>
              <p className="mt-1.5 text-13 text-muted leading-relaxed">
                Khám phá các chuyên khoa mũi nhọn như Tim mạch, Nội tổng quát, Da liễu, Nhi khoa.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-purple-600">
                <span>Khám phá</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* 4. Why ClinicCare / Value Propositions */}
      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs">
        <div className="max-w-xl mb-6">
          <h2 className="text-xl font-bold tracking-tight text-ink">Vì sao nên đặt lịch tại ClinicCare?</h2>
          <p className="text-13 text-muted mt-1">
            Trải nghiệm y tế hiện đại, văn minh với quy trình chuẩn y khoa
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
              <UserCheck className="size-5" />
            </div>
            <div>
              <h4 className="font-semibold text-ink text-sm">Bác sĩ chuyên khoa giỏi</h4>
              <p className="mt-1 text-13 text-muted leading-relaxed">
                Các bác sĩ nhiều năm công tác tại bệnh viện tuyến đầu, tận tâm và giàu kinh nghiệm.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Clock className="size-5" />
            </div>
            <div>
              <h4 className="font-semibold text-ink text-sm">Không chờ đợi mệt mỏi</h4>
              <p className="mt-1 text-13 text-muted leading-relaxed">
                Được ưu tiên vào khám đúng khung giờ đã hẹn, giảm thiểu tối đa thời gian xếp hàng.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h4 className="font-semibold text-ink text-sm">Minh bạch & Tin cậy</h4>
              <p className="mt-1 text-13 text-muted leading-relaxed">
                Chi phí khám niêm yết rõ ràng, hồ sơ bảo mật an toàn theo tiêu chuẩn Bộ Y Tế.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
