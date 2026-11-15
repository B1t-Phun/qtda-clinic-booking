'use client';

import { useState } from 'react';
import { Activity } from 'lucide-react';
import { actionLabel } from '../data';
import { EmptyState, PageHeading, Pagination } from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { dateTimeVN, dateVN, timeLabel } from '../utils';

export default function NotificationsView() {
  const store = useDoctorStore();
  const [action, setAction] = useState(''), [page, setPage] = useState(1);
  const patients = new Map(store.patients.map(patient => [patient.id, patient]));
  const appointments = new Map(store.appointments.map(appointment => [appointment.id, appointment]));
  const slots = new Map(store.slots.map(slot => [slot.id, slot]));
  const events = store.events.filter(event => !action || event.action === action);
  const pageSize = 20, current = Math.min(page, Math.max(1, Math.ceil(events.length / pageSize)));
  return <div className="page-content">
    <PageHeading title="Nhật ký hoạt động" description="100 thao tác gần nhất thuộc lịch khám của bạn. Mở lịch hẹn để xem đầy đủ nhật ký của ca khám." />
    <section className="card"><div className="filter-toolbar"><label className="inline-field"><span>Hành động</span><select value={action} onChange={event => { setAction(event.target.value); setPage(1); }}>
      <option value="">Tất cả hành động</option>{Object.entries(actionLabel).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <span className="muted">{events.length} sự kiện</span></div>
      {!events.length ? <EmptyState title="Chưa có hoạt động phù hợp" description="Các thay đổi lịch khám được lưu tự động khi thao tác thành công." /> :
        <><ol className="activity-list">{events.slice((current - 1) * pageSize, current * pageSize).map(event => {
          const patient = patients.get(event.patient_id), appointment = appointments.get(event.appointment_id);
          const slot = slots.get(event.new_slot_id), oldSlot = event.old_slot_id ? slots.get(event.old_slot_id) : null;
          return <li key={event.id}><span className="activity-icon"><Activity size={18} /></span><div><strong>{actionLabel[event.action] || 'Cập nhật lịch hẹn'}</strong>
            <p>{patient?.full_name || 'Bệnh nhân'} · Lịch hẹn #{event.appointment_id}{slot ? ' · ' + dateVN(slot.slot_date) + ' ' + timeLabel(slot.start_time) : ''}</p>
            {event.reason && <p className="preserve">{event.reason}</p>}
            {event.action === 'reschedule' && oldSlot && slot && <p>{dateVN(oldSlot.slot_date)} {timeLabel(oldSlot.start_time)} → {dateVN(slot.slot_date)} {timeLabel(slot.start_time)}</p>}
            <small>{dateTimeVN(event.created_at)}</small></div>
            {appointment && <button className="btn btn-secondary" onClick={() => store.setSelectedAppointment(appointment)}>Xem lịch hẹn</button>}
          </li>;
        })}</ol><Pagination page={current} total={events.length} pageSize={pageSize} onChange={setPage} /></>}
    </section>
  </div>;
}
