'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { Avatar, EmptyState, Pagination, StatusBadge } from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { ageOf, dateTimeVN, dateVN, genderLabel, timeLabel } from '../utils';
import styles from '@/components/profile/Profile.module.css';

export default function PatientDetailView({ id }: { id: string }) {
  const store = useDoctorStore(), [page, setPage] = useState(1);
  const history = store.appointments.filter(appointment => appointment.patient_id === id);
  const patient = history.length ? store.patients.find(person => person.id === id) : undefined;
  if (!patient) return <div className="page-content"><Link href="/doctor/patients" className="inline-flex items-center gap-2 text-sm"><ArrowLeft size={16} />Danh sách bệnh nhân</Link>
    <section className="card"><EmptyState title="Không tìm thấy hồ sơ bệnh nhân" description="Hồ sơ không thuộc lịch khám của bạn hoặc không còn quyền truy cập." /></section></div>;
  const slots = new Map(store.slots.map(slot => [slot.id, slot]));
  const ordered = history.slice().sort((a, b) => (slots.get(b.slot_id)?.slot_date || '').localeCompare(slots.get(a.slot_id)?.slot_date || '') || b.created_at.localeCompare(a.created_at));
  const completed = history.filter(appointment => appointment.status === 'completed');
  const last = completed.map(appointment => slots.get(appointment.slot_id)?.slot_date || '').sort().at(-1);
  const pageSize = 10, current = Math.min(page, Math.max(1, Math.ceil(ordered.length / pageSize)));
  return <div className={styles.root} data-role="doctor">
    <Link href="/doctor/patients" className="mb-5 inline-flex items-center gap-2 text-sm"><ArrowLeft size={16} />Danh sách bệnh nhân</Link>
    <div className={styles.patientHero}><Avatar profile={patient} size="lg" /><div><span className={styles.eyebrow}>HỒ SƠ BỆNH NHÂN</span><h1>{patient.full_name || 'Chưa cập nhật họ tên'}</h1>
      <p className="muted">{genderLabel[patient.gender]} · {ageOf(patient.date_of_birth, store.now)} tuổi</p></div></div>
    <div className={styles.layout}>
      <aside className={styles.sidebar}><section className={styles.account}><h2>Thông tin cá nhân</h2>
        <dl className={styles.dataGrid} style={{ padding: 0, gridTemplateColumns: '1fr', gap: 18 }}>
          <div><dt>Ngày sinh</dt><dd>{dateVN(patient.date_of_birth)}</dd></div>
          <div><dt>Điện thoại</dt><dd>{patient.phone ? <a href={'tel:' + patient.phone}>{patient.phone}</a> : 'Chưa cập nhật'}</dd></div>
          <div><dt>Email</dt><dd>{patient.email ? <a href={'mailto:' + patient.email}>{patient.email}</a> : 'Chưa cập nhật'}</dd></div>
          <div><dt>Địa chỉ</dt><dd>{patient.address || 'Chưa cập nhật'}</dd></div><div><dt>Ngày tham gia</dt><dd>{dateTimeVN(patient.created_at)}</dd></div>
          <div><dt>Cập nhật hồ sơ</dt><dd>{dateTimeVN(patient.updated_at)}</dd></div></dl>
        <details><summary>Mã hồ sơ</summary><p className={styles.identifier}>{patient.id}</p></details>
        <p className="help">Bệnh nhân cập nhật thông tin từ tài khoản của họ. Bạn chỉ xem được lịch sử khám do mình phụ trách.</p>
      </section><section className={styles.account}><h2>Khám với bạn</h2><dl><div><dt>Lịch hẹn</dt><dd>{history.length}</dd></div><div><dt>Hoàn thành</dt><dd>{completed.length}</dd></div>
        <div><dt>Khám gần nhất</dt><dd>{last ? dateVN(last) : 'Chưa khám'}</dd></div></dl></section></aside>
      <section className="card"><div className="section-heading"><h2><CalendarDays size={18} className="inline-block mr-2" />Lịch sử khám</h2><span className="muted">{history.length} lịch hẹn</span></div>
        <div className="visit-list">{ordered.slice((current - 1) * pageSize, current * pageSize).map(appointment => {
          const slot = slots.get(appointment.slot_id);
          return <button type="button" key={appointment.id} onClick={() => store.setSelectedAppointment(appointment)}><span><strong>{slot ? dateVN(slot.slot_date) + ' · ' + timeLabel(slot.start_time) + '–' + timeLabel(slot.end_time) : 'Lịch hẹn #' + appointment.id}</strong>
            <small>{appointment.reason || 'Chưa có lý do khám'}</small>{appointment.doctor_note && <p className="line-clamp">{appointment.doctor_note}</p>}</span><StatusBadge appointment={appointment} /></button>;
        })}</div><Pagination page={current} total={ordered.length} pageSize={pageSize} onChange={setPage} />
      </section>
    </div>
  </div>;
}
