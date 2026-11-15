import { Suspense } from 'react';
import { Authorized } from '@/components/auth/Authorized';
import { SupabaseCheck } from '@/modules/auth/SupabaseCheck';
export default function Page() {
  return <Suspense fallback={<p>Đang kiểm tra quyền…</p>}><Authorized role="admin"><SupabaseCheck /></Authorized></Suspense>;
}
