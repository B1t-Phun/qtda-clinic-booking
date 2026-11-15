import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabase, readIdentity } from '@/lib/auth/server';
import { ROLE_HOME } from '@/lib/auth/policy';

async function Entry() {
  const { user, needsMfa, needsReauthentication } = await readIdentity(await createServerSupabase());
  if (needsReauthentication || user?.role === 'admin') redirect('/login?reauth=admin');
  if (needsMfa) redirect('/auth/mfa');
  return redirect(user ? ROLE_HOME[user.role] : '/login');
}

export default function Home() {
  return <Suspense fallback={<p className="p-8 text-center">Đang kiểm tra đăng nhập…</p>}><Entry /></Suspense>;
}
