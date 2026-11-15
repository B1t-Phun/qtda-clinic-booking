'use client';
import Link from 'next/link';
export default function ProfileError({ retry }: { error: unknown; retry: () => void }) {
  return <section className="rounded-xl border bg-white p-6" role="alert"><h1 className="text-xl font-semibold">Chưa tải được hồ sơ</h1>
    <p className="my-3 text-sm text-slate-600">Kiểm tra kết nối rồi thử lại. Thông tin đã lưu vẫn được giữ trên hệ thống.</p>
    <div className="flex gap-4"><button onClick={() => retry()} className="rounded-lg bg-primary px-4 py-2 text-sm text-white">Thử lại</button>
      <Link href="/client" className="p-2 text-sm text-primary">Về trang chủ</Link></div></section>;
}
