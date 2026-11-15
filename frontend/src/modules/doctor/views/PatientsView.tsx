'use client';

import { useDeferredValue, useState } from 'react';
import { Search } from 'lucide-react';
import { Avatar, EmptyState, Overlay, PageHeading, Pagination, StatusBadge } from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { ageOf, dateVN, genderLabel, searchText, timeLabel } from '../utils';

export default function PatientsView() {
  const store = useDoctorStore();
  const [query, setQuery] = useState(''), [page, setPage] = useState(1), [selectedId, setSelectedId] = useState<string | null>(null);
  const search = searchText(useDeferredValue(query));
  const slots = new Map(store.slots.map(slot => [slot.id, slot]));
  const grouped = new Map<string, typeof store.appointments>();
  for (const appointment of store.appointments) grouped.set(appointment.patient_id, [...grouped.get(appointment.patient_id) || [], appointment]);
  const patients = store.patients.filter(patient => grouped.has(patient.id) && (!search || searchText(patient.full_name + ' ' + patient.phone + ' ' + patient.email).includes(search)))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'));
  const pageSize = 15, current = Math.min(page, Math.max(1, Math.ceil(patients.length / pageSize)));
  const selected = store.patients.find(patient => patient.id === selectedId);
  const history = selected ? (grouped.get(selected.id) || []).slice().sort((a, b) => (slots.get(b.slot_id)?.slot_date || '').localeCompare(slots.get(a.slot_id)?.slot_date || '')) : [];
  return <div className="page-content">
    <PageHeading title="Bệnh nhân của tôi" description="Thông tin và lịch sử những bệnh nhân đã có lịch khám với bạn." />
    <section className="card"><div className="filter-toolbar"><label className="search-field"><Search size={18} /><input aria-label="Tìm bệnh nhân" type="search"
      placeholder="Tên, điện thoại hoặc email…" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label><span className="muted">{patients.length} bệnh nhân</span></div>
      {!patients.length ? <EmptyState search={!!query} title={query ? undefined : 'Chưa có bệnh nhân'} /> : <>
        <table className="doctor-table patient-table"><thead><tr><th>Bệnh nhân</th><th>Thông tin liên hệ</th><th>Lượt hoàn thành</th><th>Lần khám gần nhất</th><th>Hồ sơ</th></tr></thead>
          <tbody>{patients.slice((current - 1) * pageSize, current * pageSize).map(patient => {
            const completed = (grouped.get(patient.id) || []).filter(a => a.status === 'completed');
            const last = completed.map(a => slots.get(a.slot_id)?.slot_date || '').sort().at(-1);
            return <tr key={patient.id}><td><button className="person appointment-open" onClick={() => setSelectedId(patient.id)}><Avatar profile={patient} /><span><strong>{patient.full_name || 'Chưa cập nhật họ tên'}</strong>
              <small>{genderLabel[patient.gender]} · {ageOf(patient.date_of_birth, store.now)} tuổi</small></span></button></td>
              <td data-label="Liên hệ">{patient.phone || 'Chưa có số điện thoại'}<small>{patient.email || 'Chưa có email'}</small></td>
              <td data-label="Hoàn thành">{completed.length} lượt</td><td data-label="Gần nhất">{last ? dateVN(last) : 'Chưa khám'}</td>
              <td><button className="btn btn-secondary" onClick={() => setSelectedId(patient.id)}>Xem lịch sử</button></td></tr>;
          })}</tbody></table>
        <Pagination page={current} total={patients.length} pageSize={pageSize} onChange={setPage} />
      </>}
    </section>
    {selected && <Overlay title="Hồ sơ bệnh nhân" onClose={() => setSelectedId(null)}>
      <div className="person"><Avatar profile={selected} size="lg" /><div><h3>{selected.full_name}</h3><p>{genderLabel[selected.gender]} · {ageOf(selected.date_of_birth, store.now)} tuổi</p></div></div>
      <dl className="patient-info"><div><dt>Điện thoại</dt><dd>{selected.phone ? <a href={'tel:' + selected.phone}>{selected.phone}</a> : 'Chưa cập nhật'}</dd></div>
        <div><dt>Email</dt><dd>{selected.email || 'Chưa cập nhật'}</dd></div><div><dt>Ngày sinh</dt><dd>{dateVN(selected.date_of_birth)}</dd></div>
        <div><dt>Địa chỉ</dt><dd>{selected.address || 'Chưa cập nhật'}</dd></div></dl>
      <section className="detail-section"><h3>Lịch sử khám với bạn</h3><div className="visit-list">{history.map(a => {
        const slot = slots.get(a.slot_id);
        return <button key={a.id} onClick={() => { setSelectedId(null); store.setSelectedAppointment(a); }}><span><strong>{slot ? dateVN(slot.slot_date) + ' · ' + timeLabel(slot.start_time) : 'Lịch hẹn #' + a.id}</strong>
          <small>{a.reason || 'Chưa có lý do khám'}</small>{a.doctor_note && <p className="line-clamp">{a.doctor_note}</p>}</span><StatusBadge appointment={a} /></button>;
      })}</div></section>
    </Overlay>}
  </div>;
}
