'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ClipboardList,
  CalendarPlus,
  LogIn,
  Check,
  Camera,
  HeartPulse,
} from 'lucide-react';
import { PageHeader, Card, Skeleton, Button } from '@/components/ui/core';
import { Field, Input, Textarea } from '@/components/ui/form';
import { useToast } from '@/components/ui/overlay';
import { createClient } from '@/lib/supabase/client';
import { PatientProfile } from '../client-types';

// Avatar mẫu thân thiện cho bệnh nhân lựa chọn nhanh
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=256&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&auto=format&fit=crop&q=80',
];

export default function PatientProfilePage() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Original profile from DB
  const [originalProfile, setOriginalProfile] = useState<PatientProfile | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showCustomAvatarInput, setShowCustomAvatarInput] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });

  // Load Profile from DB
  const fetchProfile = useCallback(async (uid: string, emailFallback?: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      // 1. Fetch profile from Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.warn('Direct profile query error, trying backend API:', error.message);
      }

      // 2. Fetch stats
      const { count: totalCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', uid);

      const { count: pendingCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', uid)
        .in('status', ['pending', 'confirmed']);

      const { count: completedCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', uid)
        .eq('status', 'completed');

      const profileData: PatientProfile = {
        id: uid,
        email: data?.email || emailFallback || '',
        full_name: data?.full_name || '',
        phone: data?.phone || '',
        role: data?.role || 'patient',
        date_of_birth: data?.date_of_birth || '',
        gender: (data?.gender as 'male' | 'female' | 'other') || null,
        address: data?.address || '',
        avatar_url: data?.avatar_url || '',
        created_at: data?.created_at,
        updated_at: data?.updated_at,
        stats: {
          totalAppointments: totalCount || 0,
          pendingAppointments: pendingCount || 0,
          completedAppointments: completedCount || 0,
        },
      };

      setOriginalProfile(profileData);
      setFullName(profileData.full_name);
      setPhone(profileData.phone || '');
      setDateOfBirth(profileData.date_of_birth || '');
      setGender(profileData.gender || '');
      setAddress(profileData.address || '');
      setAvatarUrl(profileData.avatar_url || '');

      setStats({
        total: totalCount || 0,
        pending: pendingCount || 0,
        completed: completedCount || 0,
      });
    } catch (err) {
      console.error('Error fetching patient profile:', err);
      toast({
        tone: 'error',
        title: 'Không thể tải hồ sơ',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại sau',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (active) {
            setUserId(null);
            setLoading(false);
          }
          return;
        }

        if (active) {
          setUserId(user.id);
          await fetchProfile(user.id, user.email);
        }
      } catch (err) {
        console.error('Auth error in profile page:', err);
        if (active) setLoading(false);
      }
    }

    init();
    return () => {
      active = false;
    };
  }, [fetchProfile]);

  // Compute profile completeness percentage
  const completeness = useMemo(() => {
    let score = 0;
    if (fullName.trim()) score += 25;
    if (phone.trim()) score += 25;
    if (dateOfBirth) score += 20;
    if (gender) score += 15;
    if (address.trim()) score += 15;
    return Math.min(100, score);
  }, [fullName, phone, dateOfBirth, gender, address]);

  // Compute age from DOB
  const calculatedAge = useMemo(() => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [dateOfBirth]);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    if (!originalProfile) return false;
    return (
      fullName !== (originalProfile.full_name || '') ||
      phone !== (originalProfile.phone || '') ||
      dateOfBirth !== (originalProfile.date_of_birth || '') ||
      gender !== (originalProfile.gender || '') ||
      address !== (originalProfile.address || '') ||
      avatarUrl !== (originalProfile.avatar_url || '')
    );
  }, [originalProfile, fullName, phone, dateOfBirth, gender, address, avatarUrl]);

  // Reset form to original values
  const handleReset = () => {
    if (!originalProfile) return;
    setFullName(originalProfile.full_name || '');
    setPhone(originalProfile.phone || '');
    setDateOfBirth(originalProfile.date_of_birth || '');
    setGender(originalProfile.gender || '');
    setAddress(originalProfile.address || '');
    setAvatarUrl(originalProfile.avatar_url || '');
    toast({
      tone: 'info',
      title: 'Đã hoàn tác',
      description: 'Thông tin form đã được khôi phục về trạng thái lưu gần nhất.',
    });
  };

  // Submit profile updates
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    // 1. Validation
    if (!fullName.trim()) {
      toast({
        tone: 'error',
        title: 'Thiếu thông tin bắt buộc',
        description: 'Vui lòng nhập họ và tên của bạn.',
      });
      return;
    }

    if (phone.trim()) {
      const cleanPhone = phone.trim().replace(/[\s.-]/g, '');
      const phoneRegex = /^(84|0)(3|5|7|8|9)[0-9]{8}$/;
      if (!phoneRegex.test(cleanPhone)) {
        toast({
          tone: 'error',
          title: 'Số điện thoại không hợp lệ',
          description: 'Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số (ví dụ: 0912345678).',
        });
        return;
      }
    }

    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      if (birthDate > today) {
        toast({
          tone: 'error',
          title: 'Ngày sinh không hợp lệ',
          description: 'Ngày sinh không thể lớn hơn ngày hôm nay.',
        });
        return;
      }
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        address: address.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // 1. Direct Supabase update
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        // Fallback to backend API
        const res = await fetch(`/api/patient/profile/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.message || 'Lỗi cập nhật hồ sơ');
        }
      }

      toast({
        tone: 'success',
        title: 'Cập nhật thành công',
        description: 'Thông tin hồ sơ cá nhân của bạn đã được lưu an toàn.',
      });

      // Update original
      if (originalProfile) {
        setOriginalProfile({
          ...originalProfile,
          ...payload,
        });
      }

      // Dispatch custom event to notify Header & Layout
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cliniccare:profile-updated', {
            detail: { full_name: fullName.trim(), avatar_url: avatarUrl.trim() },
          })
        );
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      toast({
        tone: 'error',
        title: 'Không thể lưu hồ sơ',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <PageHeader
        title="Thông tin cá nhân"
        description="Cập nhật thông tin chi tiết và liên hệ để bác sĩ và nhân viên phòng khám thuận tiện chăm sóc sức khỏe"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/client/appointments">
              <Button variant="secondary" size="sm" icon={<ClipboardList className="size-4" />}>
                Lịch hẹn của tôi
              </Button>
            </Link>
            <Link href="/client/booking">
              <Button variant="primary" size="sm" icon={<CalendarPlus className="size-4" />}>
                Đặt lịch khám
              </Button>
            </Link>
          </div>
        }
      />

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="size-24 rounded-full" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-44" />
            </div>
            <Skeleton className="h-20 w-full" />
          </Card>
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-24 w-full" />
            </Card>
          </div>
        </div>
      ) : !userId ? (
        /* Unauthenticated guard */
        <Card className="p-8 text-center max-w-lg mx-auto space-y-4 shadow-sm border border-line">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-primary mx-auto">
            <User className="size-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">Vui lòng đăng nhập</h3>
            <p className="mt-1 text-13 text-muted">
              Đăng nhập tài khoản bệnh nhân để xem và cập nhật hồ sơ y tế, thông tin liên hệ và lịch sử khám bệnh.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="primary" size="lg" icon={<LogIn className="size-4" />}>
                Đăng nhập tài khoản
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        /* Authenticated Profile Content */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Profile Card & Quick Stats (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Identity Card */}
            <Card className="p-6 text-center relative overflow-hidden border border-line shadow-xs">
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-blue-600 to-primary opacity-90" />
              
              <div className="relative pt-6 flex flex-col items-center">
                {/* Avatar with Ring */}
                <div className="relative group">
                  <div className="size-24 rounded-full p-1 bg-white shadow-md">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={fullName || 'Avatar'}
                        className="size-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="size-full rounded-full bg-blue-50 text-primary font-bold text-2xl flex items-center justify-center">
                        {fullName ? fullName.charAt(0).toUpperCase() : 'BN'}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomAvatarInput(!showCustomAvatarInput)}
                    className="absolute bottom-1 right-1 size-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-blue-700 transition-transform active:scale-95"
                    title="Đổi ảnh đại diện"
                  >
                    <Camera className="size-3.5" />
                  </button>
                </div>

                {/* User Info */}
                <h3 className="mt-3.5 text-lg font-bold text-ink leading-snug">
                  {fullName || 'Chưa đặt họ tên'}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted">
                  <Mail className="size-3.5 text-slate-400" />
                  <span>{originalProfile?.email || 'Chưa có email'}</span>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <HeartPulse className="size-3" />
                    Bệnh nhân
                  </span>
                  {calculatedAge !== null && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {calculatedAge} tuổi
                    </span>
                  )}
                </div>
              </div>

              {/* Profile Completion Bar */}
              <div className="mt-6 pt-5 border-t border-line text-left">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-700">Mức độ hoàn thiện hồ sơ</span>
                  <span className={completeness === 100 ? 'text-green-600' : 'text-primary'}>
                    {completeness}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      completeness === 100 ? 'bg-green-500' : 'bg-primary'
                    }`}
                    style={{ width: `${completeness}%` }}
                  />
                </div>
                {completeness < 100 && (
                  <p className="mt-2 text-[11px] text-muted flex items-start gap-1">
                    <Sparkles className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                    Bổ sung đầy đủ số điện thoại và địa chỉ giúp phòng khám liên hệ nhanh chóng khi có lịch khám.
                  </p>
                )}
              </div>
            </Card>

            {/* Quick Avatar Picker */}
            <Card className="p-5 border border-line shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-13 font-bold text-ink">Chọn nhanh ảnh đại diện</h4>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Xóa ảnh
                  </button>
                )}
              </div>
              <p className="text-xs text-muted">
                Chọn một trong các avatar minh họa dưới đây hoặc dán link ảnh tùy thích:
              </p>
              <div className="grid grid-cols-6 gap-2 pt-1">
                {PRESET_AVATARS.map((url, idx) => {
                  const selected = avatarUrl === url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`relative size-10 rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${
                        selected ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-slate-200'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Preset ${idx + 1}`} className="size-full object-cover" />
                      {selected && (
                        <div className="absolute inset-0 bg-primary/40 flex items-center justify-center text-white">
                          <Check className="size-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {showCustomAvatarInput && (
                <div className="pt-2 animate-fade-in">
                  <Field label="Hoặc dán URL ảnh trực tiếp:" hint="Dán link ảnh (.jpg, .png) có sẵn">
                    <Input
                      type="url"
                      placeholder="https://example.com/my-photo.jpg"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </Card>

            {/* Stats Overview */}
            <Card className="p-5 border border-line shadow-xs">
              <h4 className="text-13 font-bold text-ink mb-3">Hoạt động khám bệnh</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-lg font-black text-ink">{stats.total}</p>
                  <p className="text-[11px] text-muted mt-0.5">Tổng lịch</p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-100">
                  <p className="text-lg font-black text-amber-600">{stats.pending}</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">Sắp tới</p>
                </div>
                <div className="p-2.5 rounded-lg bg-green-50/70 border border-green-100">
                  <p className="text-lg font-black text-green-600">{stats.completed}</p>
                  <p className="text-[11px] text-green-700 mt-0.5">Hoàn tất</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Edit Profile Form (8 cols) */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Card 1: Basic Information */}
              <Card className="p-6 border border-line shadow-xs space-y-5">
                <div className="border-b border-line pb-3">
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    <User className="size-5 text-primary" />
                    Thông tin cơ bản
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Họ và tên, giới tính và ngày sinh chính xác theo giấy tờ tùy thân
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="md:col-span-2">
                    <Field label="Họ và tên" required hint="Ví dụ: Nguyễn Văn An">
                      <Input
                        type="text"
                        placeholder="Nhập họ và tên đầy đủ"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </Field>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block">
                      <span className="mb-1.5 block text-13 font-medium text-slate-700">
                        Giới tính
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'male', label: 'Nam' },
                          { id: 'female', label: 'Nữ' },
                          { id: 'other', label: 'Khác' },
                        ].map((g) => {
                          const active = gender === g.id;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setGender(g.id as 'male' | 'female' | 'other')}
                              className={`h-10 rounded-lg text-sm font-medium border transition-colors ${
                                active
                                  ? 'bg-blue-50 border-primary text-primary font-semibold shadow-xs'
                                  : 'bg-white border-line text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {g.label}
                            </button>
                          );
                        })}
                      </div>
                    </label>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <Field
                      label="Ngày sinh"
                      hint={calculatedAge !== null ? `(${calculatedAge} tuổi)` : 'Chọn ngày sinh'}
                    >
                      <Input
                        type="date"
                        value={dateOfBirth}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </Card>

              {/* Card 2: Contact & Address */}
              <Card className="p-6 border border-line shadow-xs space-y-5">
                <div className="border-b border-line pb-3">
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    <Phone className="size-5 text-primary" />
                    Thông tin liên hệ & Địa chỉ
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Dùng để phòng khám gửi thông báo xác nhận lịch khám và kết quả điều trị
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div>
                    <Field
                      label="Số điện thoại"
                      hint="10 chữ số (ví dụ: 0987654321)"
                    >
                      <Input
                        type="tel"
                        placeholder="09xx xxx xxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </Field>
                  </div>

                  {/* Account Email (Read-only) */}
                  <div>
                    <Field
                      label="Email tài khoản"
                      hint="Liên kết tài khoản Supabase Auth (không thể đổi trực tiếp)"
                    >
                      <div className="relative">
                        <Input
                          type="email"
                          value={originalProfile?.email || ''}
                          disabled
                          className="bg-slate-50 text-slate-500 cursor-not-allowed pl-9"
                        />
                        <Shield className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </Field>
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <Field
                      label="Địa chỉ thường trú / liên hệ"
                      hint="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    >
                      <Textarea
                        placeholder="Ví dụ: 123 Nguyễn Văn Cừ, Phường 4, Quận 5, TP. Hồ Chí Minh"
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </Card>

              {/* Form Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-muted flex items-center gap-1.5">
                  {isDirty ? (
                    <span className="text-amber-600 font-medium flex items-center gap-1">
                      <AlertCircle className="size-3.5" /> Có thay đổi chưa lưu
                    </span>
                  ) : (
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> Thông tin đã đồng bộ
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {isDirty && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      icon={<RotateCcw className="size-4" />}
                      onClick={handleReset}
                      disabled={saving}
                    >
                      Hoàn tác
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={saving}
                    icon={<Save className="size-4" />}
                    className="flex-1 sm:flex-initial"
                  >
                    Lưu thông tin
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
