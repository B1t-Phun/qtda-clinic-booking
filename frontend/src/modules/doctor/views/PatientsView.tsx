'use client';

import React, { useState } from 'react';
import {
  Cake,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  Search,
  UserRound,
} from 'lucide-react';
import {
  type Appointment,
  type Profile,
  type TimeSlot,
} from '../data';
import {
  Avatar,
  StatusBadge,
  Overlay,
  Info,
} from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { dateVN, ageOf, genderLabel } from '../utils';

function PatientDetail({
  patient,
  appointments,
  slots,
  close,
  openAppointment,
}: {
  patient: Profile;
  appointments: Appointment[];
  slots: TimeSlot[];
  close: () => void;
  openAppointment: (a: Appointment) => void;
}) {
  const ordered = [...appointments].sort((a, b) => {
    const sa = slots.find((s) => s.id === a.slot_id);
    const sb = slots.find((s) => s.id === b.slot_id);
    if (!sa || !sb) return 0;
    return sb.slot_date.localeCompare(sa.slot_date);
  });

  return (
    <Overlay title="Thông tin bệnh nhân" onClose={close}>
      <div className="patient-hero">
        <Avatar profile={patient} size="lg" />
        <div>
          <h2>{patient.full_name}</h2>
          <p>
            {ageOf(patient.date_of_birth)} tuổi · {genderLabel[patient.gender]}
          </p>
        </div>
      </div>

      <div className="info-grid">
        <Info
          icon={<Cake />}
          label="Ngày sinh"
          value={`${dateVN(patient.date_of_birth)} (${ageOf(patient.date_of_birth)} tuổi)`}
        />
        <Info
          icon={<UserRound />}
          label="Giới tính"
          value={genderLabel[patient.gender]}
        />
        <Info icon={<Phone />} label="Điện thoại" value={patient.phone} />
        <Info icon={<Mail />} label="Email" value={patient.email} />
        <Info icon={<MapPin />} label="Địa chỉ" value={patient.address} wide />
      </div>

      <div className="form-section visit-history">
        <h3>
          Lịch sử khám với bạn <span>{ordered.length}</span>
        </h3>
        {ordered.map((a) => {
          const s = slots.find((x) => x.id === a.slot_id);
          if (!s) return null;
          return (
            <button
              type="button"
              key={a.id}
              onClick={() => openAppointment(a)}
            >
              <div className="visit-date">
                <b>{dateVN(s.slot_date)}</b>
                <span>
                  {s.start_time}–{s.end_time}
                </span>
              </div>
              <div>
                <strong>{a.reason}</strong>
                {a.doctor_note && <small>{a.doctor_note}</small>}
              </div>
              <StatusBadge status={a.status} />
            </button>
          );
        })}
      </div>
    </Overlay>
  );
}

export default function PatientsView() {
  const { appointments, slots, patients, setSelectedAppointment } = useDoctorStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);

  const rows = patients
    .map((p) => {
      const apps = appointments.filter((a) => a.patient_id === p.id);
      const past = apps
        .filter((a) => a.status === 'completed')
        .sort((a, b) => {
          const sa = slots.find((s) => s.id === a.slot_id);
          const sb = slots.find((s) => s.id === b.slot_id);
          if (!sa || !sb) return 0;
          return sb.slot_date.localeCompare(sa.slot_date);
        });
      const lastSlot = past[0] ? slots.find((s) => s.id === past[0].slot_id) : null;
      return {
        p,
        apps,
        visits: past.length,
        last: lastSlot ? lastSlot.slot_date : null,
      };
    })
    .filter(
      (x) =>
        x.apps.length > 0 &&
        `${x.p.full_name} ${x.p.phone}`.toLowerCase().includes(query.toLowerCase())
    );

  return (
    <div className="page-content">
      <div className="page-heading">
        <p className="eyebrow">DANH SÁCH CỦA TÔI</p>
        <h1>Bệnh nhân</h1>
        <p className="heading-sub">Chỉ hiển thị bệnh nhân đã có lịch hẹn với bạn.</p>
      </div>

      <div className="card patient-card">
        <label className="search-field patient-search">
          <Search size={19} />
          <input
            placeholder="Tìm bệnh nhân..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="patient-table-header">
          <span>Bệnh nhân</span>
          <span>Giới tính · Tuổi</span>
          <span>Lượt khám</span>
          <span>Lần gần nhất</span>
          <span />
        </div>

        {rows.map(({ p, visits, last }) => (
          <button
            type="button"
            className="patient-row"
            key={p.id}
            onClick={() => setSelected(p)}
          >
            <div>
              <Avatar profile={p} />
              <span>
                <strong>{p.full_name}</strong>
                <small>{p.phone}</small>
              </span>
            </div>
            <span>
              {genderLabel[p.gender]} · {ageOf(p.date_of_birth)} tuổi
            </span>
            <b>{visits}</b>
            <span>{last ? dateVN(last) : 'Chưa khám'}</span>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>

      {selected && (
        <PatientDetail
          patient={selected}
          appointments={appointments.filter((a) => a.patient_id === selected.id)}
          slots={slots}
          close={() => setSelected(null)}
          openAppointment={(a) => {
            setSelected(null);
            setSelectedAppointment(a);
          }}
        />
      )}
    </div>
  );
}
