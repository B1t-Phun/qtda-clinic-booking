'use client';

import Link from 'next/link';
export default function DoctorError({ retry }: { error: unknown; retry: () => void }) {
  return <div className="doctor-app p-8"><section className="card" role="alert"><h1>Không tải được trang bác sĩ</h1>
    <p className="mt-3">Vui lòng thử lại. Các thay đổi đã lưu vẫn được giữ trên hệ thống.</p>
    <div className="inline-actions mt-5"><button className="btn btn-primary" onClick={() => retry()}>Thử lại</button>
      <Link className="btn btn-secondary" href="/doctor">Về tổng quan</Link></div>
  </section></div>;
}
