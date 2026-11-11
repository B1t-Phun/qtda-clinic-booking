'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarPlus,
  Clock,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  MapPin,
  CreditCard,
  Award,
  AlertCircle,
  LogIn,
  Check,
  Stethoscope,
} from 'lucide-react';
import {
  PageHeader,
  Card,
  Button,
  Avatar,
  Skeleton,
  Chip,
} from '@/components/ui/core';
import { Field, Select, Textarea } from '@/components/ui/form';
import { useToast } from '@/components/ui/overlay';
import { createClient } from '@/lib/supabase/client';
import { fmtDate, fmtVND } from '@/lib/format';
import {
  type DoctorItem,
  type SpecialtyItem,
  type TimeSlotItem,
  getDoctorProfile,
  getDoctorSpecialty,
} from '../client-types';

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlDoctorId = searchParams.get('doctor_id');
  const urlSpecialtyId = searchParams.get('specialty');
  const toast = useToast();

  // Current Step: 1 | 2 | 3
  const [step, setStep] = useState<number>(1);

  // Auth User
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
    full_name?: string;
    phone?: string;
  } | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Master Data
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Step 1 selections
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>(urlSpecialtyId || 'all');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(urlDoctorId || '');

  // Step 2 selections
  const next14Days = useMemo(() => {
    const list = [];
    const now = new Date();
    const dayNames = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      list.push({
        dateStr,
        displayDay: i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : dayNames[d.getDay()],
        displayDate: `${dd}/${mm}`,
        isToday: i === 0,
      });
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(next14Days[0].dateStr);
  const [slots, setSlots] = useState<TimeSlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  // Step 3 inputs
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Load User Auth & Initial Data
  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function init() {
      try {
        // Fetch Auth User
        const { data: { user } } = await supabase.auth.getUser();
        if (user && active) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (active) {
            setCurrentUser({
              id: user.id,
              email: user.email,
              full_name: profile?.full_name || user.email?.split('@')[0] || 'Bệnh nhân',
              phone: profile?.phone || '',
            });
          }
        }

        // Fetch Specialties
        const { data: specData } = await supabase
          .from('specialties')
          .select('*')
          .order('name');
        if (active) setSpecialties(specData || []);

        // Fetch Active Doctors
        const { data: docData } = await supabase
          .from('doctors')
          .select(`
            id,
            bio,
            room,
            years_experience,
            consultation_fee,
            is_active,
            specialty_id,
            profiles (
              id,
              full_name,
              phone,
              avatar_url
            ),
            specialties (
              id,
              name
            )
          `)
          .eq('is_active', true)
          .order('years_experience', { ascending: false });

        const loadedDoctors = (docData as DoctorItem[]) || [];
        if (active) {
          setDoctors(loadedDoctors);

          // Pre-select doctor if in URL
          if (urlDoctorId) {
            const matched = loadedDoctors.find((d) => d.id === urlDoctorId);
            if (matched) {
              setSelectedDoctorId(matched.id);
              if (matched.specialty_id) {
                setSelectedSpecialtyId(String(matched.specialty_id));
              }
            }
          }
        }
      } catch (err) {
        console.error('Error initializing booking data:', err);
      } finally {
        if (active) {
          setLoadingInitial(false);
          setLoadingAuth(false);
        }
      }
    }

    init();
    return () => {
      active = false;
    };
  }, [urlDoctorId]);

  // Selected Doctor Object
  const selectedDoctor = useMemo(() => {
    return doctors.find((d) => d.id === selectedDoctorId) || null;
  }, [doctors, selectedDoctorId]);

  // Filtered Doctors by Specialty
  const availableDoctors = useMemo(() => {
    if (selectedSpecialtyId === 'all') return doctors;
    return doctors.filter(
      (d) =>
        String(d.specialty_id) === selectedSpecialtyId ||
        String(getDoctorSpecialty(d)?.id) === selectedSpecialtyId
    );
  }, [doctors, selectedSpecialtyId]);

  // Handle specialty dropdown change
  const handleSpecialtyChange = (specId: string) => {
    setSelectedSpecialtyId(specId);
    if (specId !== 'all' && selectedDoctor && String(selectedDoctor.specialty_id) !== specId) {
      setSelectedDoctorId('');
      setSelectedSlotId('');
      setSlots([]);
    }
  };

  // 2. Load Slots when Doctor & Date change
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) {
      return;
    }

    let active = true;
    const supabase = createClient();

    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const { data, error } = await supabase
          .from('time_slots')
          .select('*')
          .eq('doctor_id', selectedDoctorId)
          .eq('slot_date', selectedDate)
          .order('start_time', { ascending: true });

        if (error) throw error;
        if (!active) return;

        const loadedSlots = (data as TimeSlotItem[]) || [];
        setSlots(loadedSlots);

        const now = new Date();
        const todayStr = next14Days[0].dateStr;
        const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Reset selected slot if not in new list, already booked, or already past
        setSelectedSlotId((prev) => {
          const found = loadedSlots.find((s) => String(s.id) === prev);
          const isPast = selectedDate === todayStr && !!found && found.start_time.slice(0, 5) <= nowHHMM;
          return found && !found.is_booked && !isPast ? prev : '';
        });
      } catch (err) {
        console.error('Error fetching slots:', err);
      } finally {
        if (active) setLoadingSlots(false);
      }
    }

    fetchSlots();
    return () => {
      active = false;
    };
  }, [selectedDoctorId, selectedDate, next14Days]);

  const displayedSlots = useMemo(() => {
    if (!selectedDoctorId || !selectedDate) return [];
    return slots;
  }, [selectedDoctorId, selectedDate, slots]);

  const isSlotPast = (slot: TimeSlotItem) => {
    if (slot.slot_date > next14Days[0].dateStr) return false;
    if (slot.slot_date < next14Days[0].dateStr) return true;
    const now = new Date();
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return slot.start_time.slice(0, 5) <= nowHHMM;
  };

  // Selected Slot Object
  const selectedSlot = useMemo(() => {
    return displayedSlots.find((s) => String(s.id) === selectedSlotId) || null;
  }, [displayedSlots, selectedSlotId]);

  const reloadCurrentSlots = async (doctorId: string, slotDate: string) => {
    const supabase = createClient();
    const { data: refreshed } = await supabase
      .from('time_slots')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('slot_date', slotDate)
      .order('start_time', { ascending: true });
    setSlots((refreshed as TimeSlotItem[]) || []);
    setSelectedSlotId('');
  };

  // Step 3 Submission
  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedSlot) {
      toast({
        tone: 'error',
        title: 'Thiếu thông tin',
        description: 'Vui lòng chọn đầy đủ bác sĩ và khung giờ khám.',
      });
      return;
    }

    const supabase = createClient();

    // Check user auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        tone: 'error',
        title: 'Chưa đăng nhập',
        description: 'Vui lòng đăng nhập tài khoản bệnh nhân để hoàn tất đặt lịch.',
      });
      router.push('/login');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Conflict Check: verify slot is still available
      const { data: checkSlot, error: checkErr } = await supabase
        .from('time_slots')
        .select('is_booked')
        .eq('id', selectedSlot.id)
        .single();

      if (checkErr || !checkSlot || checkSlot.is_booked) {
        toast({
          tone: 'error',
          title: 'Khung giờ đã có người đặt',
          description: 'Khung giờ đã được đặt bởi người khác, vui lòng chọn khung giờ khác.',
        });
        await reloadCurrentSlots(selectedDoctor.id, selectedDate);
        setStep(2);
        return;
      }

      // 1b. Self-overlap check: prevent same patient booking overlapping time slot
      const { data: myActiveAppts } = await supabase
        .from('appointments')
        .select('id, slot:time_slots (slot_date, start_time, end_time)')
        .eq('patient_id', user.id)
        .in('status', ['pending', 'confirmed']);

      const hasSelfOverlap = (myActiveAppts || []).some((appt) => {
        const s = Array.isArray(appt.slot) ? appt.slot[0] : appt.slot;
        if (!s || s.slot_date !== selectedSlot.slot_date) return false;
        return selectedSlot.start_time < s.end_time && selectedSlot.end_time > s.start_time;
      });

      if (hasSelfOverlap) {
        toast({
          tone: 'error',
          title: 'Trùng lịch hẹn của bạn',
          description: 'Bạn đã có một lịch hẹn khác trùng với khung giờ này. Vui lòng chọn giờ khác.',
        });
        setStep(2);
        return;
      }

      // 2. Insert into appointments (DB trigger `trg_sync_slot_booked` automatically marks time_slots.is_booked = true)
      const { error: insertErr } = await supabase.from('appointments').insert({
        patient_id: user.id,
        doctor_id: selectedDoctor.id,
        slot_id: selectedSlot.id,
        reason: reason.trim() || 'Khám bệnh',
        status: 'pending',
      });

      if (insertErr) {
        // Unique constraint `uq_appt_active_slot` (23505) or conflict
        if (
          insertErr.code === '23505' ||
          insertErr.message?.includes('uq_appt_active_slot') ||
          insertErr.message?.includes('conflict')
        ) {
          toast({
            tone: 'error',
            title: 'Khung giờ đã được đặt',
            description: 'Khung giờ đã được đặt bởi người khác, vui lòng chọn khung giờ khác.',
          });
          await reloadCurrentSlots(selectedDoctor.id, selectedDate);
          setStep(2);
          return;
        }
        throw insertErr;
      }

      // Success
      toast({
        tone: 'success',
        title: 'Đặt lịch khám thành công!',
        description: 'Lịch hẹn của bạn đang chờ phòng khám xác nhận.',
      });

      // Redirect to appointments list
      router.push('/client/appointments');
    } catch (err: unknown) {
      console.error('Error confirming booking:', err);
      toast({
        tone: 'error',
        title: 'Lỗi đặt lịch',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const doctorProfile = getDoctorProfile(selectedDoctor);
  const doctorSpecialty = getDoctorSpecialty(selectedDoctor);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <PageHeader
        title="Đặt lịch khám bệnh"
        description="Hoàn tất quy trình 3 bước để đặt lịch khám cùng bác sĩ chuyên khoa"
      />

      {/* Stepper Progress Bar */}
      <div className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <div
              className={`flex size-9 items-center justify-center rounded-xl font-bold text-sm transition-colors ${
                step >= 1 ? 'bg-primary text-white shadow-xs' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {step > 1 ? <Check className="size-5" /> : '1'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs text-muted">Bước 1</p>
              <p className={`text-sm font-semibold ${step >= 1 ? 'text-ink' : 'text-slate-400'}`}>
                Bác sĩ & Chuyên khoa
              </p>
            </div>
          </div>

          <div className={`h-0.5 flex-1 mx-3 sm:mx-6 ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`} />

          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <div
              className={`flex size-9 items-center justify-center rounded-xl font-bold text-sm transition-colors ${
                step >= 2
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {step > 2 ? <Check className="size-5" /> : '2'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs text-muted">Bước 2</p>
              <p className={`text-sm font-semibold ${step >= 2 ? 'text-ink' : 'text-slate-400'}`}>
                Ngày & Giờ khám
              </p>
            </div>
          </div>

          <div className={`h-0.5 flex-1 mx-3 sm:mx-6 ${step >= 3 ? 'bg-primary' : 'bg-slate-200'}`} />

          {/* Step 3 */}
          <div className="flex items-center gap-3">
            <div
              className={`flex size-9 items-center justify-center rounded-xl font-bold text-sm transition-colors ${
                step === 3 ? 'bg-primary text-white shadow-xs' : 'bg-slate-100 text-slate-500'
              }`}
            >
              3
            </div>
            <div className="hidden sm:block">
              <p className="text-xs text-muted">Bước 3</p>
              <p className={`text-sm font-semibold ${step === 3 ? 'text-ink' : 'text-slate-400'}`}>
                Xác nhận lịch hẹn
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 1: CHỌN CHUYÊN KHOA & BÁC SĨ */}
      {step === 1 && (
        <Card className="p-6 sm:p-8 space-y-6 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold text-ink">Bước 1: Chọn chuyên khoa & Bác sĩ khám</h2>
            <p className="text-13 text-muted mt-0.5">
              Chọn chuyên khoa cần khám hoặc trực tiếp chọn bác sĩ bạn mong muốn
            </p>
          </div>

          {loadingInitial ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Chuyên khoa khám">
                  <Select
                    value={selectedSpecialtyId}
                    onChange={(e) => handleSpecialtyChange(e.target.value)}
                  >
                    <option value="all">Tất cả chuyên khoa</option>
                    {specialties.map((s) => (
                      <option key={String(s.id)} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Bác sĩ điều trị" required>
                  <Select
                    value={selectedDoctorId}
                    onChange={(e) => {
                      setSelectedDoctorId(e.target.value);
                      setSelectedSlotId('');
                    }}
                  >
                    <option value="">-- Vui lòng chọn bác sĩ --</option>
                    {availableDoctors.map((doc) => {
                      const p = getDoctorProfile(doc);
                      const s = getDoctorSpecialty(doc);
                      return (
                        <option key={doc.id} value={doc.id}>
                          {p?.full_name || 'Bác sĩ'} {s ? `(${s.name})` : ''} - {doc.years_experience} năm KN
                        </option>
                      );
                    })}
                  </Select>
                </Field>
              </div>

              {/* Selected Doctor Preview Card */}
              {selectedDoctor ? (
                <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/40 p-5 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <Avatar
                        name={doctorProfile?.full_name || 'Bác sĩ'}
                        url={doctorProfile?.avatar_url}
                        size={60}
                        className="ring-2 ring-white shadow-xs shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-ink">
                            {doctorProfile?.full_name || 'Bác sĩ chuyên khoa'}
                          </h3>
                          {doctorSpecialty && (
                            <Chip tone="blue">{doctorSpecialty.name}</Chip>
                          )}
                        </div>
                        <p className="text-13 text-slate-600 mt-1 line-clamp-2">
                          {selectedDoctor.bio || 'Bác sĩ giàu kinh nghiệm trong chẩn đoán và điều trị.'}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
                          <span className="flex items-center gap-1 font-medium">
                            <Award className="size-3.5 text-amber-500" />
                            {selectedDoctor.years_experience} năm kinh nghiệm
                          </span>
                          {selectedDoctor.room && (
                            <span className="flex items-center gap-1 font-medium">
                              <MapPin className="size-3.5 text-primary" />
                              Phòng khám: {selectedDoctor.room}
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-bold text-emerald-600">
                            <CreditCard className="size-3.5" />
                            Giá khám: {fmtVND(selectedDoctor.consultation_fee || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-muted">
                  <Stethoscope className="size-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-700">Chưa chọn bác sĩ</p>
                  <p className="text-xs text-muted mt-1">
                    Vui lòng chọn một bác sĩ từ danh sách trên để xem các khung giờ khám còn trống.
                  </p>
                </div>
              )}

              {/* Navigation button */}
              <div className="pt-4 flex justify-end">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!selectedDoctorId}
                  onClick={() => setStep(2)}
                  icon={<ChevronRight className="size-4" />}
                >
                  Tiếp theo: Chọn ngày & giờ
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* STEP 2: CHỌN NGÀY & KHUNG GIỜ */}
      {step === 2 && (
        <Card className="p-6 sm:p-8 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">Bước 2: Chọn ngày & Khung giờ khám</h2>
              <p className="text-13 text-muted mt-0.5">
                Khám với <strong>{doctorProfile?.full_name}</strong> ({doctorSpecialty?.name})
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              Đổi bác sĩ
            </Button>
          </div>

          {/* Date Picker: 14 Days Carousel / Chips */}
          <div>
            <label className="block text-13 font-semibold text-slate-700 mb-2.5">
              Chọn ngày khám (14 ngày tới)
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-gutter:stable]">
              {next14Days.map((item) => {
                const isSelected = selectedDate === item.dateStr;
                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDate(item.dateStr);
                      setSelectedSlotId('');
                    }}
                    className={`flex flex-col items-center justify-center min-w-[76px] py-2.5 px-2 rounded-xl border transition-all shrink-0 ${
                      isSelected
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : 'border-line bg-white hover:border-slate-300 text-ink hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-[11px] font-medium ${isSelected ? 'text-blue-100' : 'text-muted'}`}>
                      {item.displayDay}
                    </span>
                    <span className="text-base font-bold num mt-0.5">
                      {item.displayDate}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available Slots Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-13 font-semibold text-slate-700">
                Khung giờ trống trong ngày ({fmtDate(selectedDate)})
              </label>
              <span className="text-xs text-muted">
                {displayedSlots.filter((s) => !s.is_booked && !isSlotPast(s)).length} giờ còn trống
              </span>
            </div>

            {loadingSlots ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : displayedSlots.length === 0 ? (
              <div className="rounded-xl border border-line bg-slate-50 p-8 text-center">
                <Clock className="size-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-ink">Bác sĩ chưa có lịch khám vào ngày này</p>
                <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                  Vui lòng chọn ngày khám khác ở hàng ngày phía trên để xem các khung giờ phục vụ.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {displayedSlots.map((s) => {
                  const startTime = s.start_time.slice(0, 5);
                  const endTime = s.end_time.slice(0, 5);
                  const slotIdStr = String(s.id);
                  const isSelected = selectedSlotId === slotIdStr;
                  const past = isSlotPast(s);
                  const isDisabled = s.is_booked || past;

                  return (
                    <button
                      key={slotIdStr}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedSlotId(slotIdStr)}
                      className={`relative flex items-center justify-center py-3 px-3 rounded-xl border text-sm font-semibold transition-all ${
                        isDisabled
                          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'border-primary bg-blue-50 text-primary ring-2 ring-primary/30 shadow-xs'
                          : 'border-line bg-white text-ink hover:border-primary/50 hover:bg-slate-50'
                      }`}
                    >
                      <Clock className={`size-3.5 mr-1.5 ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                      <span>{startTime} - {endTime}</span>
                      {s.is_booked ? (
                        <span className="absolute top-1 right-1.5 text-[9px] font-bold text-slate-400 uppercase">
                          Hết
                        </span>
                      ) : past ? (
                        <span className="absolute top-1 right-1.5 text-[9px] font-bold text-slate-400 uppercase">
                          Qua
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="pt-4 border-t border-line flex items-center justify-between">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setStep(1)}
              icon={<ChevronLeft className="size-4" />}
            >
              Quay lại
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={!selectedSlotId}
              onClick={() => setStep(3)}
              icon={<ChevronRight className="size-4" />}
            >
              Tiếp theo: Xác nhận đặt lịch
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: XÁC NHẬN & LÝ DO KHÁM */}
      {step === 3 && (
        <Card className="p-6 sm:p-8 space-y-6 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold text-ink">Bước 3: Xác nhận thông tin & Lý do khám</h2>
            <p className="text-13 text-muted mt-0.5">
              Kiểm tra thông tin chi tiết trước khi gửi yêu cầu đặt lịch hẹn
            </p>
          </div>

          {/* User Auth Banner */}
          {loadingAuth ? (
            <Skeleton className="h-20 w-full rounded-xl" />
          ) : !currentUser ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
              <div className="flex items-center gap-3">
                <AlertCircle className="size-5 text-amber-600 shrink-0" />
                <div className="text-13">
                  <span className="font-semibold">Bạn chưa đăng nhập!</span> Để phòng khám lưu lịch hẹn vào hồ sơ
                  của bạn, vui lòng đăng nhập trước khi xác nhận.
                </div>
              </div>
              <Link href="/login" className="shrink-0">
                <Button variant="primary" size="sm" icon={<LogIn className="size-4" />}>
                  Đăng nhập ngay
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-slate-50/80 p-4">
              <h4 className="text-xs font-semibold uppercase text-muted tracking-wider mb-2">
                Thông tin người đặt lịch
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted block">Họ và tên:</span>
                  <span className="font-bold text-ink">{currentUser.full_name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Số điện thoại:</span>
                  <span className="font-medium text-ink">{currentUser.phone || 'Chưa cập nhật'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Email:</span>
                  <span className="font-medium text-ink">{currentUser.email}</span>
                </div>
              </div>
            </div>
          )}

          {/* Booking Summary Box */}
          <div className="rounded-2xl border border-line bg-white p-5 space-y-4">
            <h4 className="text-sm font-bold text-ink">Tóm tắt lịch hẹn khám</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={doctorProfile?.full_name || 'Bác sĩ'}
                    url={doctorProfile?.avatar_url}
                    size={46}
                  />
                  <div>
                    <span className="text-xs text-muted block">Bác sĩ phụ trách:</span>
                    <span className="font-bold text-ink text-base">
                      {doctorProfile?.full_name}
                    </span>
                    {doctorSpecialty && (
                      <p className="text-xs text-primary font-medium">{doctorSpecialty.name}</p>
                    )}
                  </div>
                </div>

                {selectedDoctor?.room && (
                  <div className="flex items-center gap-2 text-13 text-slate-600">
                    <MapPin className="size-4 text-primary shrink-0" />
                    <span>Phòng khám: <strong>{selectedDoctor.room}</strong></span>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-3 sm:pt-0 sm:border-l sm:border-line sm:pl-4">
                <div className="flex items-start gap-2.5">
                  <Calendar className="size-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-muted block">Ngày khám:</span>
                    <span className="font-bold text-ink">
                      {fmtDate(selectedSlot?.slot_date)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="size-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-muted block">Khung giờ:</span>
                    <span className="font-bold text-primary">
                      {selectedSlot?.start_time.slice(0, 5)} - {selectedSlot?.end_time.slice(0, 5)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CreditCard className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-muted block">Giá khám dự kiến:</span>
                    <span className="font-bold text-emerald-600">
                      {fmtVND(selectedDoctor?.consultation_fee || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reason / Symptoms Textarea */}
          <Field
            label="Lý do khám / Triệu chứng bệnh (tùy chọn)"
            hint="Mô tả cụ thể triệu chứng giúp bác sĩ nắm bắt tình trạng trước buổi khám."
          >
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Đau tức ngực kèm khó thở khi vận động mạnh, triệu chứng kéo dài khoảng 3 ngày..."
              rows={3}
            />
          </Field>

          {/* Notice box */}
          <div className="rounded-xl bg-blue-50/70 p-4 text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
            <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
            <div>
              <strong>Lưu ý:</strong> Sau khi gửi yêu cầu, lịch hẹn sẽ ở trạng thái <em>Chờ duyệt</em>.
              Bộ phận điều phối của ClinicCare sẽ liên hệ xác nhận trong vòng 15 phút.
              Quý khách vui lòng đến trước giờ khám 10-15 phút để hoàn tất thủ tục đón tiếp.
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-line flex items-center justify-between">
            <Button
              variant="secondary"
              size="lg"
              disabled={submitting}
              onClick={() => setStep(2)}
              icon={<ChevronLeft className="size-4" />}
            >
              Quay lại
            </Button>
            <Button
              variant="primary"
              size="lg"
              loading={submitting}
              onClick={handleConfirmBooking}
              icon={<CalendarPlus className="size-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 font-semibold"
            >
              Xác nhận đặt lịch
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
