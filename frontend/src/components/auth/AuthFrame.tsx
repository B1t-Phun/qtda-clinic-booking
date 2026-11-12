import Link from 'next/link';
import { CalendarCheck2, Check, ChevronLeft, ChevronRight, ClipboardList, HeartPulse, Stethoscope } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './AuthForm.module.css';

export function AuthBrand({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`${styles.brand} ${light ? styles.brandLight : ''}`} aria-label="ClinicCare - Trang chủ">
    <span className={styles.brandIcon}><HeartPulse size={23} strokeWidth={2} aria-hidden="true" /></span>
    <span>Clinic<span className={styles.brandAccent}>Care</span></span>
  </Link>;
}

export function AuthFrame({ children }: { children: ReactNode }) {
  return <main className={styles.page}>
    <aside className={styles.showcase}>
      <AuthBrand light />
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}><span />SỨC KHỎE TRONG TẦM TAY</span>
        <h2>Chăm sóc sức khỏe,<br /><span>bắt đầu từ bạn.</span></h2>
        <p>Kết nối với bác sĩ, đặt lịch thuận tiện.<br />An tâm chăm sóc bản thân và gia đình.</p>
      </div>
      <div className={styles.illustration} aria-hidden="true">
        <div className={styles.orbit} /><div className={styles.orbitInner} />
        <div className={styles.medicalCross}><span /><span /></div>
        <div className={styles.calendarCard}>
          <div className={styles.calendarHeading}><span className={styles.calendarIcon}><CalendarCheck2 size={22} /></span><div><strong>Lịch khám của bạn</strong><span>Chọn thời gian phù hợp</span></div><span className={styles.calendarArrows}><ChevronLeft size={15} /><ChevronRight size={15} /></span></div>
          <div className={styles.calendarGrid}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <span key={day}>{day}</span>)}{[12, 13, 14, 15, 16, 17, 18].map(day => <b className={day === 15 ? styles.selectedDay : ''} key={day}>{day}</b>)}</div>
          <div className={styles.visitRow}><span className={styles.visitIcon}><Stethoscope size={22} /></span><div><strong>Khám tổng quát</strong><span>09:00 – 09:30</span></div><span className={styles.visitCheck}><Check size={15} /></span></div>
        </div>
        <div className={styles.floatingCard}><span><Check size={18} /></span><div><strong>Đã sẵn sàng!</strong><small>Một lịch hẹn, thêm an tâm.</small></div></div>
        <span className={styles.sparkleOne}>+</span><span className={styles.sparkleTwo}>+</span>
      </div>
      <div className={styles.showcaseFooter}><span><CalendarCheck2 size={17} />Đặt lịch dễ dàng</span><i /><span><ClipboardList size={17} />Theo dõi thuận tiện</span></div>
    </aside>
    <section className={styles.content} aria-label="Tài khoản ClinicCare">
      <div className={styles.mobileBrand}><AuthBrand /></div>
      <div className={styles.formContainer}>{children}</div>
      <footer className={styles.footer}>© 2026 ClinicCare</footer>
    </section>
  </main>;
}
