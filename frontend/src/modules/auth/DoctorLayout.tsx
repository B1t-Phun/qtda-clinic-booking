'use client';

import type { ReactNode } from 'react';
import type { DoctorSnapshot } from '@/modules/doctor/data';
import { DoctorProvider } from '@/modules/doctor/store/store';
import { DoctorShell } from '@/modules/doctor/layout/DoctorShell';
import '@/app/doctor/doctor.css';

export default function DoctorLayout({ children, initialSnapshot }: { children: ReactNode; initialSnapshot: DoctorSnapshot }) {
  return <DoctorProvider key={initialSnapshot.profile.id} initialSnapshot={initialSnapshot}>
    <DoctorShell>{children}</DoctorShell>
  </DoctorProvider>;
}
