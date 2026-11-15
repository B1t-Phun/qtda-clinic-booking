'use client';

import React, { useState } from 'react';
import {
  Download,
  Plus,
  Search,
} from 'lucide-react';
import {
  type Appointment,
} from '../data';
import {
  StatusBadge,
  EmptyState,
  SkeletonList,
} from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { ageOf, genderLabel } from '../utils';


export default function AppointmentsView() {
  const { appointments, slots, patients, setSelectedAppointment } = useDoctorStore();
  const [tab, setTab] = useState<'all' | 'pending' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Status mapping for tabs
  const tabFilter = (a: Appointment) => {
    if (tab === 'all') return true;
    if (tab === 'pending') return a.status === 'pending';
    if (tab === 'upcoming') return a.status === 'confirmed';
    if (tab === 'ongoing') return a.status === 'confirmed'; // Live/current
    if (tab === 'completed') return a.status === 'completed';
    if (tab === 'cancelled') return a.status === 'cancelled' || a.status === 'no_show';
    return true;
  };

  const filtered = appointments
    .filter((a) => {
      const p = patients.find((x) => x.id === a.patient_id);
      const s = slots.find((x) => x.id === a.slot_id);
      if (!p || !s) return false;
      return (
        tabFilter(a) &&
        (!date || s.slot_date === date) &&
        (!search || `${p.full_name} ${p.phone} #${a.id}`.toLowerCase().includes(search.toLowerCase()))
      );
    })
    .sort((a, b) => {
      const sa = slots.find((x) => x.id === a.slot_id)!;
      const sb = slots.find((x) => x.id === b.slot_id)!;
      return `${sa.slot_date}${sa.start_time}`.localeCompare(`${sb.slot_date}${sb.start_time}`);
    });

  const triggerLoad = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 250);
  };

  const pendingCount = appointments.filter((a) => a.status === 'pending').length;
  const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const cancelledCount = appointments.filter((a) => a.status === 'cancelled' || a.status === 'no_show').length;

  return (
    <div className="space-y-6 animate-fade-in text-[#193638]">
      {/* ── Tiêu đề trang (Page Heading & Actions) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-medium text-[#65797d]">
            Không gian bác sĩ / <span className="text-[#193638]">Danh sách lịch hẹn</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#103f3d] mt-1 sm:text-[26px]">
            Danh sách lịch hẹn
          </h1>
          <p className="text-xs text-[#65797d] mt-0.5">
            Theo dõi, xác nhận và điều phối các lịch hẹn của bạn.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => alert('Đang xuất danh sách lịch hẹn CSV...')}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe7e7] bg-white px-3.5 text-xs font-semibold text-[#193638] shadow-xs hover:bg-[#f4f7f7] transition-colors"
          >
            <Download className="size-4 text-[#65797d]" />
            <span>Xuất danh sách</span>
          </button>
          <button
            type="button"
            onClick={() => alert('Mở dialog tạo lịch hẹn')}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#087f72] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#06665c] transition-colors"
          >
            <Plus className="size-4" />
            <span>Tạo lịch hẹn</span>
          </button>
        </div>
      </div>

      {/* ── Khối nội dung (Tabs & Filters & Table) ── */}
      <div className="rounded-2xl border border-[#dfe7e7] bg-white shadow-xs overflow-hidden">
        {/* Tabs chuẩn Figma */}
        <div className="flex border-b border-[#dfe7e7] px-4 overflow-x-auto gap-2">
          {[
            { id: 'all', label: 'Tất cả', count: appointments.length },
            { id: 'pending', label: 'Chờ xác nhận', count: pendingCount },
            { id: 'upcoming', label: 'Sắp khám', count: confirmedCount },
            { id: 'ongoing', label: 'Đang khám', count: 1 },
            { id: 'completed', label: 'Hoàn tất', count: completedCount },
            { id: 'cancelled', label: 'Đã hủy', count: cancelledCount },
          ].map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => {
                setTab(t.id as typeof tab);
                triggerLoad();
              }}
              className={`flex items-center gap-1.5 py-3.5 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-[#087f72] text-[#087f72] font-semibold'
                  : 'border-transparent text-[#65797d] hover:text-[#193638]'
              }`}
            >
              <span>{t.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                tab === t.id ? 'bg-[#e8f5f0] text-[#087f72]' : 'bg-[#f4f7f7] text-[#65797d]'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-[#dfe7e7] bg-[#fcfcfa] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative min-w-[240px] max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8a9b9e]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="⌕  Tìm tên bệnh nhân, mã lịch hẹn..."
                className="h-9 w-full rounded-xl border border-[#dfe7e7] bg-white pl-9 pr-3 text-xs text-[#193638] placeholder:text-[#8a9b9e] focus:border-[#087f72] focus:outline-none"
              />
            </div>

            {/* Date filter */}
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 rounded-xl border border-[#dfe7e7] bg-white px-3 text-xs text-[#193638] focus:border-[#087f72] focus:outline-none"
              />
            </div>
          </div>

          {(search || date || tab !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDate('');
                setTab('all');
              }}
              className="text-xs font-medium text-[#087f72] hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Data Table chuẩn Figma */}
        {loading ? (
          <div className="p-6">
            <SkeletonList />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState search={!!(search || date || tab !== 'all')} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#dfe7e7] bg-[#f4f7f7] text-[11px] font-semibold uppercase text-[#65797d]">
                <tr>
                  <th className="py-3 px-4">BỆNH NHÂN</th>
                  <th className="py-3 px-4">GIỜ HẸN</th>
                  <th className="py-3 px-4">LÝ DO KHÁM</th>
                  <th className="py-3 px-4">HÌNH THỨC</th>
                  <th className="py-3 px-4">TRẠNG THÁI</th>
                  <th className="py-3 px-4 text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfe7e7]">
                {filtered.map((a) => {
                  const p = patients.find((x) => x.id === a.patient_id);
                  const s = slots.find((x) => x.id === a.slot_id);
                  if (!p || !s) return null;

                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAppointment(a)}
                      className="cursor-pointer hover:bg-[#f4f7f7]/60 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8f5f0] text-[#087f72] font-bold text-xs">
                            {p.full_name.split(' ').map((x) => x[0]).slice(-2).join('').toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[#193638]">{p.full_name}</div>
                            <div className="text-[11px] text-[#65797d]">
                              BN-{String(p.id).padStart(5, '0')} · {genderLabel[p.gender]}, {ageOf(p.date_of_birth)}t
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-[#193638]">{s.start_time}</div>
                        <div className="text-[11px] text-[#65797d]">30 phút · {s.slot_date}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#193638] max-w-xs truncate">
                        {a.reason || 'Khám bệnh'}
                      </td>
                      <td className="py-3.5 px-4 text-[#65797d]">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px]">
                          Tại phòng khám
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointment(a);
                          }}
                          className="rounded-lg border border-[#dfe7e7] px-2.5 py-1 text-[11px] font-medium text-[#193638] hover:bg-[#f4f7f7] transition-colors"
                        >
                          Xem ⋯
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination footer */}
            <div className="p-4 border-t border-[#dfe7e7] bg-[#fcfcfa] flex items-center justify-between text-xs text-[#65797d]">
              <div>
                Hiển thị <b>1–{filtered.length}</b> trong <b>{appointments.length}</b> lịch hẹn
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-[#dfe7e7] px-2.5 py-1 text-xs opacity-50 cursor-not-allowed"
                >
                  ← Trước
                </button>
                <span className="px-2 font-medium text-[#193638]">1</span>
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-[#dfe7e7] px-2.5 py-1 text-xs opacity-50 cursor-not-allowed"
                >
                  Sau →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
