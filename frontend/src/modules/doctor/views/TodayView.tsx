'use client';

import Link from 'next/link';
import { ArrowRight, CalendarPlus } from 'lucide-react';
import { Avatar, EmptyState, PageHeading, QuickAction, StatusBadge } from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { clinicDate, queueAppointments, slotInstant } from '../workflow';
import { dateVN, longDate, timeLabel } from '../utils';

export default function TodayView() {
  const store = useDoctorStore();
  const today = clinicDate(store.now);
  const slots = new Map(store.slots.map(slot => [slot.id, slot]));
  const patients = new Map(store.patients.map(patient => [patient.id, patient]));
  const todayAppointments = store.appointments.filter(a => slots.get(a.slot_id)?.slot_date === today)
    .sort((a, b) => slotInstant(slots.get(a.slot_id)!) - slotInstant(slots.get(b.slot_id)!));
  const queue = queueAppointments(store.appointments, store.slots, store.now);
  const current = store.appointments.find(a => a.status === 'confirmed' && a.started_at);
  const pending = store.appointments.filter(a => a.status === 'pending');
  const upcoming = store.appointments.filter(a => ['pending', 'confirmed'].includes(a.status) && !a.checked_in_at && slots.has(a.slot_id) && slotInstant(slots.get(a.slot_id)!) > store.now.getTime())
    .sort((a, b) => slotInstant(slots.get(a.slot_id)!) - slotInstant(slots.get(b.slot_id)!)).slice(0, 5);
  const metrics = [
    ['Lịch hẹn hôm nay', todayAppointments.length, 'Theo ngày khám tại Việt Nam'],
    ['Chờ xác nhận', pending.length, 'Lịch hẹn cần phản hồi'],
    ['Đã tiếp nhận', todayAppointments.filter(a => a.checked_in_at).length, 'Bệnh nhân đã đến hôm nay'],
    ['Đang chờ khám', queue.filter(a => !a.started_at).length, 'Đã đến, chưa bắt đầu khám'],
    ['Đã hoàn thành', todayAppointments.filter(a => a.status === 'completed').length, 'Ca khám hoàn tất hôm nay'],
    ['Hủy / Vắng', todayAppointments.filter(a => ['cancelled', 'no_show'].includes(a.status)).length, 'Trong lịch khám hôm nay'],
  ];
  function rows(appointments: typeof store.appointments) {
    return appointments.map(a => {
      const patient = patients.get(a.patient_id), slot = slots.get(a.slot_id);
      if (!patient || !slot) return null;
      return <div className="appointment-row" key={a.id}>
        <button className="person appointment-open" onClick={() => store.setSelectedAppointment(a)}><Avatar profile={patient} />
          <span><strong>{patient.full_name || 'Chưa cập nhật họ tên'}</strong><small>{dateVN(slot.slot_date)} · {timeLabel(slot.start_time)} · {a.reason || 'Chưa có lý do khám'}</small></span></button>
        <StatusBadge appointment={a} /><QuickAction appointment={a} /></div>;
    });
  }
  const currentPatient = current && patients.get(current.patient_id);
  return <div className="page-content">
    <PageHeading title={'Xin chào, ' + (store.profile.full_name || 'bác sĩ')} description={longDate(today)}
      actions={<Link className="btn btn-secondary" href="/doctor/schedule"><CalendarPlus size={17} />Quản lý giờ khám</Link>} />
    <div className="stat-grid">{metrics.map(([title, count, hint]) => <section className="stat-card" key={String(title)}><span>{title}</span><strong>{count}</strong><small>{hint}</small></section>)}</div>
    <div className="dashboard-grid">
      <section className={'card current-exam' + (current ? ' active-exam' : '')}><div className="section-heading"><h2>Ca đang khám</h2>{current && <StatusBadge appointment={current} />}</div>
        {current && currentPatient ? <><div className="person"><Avatar profile={currentPatient} size="lg" /><div><h3>{currentPatient.full_name}</h3>
          <p>{current.reason || 'Chưa có lý do khám'}</p><small>Bắt đầu lúc {new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }).format(new Date(current.started_at!))}</small></div></div>
          <button className="btn btn-primary" onClick={() => store.setSelectedAppointment(current)}>Tiếp tục ghi nhận kết quả<ArrowRight size={17} /></button></>
          : <EmptyState title="Chưa có ca đang khám" description="Tiếp nhận bệnh nhân rồi chọn Bắt đầu khám trong hàng đợi." />}
      </section>
      <section className="card"><div className="section-heading"><h2>Hàng đợi hôm nay <span className="count">{queue.length}</span></h2>
        <Link href="/doctor/appointments?tab=queue">Xem hàng đợi</Link></div>
        {queue.length ? rows(queue.slice(0, 4)) : <EmptyState title="Chưa có bệnh nhân chờ khám" description="Các bệnh nhân đã được tiếp nhận sẽ xuất hiện tại đây." />}
      </section>
    </div>
    <section className="card"><div className="section-heading"><h2>Lịch khám hôm nay <span className="count">{todayAppointments.length}</span></h2>
      <Link href={'/doctor/appointments?date=' + today}>Xem tất cả</Link></div>
      {todayAppointments.length ? rows(todayAppointments.slice(0, 8)) : <EmptyState title="Hôm nay chưa có lịch hẹn" description="Bạn có thể tạo khung giờ để bệnh nhân đặt lịch mới." />}
    </section>
    <div className="dashboard-grid"><section className="card"><div className="section-heading"><h2>Cần xác nhận <span className="count">{pending.length}</span></h2>
      <Link href="/doctor/appointments?tab=pending">Xử lý lịch hẹn</Link></div>{pending.length ? rows(pending.slice(0, 4)) : <EmptyState title="Đã xử lý hết yêu cầu" description="Hiện không có lịch hẹn chờ xác nhận." />}</section>
      <section className="card"><div className="section-heading"><h2>Lịch sắp tới</h2><Link href="/doctor/appointments?tab=upcoming">Xem lịch</Link></div>
        {upcoming.length ? rows(upcoming) : <EmptyState title="Chưa có lịch sắp tới" description="Các lịch hẹn trong tương lai sẽ hiển thị tại đây." />}</section></div>
  </div>;
}
