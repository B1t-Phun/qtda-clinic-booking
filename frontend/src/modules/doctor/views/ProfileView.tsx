'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import type { ProfessionalInput, Profile, ProfileInput } from '../data';
import { Avatar, DoctorButton, Field, PageHeading } from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { clinicDate } from '../workflow';
import { money } from '../utils';

function profileInput(profile: Profile): ProfileInput {
  return { full_name: profile.full_name, phone: profile.phone, date_of_birth: profile.date_of_birth,
    gender: profile.gender, address: profile.address, avatar_url: profile.avatar_url };
}
export default function ProfileView() {
  const store = useDoctorStore();
  const [draft, setDraft] = useState(() => profileInput(store.profile));
  const [professional, setProfessional] = useState<ProfessionalInput>(() => ({
    bio: store.doctor.bio, room: store.doctor.room, consultation_fee: store.doctor.consultation_fee,
  }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(profileInput(store.profile));
  const professionalDirty = professional.bio !== store.doctor.bio || professional.room !== store.doctor.room || professional.consultation_fee !== store.doctor.consultation_fee;
  const busy = !!store.pending;
  return <div className="page-content">
    <PageHeading title="Hồ sơ bác sĩ" description="Cập nhật thông tin liên hệ và thông tin khám bệnh của chính bạn." />
    <div className="profile-grid">
      <section className="card"><div className="profile-heading"><Avatar profile={store.profile} size="lg" /><div><h2>{store.profile.full_name}</h2><p>{store.profile.email}</p><small>{store.specialty?.name || 'Chưa có chuyên khoa'}</small></div></div>
        <form onSubmit={async event => { event.preventDefault(); const values = { ...draft, full_name: draft.full_name.trim(), phone: draft.phone.trim(), address: draft.address.trim(), avatar_url: draft.avatar_url.trim() };
          if (await store.saveProfile(values)) setDraft(values); }}>
          <fieldset disabled={busy} className="form-stack"><div className="form-grid two">
            <Field label="Họ và tên"><input autoComplete="name" required minLength={2} maxLength={100} value={draft.full_name} onChange={event => setDraft({ ...draft, full_name: event.target.value })} /></Field>
            <Field label="Số điện thoại"><input type="tel" autoComplete="tel" inputMode="tel" pattern="0[0-9]{9}" maxLength={10} value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} /></Field>
            <Field label="Ngày sinh"><input type="date" min="1900-01-01" max={clinicDate(store.now)} value={draft.date_of_birth} onChange={event => setDraft({ ...draft, date_of_birth: event.target.value })} /></Field>
            <Field label="Giới tính"><select value={draft.gender} onChange={event => setDraft({ ...draft, gender: event.target.value as Profile['gender'] })}><option value="">Chưa cập nhật</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></Field>
            <Field label="Địa chỉ" wide><input autoComplete="street-address" maxLength={500} value={draft.address} onChange={event => setDraft({ ...draft, address: event.target.value })} /></Field>
            <Field label="Ảnh đại diện (liên kết HTTPS)" wide><input type="url" placeholder="https://…" maxLength={2048} pattern="https://.*" value={draft.avatar_url} onChange={event => setDraft({ ...draft, avatar_url: event.target.value })} /></Field>
          </div><p className="help">Email đăng nhập được quản lý tại trang Bảo mật tài khoản.</p>
            <div className="section-actions"><span className="muted">{dirty ? 'Có thay đổi chưa lưu' : 'Hồ sơ đã đồng bộ'}</span>
              <DoctorButton variant="secondary" disabled={!dirty} onClick={() => setDraft(profileInput(store.profile))}>Bỏ thay đổi</DoctorButton>
              <DoctorButton type="submit" disabled={!dirty} icon={<Save size={16} />}>{store.pending === 'profile' ? 'Đang lưu…' : 'Lưu hồ sơ'}</DoctorButton></div>
          </fieldset>
        </form>
      </section>
      <aside className="form-stack"><section className="card">
        <h2>Thông tin chuyên môn</h2>
        <dl className="professional-info"><div><dt>Chuyên khoa</dt><dd>{store.specialty?.name || 'Chưa cập nhật'}</dd></div>
          <div><dt>Kinh nghiệm</dt><dd>{store.doctor.years_experience == null ? 'Chưa cập nhật' : store.doctor.years_experience + ' năm'}</dd></div>
          <div><dt>Giá khám hiện tại</dt><dd>{money(store.doctor.consultation_fee)}</dd></div></dl>
        <p className="help">Chuyên khoa, kinh nghiệm và trạng thái hoạt động do quản trị viên quản lý.</p>
        <form onSubmit={async event => { event.preventDefault(); const values = { ...professional, bio: professional.bio.trim(), room: professional.room.trim() };
          if (await store.saveProfessional(values)) setProfessional(values); }}>
          <fieldset disabled={busy} className="form-stack">
            <Field label="Phòng khám"><input maxLength={100} value={professional.room} onChange={event => setProfessional({ ...professional, room: event.target.value })} /></Field>
            <Field label="Giá khám (VND)"><input type="number" min={0} max={999999999999} step={1} value={professional.consultation_fee ?? ''} onChange={event => setProfessional({ ...professional, consultation_fee: event.target.value === '' ? null : Number(event.target.value) })} /></Field>
            <Field label="Giới thiệu bác sĩ"><textarea rows={5} maxLength={4000} value={professional.bio} onChange={event => setProfessional({ ...professional, bio: event.target.value })} /></Field>
            <DoctorButton type="submit" disabled={!professionalDirty}>{store.pending === 'professional' ? 'Đang lưu…' : 'Lưu thông tin chuyên môn'}</DoctorButton>
          </fieldset>
        </form>
      </section>
        <section className="card security-card"><ShieldCheck size={25} /><h2>Bảo mật tài khoản</h2><p>Đổi mật khẩu, email và quản lý xác thực hai bước.</p>
          <Link href="/account/security" className="btn btn-secondary">Mở cài đặt bảo mật</Link></section>
      </aside>
    </div>
  </div>;
}
