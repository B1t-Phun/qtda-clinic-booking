'use client';

import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Check,
  Search,
  X,
  AlertCircle,
  BadgeCheck,
  MapPin,
  Clock3,
  LockKeyhole,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  type Appointment,
  type AppointmentStatus,
  type Profile,
  type TimeSlot,
  statusLabel,
} from '../data';
import { initials, longDate, ageOf, genderLabel } from '../utils';
import { useDoctorStore } from '../store/store';

export function Avatar({
  profile,
  size = 'md',
}: {
  profile: Profile;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className={`avatar avatar-${size}`} aria-label={profile.full_name}>
      {profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt="" />
      ) : (
        initials(profile.full_name)
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`status status-${status}`}>
      <i />
      {statusLabel[status]}
    </span>
  );
}

export function LiveBadge() {
  return (
    <span className="live-badge">
      <i />
      Đang diễn ra
    </span>
  );
}

export function DoctorButton({
  children,
  variant = 'primary',
  icon,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: React.ReactNode;
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
}

export function EmptyState({ search = false }: { search?: boolean }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{search ? <Search /> : <CalendarDays />}</div>
      <h3>{search ? 'Không tìm thấy kết quả' : 'Chưa có lịch hẹn'}</h3>
      <p>
        {search
          ? 'Hãy thử từ khóa hoặc bộ lọc khác.'
          : 'Các lịch hẹn mới sẽ xuất hiện tại đây.'}
      </p>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="skeleton-list">
      {[1, 2, 3, 4].map((x) => (
        <div className="skeleton-row" key={x}>
          <span />
          <div>
            <b />
            <i />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Overlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overlay-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="overlay-panel">
        <header>
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Đóng">
            <X />
          </button>
        </header>
        <div className="overlay-body">{children}</div>
      </section>
    </div>
  );
}

export function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Info({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`info-item ${wide ? 'wide' : ''}`}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <b>{value}</b>
      </div>
    </div>
  );
}

export function CancelDialog({
  close,
  confirm,
}: {
  close: () => void;
  confirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="nested-backdrop">
      <div className="confirm-dialog">
        <div className="danger-icon">
          <AlertCircle />
        </div>
        <h3>Hủy lịch hẹn?</h3>
        <p>Khung giờ này sẽ được mở lại để bệnh nhân khác có thể đặt.</p>
        <Field label="Lý do hủy (bắt buộc)">
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do hủy lịch..."
          />
        </Field>
        <div>
          <DoctorButton variant="secondary" onClick={close}>
            Quay lại
          </DoctorButton>
          <DoctorButton
            variant="danger"
            disabled={!reason.trim()}
            onClick={() => confirm(reason.trim())}
          >
            Xác nhận hủy
          </DoctorButton>
        </div>
      </div>
    </div>
  );
}

export function PasswordDialog({
  close,
  done,
}: {
  close: () => void;
  done: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <Overlay title="Đổi mật khẩu" onClose={close}>
      <div className="form-stack">
        <Field label="Mật khẩu hiện tại">
          <div className="password-input">
            <input type={show ? 'text' : 'password'} defaultValue="password" />
            <button type="button" onClick={() => setShow(!show)}>
              {show ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </Field>
        <Field label="Mật khẩu mới">
          <input type="password" placeholder="Tối thiểu 8 ký tự" />
        </Field>
        <Field label="Nhập lại mật khẩu mới">
          <input type="password" placeholder="Nhập lại mật khẩu" />
        </Field>
      </div>
      <div className="overlay-actions">
        <DoctorButton variant="secondary" onClick={close}>
          Hủy
        </DoctorButton>
        <DoctorButton onClick={done}>Cập nhật mật khẩu</DoctorButton>
      </div>
    </Overlay>
  );
}

export function AppointmentDetailModal({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const { patients, slots, doctor, updateStatus, updateNote } = useDoctorStore();
  const p = patients.find((x) => x.id === appointment.patient_id);
  const s = slots.find((x) => x.id === appointment.slot_id);

  const [note, setNote] = useState(appointment.doctor_note || '');
  const [saving, setSaving] = useState(false);
  const [cancel, setCancel] = useState(false);

  useEffect(() => {
    setNote(appointment.doctor_note || '');
  }, [appointment.id, appointment.doctor_note]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    setSaving(true);
  };

  useEffect(() => {
    if (note === appointment.doctor_note) {
      setSaving(false);
      return;
    }
    const timer = setTimeout(() => {
      updateNote(note);
      setSaving(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [note, appointment.doctor_note, updateNote]);

  if (!p || !s) return null;

  return (
    <Overlay title="Chi tiết lịch hẹn" onClose={onClose}>
      <div className="detail-top">
        <div className="patient-hero">
          <Avatar profile={p} size="lg" />
          <div>
            <h2>{p.full_name}</h2>
            <p>
              {ageOf(p.date_of_birth)} tuổi · {genderLabel[p.gender]} · {p.phone}
            </p>
          </div>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="detail-schedule">
        <div>
          <CalendarDays />
          <span>
            <small>Ngày khám</small>
            <b>{longDate(s.slot_date)}</b>
          </span>
        </div>
        <div>
          <Clock3 />
          <span>
            <small>Thời gian · 30 phút</small>
            <b>
              {s.start_time} – {s.end_time}
            </b>
          </span>
        </div>
        <div>
          <MapPin />
          <span>
            <small>Phòng</small>
            <b>{doctor.room}</b>
          </span>
        </div>
      </div>

      <div className="reason-box detail-reason">
        <span>Lý do khám</span>
        <p>{appointment.reason}</p>
      </div>

      {appointment.cancel_reason && (
        <div className="cancel-box">
          <AlertCircle />
          <div>
            <b>Lý do hủy</b>
            <p>{appointment.cancel_reason}</p>
          </div>
        </div>
      )}

      <div className="note-area">
        <div>
          <label htmlFor="doctor-note">Ghi chú của bác sĩ</label>
          <span>
            {saving ? (
              <>
                <i className="saving" />
                Đang lưu...
              </>
            ) : (
              <>
                <Check />
                Đã lưu
              </>
            )}
          </span>
        </div>
        <textarea
          id="doctor-note"
          rows={5}
          value={note}
          onChange={handleNoteChange}
          placeholder="Thêm ghi chú sau buổi khám..."
        />
      </div>

      <div className="update-timeline">
        <h3>Lịch sử cập nhật</h3>
        <div>
          <i />
          <span>
            <b>Tạo lịch hẹn</b>
            <small>
              {new Intl.DateTimeFormat('vi-VN', {
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(appointment.created_at))}
            </small>
          </span>
        </div>
        <div>
          <i />
          <span>
            <b>Cập nhật gần nhất</b>
            <small>
              {new Intl.DateTimeFormat('vi-VN', {
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(appointment.updated_at))}
            </small>
          </span>
        </div>
      </div>

      {appointment.status === 'pending' && (
        <div className="sticky-actions">
          <DoctorButton variant="danger" onClick={() => setCancel(true)}>
            Hủy lịch
          </DoctorButton>
          <DoctorButton
            onClick={() => updateStatus('confirmed')}
            icon={<Check size={18} />}
          >
            Xác nhận lịch
          </DoctorButton>
        </div>
      )}

      {appointment.status === 'confirmed' && (
        <div className="sticky-actions multi">
          <DoctorButton variant="danger" onClick={() => setCancel(true)}>
            Hủy lịch
          </DoctorButton>
          <DoctorButton
            variant="secondary"
            onClick={() => updateStatus('no_show')}
          >
            Đánh dấu vắng
          </DoctorButton>
          <DoctorButton
            onClick={() => updateStatus('completed')}
            icon={<BadgeCheck size={18} />}
          >
            Hoàn thành
          </DoctorButton>
        </div>
      )}

      {['completed', 'cancelled', 'no_show'].includes(appointment.status) && (
        <div className="final-note">
          <LockKeyhole size={16} /> Lịch hẹn đã kết thúc. Bạn vẫn có thể chỉnh sửa ghi chú.
        </div>
      )}

      {cancel && (
        <CancelDialog
          close={() => setCancel(false)}
          confirm={(r) => {
            setCancel(false);
            updateStatus('cancelled', r);
          }}
        />
      )}
    </Overlay>
  );
}
