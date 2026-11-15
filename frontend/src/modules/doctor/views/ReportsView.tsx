'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock, Download, FileSpreadsheet, Star, TrendingUp, Users } from 'lucide-react';

import { useDoctorStore } from '../store/store';

export default function ReportsView() {
  const { profile } = useDoctorStore();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('week');

  const doctorDisplayName = profile.full_name.startsWith('BS.')
    ? profile.full_name
    : `BS. ${profile.full_name}`;

  return (
    <div className="space-y-6 animate-fade-in text-[#193638]">
      {/* ── Tiêu đề trang (Page Heading & Actions) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-medium text-[#65797d]">
            Không gian bác sĩ / <span className="text-[#193638]">Báo cáo cá nhân</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#103f3d] mt-1 sm:text-[26px]">
            Báo cáo cá nhân
          </h1>
          <p className="text-xs text-[#65797d] mt-0.5">
            Số liệu lịch hẹn và hiệu suất khám của {doctorDisplayName} trong kỳ đã chọn.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex rounded-xl border border-[#dfe7e7] bg-white p-1 text-xs">
            <button
              type="button"
              onClick={() => setPeriod('week')}
              className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
                period === 'week' ? 'bg-[#e8f5f0] text-[#087f72]' : 'text-[#65797d] hover:text-[#193638]'
              }`}
            >
              Tuần này
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
                period === 'month' ? 'bg-[#e8f5f0] text-[#087f72]' : 'text-[#65797d] hover:text-[#193638]'
              }`}
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => setPeriod('quarter')}
              className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
                period === 'quarter' ? 'bg-[#e8f5f0] text-[#087f72]' : 'text-[#65797d] hover:text-[#193638]'
              }`}
            >
              Quý này
            </button>
          </div>

          <button
            type="button"
            onClick={() => alert('Đang xuất báo cáo cá nhân định dạng PDF...')}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#087f72] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#06665c] transition-colors"
          >
            <Download className="size-4" />
            <span>Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* ── 4 Thẻ KPI Tổng hợp kỳ báo cáo chuẩn Figma ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Tổng ca khám */}
        <div className="rounded-2xl border border-[#dfe7e7] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#65797d]">
            <span>Tổng ca khám</span>
            <Users className="size-4 text-[#087f72]" />
          </div>
          <div className="text-3xl font-extrabold text-[#193638] mt-2 tracking-tight">
            58
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-[#087f72] font-semibold mt-2">
            <TrendingUp className="size-3.5" />
            <span>+12% so với kỳ trước</span>
          </div>
        </div>

        {/* KPI 2: Tỉ lệ hoàn tất */}
        <div className="rounded-2xl border border-[#dfe7e7] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#65797d]">
            <span>Tỉ lệ hoàn tất khám</span>
            <CheckCircle2 className="size-4 text-[#087f72]" />
          </div>
          <div className="text-3xl font-extrabold text-[#193638] mt-2 tracking-tight">
            94.8%
          </div>
          <div className="text-[11.5px] text-[#65797d] mt-2">
            55 ca hoàn thành · 3 hủy/vắng
          </div>
        </div>

        {/* KPI 3: Thời gian khám trung bình */}
        <div className="rounded-2xl border border-[#dfe7e7] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#65797d]">
            <span>Thời lượng TB / ca</span>
            <Clock className="size-4 text-[#d97706]" />
          </div>
          <div className="text-3xl font-extrabold text-[#193638] mt-2 tracking-tight">
            22.4 ph
          </div>
          <div className="text-[11.5px] text-[#65797d] mt-2">
            Chuẩn mục tiêu: 20–25 phút
          </div>
        </div>

        {/* KPI 4: Đánh giá bệnh nhân */}
        <div className="rounded-2xl border border-[#dfe7e7] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#65797d]">
            <span>Đánh giá từ bệnh nhân</span>
            <Star className="size-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-[#193638] mt-2 tracking-tight">
            4.9 / 5.0
          </div>
          <div className="text-[11.5px] text-[#65797d] mt-2">
            Dựa trên 42 lượt phản hồi
          </div>
        </div>
      </div>

      {/* ── Biểu đồ thống kê: Khối lượng khám & Cơ cấu ca bệnh ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Biểu đồ số lượng ca khám 7 ngày (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-[#dfe7e7] bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#dfe7e7] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#103f3d]">Số ca khám theo ngày trong tuần</h3>
                <p className="text-[11px] text-[#65797d] mt-0.5">09/11/2026 – 15/11/2026</p>
              </div>
              <span className="text-xs font-semibold text-[#087f72]">58 ca khám</span>
            </div>

            <div className="mt-8 flex items-end justify-between gap-3 h-40 pt-4">
              {[
                { day: 'Thứ 2', date: '09/11', count: 12, max: 15 },
                { day: 'Thứ 3', date: '10/11', count: 10, max: 15 },
                { day: 'Thứ 4', date: '11/11', count: 11, max: 15 },
                { day: 'Thứ 5', date: '12/11', count: 9, max: 15 },
                { day: 'Thứ 6', date: '13/11', count: 10, max: 15 },
                { day: 'Thứ 7', date: '14/11', count: 6, max: 15 },
                { day: 'Chủ Nhật', date: '15/11', count: 0, max: 15 },
              ].map((item) => {
                const heightPct = Math.max(6, Math.round((item.count / item.max) * 100));
                return (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-xs font-bold text-[#193638]">
                      {item.count > 0 ? item.count : ''}
                    </span>
                    <div
                      className={`w-full max-w-[42px] rounded-t-lg transition-all duration-300 ${
                        item.count >= 10 ? 'bg-[#087f72]' : 'bg-[#14b8a6]/60'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <div className="text-center leading-tight">
                      <div className="text-[11px] font-semibold text-[#193638]">{item.day}</div>
                      <div className="text-[10px] text-[#65797d]">{item.date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-[#dfe7e7] text-[11px] text-[#65797d] flex items-center justify-between">
            <span>Ngày cao điểm: <b>Thứ Hai (12 ca)</b></span>
            <span>Khung giờ khám nhiều nhất: <b>08:30 – 10:30</b></span>
          </div>
        </div>

        {/* Cơ cấu loại hình khám bệnh (1 col) */}
        <div className="rounded-2xl border border-[#dfe7e7] bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="border-b border-[#dfe7e7] pb-3">
              <h3 className="text-sm font-bold text-[#103f3d]">Phân bổ ca bệnh</h3>
              <p className="text-[11px] text-[#65797d] mt-0.5">Theo tính chất thăm khám</p>
            </div>

            <div className="mt-5 space-y-4">
              {[
                { label: 'Tái khám định kỳ (THA, ĐTĐ)', count: 26, pct: 45, color: '#087f72' },
                { label: 'Khám mới có triệu chứng', count: 18, pct: 31, color: '#2563eb' },
                { label: 'Tư vấn cận lâm sàng', count: 9, pct: 16, color: '#d97706' },
                { label: 'Kiểm tra sức khỏe tổng quát', count: 5, pct: 8, color: '#7c3aed' },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#193638]">{item.label}</span>
                    <span className="font-bold text-[#193638]">{item.count} ({item.pct}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#f4f7f7]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-[#dfe7e7] text-[11px] text-[#8a9b9e]">
            Số liệu cập nhật tự động từ hồ sơ thăm khám hoàn tất.
          </div>
        </div>
      </div>

      {/* ── Bảng Chi tiết từng ngày trong kỳ ── */}
      <div className="rounded-2xl border border-[#dfe7e7] bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#dfe7e7] bg-[#fcfcfa] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[#103f3d]">Bảng chi tiết lịch khám theo ngày</h3>
            <p className="text-[11px] text-[#65797d] mt-0.5">Từ ngày 09/11/2026 đến ngày 15/11/2026</p>
          </div>
          <button
            type="button"
            onClick={() => alert('Xuất file bảng tính Excel...')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087f72] hover:underline"
          >
            <FileSpreadsheet className="size-4" />
            <span>Xuất Excel</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#dfe7e7] bg-[#f4f7f7] text-[11px] font-semibold uppercase text-[#65797d]">
              <tr>
                <th className="py-3 px-4">NGÀY</th>
                <th className="py-3 px-4">TỔNG LỊCH</th>
                <th className="py-3 px-4">HOÀN TẤT</th>
                <th className="py-3 px-4">HỦY / VẮNG</th>
                <th className="py-3 px-4">TỈ LỆ HOÀN THÀNH</th>
                <th className="py-3 px-4 text-right">ĐÁNH GIÁ TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfe7e7]">
              {[
                { date: 'Thứ Hai, 09/11/2026', total: 12, completed: 11, cancelled: 1, rate: '91.7%', rating: '4.9 ★' },
                { date: 'Thứ Ba, 10/11/2026', total: 10, completed: 10, cancelled: 0, rate: '100%', rating: '5.0 ★' },
                { date: 'Thứ Tư, 11/11/2026', total: 11, completed: 10, cancelled: 1, rate: '90.9%', rating: '4.8 ★' },
                { date: 'Thứ Năm, 12/11/2026', total: 9, completed: 9, cancelled: 0, rate: '100%', rating: '4.9 ★' },
                { date: 'Thứ Sáu, 13/11/2026', total: 10, completed: 9, cancelled: 1, rate: '90.0%', rating: '5.0 ★' },
                { date: 'Thứ Bảy, 14/11/2026', total: 6, completed: 6, cancelled: 0, rate: '100%', rating: '4.9 ★' },
              ].map((row) => (
                <tr key={row.date} className="hover:bg-[#f4f7f7]/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#193638]">{row.date}</td>
                  <td className="py-3 px-4 font-bold text-[#193638]">{row.total}</td>
                  <td className="py-3 px-4 text-[#087f72] font-semibold">{row.completed}</td>
                  <td className="py-3 px-4 text-rose-600">{row.cancelled}</td>
                  <td className="py-3 px-4 font-mono font-medium">{row.rate}</td>
                  <td className="py-3 px-4 text-right font-bold text-amber-700">{row.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
