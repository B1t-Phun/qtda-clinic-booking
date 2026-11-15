'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Activity, Bell, CalendarClock, CheckCheck, ChevronRight, Clock, Mail, MessageSquare, Settings, UserCheck } from 'lucide-react';



interface NotificationItem {
  id: string;
  type: 'appointment' | 'checkin' | 'lab' | 'schedule';
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  link?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    type: 'checkin',
    title: 'Bệnh nhân đã đến phòng chờ',
    description: 'Trần Thị Lan (BN-00128) đã hoàn tất thủ tục tiếp đón tại quầy lúc 09:05.',
    time: '10 phút trước',
    isRead: false,
    link: '/doctor/appointments',
  },
  {
    id: 'n2',
    type: 'appointment',
    title: 'Lịch hẹn mới cần xác nhận',
    description: 'Lê Quốc Bảo đặt lịch khám lúc 09:30 hôm nay. Lý do: Ho kéo dài.',
    time: '25 phút trước',
    isRead: false,
    link: '/doctor/appointments',
  },
  {
    id: 'n3',
    type: 'lab',
    title: 'Có kết quả cận lâm sàng mới',
    description: 'Kết quả điện tâm đồ (ECG) của bệnh nhân Nguyễn Văn Hùng đã sẵn sàng.',
    time: '1 giờ trước',
    isRead: false,
    link: '/doctor/appointments?tab=records',
  },
  {
    id: 'n4',
    type: 'appointment',
    title: 'Bệnh nhân yêu cầu dời lịch',
    description: 'Phạm Ngọc Lan xin dời lịch từ 14:00 sang 15:30 chiều nay.',
    time: '2 giờ trước',
    isRead: false,
    link: '/doctor/appointments',
  },
  {
    id: 'n5',
    type: 'schedule',
    title: 'Lịch làm việc tuần sau đã duyệt',
    description: 'Ban quản trị phòng khám đã phê duyệt khung giờ trực tuần 16/11–22/11 của bạn.',
    time: 'Hôm qua',
    isRead: true,
    link: '/doctor/schedule',
  },
  {
    id: 'n6',
    type: 'lab',
    title: 'Kết quả xét nghiệm sinh hóa máu',
    description: 'Bác sĩ xét nghiệm đã cập nhật chỉ số Cholesterol của BN-00094.',
    time: 'Hôm qua',
    isRead: true,
    link: '/doctor/appointments?tab=records',
  },
];

export default function NotificationsView() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const getTypeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'checkin':
        return <UserCheck className="size-4 text-[#087f72]" />;
      case 'appointment':
        return <CalendarClock className="size-4 text-[#d97706]" />;
      case 'lab':
        return <Activity className="size-4 text-[#2563eb]" />;
      case 'schedule':
        return <Clock className="size-4 text-[#7c3aed]" />;
      default:
        return <Bell className="size-4 text-[#65797d]" />;
    }
  };

  const getTypeBg = (type: NotificationItem['type']) => {
    switch (type) {
      case 'checkin':
        return 'bg-[#e8f5f0] border-[#087f72]/20';
      case 'appointment':
        return 'bg-amber-50 border-amber-200';
      case 'lab':
        return 'bg-blue-50 border-blue-200';
      case 'schedule':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#193638]">
      {/* ── Tiêu đề trang (Page Heading & Actions) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-medium text-[#65797d]">
            Không gian bác sĩ / <span className="text-[#193638]">Thông báo</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#103f3d] mt-1 sm:text-[26px]">
            Thông báo
          </h1>
          <p className="text-xs text-[#65797d] mt-0.5">
            Cập nhật lịch hẹn, tiếp nhận bệnh nhân và kết quả cận lâm sàng.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe7e7] bg-white px-3.5 text-xs font-semibold text-[#193638] shadow-xs hover:bg-[#f4f7f7] transition-colors"
            >
              <CheckCheck className="size-4 text-[#087f72]" />
              <span>Đánh dấu tất cả đã đọc</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Bố cục: Danh sách thông báo & Cài đặt nhanh ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cột trái: Danh sách thông báo (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs bộ lọc */}
          <div className="flex items-center gap-2 border-b border-[#dfe7e7] pb-3">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-[#e8f5f0] text-[#087f72]'
                  : 'text-[#65797d] hover:bg-[#f4f7f7]'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === 'unread'
                  ? 'bg-[#e8f5f0] text-[#087f72]'
                  : 'text-[#65797d] hover:bg-[#f4f7f7]'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {/* List items */}
          <div className="divide-y divide-[#dfe7e7] rounded-2xl border border-[#dfe7e7] bg-white overflow-hidden shadow-xs">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => markAsRead(item.id)}
                className={`flex items-start gap-3.5 p-4 transition-colors cursor-pointer hover:bg-[#f4f7f7]/70 ${
                  !item.isRead ? 'bg-[#fcfcfa]' : ''
                }`}
              >
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${getTypeBg(item.type)}`}>
                  {getTypeIcon(item.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs ${!item.isRead ? 'font-bold text-[#103f3d]' : 'font-semibold text-[#193638]'}`}>
                      {item.title}
                    </h4>
                    <span className="text-[11px] text-[#8a9b9e] font-mono shrink-0">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-[#65797d] mt-1 leading-relaxed">
                    {item.description}
                  </p>

                  {item.link && (
                    <div className="mt-2.5">
                      <Link
                        href={item.link}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#087f72] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Xem chi tiết</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </div>
                  )}
                </div>

                {!item.isRead && (
                  <span className="size-2 rounded-full bg-[#087f72] shrink-0 mt-2" />
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="p-12 text-center text-xs text-[#65797d]">
                Không có thông báo nào.
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Thiết lập nhanh thông báo (1 col) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#dfe7e7] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#dfe7e7] pb-3">
              <Settings className="size-4 text-[#087f72]" />
              <h3 className="text-xs font-bold text-[#103f3d]">Thiết lập nhận tin</h3>
            </div>

            <div className="space-y-3 text-xs text-[#193638]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-0.5 rounded border-[#dfe7e7] text-[#087f72] focus:ring-[#087f72]" />
                <div>
                  <div className="font-semibold">Bệnh nhân đến phòng khám</div>
                  <div className="text-[11px] text-[#65797d]">Nhận chuông báo ngay khi quầy tiếp đón bấm check-in.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-0.5 rounded border-[#dfe7e7] text-[#087f72] focus:ring-[#087f72]" />
                <div>
                  <div className="font-semibold">Lịch hẹn mới đặt trực tuyến</div>
                  <div className="text-[11px] text-[#65797d]">Thông báo khi có bệnh nhân chọn khung giờ của bạn.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-0.5 rounded border-[#dfe7e7] text-[#087f72] focus:ring-[#087f72]" />
                <div>
                  <div className="font-semibold">Kết quả cận lâm sàng</div>
                  <div className="text-[11px] text-[#65797d]">Báo tin khi phòng xét nghiệm hoàn tất tải lên file.</div>
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-[#dfe7e7] bg-[#fcfcfa] p-4 text-[11px] text-[#65797d] space-y-2">
            <div className="font-semibold text-[#103f3d]">Kênh nhận thông báo</div>
            <div className="flex items-center gap-2 text-slate-700">
              <Mail className="size-3.5 text-[#087f72]" />
              <span>Email: bs.minhanh@clinicbooking.vn</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <MessageSquare className="size-3.5 text-[#087f72]" />
              <span>SMS nội bộ phòng khám</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
