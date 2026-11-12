'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
export function SupabaseCheck() {
  const [status, setStatus] = useState('Đang kiểm tra…');
  useEffect(() => {
    createClient().from('specialties').select('id').limit(1).then(({ error }) => {
      setStatus(error ? 'Không thể kết nối. Kiểm tra cấu hình Supabase và quyền truy cập.' : 'Kết nối Supabase thành công.');
    });
  }, []);
  return <main className="p-8"><h1 className="text-xl font-bold">Kiểm tra kết nối ClinicCare</h1><p role="status" className="mt-4">{status}</p></main>;
}
