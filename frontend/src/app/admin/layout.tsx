'use client';

import React, { Suspense, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { StoreProvider } from '@/modules/admin/store/store';
import { ToastProvider } from '@/components/ui/overlay';
import { AppointmentUIProvider } from '@/modules/admin/views/appointments/AppointmentUI';
import { Shell } from '@/modules/admin/layout/Shell';

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function AdminShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mounted = useIsClient();

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        Đang tải ClinicCare Admin...
      </div>
    );
  }

  return (
    <Shell path={pathname || '/admin'}>
      {children}
    </Shell>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      <ToastProvider>
        <AppointmentUIProvider>
          <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">Đang tải ClinicCare Admin...</div>}>
            <AdminShellWrapper>
              {children}
            </AdminShellWrapper>
          </Suspense>
        </AppointmentUIProvider>
      </ToastProvider>
    </StoreProvider>
  );
}
