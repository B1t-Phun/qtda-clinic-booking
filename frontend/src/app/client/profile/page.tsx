import { Suspense } from 'react';
import Link from 'next/link';
import { CalendarDays, CalendarPlus, ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/core';
import { createServerSupabase, requireRole } from '@/lib/auth/server';
import { ownProfile, profileDatabaseError } from '@/lib/profile-server';
import { PersonalProfilePanel } from '@/components/profile/PersonalProfile';

async function ProfileContent() {
  const user = await requireRole('patient');
  const client = await createServerSupabase();
  const [profile, appointments, completed] = await Promise.all([
    ownProfile(client, user.id),
    client.from('appointments').select('id', { count: 'exact', head: true }).eq('patient_id', user.id),
    client.from('appointments').select('id', { count: 'exact', head: true }).eq('patient_id', user.id).eq('status', 'completed'),
  ]);
  profileDatabaseError(appointments.error);
  profileDatabaseError(completed.error);

  return <div className="space-y-6">
    <PersonalProfilePanel initialProfile={profile} />
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Lịch sử đặt lịch của bạn">
      <Card className="p-5"><CalendarDays className="mb-3 size-5 text-teal-700" />
        <p className="text-xs text-muted">Tổng lịch hẹn</p><strong className="mt-1 block text-3xl text-ink">{appointments.count ?? 0}</strong></Card>
      <Card className="p-5"><ClipboardList className="mb-3 size-5 text-teal-700" />
        <p className="text-xs text-muted">Lượt khám hoàn thành</p><strong className="mt-1 block text-3xl text-ink">{completed.count ?? 0}</strong></Card>
      <Card className="flex flex-col items-start justify-center gap-3 p-5">
        <Link href="/client/appointments" className="text-sm font-semibold text-primary">Xem lịch hẹn và kết quả khám →</Link>
        <Link href="/client/booking" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <CalendarPlus size={16} />Đặt lịch khám mới
        </Link>
      </Card>
    </section>
  </div>;
}

export default function ProfilePage() {
  return <Suspense fallback={<div className="space-y-5" role="status" aria-label="Đang tải hồ sơ bệnh nhân">
    <div className="skeleton h-20" /><div className="skeleton h-96" />
  </div>}><ProfileContent /></Suspense>;
}
