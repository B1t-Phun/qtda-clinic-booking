'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/core';

export default function ProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="rounded-2xl border border-line bg-white p-6" role="alert">
    <h1 className="text-xl font-semibold text-ink">Chưa tải được hồ sơ</h1>
    <p className="my-3 text-sm text-muted">Kiểm tra kết nối rồi thử lại. Thông tin đã lưu vẫn được giữ trên hệ thống.</p>
    <div className="flex gap-3"><Button onClick={reset}>Thử lại</Button>
      <Link href="/client" className="inline-flex items-center rounded-lg px-3 text-sm font-medium text-primary hover:bg-blue-50">Về trang chủ</Link></div>
  </section>;
}
