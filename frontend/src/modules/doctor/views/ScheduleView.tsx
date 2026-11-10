'use client';

import React, { useMemo, useState } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LockKeyhole,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  type TimeSlot,
} from '../data';
import {
  DoctorButton,
  Overlay,
  Field,
} from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { todayISO, dateVN, longDate } from '../utils';

function SlotCreator({
  existing,
  onClose,
  onCreate,
}: {
  existing: TimeSlot[];
  onClose: () => void;
  onCreate: (slots: TimeSlot[]) => void;
}) {
  const { doctor } = useDoctorStore();
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(() => {
    const endDefault = typeof window === 'undefined' ? new Date('2026-11-09T00:00:00') : new Date();
    endDefault.setDate(endDefault.getDate() + 6);
    return endDefault.toISOString().slice(0, 10);
  });
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('11:00');
  const [length, setLength] = useState(30);
  const [hasBreak, setHasBreak] = useState(true);
  const [breakStart, setBreakStart] = useState('09:30');
  const [breakEnd, setBreakEnd] = useState('10:00');

  const preview = useMemo(() => {
    const result: TimeSlot[] = [];
    const begin = new Date(`${startDate}T12:00:00`);
    const finish = new Date(`${endDate}T12:00:00`);
    for (const d = new Date(begin); d <= finish; d.setDate(d.getDate() + 1)) {
      if (days.includes(d.getDay())) {
        const date = d.toISOString().slice(0, 10);
        let mins = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
        const max = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));
        while (mins + length <= max) {
          const a = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
          const em = mins + length;
          const b = `${String(Math.floor(em / 60)).padStart(2, '0')}:${String(em % 60).padStart(2, '0')}`;
          if (!hasBreak || b <= breakStart || a >= breakEnd) {
            result.push({
              id: `slot-new-${date}-${a}`,
              doctor_id: doctor.id,
              slot_date: date,
              start_time: a,
              end_time: b,
              is_booked: false,
              created_at: new Date().toISOString(),
            });
          }
          mins += length;
        }
      }
    }
    return result;
  }, [startDate, endDate, days, start, end, length, hasBreak, breakStart, breakEnd, doctor.id]);

  const conflicts = preview.filter((p) =>
    existing.some(
      (e) =>
        e.slot_date === p.slot_date &&
        p.start_time < e.end_time &&
        p.end_time > e.start_time
    )
  );

  const valid =
    preview.length > 0 &&
    conflicts.length === 0 &&
    endDate >= startDate &&
    end > start;

  const dayLabels = [
    ['T2', 1],
    ['T3', 2],
    ['T4', 3],
    ['T5', 4],
    ['T6', 5],
    ['T7', 6],
    ['CN', 0],
  ] as const;

  return (
    <Overlay title="Tạo khung giờ" onClose={onClose}>
      <div className="form-section">
        <h3>Khoảng ngày</h3>
        <div className="form-grid two">
          <Field label="Từ ngày">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="Đến ngày">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="form-section">
        <h3>Ngày làm việc</h3>
        <div className="weekday-picker">
          {dayLabels.map(([label, d]) => (
            <button
              type="button"
              className={days.includes(d) ? 'active' : ''}
              key={d}
              onClick={() =>
                setDays((x) =>
                  x.includes(d) ? x.filter((v) => v !== d) : [...x, d]
                )
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3>Thời gian</h3>
        <div className="form-grid three">
          <Field label="Bắt đầu">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="Kết thúc">
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
          <Field label="Độ dài">
            <select
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
            >
              {[15, 20, 30, 45, 60].map((x) => (
                <option key={x} value={x}>
                  {x} phút
                </option>
              ))}
            </select>
          </Field>
        </div>

        <label className="check-row">
          <input
            type="checkbox"
            checked={hasBreak}
            onChange={(e) => setHasBreak(e.target.checked)}
          />{' '}
          Có giờ nghỉ
        </label>

        {hasBreak && (
          <div className="form-grid two compact">
            <Field label="Nghỉ từ">
              <input
                type="time"
                value={breakStart}
                onChange={(e) => setBreakStart(e.target.value)}
              />
            </Field>
            <Field label="Đến">
              <input
                type="time"
                value={breakEnd}
                onChange={(e) => setBreakEnd(e.target.value)}
              />
            </Field>
          </div>
        )}
      </div>

      <div className={`preview-box ${conflicts.length ? 'warning' : ''}`}>
        <div>
          <CalendarRange size={20} />
          <span>
            <b>{preview.length} khung giờ</b>
            <small>Dự kiến sẽ được tạo</small>
          </span>
        </div>
        {conflicts.length > 0 && (
          <p>
            <AlertCircle size={16} /> Có {conflicts.length} khung giờ trùng hoặc chồng
            lấn với lịch hiện tại.
          </p>
        )}
      </div>

      <div className="overlay-actions">
        <DoctorButton variant="secondary" onClick={onClose}>
          Hủy
        </DoctorButton>
        <DoctorButton
          disabled={!valid}
          onClick={() => onCreate(preview)}
          icon={<Plus size={18} />}
        >
          Tạo {preview.length} khung giờ
        </DoctorButton>
      </div>
    </Overlay>
  );
}

export default function ScheduleView() {
  const { slots, appointments, deleteSlot, addSlots, toast } = useDoctorStore();
  const [mode, setMode] = useState<'day' | 'week'>('week');
  const [anchor, setAnchor] = useState(() => (typeof window === 'undefined' ? new Date('2026-11-09T00:00:00') : new Date()));
  const [creator, setCreator] = useState(false);

  const dates = Array.from({ length: mode === 'week' ? 7 : 1 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() - (mode === 'week' ? (d.getDay() + 6) % 7 : 0) + i);
    return d;
  });

  const move = (n: number) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + n * (mode === 'week' ? 7 : 1));
    setAnchor(d);
  };

  return (
    <div className="page-content">
      <div className="page-heading heading-actions">
        <div>
          <p className="eyebrow">LỊCH LÀM VIỆC</p>
          <h1>Khung giờ của tôi</h1>
          <p className="heading-sub">
            Tạo và quản lý thời gian bệnh nhân có thể đặt lịch.
          </p>
        </div>
        <DoctorButton
          icon={<Plus size={18} />}
          onClick={() => setCreator(true)}
        >
          Tạo khung giờ
        </DoctorButton>
      </div>

      <div className="card calendar-card">
        <div className="calendar-toolbar">
          <div className="segmented">
            <button
              type="button"
              className={mode === 'day' ? 'active' : ''}
              onClick={() => setMode('day')}
            >
              Ngày
            </button>
            <button
              type="button"
              className={mode === 'week' ? 'active' : ''}
              onClick={() => setMode('week')}
            >
              Tuần
            </button>
          </div>

          <div className="calendar-nav">
            <button type="button" onClick={() => move(-1)} aria-label="Trước">
              <ChevronLeft />
            </button>
            <strong>
              {mode === 'week'
                ? `${dateVN(dates[0].toISOString().slice(0, 10))} — ${dateVN(dates.at(-1)!.toISOString().slice(0, 10))}`
                : longDate(dates[0].toISOString().slice(0, 10))}
            </strong>
            <button type="button" onClick={() => move(1)} aria-label="Sau">
              <ChevronRight />
            </button>
          </div>

          <DoctorButton variant="ghost" onClick={() => setAnchor(new Date())}>
            Hôm nay
          </DoctorButton>
        </div>

        <div className={`calendar-grid ${mode}`}>
          {dates.map((d) => {
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const daySlots = slots.filter((s) => s.slot_date === iso);
            return (
              <div
                className={`calendar-day ${iso === todayISO() ? 'today' : ''}`}
                key={iso}
              >
                <header>
                  <span>
                    {new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(d)}
                  </span>
                  <b>{d.getDate()}</b>
                </header>
                <div className="slot-stack">
                  {daySlots.length ? (
                    daySlots.map((s) => {
                      const a = appointments.find((x) => x.slot_id === s.id);
                      const nowTimeString = typeof window === 'undefined' ? '00:00' : new Date().toTimeString().slice(0, 5);
                      const isPast =
                        `${s.slot_date}T${s.end_time}` < `${todayISO()}T${nowTimeString}`;
                      return (
                        <div
                          className={`slot-chip ${a ? `booked ${a.status}` : 'free'} ${isPast ? 'past' : ''}`}
                          key={s.id}
                        >
                          <span>
                            {s.start_time}–{s.end_time}
                          </span>
                          {a ? (
                            <LockKeyhole
                              size={13}
                              aria-label="Đã khóa vì có lịch hẹn"
                            />
                          ) : (
                            !isPast && (
                              <button
                                type="button"
                                aria-label="Xóa khung giờ"
                                onClick={() => deleteSlot(s.id)}
                              >
                                <X size={14} />
                              </button>
                            )
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <span className="no-slots">Chưa có khung giờ</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="calendar-legend">
          <span>
            <i className="free" />
            Trống
          </span>
          <span>
            <i className="booked" />
            Đã đặt
          </span>
          <span>
            <i className="past" />
            Đã qua
          </span>
          <span className="hint">
            <CircleHelp size={15} /> Khung giờ đã đặt không thể xóa
          </span>
        </div>
      </div>

      {creator && (
        <SlotCreator
          existing={slots}
          onClose={() => setCreator(false)}
          onCreate={(s) => {
            addSlots(s);
            setCreator(false);
            toast(`Đã tạo ${s.length} khung giờ mới`);
          }}
        />
      )}
    </div>
  );
}
