'use client';

import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { DoctorButton, EmptyState, PageHeading } from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { addClinicDays, clinicDate, downloadCsv } from '../workflow';
import { dateVN } from '../utils';

type Period = 'week' | 'month' | 'quarter';
function periodStart(today: string, period: Period) {
  if (period === 'month') return today.slice(0, 7) + '-01';
  if (period === 'quarter') return today.slice(0, 4) + '-' + String(Math.floor((Number(today.slice(5, 7)) - 1) / 3) * 3 + 1).padStart(2, '0') + '-01';
  return addClinicDays(today, -(new Date(today + 'T12:00:00Z').getUTCDay() + 6) % 7);
}
export default function ReportsView() {
  const store = useDoctorStore(), today = clinicDate(store.now);
  const [period, setPeriod] = useState<Period>('week');
  const [from, setFrom] = useState(() => periodStart(today, 'week')), [to, setTo] = useState(today);
  const valid = !!addClinicDays(from, 0) && !!addClinicDays(to, 0) && to >= from && to <= addClinicDays(from, 365);
  const slots = new Map(store.slots.map(slot => [slot.id, slot]));
  const appointments = valid ? store.appointments.filter(a => { const slot = slots.get(a.slot_id); return slot && slot.slot_date >= from && slot.slot_date <= to; }) : [];
  const completed = appointments.filter(a => a.status === 'completed');
  const durations = completed.filter(a => a.started_at && a.completed_at && Date.parse(a.completed_at) >= Date.parse(a.started_at))
    .map(a => (Date.parse(a.completed_at!) - Date.parse(a.started_at!)) / 60_000);
  const average = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null;
  const dates: string[] = [];
  if (valid) for (let date = from; date <= to; date = addClinicDays(date, 1)) dates.push(date);
  const rows = dates.map(date => {
    const items = appointments.filter(a => slots.get(a.slot_id)?.slot_date === date);
    return { date, total: items.length, completed: items.filter(a => a.status === 'completed').length,
      cancelled: items.filter(a => a.status === 'cancelled').length, noShow: items.filter(a => a.status === 'no_show').length,
      pending: items.filter(a => a.status === 'pending').length };
  });
  const chart = rows.slice(-14), maximum = Math.max(1, ...chart.map(row => row.total));
  function choose(value: Period) { setPeriod(value); setFrom(periodStart(today, value)); setTo(today); }
  return <div className="page-content report-page">
    <PageHeading title="Báo cáo cá nhân" description={'Bác sĩ ' + store.profile.full_name + ' · Số liệu theo ngày khám'}
      actions={<><DoctorButton variant="secondary" disabled={!valid} icon={<Printer size={17} />} onClick={() => window.print()}>In báo cáo</DoctorButton>
        <DoctorButton disabled={!valid || !appointments.length} icon={<Download size={17} />} onClick={() => downloadCsv('bao-cao-' + from + '-' + to + '.csv', [
          ['Ngày khám', 'Tổng lịch', 'Hoàn thành', 'Hủy', 'Vắng mặt', 'Chờ xác nhận'],
          ...rows.map(row => [row.date, row.total, row.completed, row.cancelled, row.noShow, row.pending]),
        ])}>Xuất CSV</DoctorButton></>} />
    <div className="filter-toolbar card"><div className="segmented">{([['week', 'Tuần này'], ['month', 'Tháng này'], ['quarter', 'Quý này']] as const).map(([value, label]) =>
      <button key={value} aria-pressed={period === value} onClick={() => choose(value)}>{label}</button>)}</div>
      <label className="inline-field"><span>Từ ngày</span><input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label className="inline-field"><span>Đến ngày</span><input type="date" value={to} onChange={event => setTo(event.target.value)} /></label>
    </div>
    {!valid ? <p className="notice warning" role="alert">Chọn khoảng ngày hợp lệ, tối đa một năm.</p> : <>
      <p className="report-period">{dateVN(from)} – {dateVN(to)}</p>
      <div className="stat-grid report-stats"><section className="stat-card"><span>Tổng lịch hẹn</span><strong>{appointments.length}</strong><small>Theo khoảng ngày đã chọn</small></section>
        <section className="stat-card"><span>Hoàn thành</span><strong>{completed.length}</strong><small>{appointments.length ? (completed.length / appointments.length * 100).toFixed(1) : 0}% số lịch trong kỳ</small></section>
        <section className="stat-card"><span>Thời lượng khám TB</span><strong>{average === null ? '—' : average.toFixed(1) + ' phút'}</strong><small>{durations.length} ca có đủ thời điểm bắt đầu/kết thúc</small></section>
        <section className="stat-card"><span>Hủy / Vắng mặt</span><strong>{appointments.filter(a => ['cancelled', 'no_show'].includes(a.status)).length}</strong><small>Không tính vào ca hoàn thành</small></section></div>
      <section className="card"><div className="section-heading"><h2>Lịch hẹn theo ngày</h2><span className="muted">{rows.length > 14 ? '14 ngày cuối trong khoảng đã chọn' : 'Trong khoảng đã chọn'}</span></div>
        {!appointments.length ? <EmptyState title="Chưa có lịch hẹn trong kỳ" description="Chọn khoảng ngày khác để xem số liệu." /> :
          <div className="report-chart" role="img" aria-label={'Số lịch hẹn theo ngày từ ' + dateVN(chart[0]?.date || from) + ' đến ' + dateVN(to)}
            style={{ gridTemplateColumns: 'repeat(' + chart.length + ', minmax(0, 1fr))' }}>
            {chart.map(row => <div key={row.date} className="chart-column" title={dateVN(row.date) + ': ' + row.total + ' lịch, ' + row.completed + ' hoàn thành'}>
              <strong>{row.total}</strong><div className="chart-track"><span style={{ height: row.total / maximum * 100 + '%' }} /></div><small>{row.date.slice(8) + '/' + row.date.slice(5, 7)}</small></div>)}
          </div>}
      </section>
      <section className="card"><div className="section-heading"><h2>Chi tiết từng ngày</h2><span className="muted">Số liệu riêng của bạn</span></div>
        <table className="doctor-table report-table"><thead><tr><th>Ngày khám</th><th>Tổng lịch</th><th>Hoàn thành</th><th>Hủy</th><th>Vắng mặt</th><th>Chờ xác nhận</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.date}><td>{dateVN(row.date)}</td><td data-label="Tổng lịch">{row.total}</td><td data-label="Hoàn thành">{row.completed}</td>
            <td data-label="Hủy">{row.cancelled}</td><td data-label="Vắng mặt">{row.noShow}</td><td data-label="Chờ xác nhận">{row.pending}</td></tr>)}</tbody></table>
      </section>
    </>}
  </div>;
}
