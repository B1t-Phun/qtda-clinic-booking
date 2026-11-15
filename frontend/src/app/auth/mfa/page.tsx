import { Suspense } from 'react';
import { MfaPanel } from '@/components/auth/MfaPanel';
export default function Page() {
  return <main className="mx-auto mt-12 w-full max-w-md rounded-2xl border bg-white p-6"><Suspense fallback={<p>Đang tải…</p>}><MfaPanel /></Suspense></main>;
}
