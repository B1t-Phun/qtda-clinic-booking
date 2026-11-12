'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Plus } from 'lucide-react';

import { StatusBadge } from '../components/DoctorUI';

import { useDoctorStore } from '../store/store';
import {
  todayISO,
  longDate,
  ageOf,
  genderLabel,
} from '../utils';

export default function TodayView() {
  const { appointments, slots, patients, doctor, profile, setSelectedAppointment } =
    useDoctorStore();

  const today = todayISO();
  const todaySlots = slots
    .filter((s) => s.slot_date === today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // If mock data doesn't have slots today, fallback to all available appointments for demonstration
  const displayApps = todaySlots.length > 0
    ? appointments.filter((a) => todaySlots.some((s) => s.id === a.slot_id))
    : appointments;

  const confirmedCount = displayApps.filter((a) => a.status === 'confirmed').length;
  const pendingCount = displayApps.filter((a) => a.status === 'pending').length;
  const completedCount = displayApps.filter((a) => a.status === 'completed').length;
  const cancelledCount = displayApps.filter((a) => a.status === 'cancelled').length;


  // Active / examining appointment
  const currentExamining =
    displayApps.find((a) => a.status === 'confirmed') ||
    displayApps.find((a) => a.status === 'pending') ||
    displayApps[0];

  const currentSlot = currentExamining && slots.find((s) => s.id === currentExamining.slot_id);
  const currentPatient = currentExamining && patients.find((p) => p.id === currentExamining.patient_id);

  // Next patient in line
  const nextExamining = displayApps.filter((a) => a.id !== currentExamining?.id)[0];
  const nextSlot = nextExamining && slots.find((s) => s.id === nextExamining.slot_id);
  const nextPatient = nextExamining && patients.find((p) => p.id === nextExamining.patient_id);

  // Pending list for confirmation card
  const pendingList = displayApps.filter((a) => a.status === 'pending');

  const doctorDisplayName = profile.full_name.startsWith('BS.')
    ? profile.full_name.replace('BS. ', '')
    : profile.full_name;

  return (
    <div className="space-y-6 animate-fade-in text-[#193638]">
      {/* ── Tiêu đề trang (Page Heading & Actions) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-medium text-[#65797d]">
            Không gian bác sĩ / <span className="text-[#193638]">Tổng quan</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#103f3d] mt-1 sm:text-[26px]">
            Chào buổi sáng, bác sĩ {doctorDisplayName}
          </h1>
          <p className="text-xs text-[#65797d] mt-0.5">
            {longDate(today)} · Hôm nay có <b>{displayApps.length}</b> lịch hẹn cần theo dõi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/doctor/appointments">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#087f72] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#06665c] transition-colors"
            >
              <Plus className="size-4" />
              <span>Tạo lịch hẹn</span>
            </button>
          </Link>
        </div>
      </div>

      {/* ── Chỉ số hôm nay (4 KPI Cards chuẩn Figma) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <div className="rounded-2xl border border-[#dfe7e7] bg-white p-5 shadow-xs">
          <div className="text-xs font-medium text-[#65797d]">Lịch hẹn hôm nay</div>
          <div className="text-3xl font-extrabold text-[#193638] mt-2 tracking-tight">
            {displayApps.length}
          </div>
          <div className="text-[11.5px] text-[#65797d] mt-2">
            {confirmedCount} đã xác nhận · {pendingCount} chờ · {cancelledCount} đã hủy
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-2xl border border-[#dfe7e7] bg-white p-5 shadow-xs">
          <div className="text-xs font-medium text-[#65797d]">Bệnh nhân đã đến</div>
          <div className="text-3xl font-extrabold text-[#193638] mt-2 tracking-tight">
            {completedCount + (currentExamining ? 1 : 0)}
          </div>
          <div className="text-[11.5px] text-[#65797d] mt-2">
            {completedCount} hoàn tất · 1 đang khám · {pendingCount} chờ
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-2xl border border-[#dfe7e7] bg-white p-5 shadow-xs">
          <div className="text-xs font-medium text-[#65797d]">Yêu cầu chờ xác nhận</div>
          <div className="text-3xl font-extrabold text-[#d97706] mt-2 tracking-tight">
            {pendingCount}
          </div>
          <div className="text-[11.5px] text-[#65797d] mt-2">
            Cần phản hồi trong hôm nay
          </div>
        </div>

        {/* KPI 4 */}
        <div className="rounded-2xl border border-[#dfe7e7] bg-white p-5 shadow-xs">
          <div className="text-xs font-medium text-[#65797d]">Đã hoàn tất khám</div>
          <div className="text-3xl font-extrabold text-[#087f72] mt-2 tracking-tight">
            {completedCount} / {displayApps.length}
          </div>
          <div className="text-[11.5px] text-[#65797d] mt-2">
            Cập nhật theo ca khám
          </div>
        </div>
      </div>

      {/* ── Ưu tiên trong ngày (Ca đang khám & Cần xác nhận) ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Ca đang khám (Figma dark pine background #103f3d) */}
        {currentExamining && currentPatient ? (
          <div className="rounded-2xl bg-[#103f3d] p-6 text-white shadow-md flex flex-col justify-between">
            <div>
              {/* Header tags */}
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-emerald-300">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  ĐANG KHÁM · {doctor.room || 'PHÒNG 201'}
                </span>
                <span className="rounded-md bg-white/10 px-2.5 py-1 text-white/80 font-mono text-[11px]">
                  {currentSlot?.start_time || '09:00'}–{currentSlot?.end_time || '09:30'}
                </span>
              </div>

              {/* Patient info row */}
              <div className="mt-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#e8f5f0] text-[#087f72] font-bold text-sm">
                    {currentPatient.full_name.split(' ').map((s) => s[0]).slice(-2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">
                      {currentPatient.full_name}
                    </h3>
                    <p className="text-xs text-white/70 truncate mt-0.5">
                      BN-{String(currentPatient.id).padStart(5, '0')} · {genderLabel[currentPatient.gender]}, {ageOf(currentPatient.date_of_birth)} tuổi · {currentExamining.reason || 'Tái khám định kỳ'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAppointment(currentExamining)}
                  className="shrink-0 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#103f3d] hover:bg-emerald-50 transition-colors shadow-sm"
                >
                  Tiếp tục khám →
                </button>
              </div>
            </div>

            {/* Next patient line */}
            <div className="mt-6 pt-4 border-t border-white/10 text-xs text-white/70 flex items-center justify-between">
              <span>
                {nextPatient ? (
                  <>Tiếp theo: <b>{nextSlot?.start_time || '09:30'}</b> · {nextPatient.full_name} · Đã tiếp đón</>
                ) : (
                  <>Không có ca tiếp theo trong khung giờ kế tiếp</>
                )}
              </span>
              <Clock className="size-3.5 text-white/50" />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#dfe7e7] bg-white p-6 text-center text-[#65797d]">
            Hiện chưa có ca khám nào đang tiến hành.
          </div>
        )}

        {/* Khối Cần xác nhận */}
        <div className="rounded-2xl border border-[#dfe7e7] bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#dfe7e7] pb-3.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#193638]">Cần xác nhận</h3>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  {pendingList.length} yêu cầu
                </span>
              </div>
              <Link href="/doctor/appointments" className="text-xs font-medium text-[#087f72] hover:underline">
                Xem tất cả yêu cầu →
              </Link>
            </div>

            <div className="mt-3 divide-y divide-[#f4f7f7]">
              {pendingList.slice(0, 3).map((a) => {
                const pat = patients.find((p) => p.id === a.patient_id);
                const s = slots.find((sl) => sl.id === a.slot_id);
                return (
                  <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-[#193638] truncate">
                        {pat?.full_name || 'Bệnh nhân'} · <span className="font-mono text-[#087f72]">{s?.start_time || '08:00'}</span>
                      </div>
                      <div className="text-[11px] text-[#65797d] truncate mt-0.5">
                        {a.reason || 'Yêu cầu khám mới'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAppointment(a)}
                      className="rounded-lg border border-[#dfe7e7] px-3 py-1 text-xs font-medium text-[#193638] hover:bg-[#f4f7f7] transition-colors shrink-0"
                    >
                      Xem →
                    </button>
                  </div>
                );
              })}
              {pendingList.length === 0 && (
                <div className="py-8 text-center text-xs text-[#65797d]">
                  Không có lịch hẹn nào đang chờ xác nhận.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#dfe7e7]">
            <Link
              href="/doctor/appointments"
              className="text-xs font-semibold text-[#087f72] hover:underline block text-center"
            >
              Xem toàn bộ danh sách chờ xử lý ({pendingList.length}) →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Lịch trình và khối lượng (Lịch khám hôm nay & Khối lượng tuần này) ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Lịch khám hôm nay (Table) */}
        <div className="lg:col-span-2 rounded-2xl border border-[#dfe7e7] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#dfe7e7] pb-3.5">
            <div>
              <h3 className="text-sm font-bold text-[#193638]">Lịch khám hôm nay</h3>
              <p className="text-[11.5px] text-[#65797d] mt-0.5">{longDate(today)}</p>
            </div>
            <Link href="/doctor/appointments" className="text-xs font-medium text-[#087f72] hover:underline">
              Xem toàn bộ {displayApps.length} lịch hẹn →
            </Link>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#dfe7e7] bg-[#f4f7f7] text-[11px] font-semibold uppercase text-[#65797d]">
                <tr>
                  <th className="py-2.5 px-3">BỆNH NHÂN</th>
                  <th className="py-2.5 px-3">GIỜ</th>
                  <th className="py-2.5 px-3">LÝ DO KHÁM</th>
                  <th className="py-2.5 px-3 text-right">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4f7f7]">
                {displayApps.slice(0, 5).map((a) => {
                  const pat = patients.find((p) => p.id === a.patient_id);
                  const sl = slots.find((s) => s.id === a.slot_id);
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAppointment(a)}
                      className="cursor-pointer hover:bg-[#f4f7f7]/60 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#193638]">{pat?.full_name || 'Bệnh nhân'}</div>
                        <div className="text-[10.5px] text-[#65797d]">
                          {pat ? `${genderLabel[pat.gender]}, ${ageOf(pat.date_of_birth)}t` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-[#193638]">
                        {sl?.start_time || '09:00'}
                      </td>
                      <td className="py-3 px-3 text-[#65797d] max-w-xs truncate">
                        {a.reason || 'Khám tổng quát'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Khối lượng tuần này (Bar Chart) */}
        <div className="rounded-2xl border border-[#dfe7e7] bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#dfe7e7] pb-3.5">
              <h3 className="text-sm font-bold text-[#193638]">Khối lượng tuần này</h3>
              <span className="text-[11px] text-[#65797d] font-mono">09–15/11</span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#193638]">58</span>
              <span className="text-xs text-[#65797d]">lịch hẹn trong tuần</span>
            </div>

            {/* Weekly bar chart visual */}
            <div className="mt-6 flex items-end justify-between gap-2 h-28 pt-4">
              {[
                { day: 'T2', val: 12, max: 15 },
                { day: 'T3', val: 10, max: 15 },
                { day: 'T4', val: 11, max: 15 },
                { day: 'T5', val: 9, max: 15 },
                { day: 'T6', val: 10, max: 15 },
                { day: 'T7', val: 6, max: 15 },
                { day: 'CN', val: 0, max: 15 },
              ].map((item) => {
                const heightPct = Math.max(8, Math.round((item.val / item.max) * 100));
                return (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-semibold text-[#65797d]">
                      {item.val > 0 ? item.val : ''}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        item.day === 'T2' ? 'bg-[#087f72]' : 'bg-[#e8f5f0]'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[10px] font-medium text-[#65797d]">
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#dfe7e7] text-[11px] text-[#8a9b9e]">
            Thứ Hai có nhiều lịch nhất. Số liệu bao gồm các lịch hẹn đã tạo trong tuần.
          </div>
        </div>
      </div>
    </div>
  );
}
