import { Suspense } from 'react';
import { Authorized } from '@/components/auth/Authorized';
import DoctorLayout from '@/modules/auth/DoctorLayout';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="p-8 text-center">Đang kiểm tra đăng nhập…</p>}>
    <Authorized role="doctor"><DoctorLayout>{children}</DoctorLayout></Authorized>
  </Suspense>;
}
