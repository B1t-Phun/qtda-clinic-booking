'use client';

import React, { Suspense } from 'react';
import { DoctorProvider } from '@/modules/doctor/store/store';
import { DoctorShell } from '@/modules/doctor/layout/DoctorShell';
import './doctor.css';

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DoctorProvider>
      <Suspense fallback={<div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-sm text-slate-500">Đang tải ClinicBooking Doctor...</div>}>
        <DoctorShell>
          {children}
        </DoctorShell>
      </Suspense>
    </DoctorProvider>
  );
}
