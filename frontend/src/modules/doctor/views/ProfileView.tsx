'use client';

import { useState } from 'react';
import { Save, Stethoscope } from 'lucide-react';
import type { ProfessionalInput } from '../data';
import { DoctorButton, Field } from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { dateTimeVN } from '../utils';
import { PersonalProfilePanel } from '@/components/profile/PersonalProfile';

export default function ProfileView() {
  const store = useDoctorStore();
  const [professional, setProfessional] = useState<ProfessionalInput>(() => ({
    bio: store.doctor.bio, room: store.doctor.room, consultation_fee: store.doctor.consultation_fee,
  }));
  const [error, setError] = useState('');
  const changed = professional.bio !== store.doctor.bio || professional.room !== store.doctor.room || professional.consultation_fee !== store.doctor.consultation_fee;
  const busy = !!store.pending;
  return <div className="page-content">
    <PersonalProfilePanel initialProfile={store.profile} onSaved={store.syncProfile} />
    <section className="card" aria-labelledby="professional-heading">
      <div className="section-heading"><div><h2 id="professional-heading"><Stethoscope size={19} className="inline-block mr-2" />Thông tin chuyên môn</h2>
        <p className="help">Chuyên khoa, số năm kinh nghiệm và trạng thái hoạt động được quản trị viên xác nhận.</p></div></div>
      <div className="profile-grid">
        <dl className="professional-info">
          <div><dt>Chuyên khoa</dt><dd>{store.specialty?.name || 'Chưa cập nhật'}</dd></div>
          <div><dt>Kinh nghiệm</dt><dd>{store.doctor.years_experience == null ? 'Chưa cập nhật' : store.doctor.years_experience + ' năm'}</dd></div>
          <div><dt>Trạng thái</dt><dd>{store.doctor.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}</dd></div>
          <div><dt>Ngày tạo hồ sơ</dt><dd>{dateTimeVN(store.doctor.created_at)}</dd></div>
          <div><dt>Mã bác sĩ</dt><dd className="break-all text-xs">{store.doctor.id}</dd></div>
        </dl>
        <form onSubmit={async event => {
          event.preventDefault(); setError('');
          if (professional.consultation_fee !== null && (!Number.isSafeInteger(professional.consultation_fee) || professional.consultation_fee < 0)) {
            setError('Giá khám cần là số nguyên không âm.'); return;
          }
          const next = { ...professional, bio: professional.bio.trim(), room: professional.room.trim() };
          if (await store.saveProfessional(next)) setProfessional(next);
        }}>
          <fieldset disabled={busy} className="form-stack">
            <div className="form-grid two"><Field label="Phòng khám"><input maxLength={100} value={professional.room} placeholder="Ví dụ: P.203"
              onChange={event => setProfessional({ ...professional, room: event.target.value })} /></Field>
              <Field label="Giá khám (VND)"><input type="number" min={0} max={999999999999} step={1} value={professional.consultation_fee ?? ''}
                onChange={event => setProfessional({ ...professional, consultation_fee: event.target.value === '' ? null : Number(event.target.value) })} /></Field></div>
            <Field label="Giới thiệu bác sĩ"><textarea rows={5} maxLength={4000} value={professional.bio} placeholder="Giới thiệu chuyên môn, lĩnh vực thăm khám và kinh nghiệm…"
              onChange={event => setProfessional({ ...professional, bio: event.target.value })} /></Field>
            <span className="muted">{professional.bio.length}/4000 ký tự</span>
            {error && <p role="alert" className="notice error">{error}</p>}
            <div className="section-actions"><DoctorButton variant="secondary" disabled={!changed} onClick={() => setProfessional({
              bio: store.doctor.bio, room: store.doctor.room, consultation_fee: store.doctor.consultation_fee,
            })}>Bỏ thay đổi</DoctorButton>
              <DoctorButton type="submit" disabled={!changed} icon={<Save size={16} />}>{store.pending === 'professional' ? 'Đang lưu…' : 'Lưu thông tin chuyên môn'}</DoctorButton></div>
          </fieldset>
        </form>
      </div>
    </section>
  </div>;
}
