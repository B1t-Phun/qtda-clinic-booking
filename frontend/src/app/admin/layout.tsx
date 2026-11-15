import { Suspense } from 'react';
import { Authorized } from '@/components/auth/Authorized';
import AdminLayout from '@/modules/auth/AdminLayout';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="p-8 text-center">Đang kiểm tra đăng nhập…</p>}>
    <Authorized role="admin"><AdminLayout>{children}</AdminLayout></Authorized>
  </Suspense>;
}
