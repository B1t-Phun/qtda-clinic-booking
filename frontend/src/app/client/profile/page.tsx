import { Suspense } from 'react';
import Link from 'next/link';
import { CalendarDays, CalendarPlus, ClipboardList } from 'lucide-react';
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
  return <div className="space-y-6">
    <PersonalProfilePanel initialProfile={profile} />
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Lịch sử đặt lịch của bạn">
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><CalendarDays className="mb-3 size-5 text-teal-700" />
        <p className="text-xs text-slate-500">Tổng lịch hẹn</p><strong className="mt-1 block text-3xl text-slate-800">{all.count || 0}</strong></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><ClipboardList className="mb-3 size-5 text-teal-700" />
        <p className="text-xs text-slate-500">Lượt khám hoàn thành</p><strong className="mt-1 block text-3xl text-slate-800">{completed.count || 0}</strong></div>
      <div className="flex flex-col items-start justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <Link href="/client/appointments" className="text-sm font-semibold text-teal-700">Xem lịch hẹn & kết quả khám →</Link>
        <Link href="/client/booking" className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white"><CalendarPlus size={16} />Đặt lịch khám mới</Link>
      </div>
    </section>
  </div>;
}
export default function ProfilePage() {
  return <Suspense fallback={<div className="space-y-5" role="status" aria-label="Đang tải hồ sơ bệnh nhân"><div className="skeleton h-20" /><div className="skeleton h-96" /></div>}>
    <Content />
  </Suspense>;
}
