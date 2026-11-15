'use client';

import { use } from 'react';
import { PatientDetail } from '@/modules/admin/views/Patients';

export default function AdminPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PatientDetail id={id} />;
}
