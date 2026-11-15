'use client';

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, LoaderCircle, Search, X } from 'lucide-react';
import type { Appointment, AppointmentEvent, AppointmentStatus, DoctorAction, Profile } from '../data';
import { actionLabel, statusLabel } from '../data';
import { ageOf, dateTimeVN, dateVN, genderLabel, initials, timeLabel } from '../utils';
import { clinicDate, slotInstant, stage, stageLabel } from '../workflow';
import { doctorRequest, useDoctorStore } from '../store/store';

export function Avatar({ profile, size = 'md' }: { profile: Profile; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={'avatar avatar-' + size} aria-label={profile.full_name}>
    {profile.avatar_url
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={profile.avatar_url} alt="" loading="lazy" referrerPolicy="no-referrer" />
      : initials(profile.full_name)}
  </span>;
}
export function StatusBadge({ status, appointment }: { status?: AppointmentStatus; appointment?: Appointment }) {
  const key = appointment ? stage(appointment) : status || 'pending';
  return <span className={'status status-' + key}><i />{appointment ? stageLabel(appointment) : statusLabel[status || 'pending']}</span>;
}
export function DoctorButton({ children, variant = 'primary', icon, className = '', type = 'button', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; icon?: ReactNode }) {
  return <button type={type} className={'btn btn-' + variant + ' ' + className} {...props}>{icon}{children}</button>;
}
export function PageHeading({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">KHÔNG GIAN BÁC SĨ</p><h1>{title}</h1><p>{description}</p></div>
    {actions && <div className="heading-actions">{actions}</div>}</div>;
}
export function EmptyState({ search = false, title, description }: { search?: boolean; title?: string; description?: string }) {
  return <div className="empty-state"><Search aria-hidden="true" /><h3>{title || (search ? 'Không tìm thấy kết quả' : 'Chưa có dữ liệu')}</h3>
    <p>{description || (search ? 'Thử đổi từ khóa hoặc xóa bộ lọc.' : 'Dữ liệu mới sẽ xuất hiện khi có lịch khám phát sinh.')}</p></div>;
}
export function SkeletonList() {
  return <div className="skeleton-list" role="status" aria-label="Đang tải dữ liệu">{[1, 2, 3].map(row => <div className="skeleton-row" key={row}><i /><span /></div>)}</div>;
}
export function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={'field' + (wide ? ' wide' : '')}><span>{label}</span>{children}</label>;
}
export function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { toasts } = useDoctorStore();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="doctor-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-surface"><header><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Đóng"><X /></button></header>
      <div className="dialog-body"><div aria-live="polite">{toasts.filter(item => item.error).slice(-1).map(item => <p key={item.id} className="notice error" role="alert">{item.text}</p>)}</div>{children}</div></div>
  </dialog>;
}
export function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="pagination"><span>{total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} / {total}</span>
    <div><DoctorButton variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Trang trước"><ChevronLeft size={16} /></DoctorButton>
      <span>Trang {page}/{pages}</span><DoctorButton variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Trang sau"><ChevronRight size={16} /></DoctorButton></div></div>;
}
export function QuickAction({ appointment }: { appointment: Appointment }) {
  const { slots, appointments, pending, now, act, setSelectedAppointment } = useDoctorStore();
  const slot = slots.find(item => item.id === appointment.slot_id);
  const ongoing = appointments.some(item => item.status === 'confirmed' && item.started_at);
  let action: DoctorAction | null = null;
  let label = 'Xem chi tiết';
  if (slot && appointment.status === 'pending' && slotInstant(slot, true) > now.getTime()) { action = 'confirm'; label = 'Xác nhận'; }
  else if (slot && appointment.status === 'confirmed' && !appointment.checked_in_at && slot.slot_date === clinicDate(now)) { action = 'check_in'; label = 'Tiếp nhận'; }
  else if (slot && appointment.status === 'confirmed' && appointment.checked_in_at && !appointment.started_at && slot.slot_date === clinicDate(now) && !ongoing) { action = 'start'; label = 'Bắt đầu khám'; }
  else if (appointment.started_at && appointment.status === 'confirmed') label = 'Tiếp tục khám';
  return <DoctorButton variant={action ? 'primary' : 'secondary'} disabled={!!pending}
    onClick={async () => { if (!action) setSelectedAppointment(appointment); else if (await act(appointment, action)) { if (action === 'start') setSelectedAppointment(appointment); } }}>
    {pending === appointment.id && <LoaderCircle className="spin" size={15} />}{label}
  </DoctorButton>;
}

