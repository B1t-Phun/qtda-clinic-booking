'use client';

import { useState } from 'react';
import { Save, Stethoscope } from 'lucide-react';
import { PersonalProfilePanel } from '@/components/profile/PersonalProfile';
import styles from '@/components/profile/Profile.module.css';
import { useDoctorStore } from '../store/store';
import type { ProfessionalInput } from '../data';
import { dateTimeVN } from '../utils';

export default function ProfileView() {
  const store = useDoctorStore();
  const [draft, setDraft] = useState<ProfessionalInput>(() => ({ bio: store.doctor.bio, room: store.doctor.room, consultation_fee: store.doctor.consultation_fee }));
  const [error, setError] = useState('');
  const changed = draft.bio !== store.doctor.bio || draft.room !== store.doctor.room || draft.consultation_fee !== store.doctor.consultation_fee;
  return <div className={styles.root} data-role="doctor">
    <PersonalProfilePanel initialProfile={store.profile} onSaved={store.syncProfile}
      statistics={[
        { kind: 'all', label: 'Tổng lịch khám', value: store.appointments.length, href: '/doctor/appointments' },
        { kind: 'completed', label: 'Đã hoàn thành', value: store.appointments.filter(appointment => appointment.status === 'completed').length, href: '/doctor/appointments?tab=completed' },
        { kind: 'cancelled', label: 'Đã hủy', value: store.appointments.filter(appointment => appointment.status === 'cancelled').length, href: '/doctor/appointments?tab=cancelled' },
        { kind: 'pending', label: 'Chờ xác nhận', value: store.appointments.filter(appointment => appointment.status === 'pending').length, href: '/doctor/appointments?tab=pending' },
      ]}
    />
    <section className={styles.professional} aria-labelledby="doctor-professional">
      <header><Stethoscope size={22} /><div><h2 id="doctor-professional">Thông tin chuyên môn</h2><p>Chuyên khoa, kinh nghiệm và trạng thái hoạt động do quản trị viên xác nhận.</p></div></header>
      <div className={styles.professionalGrid}>
        <dl className={styles.dataGrid}><div><dt>Chuyên khoa</dt><dd>{store.specialty?.name || 'Chưa cập nhật'}</dd></div>
          <div><dt>Kinh nghiệm</dt><dd>{store.doctor.years_experience == null ? 'Chưa cập nhật' : store.doctor.years_experience + ' năm'}</dd></div>
          <div><dt>Trạng thái</dt><dd>{store.doctor.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}</dd></div>
          <div><dt>Ngày tạo hồ sơ bác sĩ</dt><dd>{dateTimeVN(store.doctor.created_at)}</dd></div>
          <div><dt>Mã bác sĩ</dt><dd className={styles.identifier}>{store.doctor.id}</dd></div>
          <div><dt>Mã chuyên khoa</dt><dd>{store.doctor.specialty_id}</dd></div></dl>
        <form onSubmit={async event => {
          event.preventDefault(); setError('');
          if (draft.consultation_fee !== null && (!Number.isSafeInteger(draft.consultation_fee) || draft.consultation_fee < 0)) { setError('Giá khám phải là số nguyên không âm.'); return; }
          const next = { ...draft, bio: draft.bio.trim(), room: draft.room.trim() };
          if (await store.saveProfessional(next)) setDraft(next);
        }}>
          <fieldset className={styles.formGrid} disabled={!!store.pending}>
            <div className={styles.field}><label htmlFor="professional-room">Phòng khám</label><input id="professional-room" maxLength={100} value={draft.room}
              onChange={event => setDraft({ ...draft, room: event.target.value })} /></div>
            <div className={styles.field}><label htmlFor="professional-fee">Giá khám (VND)</label><input id="professional-fee" type="number" min={0} max={999999999999} step={1}
              value={draft.consultation_fee ?? ''} onChange={event => setDraft({ ...draft, consultation_fee: event.target.value === '' ? null : Number(event.target.value) })} /></div>
            <div className={styles.field + ' ' + styles.wide}><label htmlFor="professional-bio">Giới thiệu bác sĩ</label><textarea id="professional-bio" rows={5} maxLength={4000}
              value={draft.bio} onChange={event => setDraft({ ...draft, bio: event.target.value })} /><small>{draft.bio.length}/4000 ký tự</small></div>
            {error && <p role="alert" className={styles.error + ' ' + styles.wide}>{error}</p>}
            <div className={styles.saveBar}><span>{changed ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ'}</span><div>
              <button className={styles.secondary} type="button" disabled={!changed} onClick={() => setDraft({ bio: store.doctor.bio, room: store.doctor.room, consultation_fee: store.doctor.consultation_fee })}>Bỏ thay đổi</button>
              <button className={styles.primary} type="submit" disabled={!changed}><Save size={16} />{store.pending === 'professional' ? 'Đang lưu…' : 'Lưu chuyên môn'}</button></div></div>
          </fieldset>
        </form>
      </div>
    </section>
  </div>;
}
