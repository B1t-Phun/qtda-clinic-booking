import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabase, readIdentity } from '@/lib/auth/server';
import { AuthProvider } from '@/lib/auth/context';
import { SecurityPanel } from '@/components/auth/SecurityPanel';
async function Content() {
  const { user, needsMfa } = await readIdentity(await createServerSupabase());
  if (needsMfa) redirect('/auth/mfa?next=/account/security');
  if (!user) redirect('/login');
  return <AuthProvider user={user}><SecurityPanel /></AuthProvider>;
}
export default function Page() {
  return <Suspense fallback={<p className="p-8">Đang kiểm tra tài khoản…</p>}><Content /></Suspense>;
}