export function AppointmentDetailModal({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  return <AppointmentDetails key={appointment.id} appointment={appointment} onClose={onClose} />;
}
function AppointmentDetails({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const store = useDoctorStore();
  const patient = store.patients.find(item => item.id === appointment.patient_id);
  const slot = store.slots.find(item => item.id === appointment.slot_id);
  const [note, setNote] = useState(appointment.doctor_note);
  const [baseline, setBaseline] = useState(appointment.doctor_note);
  const [panel, setPanel] = useState<DoctorAction | 'discard' | null>(null);
  const [reason, setReason] = useState('');
  const [target, setTarget] = useState('');
  const [history, setHistory] = useState<AppointmentEvent[]>(store.events.filter(event => event.appointment_id === appointment.id));
  const [historyVersion, setHistoryVersion] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const dirty = note !== appointment.doctor_note;
  const conflict = baseline !== appointment.doctor_note && dirty;
  const busy = !!store.pending;
  const today = clinicDate(store.now);
  const ongoing = store.appointments.some(item => item.status === 'confirmed' && item.started_at && item.id !== appointment.id);
  const available = store.slots.filter(item => item.id !== appointment.slot_id && !item.is_booked && slotInstant(item) > store.now.getTime());
  const canCancel = ['pending', 'confirmed'].includes(appointment.status) && !appointment.started_at;
  const canMove = canCancel && !appointment.checked_in_at;
  const canNoShow = slot && appointment.status === 'confirmed' && !appointment.checked_in_at && slotInstant(slot) <= store.now.getTime();
  const canStart = slot && slot.slot_date === today && appointment.status === 'confirmed' && appointment.checked_in_at && !appointment.started_at;
  const canComplete = appointment.status === 'confirmed' && !!appointment.started_at;

  useEffect(() => {
    const controller = new AbortController();
    doctorRequest<{ events: AppointmentEvent[] }>('history?appointmentId=' + appointment.id, undefined, controller.signal)
      .then(result => { setHistory(result.events); setHistoryVersion(appointment.updated_at); setHistoryError(''); })
      .catch(error => { if (!controller.signal.aborted) { setHistoryError(error instanceof Error ? error.message : 'Không tải được nhật ký.'); setHistoryVersion(appointment.updated_at); } });
    return () => controller.abort();
  }, [appointment.id, appointment.updated_at, historyAttempt]);

  async function save() {
    if (await store.act(appointment, 'save_note', { note })) setBaseline(note);
  }
  async function confirm() {
    if (panel === 'discard') { onClose(); return; }
    if (!panel) return;
    const ok = await store.act(appointment, panel, {
      ...(panel === 'complete' ? { note } : {}),
      ...(['cancel', 'reschedule'].includes(panel) ? { reason: reason.trim() } : {}),
      ...(panel === 'reschedule' ? { slotId: target } : {}),
    });
    if (ok) { setPanel(null); setReason(''); if (panel === 'complete') setBaseline(note); }
  }
  const close = () => { if (busy) return; if (dirty) setPanel('discard'); else onClose(); };
  if (!patient || !slot) return <Overlay title="Chi tiết lịch hẹn" onClose={onClose}><p role="alert">Không tải đủ dữ liệu lịch hẹn. Vui lòng tải lại danh sách.</p></Overlay>;

  return <Overlay title={'Lịch hẹn #' + appointment.id} onClose={close}>
    <div className="detail-top"><div className="person"><Avatar profile={patient} size="lg" /><div><h3>{patient.full_name || 'Chưa cập nhật họ tên'}</h3>
      <p>{genderLabel[patient.gender]} · {ageOf(patient.date_of_birth, store.now)} tuổi</p><a href={patient.phone ? 'tel:' + patient.phone : undefined}>{patient.phone || 'Chưa có số điện thoại'}</a></div></div>
      <StatusBadge appointment={appointment} /></div>
    <div className="detail-schedule"><div><small>Ngày khám</small><strong>{dateVN(slot.slot_date)}</strong></div>
      <div><small>Giờ khám</small><strong>{timeLabel(slot.start_time)}–{timeLabel(slot.end_time)}</strong></div>
      <div><small>Phòng khám</small><strong>{store.doctor.room || 'Chưa bố trí'}</strong></div></div>
    <section className="detail-section"><h3>Lý do khám</h3><p className="preserve">{appointment.reason || 'Chưa cung cấp lý do khám.'}</p></section>
    {appointment.cancel_reason && <p className="notice warning">Lý do hủy: {appointment.cancel_reason}</p>}
    <div className="detail-section">
      <div className="section-heading"><h3>Ghi chú / Kết luận khám</h3><span className="muted">{note.length}/10000</span></div>
      <label className="sr-only" htmlFor="doctor-note">Ghi chú và kết luận khám</label>
      <textarea id="doctor-note" rows={7} maxLength={10000} value={note} disabled={busy}
        onChange={event => setNote(event.target.value)} placeholder="Ghi nhận thăm khám, kết luận và hướng dẫn theo dõi…" />
      <div className="section-actions"><span className="muted">{dirty ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ với hồ sơ'}</span>
        <DoctorButton disabled={busy || !dirty || conflict} onClick={() => { void save(); }} icon={<Check size={16} />}>Lưu ghi chú</DoctorButton></div>
      {conflict && <div className="notice warning"><p>Ghi chú trên hệ thống đã thay đổi. Kiểm tra nội dung mới trước khi lưu bản đang soạn.</p>
        <blockquote className="preserve">{appointment.doctor_note || '(Trống)'}</blockquote><div className="inline-actions">
          <DoctorButton variant="secondary" onClick={() => { setNote(appointment.doctor_note); setBaseline(appointment.doctor_note); }}>Dùng bản trên hệ thống</DoctorButton>
          <DoctorButton variant="secondary" onClick={() => setBaseline(appointment.doctor_note)}>Giữ bản đang soạn</DoctorButton></div></div>}
    </div>
    <section className="detail-section"><h3>Xử lý lịch hẹn</h3><div className="inline-actions">
      {appointment.status === 'pending' && slotInstant(slot, true) > store.now.getTime() && <DoctorButton disabled={busy} onClick={() => { void store.act(appointment, 'confirm'); }}>Xác nhận lịch</DoctorButton>}
      {appointment.status === 'confirmed' && !appointment.checked_in_at && slot.slot_date === today && <DoctorButton disabled={busy} onClick={() => { void store.act(appointment, 'check_in'); }}>Tiếp nhận bệnh nhân</DoctorButton>}
      {canStart && <DoctorButton disabled={busy || ongoing} onClick={() => { void store.act(appointment, 'start'); }}>Bắt đầu khám</DoctorButton>}
      {canComplete && <DoctorButton disabled={busy || conflict} onClick={() => setPanel('complete')}>Hoàn thành khám</DoctorButton>}
      {canMove && <DoctorButton variant="secondary" disabled={busy} onClick={() => { setPanel('reschedule'); setReason(''); }}>Đổi lịch</DoctorButton>}
      {canNoShow && <DoctorButton variant="secondary" disabled={busy} onClick={() => setPanel('no_show')}>Đánh dấu vắng</DoctorButton>}
      {canCancel && <DoctorButton variant="danger" disabled={busy} onClick={() => { setPanel('cancel'); setReason(''); }}>Hủy lịch</DoctorButton>}
    </div>
      {canStart && ongoing && <p className="help">Bạn đang khám một bệnh nhân khác. Hoàn thành ca đó trước khi bắt đầu ca mới.</p>}
      {['completed', 'cancelled', 'no_show'].includes(appointment.status) && <p className="help">Lịch đã kết thúc. Ghi chú vẫn có thể cập nhật và mọi thay đổi được ghi vào nhật ký.</p>}
    </section>
    {panel && <section className="confirmation" role="region" aria-label="Xác nhận thao tác">
      <h3>{panel === 'discard' ? 'Ghi chú chưa được lưu' : panel === 'complete' ? 'Hoàn thành ca khám?' : panel === 'cancel' ? 'Hủy lịch hẹn?' : panel === 'no_show' ? 'Xác nhận bệnh nhân vắng mặt?' : 'Chọn giờ khám mới'}</h3>
      {panel === 'discard' && <p>Bản đang soạn sẽ mất nếu đóng chi tiết lúc này.</p>}
      {panel === 'complete' && <p>Ghi chú hiện tại sẽ được lưu cùng kết quả hoàn thành. Cần có kết luận trước khi xác nhận.</p>}
      {panel === 'no_show' && <p>Chỉ xác nhận sau khi kiểm tra bệnh nhân chưa đến phòng khám.</p>}
      {panel === 'reschedule' && <Field label="Khung giờ trống của bạn"><select value={target} onChange={event => setTarget(event.target.value)} disabled={busy}>
        <option value="">Chọn ngày và giờ khám</option>{available.map(item => <option key={item.id} value={item.id}>{dateVN(item.slot_date)} · {timeLabel(item.start_time)}–{timeLabel(item.end_time)}</option>)}</select></Field>}
      {panel === 'reschedule' && !available.length && <p className="help">Chưa có khung giờ phù hợp. Tạo khung giờ mới trong Lịch làm việc.</p>}
      {['cancel', 'reschedule'].includes(panel) && <Field label="Lý do (bắt buộc)"><textarea rows={3} maxLength={1000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></Field>}
      <div className="inline-actions"><DoctorButton variant="secondary" disabled={busy} onClick={() => setPanel(null)}>Quay lại</DoctorButton>
        <DoctorButton variant={panel === 'cancel' || panel === 'discard' ? 'danger' : 'primary'} disabled={busy ||
          (panel === 'complete' && (!note.trim() || conflict)) || (['cancel', 'reschedule'].includes(panel) && !reason.trim()) || (panel === 'reschedule' && !target)}
          onClick={() => { void confirm(); }}>{busy ? 'Đang lưu…' : panel === 'discard' ? 'Bỏ thay đổi và đóng' : 'Xác nhận'}</DoctorButton></div>
    </section>}
    <section className="detail-section"><h3>Lịch sử thao tác</h3>
      {historyVersion !== appointment.updated_at && <p className="muted" role="status">Đang cập nhật nhật ký…</p>}
      {historyError && <p role="alert" className="notice warning">{historyError} <button type="button" onClick={() => setHistoryAttempt(value => value + 1)}>Thử lại</button></p>}
      {!history.length && historyVersion === appointment.updated_at && !historyError && <p className="muted">Chưa có sự kiện được ghi nhận.</p>}
      <ol className="event-list">{history.map(event => <li key={event.id}><i /><div><strong>{actionLabel[event.action] || 'Cập nhật lịch hẹn'}</strong>
        <small>{dateTimeVN(event.created_at)}</small>{event.reason && <p>{event.reason}</p>}
        {event.action === 'reschedule' && <p>Khung giờ #{event.old_slot_id} → #{event.new_slot_id}</p>}</div></li>)}</ol>
    </section>
  </Overlay>;
}
