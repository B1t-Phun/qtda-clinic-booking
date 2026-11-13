'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  Mail,
  Shield,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { UserRole } from '@/types/auth';
import { createClient } from '@/lib/supabase/client';

const DEMO_ACCOUNTS: Record<
  UserRole,
  { email: string; label: string; desc: string; redirect: string }
> = {
  doctor: {
    email: 'quan.tran@clinicbooking.vn',
    label: 'Bác sĩ',
    desc: 'BS. Trần Minh Quân - Tim mạch',
    redirect: '/doctor',
  },
  admin: {
    email: 'phuong.admin@cliniccare.vn',
    label: 'Quản trị viên',
    desc: 'Lê Đình Phương - Quản lý phòng khám',
    redirect: '/admin',
  },
  patient: {
    email: 'lan.nguyen@example.com',
    label: 'Bệnh nhân',
    desc: 'Nguyễn Thị Lan - Đặt lịch khám bệnh',
    redirect: '/client',
  },
  receptionist: {
    email: 'tieptan@cliniccare.vn',
    label: 'Tiếp tân',
    desc: 'Bộ phận lễ tân phòng khám',
    redirect: '/admin',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('doctor');
  const [email, setEmail] = useState(DEMO_ACCOUNTS.doctor.email);
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setEmail(DEMO_ACCOUNTS[newRole].email);
    setPassword('password');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        console.warn('Supabase sign-in error:', signInError.message);
        setError(
          signInError.message === 'Invalid login credentials'
            ? 'Email hoặc mật khẩu không chính xác. (Tài khoản mẫu: mật khẩu là password)'
            : signInError.message
        );
        setLoading(false);
        return;
      }

      // Successful auth
      const target = DEMO_ACCOUNTS[role]?.redirect || (role === 'patient' ? '/client' : '/admin');
      router.push(target);
      router.refresh();
    } catch (err) {
      console.error('Login error:', err);
      setError('Đã có lỗi xảy ra trong quá trình đăng nhập. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <HeartPulse className="size-6" strokeWidth={2.2} />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">
            Clinic<span className="text-blue-600">Booking</span>
          </span>
        </Link>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Đăng nhập hệ thống phòng khám
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Chọn vai trò của bạn để truy cập đúng cổng quản lý
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200/80 rounded-2xl">
          {/* Role selector tabs */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
              Vai trò đăng nhập
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleRoleChange('doctor')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                  role === 'doctor'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HeartPulse className="size-4 mb-1" />
                <span>Bác sĩ</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                  role === 'admin'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="size-4 mb-1" />
                <span>Quản trị</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('patient')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                  role === 'patient'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="size-4 mb-1" />
                <span>Bệnh nhân</span>
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5 px-1">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>{DEMO_ACCOUNTS[role].desc}</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Địa chỉ Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="size-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="size-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <a href="#" className="font-semibold text-blue-600 hover:underline">
                Quên mật khẩu?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all duration-150 disabled:opacity-50"
            >
              {loading ? (
                <span>Đang đăng nhập...</span>
              ) : (
                <>
                  <span>Đăng nhập vào {DEMO_ACCOUNTS[role].label}</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Chưa có tài khoản bệnh nhân?{' '}
              <Link href="/register" className="font-bold text-blue-600 hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
