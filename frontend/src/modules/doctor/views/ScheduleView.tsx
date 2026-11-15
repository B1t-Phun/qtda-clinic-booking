'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { NewSlot, TimeSlot } from '../data';
import { DoctorButton, EmptyState, Field, Overlay, PageHeading } from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { addClinicDays, clinicDate, slotInstant } from '../workflow';
import { dateVN, timeLabel } from '../utils';

function createPreview(startDate: string, endDate: string, days: number[], start: string, end: string, duration: number,
  rest: boolean, restStart: string, restEnd: string, existing: TimeSlot[], now: Date): { slots: NewSlot[]; error: string; skipped: number } {
  const result: NewSlot[] = [];
  let skipped = 0;
  if (!addClinicDays(startDate, 0) || !addClinicDays(endDate, 0) || endDate < startDate || endDate > addClinicDays(startDate, 30)) {
    return { slots: [], error: 'Chọn khoảng ngày hợp lệ, tối đa 31 ngày.', skipped };
  }
  if (!days.length || !start || !end || start >= end || ![15, 20, 30, 45, 60].includes(duration) || (rest && (!restStart || !restEnd || restStart >= restEnd))) {
    return { slots: [], error: 'Kiểm tra ngày làm việc, giờ bắt đầu/kết thúc và giờ nghỉ.', skipped };
  }
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const time = (value: number) => String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
  for (let date = startDate; date <= endDate; date = addClinicDays(date, 1)) {
    if (!days.includes(new Date(date + 'T12:00:00Z').getUTCDay())) continue;
    for (let value = minutes(start); value + duration <= minutes(end); value += duration) {
      const slot = { slot_date: date, start_time: time(value), end_time: time(value + duration) };
      if (rest && slot.start_time < restEnd && slot.end_time > restStart) continue;
      if (Date.parse(date + 'T' + slot.start_time + ':00+07:00') <= now.getTime()) { skipped++; continue; }
      result.push(slot);
      if (result.length > 40) return { slots: result, error: 'Mỗi lần tạo tối đa 40 khung giờ. Thu hẹp khoảng ngày hoặc giờ khám.', skipped };
    }
  }
  const conflicts = result.filter(slot => existing.some(item => item.slot_date === slot.slot_date && slot.start_time < item.end_time && slot.end_time > item.start_time));
  return { slots: result, error: conflicts.length ? 'Có ' + conflicts.length + ' khung giờ trùng hoặc chồng lấn với lịch hiện tại.' : '', skipped };
}
function SlotCreator({ onClose }: { onClose: () => void }) {
  const store = useDoctorStore();
  const today = clinicDate(store.now);
  const [startDate, setStartDate] = useState(today), [endDate, setEndDate] = useState(addClinicDays(today, 6));
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [start, setStart] = useState('08:00'), [end, setEnd] = useState('11:00'), [duration, setDuration] = useState(30);
  const [rest, setRest] = useState(false), [restStart, setRestStart] = useState('09:30'), [restEnd, setRestEnd] = useState('10:00');
  const preview = createPreview(startDate, endDate, days, start, end, duration, rest, restStart, restEnd, store.slots, store.now);
  const busy = !!store.pending;
  return <Overlay title="Tạo khung giờ khám" onClose={() => { if (!busy) onClose(); }}>
    <form onSubmit={async event => { event.preventDefault(); if (!preview.error && preview.slots.length && await store.addSlots(preview.slots)) onClose(); }}>
      <fieldset disabled={busy} className="form-stack"><div className="form-grid two">
        <Field label="Từ ngày"><input type="date" required min={today} value={startDate} onChange={event => setStartDate(event.target.value)} /></Field>
        <Field label="Đến ngày"><input type="date" required min={startDate || today} value={endDate} onChange={event => setEndDate(event.target.value)} /></Field>
      </div>
        <div className="field"><span>Ngày làm việc</span><div className="weekday-picker">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((label, index) =>
          <button type="button" key={label} aria-pressed={days.includes(index)} onClick={() => setDays(previous => previous.includes(index) ? previous.filter(day => day !== index) : [...previous, index])}>{label}</button>)}</div></div>
        <div className="form-grid three"><Field label="Bắt đầu"><input type="time" required value={start} onChange={event => setStart(event.target.value)} /></Field>
          <Field label="Kết thúc"><input type="time" required value={end} onChange={event => setEnd(event.target.value)} /></Field>
          <Field label="Thời lượng mỗi lượt"><select value={duration} onChange={event => setDuration(Number(event.target.value))}>{[15, 20, 30, 45, 60].map(value => <option key={value} value={value}>{value} phút</option>)}</select></Field></div>
        <label className="check-row"><input type="checkbox" checked={rest} onChange={event => setRest(event.target.checked)} />Có giờ nghỉ giữa buổi</label>
        {rest && <div className="form-grid two"><Field label="Nghỉ từ"><input type="time" value={restStart} onChange={event => setRestStart(event.target.value)} /></Field>
          <Field label="Đến"><input type="time" value={restEnd} onChange={event => setRestEnd(event.target.value)} /></Field></div>}
        <div className={'notice' + (preview.error ? ' warning' : '')} aria-live="polite"><strong>{preview.slots.length} khung giờ dự kiến</strong>
          {preview.error && <p>{preview.error}</p>}{preview.skipped > 0 && <p>Đã bỏ qua {preview.skipped} khung giờ trong quá khứ.</p>}
          {!preview.error && preview.slots.length === 0 && <p>Chưa có khung giờ phù hợp. Chọn ngày hoặc thời gian khác.</p>}</div>
        {!!preview.slots.length && !preview.error && <div className="slot-preview">{preview.slots.slice(0, 8).map(item =>
          <span key={item.slot_date + item.start_time}>{dateVN(item.slot_date)} · {item.start_time}–{item.end_time}</span>)}{preview.slots.length > 8 && <small>Và {preview.slots.length - 8} khung giờ tiếp theo.</small>}</div>}
        <div className="section-actions"><DoctorButton variant="secondary" onClick={onClose}>Quay lại</DoctorButton>
          <DoctorButton type="submit" disabled={!!preview.error || !preview.slots.length}>{busy ? 'Đang tạo…' : 'Tạo ' + preview.slots.length + ' khung giờ'}</DoctorButton></div>
      </fieldset>
    </form>
  </Overlay>;
}
export default function ScheduleView() {
  const store = useDoctorStore();
  const [anchor, setAnchor] = useState(clinicDate(store.now)), [mode, setMode] = useState<'week' | 'day'>('week');
  const [creator, setCreator] = useState(false), [deleting, setDeleting] = useState<TimeSlot | null>(null);
  const weekday = (new Date(anchor + 'T12:00:00Z').getUTCDay() + 6) % 7;
  const dates = Array.from({ length: mode === 'week' ? 7 : 1 }, (_, index) => addClinicDays(anchor, mode === 'week' ? index - weekday : 0));
  const appointments = new Map<string, typeof store.appointments>();
  for (const appointment of store.appointments) appointments.set(appointment.slot_id, [...appointments.get(appointment.slot_id) || [], appointment]);
  return <div className="page-content">
    <PageHeading title="Lịch làm việc" description="Tạo giờ khám để nhận lịch đặt. Khung giờ đã có lịch sử được giữ lại."
      actions={<DoctorButton icon={<Plus size={17} />} disabled={!!store.pending} onClick={() => setCreator(true)}>Tạo khung giờ</DoctorButton>} />
    <section className="card"><div className="calendar-toolbar">
      <div className="segmented"><button aria-pressed={mode === 'day'} onClick={() => setMode('day')}>Ngày</button><button aria-pressed={mode === 'week'} onClick={() => setMode('week')}>Tuần</button></div>
      <div className="calendar-navigation"><DoctorButton variant="secondary" aria-label="Kỳ trước" onClick={() => setAnchor(addClinicDays(anchor, mode === 'week' ? -7 : -1))}><ChevronLeft size={17} /></DoctorButton>
        <strong>{dateVN(dates[0])}{dates.length > 1 ? ' – ' + dateVN(dates[dates.length - 1]) : ''}</strong>
        <DoctorButton variant="secondary" aria-label="Kỳ tiếp theo" onClick={() => setAnchor(addClinicDays(anchor, mode === 'week' ? 7 : 1))}><ChevronRight size={17} /></DoctorButton></div>
      <div className="inline-actions"><label className="sr-only" htmlFor="calendar-date">Chọn ngày xem lịch</label><input id="calendar-date" type="date" value={anchor} onChange={event => { if (addClinicDays(event.target.value, 0)) setAnchor(event.target.value); }} />
        <DoctorButton variant="ghost" onClick={() => setAnchor(clinicDate(store.now))}>Hôm nay</DoctorButton></div>
    </div>
      <div className={'calendar-grid ' + mode}>{dates.map(date => {
        const daySlots = store.slots.filter(slot => slot.slot_date === date).sort((a, b) => a.start_time.localeCompare(b.start_time));
        return <section key={date} className={'calendar-day' + (date === clinicDate(store.now) ? ' today' : '')}>
          <header><strong>{new Intl.DateTimeFormat('vi-VN', { weekday: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(date + 'T12:00:00+07:00'))} · {dateVN(date)}</strong><small>{daySlots.length} khung giờ</small></header>
          {daySlots.length ? <div className="slot-stack">{daySlots.map(slot => {
            const history = appointments.get(slot.id) || [];
            const appointment = history.find(a => ['pending', 'confirmed', 'completed'].includes(a.status));
            const past = slotInstant(slot) <= store.now.getTime();
            const canDelete = !slot.is_booked && !history.length && !past;
            return <div key={slot.id} className={'slot-chip ' + (slot.is_booked ? 'booked' : past ? 'past' : 'free')}>
              <button className="slot-open" disabled={!appointment} onClick={() => { if (appointment) store.setSelectedAppointment(appointment); }}>
                <strong>{timeLabel(slot.start_time)}–{timeLabel(slot.end_time)}</strong><small>{slot.is_booked ? 'Đã đặt' : history.length ? 'Đã có lịch sử' : past ? 'Đã qua / Đang diễn ra' : 'Còn trống'}</small></button>
              {canDelete && <button className="icon-button" disabled={!!store.pending} aria-label={'Xóa khung giờ ' + slot.start_time + ' ngày ' + dateVN(date)} onClick={() => setDeleting(slot)}><Trash2 size={15} /></button>}
            </div>;
          })}</div> : <p className="no-slots">Chưa có khung giờ</p>}
        </section>;
      })}</div>
      {!store.slots.length && <EmptyState title="Bạn chưa có lịch làm việc" description="Chọn Tạo khung giờ để bắt đầu nhận lịch đặt từ bệnh nhân." />}
      <div className="calendar-legend"><span><i className="free" />Còn trống</span><span><i className="booked" />Đã đặt</span><span><i className="past" />Đã qua</span></div>
    </section>
    {creator && <SlotCreator onClose={() => setCreator(false)} />}
    {deleting && <Overlay title="Xóa khung giờ trống?" onClose={() => { if (!store.pending) setDeleting(null); }}>
      <p>{dateVN(deleting.slot_date)} · {timeLabel(deleting.start_time)}–{timeLabel(deleting.end_time)}. Bệnh nhân sẽ không thể đặt giờ này sau khi xóa.</p>
      <div className="section-actions"><DoctorButton variant="secondary" disabled={!!store.pending} onClick={() => setDeleting(null)}>Quay lại</DoctorButton>
        <DoctorButton variant="danger" disabled={!!store.pending} onClick={async () => { if (await store.deleteSlot(deleting.id)) setDeleting(null); }}>{store.pending ? 'Đang xóa…' : 'Xác nhận xóa'}</DoctorButton></div>
    </Overlay>}
  </div>;
}
