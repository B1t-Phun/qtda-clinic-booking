import { Suspense, type ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth/context';
import { createServerSupabase, requireRole } from '@/lib/auth/server';
import { databaseError, loadDoctorSnapshot } from '@/lib/doctor/snapshot';
import DoctorLayout from '@/modules/auth/DoctorLayout';

async function Workspace({ children }: { children: ReactNode }) {
  const user = await requireRole('doctor');
  const client = await createServerSupabase();
  const { data: doctor, error } = await client.from('doctors').select('*')
    .eq('profile_id', user.id).eq('is_active', true).single();
  databaseError(error);
  if (!doctor) throw new Error('Không tìm thấy hồ sơ bác sĩ đang hoạt động.');
  const initialSnapshot = await loadDoctorSnapshot(client, user, doctor);
  return <AuthProvider user={user}><DoctorLayout initialSnapshot={initialSnapshot}>{children}</DoctorLayout></AuthProvider>;
}
export default function Layout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="p-8" role="status">Đang tải lịch khám của bạn…</div>}>
    <Workspace>{children}</Workspace>
  </Suspense>;
}
