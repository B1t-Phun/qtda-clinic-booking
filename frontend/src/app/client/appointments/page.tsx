'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  CalendarPlus,
  MapPin,
  CreditCard,
  LogIn,
  XCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';
import {
  PageHeader,
  Card,
  Button,
  Avatar,
  Skeleton,
  EmptyState,
  ErrorState,
  Tabs,
  Chip,
} from '@/components/ui/core';
import { Textarea } from '@/components/ui/form';
import { ConfirmDialog, useToast } from '@/components/ui/overlay';
import { createClient } from '@/lib/supabase/client';
import { fmtDate, fmtDateTime, fmtVND } from '@/lib/format';
import {
  type AppointmentItem,
  getAppointmentDoctor,
  getAppointmentSlot,
  getDoctorProfile,
  getDoctorSpecialty,
  PatientStatusBadge,
} from '../client-types';

type FilterTab = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

export default function MyAppointmentsPage() {
  const toast = useToast();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // Active Tab
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Cancel Dialog state
  const [cancellingAppt, setCancellingAppt] = useState<AppointmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancellingLoading, setCancellingLoading] = useState(false);

  // 1. Check user auth & fetch appointments
  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;

        if (!user) {
          setUserId(null);
          setAppointments([]);
          setLoadingAuth(false);
          setLoadingList(false);
          return;
        }

        setUserId(user.id);
        setLoadingAuth(false);

        const { data, error: apptErr } = await supabase
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
            updated_at,
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
              end_time,
              is_booked
            )
          `)
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false });

        if (apptErr) throw apptErr;
        if (active) {
          setAppointments((data as unknown as AppointmentItem[]) || []);
          setError(null);
        }
      } catch (err: unknown) {
        console.error('Error loading appointments:', err);
        if (active) {
          setError(err instanceof Error ? err.message : 'Lỗi tải danh sách lịch hẹn');
        }
      } finally {
        if (active) {
          setLoadingAuth(false);
          setLoadingList(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [reloadTick]);

  const fetchAppointments = () => {
    setLoadingList(true);
    setError(null);
    setReloadTick((t) => t + 1);
  };

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: appointments.length,
      pending: appointments.filter((a) => a.status === 'pending').length,
      confirmed: appointments.filter((a) => a.status === 'confirmed').length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      cancelled: appointments.filter((a) => a.status === 'cancelled').length,
    };
  }, [appointments]);

  // Filtered by active tab
  const filteredAppointments = useMemo(() => {
    if (activeTab === 'all') return appointments;
    return appointments.filter((a) => a.status === activeTab);
  }, [appointments, activeTab]);

  // Handle Cancel Appointment
  const handleConfirmCancel = async () => {
    if (!cancellingAppt || !userId) return;
    setCancellingLoading(true);
    const supabase = createClient();

    try {
      // Update appointment status to 'cancelled'; DB trigger `trg_sync_slot_booked` automatically frees the time slot
      const { data: updated, error: updateErr } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancel_reason: cancelReason.trim() || 'Bệnh nhân yêu cầu hủy lịch',
          updated_at: new Date().toISOString(),
        })
        .eq('id', cancellingAppt.id)
        .eq('patient_id', userId)
        .in('status', ['pending', 'confirmed'])
        .select('id')
        .maybeSingle();

      if (updateErr) throw updateErr;
      if (!updated) {
        throw new Error('Không thể hủy lịch hẹn này (trạng thái đã thay đổi).');
      }

      toast({
        tone: 'success',
        title: 'Hủy lịch thành công',
        description: 'Hủy lịch thành công. Khung giờ đã được trả lại.',
      });

      // Close modal and refresh list
      setCancellingAppt(null);
      setCancelReason('');
      fetchAppointments();
    } catch (err: unknown) {
      console.error('Error cancelling appointment:', err);
      toast({
        tone: 'error',
        title: 'Lỗi hủy lịch',
        description: err instanceof Error ? err.message : 'Không thể hủy lịch. Vui lòng thử lại.',
      });
    } finally {
      setCancellingLoading(false);
    }
  };

  const cancellingDoctor = cancellingAppt ? getAppointmentDoctor(cancellingAppt) : null;
  const cancellingDoctorProfile = cancellingDoctor ? getDoctorProfile(cancellingDoctor) : null;
  const cancellingSlot = cancellingAppt ? getAppointmentSlot(cancellingAppt) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Lịch hẹn của tôi"
        description="Theo dõi trạng thái lịch khám, xem thông tin bác sĩ và quản lý yêu cầu hủy lịch"
        actions={
          <div className="flex items-center gap-2">
            {userId && (
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw className="size-3.5" />}
                onClick={fetchAppointments}
              >
                Làm mới
              </Button>
            )}
            <Link href="/client/booking">
              <Button variant="primary" icon={<CalendarPlus className="size-4" />}>
                Đặt lịch khám mới
              </Button>
            </Link>
          </div>
        }
      />

      {/* Auth Guard Check */}
      {loadingAuth ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !userId ? (
        <Card className="p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-primary mx-auto">
            <Calendar className="size-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">Vui lòng đăng nhập</h3>
            <p className="mt-1 text-13 text-muted">
              Đăng nhập bằng tài khoản bệnh nhân để theo dõi và quản lý lịch hẹn khám bệnh của bạn.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="primary" size="lg" icon={<LogIn className="size-4" />}>
                Đăng nhập ngay
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Tabs Filter */}
          <div className="bg-white rounded-xl border border-line px-2">
            <Tabs
              tabs={[
                { id: 'all', label: 'Tất cả', count: tabCounts.all },
                { id: 'pending', label: 'Chờ duyệt', count: tabCounts.pending },
                { id: 'confirmed', label: 'Đã xác nhận', count: tabCounts.confirmed },
                { id: 'completed', label: 'Hoàn thành', count: tabCounts.completed },
                { id: 'cancelled', label: 'Đã hủy', count: tabCounts.cancelled },
              ]}
              value={activeTab}
              onChange={(tab) => setActiveTab(tab as FilterTab)}
            />
          </div>

          {/* Appointments List / Skeletons / Empty */}
          {loadingList ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-8 w-2/3" />
                </Card>
              ))}
            </div>
          ) : error ? (
            <ErrorState onRetry={fetchAppointments} />
          ) : filteredAppointments.length === 0 ? (
            <EmptyState
              kind="empty"
              title={
                activeTab === 'all'
                  ? 'Bạn chưa có lịch hẹn nào'
                  : `Không có lịch hẹn nào ở trạng thái này`
              }
              description={
                activeTab === 'all'
                  ? 'Đặt lịch khám trực tuyến với bác sĩ chuyên khoa ngay hôm nay để nhận được sự chăm sóc y tế chu đáo nhất.'
                  : 'Hãy kiểm tra lại danh mục khác hoặc đặt lịch khám mới.'
              }
              action={
                <Link href="/client/booking">
                  <Button variant="primary" icon={<CalendarPlus className="size-4" />}>
                    Đặt lịch khám ngay
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredAppointments.map((appt) => {
                const doctor = getAppointmentDoctor(appt);
                const doctorProfile = getDoctorProfile(doctor);
                const doctorSpecialty = getDoctorSpecialty(doctor);
                const slot = getAppointmentSlot(appt);
                const fullName = doctorProfile?.full_name || 'Bác sĩ chuyên khoa';
                const canCancel = appt.status === 'pending' || appt.status === 'confirmed';

                return (
                  <Card
                    key={appt.id}
                    className="flex flex-col justify-between p-5 sm:p-6 transition-all hover:shadow-md hover:border-slate-300"
                  >
                    <div>
                      {/* Top row: Status Badge & Booking ID */}
                      <div className="flex items-center justify-between pb-3.5 border-b border-line gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted">Mã lịch hẹn:</span>
                          <span className="text-xs font-bold num text-ink">#{appt.id}</span>
                        </div>
                        <PatientStatusBadge status={appt.status} />
                      </div>

                      {/* Doctor Info */}
                      <div className="flex items-start gap-3.5 py-4">
                        <Avatar
                          name={fullName}
                          url={doctorProfile?.avatar_url}
                          size={48}
                          className="shrink-0 ring-2 ring-blue-50"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-base text-ink truncate">{fullName}</h3>
                          {doctorSpecialty && (
                            <div className="mt-0.5">
                              <Chip tone="blue">{doctorSpecialty.name}</Chip>
                            </div>
                          )}
                          {doctor?.room && (
                            <p className="mt-1 text-xs text-muted flex items-center gap-1">
                              <MapPin className="size-3 text-primary shrink-0" />
                              Phòng khám: {doctor.room}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Date & Time info box */}
                      <div className="rounded-xl bg-slate-50 p-3.5 space-y-2 text-13 text-slate-700 border border-line">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-muted">
                            <Calendar className="size-4 text-primary shrink-0" />
                            Ngày khám:
                          </span>
                          <span className="font-bold text-ink">
                            {fmtDate(slot?.slot_date)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-muted">
                            <Clock className="size-4 text-primary shrink-0" />
                            Khung giờ:
                          </span>
                          <span className="font-bold text-primary">
                            {slot?.start_time ? slot.start_time.slice(0, 5) : '—'} -{' '}
                            {slot?.end_time ? slot.end_time.slice(0, 5) : '—'}
                          </span>
                        </div>

                        {doctor?.consultation_fee !== undefined && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                            <span className="flex items-center gap-1.5 text-muted">
                              <CreditCard className="size-4 text-emerald-600 shrink-0" />
                              Phí tư vấn:
                            </span>
                            <span className="font-bold text-emerald-600">
                              {fmtVND(doctor.consultation_fee)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Appointment Reason */}
                      {appt.reason && (
                        <div className="mt-3.5 text-13">
                          <span className="text-xs font-semibold text-muted block mb-0.5">
                            Lý do khám / Triệu chứng:
                          </span>
                          <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-line/80 italic">
                            &quot;{appt.reason}&quot;
                          </p>
                        </div>
                      )}

                      {/* Doctor Note (if completed or added) */}
                      {appt.doctor_note && (
                        <div className="mt-3 text-13">
                          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mb-0.5">
                            <FileText className="size-3.5" /> Ghi chú từ Bác sĩ:
                          </span>
                          <p className="text-slate-800 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                            {appt.doctor_note}
                          </p>
                        </div>
                      )}

                      {/* Cancel Reason (if cancelled) */}
                      {appt.status === 'cancelled' && appt.cancel_reason && (
                        <div className="mt-3 text-13">
                          <span className="text-xs font-semibold text-red-600 flex items-center gap-1 mb-0.5">
                            <XCircle className="size-3.5" /> Lý do hủy:
                          </span>
                          <p className="text-slate-700 bg-red-50/60 p-2.5 rounded-lg border border-red-200">
                            {appt.cancel_reason}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom row: Created At & Cancel Button */}
                    <div className="mt-5 pt-3.5 border-t border-line flex items-center justify-between gap-3 text-xs text-muted">
                      <span>Đặt lúc: {fmtDateTime(appt.created_at)}</span>

                      {canCancel && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setCancellingAppt(appt);
                            setCancelReason('');
                          }}
                        >
                          Hủy lịch
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={!!cancellingAppt}
        onClose={() => {
          setCancellingAppt(null);
          setCancelReason('');
        }}
        onConfirm={handleConfirmCancel}
        disabled={cancellingLoading}
        title="Xác nhận hủy lịch hẹn khám"
        tone="danger"
        confirmLabel={cancellingLoading ? 'Đang hủy...' : 'Hủy lịch hẹn'}
        message={
          <div>
            Bạn có chắc chắn muốn hủy lịch hẹn khám với{' '}
            <strong>{cancellingDoctorProfile?.full_name || 'Bác sĩ'}</strong> vào{' '}
            <strong>{cancellingSlot?.start_time?.slice(0, 5)}</strong> ngày{' '}
            <strong>{fmtDate(cancellingSlot?.slot_date)}</strong>? Khung giờ này sẽ được mở lại cho bệnh nhân khác.
          </div>
        }
      >
        <div className="mt-3">
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Lý do hủy lịch khám:
          </label>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Ví dụ: Có việc bận đột xuất, muốn dời lịch hẹn..."
            rows={3}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
