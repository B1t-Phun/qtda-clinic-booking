'use client';

import { use } from 'react';
import { DoctorDetail } from '@/modules/admin/views/Doctors';

export default function AdminDoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DoctorDetail id={id} />;
}
