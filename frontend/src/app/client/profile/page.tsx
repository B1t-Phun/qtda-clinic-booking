import { Suspense } from 'react';
import { createServerSupabase, requireRole } from '@/lib/auth/server';
import { ownProfile, profileDatabaseError } from '@/lib/profile-server';
import { PersonalProfilePanel } from '@/components/profile/PersonalProfile';

async function Content() {
  const user = await requireRole('patient');
  const client = await createServerSupabase();
  const [profile, all, completed] = await Promise.all([
    ownProfile(client, user.id),
    client.from('appointments').select('id', { count: 'exact', head: true }).eq('patient_id', user.id),
    client.from('appointments').select('id', { count: 'exact', head: true }).eq('patient_id', user.id).eq('status', 'completed'),
  ]);
  profileDatabaseError(all.error); profileDatabaseError(completed.error);
  return <PersonalProfilePanel initialProfile={profile}
    statistics={[
      { kind: 'all', label: 'Tổng lịch hẹn', value: all.count ?? 0, href: '/client/appointments' },
      { kind: 'completed', label: 'Lượt khám hoàn thành', value: completed.count ?? 0, href: '/client/appointments' },
    ]}
    summaryAction={{ href: '/client/booking', label: 'Đặt lịch khám mới' }}
  />;
}
export default function ProfilePage() {
  return <Suspense fallback={<div className="space-y-5" role="status" aria-label="Đang tải hồ sơ bệnh nhân"><div className="skeleton h-20" /><div className="skeleton h-96" /></div>}><Content /></Suspense>;
}
