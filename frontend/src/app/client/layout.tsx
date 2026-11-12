import { Suspense } from 'react';
import { Authorized } from '@/components/auth/Authorized';
import ClientLayout from '@/modules/auth/ClientLayout';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="p-8 text-center">Đang kiểm tra đăng nhập…</p>}>
    <Authorized role="patient"><ClientLayout>{children}</ClientLayout></Authorized>
  </Suspense>;
}
