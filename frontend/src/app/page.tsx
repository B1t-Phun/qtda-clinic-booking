'use client';

import Link from 'next/link';
import { CalendarPlus, HeartPulse, Shield, User, ArrowRight } from 'lucide-react';

export default function Home() {
  const portals = [
    {
      title: 'Cổng Bác sĩ (Doctor Portal)',
      desc: 'Quản lý lịch khám bệnh, khung giờ làm việc, hồ sơ bệnh nhân và ghi chú chuyên môn.',
      href: '/doctor',
      icon: HeartPulse,
      badge: 'Hoàn thiện từ Figma',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      color: 'from-blue-600 to-indigo-600',
      btnText: 'Truy cập Bác sĩ',
    },
    {
      title: 'Cổng Quản trị (Admin Portal)',
      desc: 'Quản lý tài khoản, phòng khám, danh mục chuyên khoa, lịch hẹn và thống kê báo cáo.',
      href: '/admin',
      icon: Shield,
      badge: 'Quản trị viên',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      color: 'from-slate-800 to-slate-900',
      btnText: 'Truy cập Quản trị',
    },
    {
      title: 'Cổng Bệnh nhân (Client Portal)',
      desc: 'Tìm kiếm bác sĩ, chuyên khoa và đặt lịch khám bệnh trực tuyến dễ dàng.',
      href: '/client',
      icon: User,
      badge: 'Bệnh nhân',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      color: 'from-teal-600 to-emerald-600',
      btnText: 'Truy cập Bệnh nhân',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
      <div className="max-w-4xl w-full text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-4">
          <CalendarPlus className="size-4" /> Hệ thống đặt lịch khám bệnh ClinicBooking
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
          Chọn cổng thông tin để trải nghiệm
        </h1>
        <p className="text-slate-600 max-w-xl mx-auto text-base">
          Hệ thống y tế tích hợp hoàn chỉnh các phân hệ dành cho Bác sĩ, Quản trị viên phòng khám và Bệnh nhân.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {portals.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.href}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`size-12 rounded-xl bg-gradient-to-br ${p.color} text-white flex items-center justify-center shadow-sm`}
                  >
                    <Icon className="size-6" />
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${p.badgeColor}`}
                  >
                    {p.badge}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">{p.title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">{p.desc}</p>
              </div>

              <Link
                href={p.href}
                className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-slate-900 text-white hover:bg-blue-600 text-sm font-semibold transition-colors duration-150 group"
              >
                <span>{p.btnText}</span>
                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          );
        })}
      </div>

      <footer className="mt-12 text-center text-xs text-slate-500">
        © 2025 - 2026 ClinicBooking · Nền tảng y tế số thông minh
      </footer>
    </div>
  );
}
