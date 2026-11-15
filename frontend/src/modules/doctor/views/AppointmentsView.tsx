'use client';

import { useDeferredValue } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Search } from 'lucide-react';
import type { Appointment } from '../data';
import { Avatar, DoctorButton, EmptyState, PageHeading, Pagination, QuickAction, StatusBadge } from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { clinicDate, downloadCsv, queueAppointments, slotInstant, stage, stageLabel } from '../workflow';
import { dateVN, searchText, timeLabel } from '../utils';

const tabs = [
  ['all', 'Tất cả'], ['pending', 'Chờ xác nhận'], ['upcoming', 'Sắp khám'], ['queue', 'Đã đến / Chờ khám'],
  ['ongoing', 'Đang khám'], ['completed', 'Hoàn thành'], ['cancelled', 'Đã hủy'], ['no_show', 'Vắng mặt'],
];
export default function AppointmentsView() {
  const store = useDoctorStore(), params = useSearchParams();
  const query = params.get('q') || '', date = params.get('date') || '';
  const tab = params.get('tab') === 'records' ? 'completed' : params.get('tab') || 'all';
  const search = searchText(useDeferredValue(query));
  const patientMap = new Map(store.patients.map(patient => [patient.id, patient]));
  const slotMap = new Map(store.slots.map(slot => [slot.id, slot]));
  const queue = new Set(queueAppointments(store.appointments, store.slots, store.now).map(a => a.id));
  const tabFilter = (a: Appointment, value: string) => value === 'all' ||
    (value === 'upcoming' ? a.status === 'confirmed' && !a.checked_in_at :
      value === 'queue' ? queue.has(a.id) : value === 'ongoing' ? stage(a) === 'ongoing' : a.status === value);
  const filtered = store.appointments.filter(a => {
    const patient = patientMap.get(a.patient_id), slot = slotMap.get(a.slot_id);
    return patient && slot && tabFilter(a, tab) && (!date || slot.slot_date === date) &&
      (!search || searchText(patient.full_name + ' ' + patient.phone + ' #' + a.id).includes(search));
  }).sort((a, b) => {
    if (tab === 'queue') return Number(!!b.started_at) - Number(!!a.started_at) || (a.checked_in_at || '').localeCompare(b.checked_in_at || '');
    return slotInstant(slotMap.get(a.slot_id)!) - slotInstant(slotMap.get(b.slot_id)!);
  });
  const pageSize = 15, pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(params.get('page'))) || 1));
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); }
    window.history.replaceState(null, '', '/doctor/appointments' + (next.size ? '?' + next.toString() : ''));
  }
  function exportRows() {
    downloadCsv('lich-hen-' + clinicDate(store.now) + '.csv', [
      ['Mã lịch', 'Bệnh nhân', 'Điện thoại', 'Ngày khám', 'Bắt đầu', 'Kết thúc', 'Trạng thái', 'Lý do khám'],
      ...filtered.map(a => { const slot = slotMap.get(a.slot_id)!, patient = patientMap.get(a.patient_id)!;
        return [a.id, patient.full_name, patient.phone, slot.slot_date, slot.start_time, slot.end_time, stageLabel(a), a.reason]; }),
    ]);
  }
  return <div className="page-content">
    <PageHeading title="Lịch hẹn của tôi" description="Xác nhận lịch, tiếp nhận bệnh nhân và theo dõi tiến trình khám."
      actions={<DoctorButton variant="secondary" icon={<Download size={17} />} disabled={!filtered.length} onClick={exportRows}>Xuất CSV</DoctorButton>} />
    <section className="card appointments-card">
      <nav className="filter-tabs" aria-label="Trạng thái lịch hẹn">{tabs.map(([value, label]) => <button type="button" key={value}
        aria-pressed={tab === value} onClick={() => update({ tab: value === 'all' ? '' : value, page: '' })}>
        {label}<span>{store.appointments.filter(a => tabFilter(a, value)).length}</span></button>)}</nav>
      <div className="filter-toolbar"><label className="search-field"><Search size={18} /><input type="search" aria-label="Tìm bệnh nhân hoặc mã lịch hẹn" placeholder="Tên bệnh nhân, số điện thoại, mã lịch…"
        value={query} onChange={event => update({ q: event.target.value, page: '' })} /></label>
        <label className="inline-field"><span>Ngày khám</span><input type="date" value={date} onChange={event => update({ date: event.target.value, page: '' })} /></label>
        {(query || date || tab !== 'all') && <DoctorButton variant="ghost" onClick={() => update({ q: '', date: '', tab: '', page: '' })}>Xóa bộ lọc</DoctorButton>}
      </div>
      {!filtered.length ? <EmptyState search={!!query || !!date || tab !== 'all'} /> : <>
        <table className="doctor-table appointment-table"><thead><tr><th>Bệnh nhân</th><th>Ngày / giờ khám</th><th>Lý do khám</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{filtered.slice((page - 1) * pageSize, page * pageSize).map(a => {
            const patient = patientMap.get(a.patient_id)!, slot = slotMap.get(a.slot_id)!;
            return <tr key={a.id}><td><button className="person appointment-open" onClick={() => store.setSelectedAppointment(a)}><Avatar profile={patient} /><span><strong>{patient.full_name || 'Chưa cập nhật họ tên'}</strong><small>{patient.phone || 'Chưa có SĐT'} · #{a.id}</small></span></button></td>
              <td data-label="Ngày / giờ"><strong>{timeLabel(slot.start_time)}–{timeLabel(slot.end_time)}</strong><small>{dateVN(slot.slot_date)}</small></td>
              <td data-label="Lý do" className="reason-cell">{a.reason || 'Chưa cung cấp'}</td><td><StatusBadge appointment={a} /></td>
              <td><div className="row-actions">{['pending', 'confirmed'].includes(a.status) && <QuickAction appointment={a} />}<DoctorButton variant="ghost" onClick={() => store.setSelectedAppointment(a)}>Chi tiết</DoctorButton></div></td></tr>;
          })}</tbody></table>
        <Pagination page={page} total={filtered.length} pageSize={pageSize} onChange={value => update({ page: String(value) })} />
      </>}
    </section>
  </div>;
}
