import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = { title: 'Đăng nhập | ClinicCare' };

export default function Page() {
  return <Suspense fallback={<p className="p-8 text-center">Đang tải…</p>}><AuthForm mode="login" /></Suspense>;
}
