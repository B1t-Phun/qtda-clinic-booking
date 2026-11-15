import { AuthProvider } from '@/lib/auth/context';
import { requireRole } from '@/lib/auth/server';
import type { UserRole } from '@/types/auth';

export async function Authorized({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const user = await requireRole(role);
  return <AuthProvider user={user}>{children}</AuthProvider>;
}
