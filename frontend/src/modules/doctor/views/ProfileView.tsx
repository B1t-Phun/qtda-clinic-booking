'use client';

import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  LockKeyhole,
  LogOut,
  Stethoscope,
} from 'lucide-react';
import {
  type Profile,
} from '../data';
import {
  Avatar,
  DoctorButton,
  Field,
  PasswordDialog,
} from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';
import { money } from '../utils';

export default function ProfileView() {
  const { profile, doctor, setProfile, logout, toast } = useDoctorStore();
  const [draft, setDraft] = useState(profile);
  const [password, setPassword] = useState(false);

  const save = () => {
    setProfile({ ...draft, updated_at: new Date().toISOString() });
  };

  const uploadAvatar = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({ ...prev, avatar_url: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="page-content">
      <div className="page-heading">
        <p className="eyebrow">TÀI KHOẢN</p>
        <h1>Hồ sơ và cài đặt</h1>
        <p className="heading-sub">Quản lý thông tin cá nhân và bảo mật tài khoản.</p>
      </div>

      <div className="profile-grid">
        <section className="card profile-section">
          <div className="profile-photo">
            <Avatar profile={draft} size="lg" />
            <div>
              <h3>{draft.full_name}</h3>
              <p>{draft.email}</p>
              <label className="avatar-upload">
                Thay ảnh đại diện
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadAvatar(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>

          <div className="form-grid two">
            <Field label="Họ và tên">
              <input
                value={draft.full_name}
                onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
              />
            </Field>
            <Field label="Số điện thoại">
              <input
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
            </Field>
            <Field label="Ngày sinh">
              <input
                type="date"
                value={draft.date_of_birth}
                onChange={(e) => setDraft({ ...draft, date_of_birth: e.target.value })}
              />
            </Field>
            <Field label="Giới tính">
              <select
                value={draft.gender}
                onChange={(e) =>
                  setDraft({ ...draft, gender: e.target.value as Profile['gender'] })
                }
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </Field>
            <Field label="Địa chỉ" wide>
              <input
                value={draft.address}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              />
            </Field>
          </div>

          <div className="section-actions">
            <DoctorButton onClick={save} icon={<Check size={18} />}>
              Lưu thay đổi
            </DoctorButton>
          </div>
        </section>

        <aside>
          <section className="card professional-card">
            <div className="card-title">
              <span>
                <Stethoscope />
              </span>
              <div>
                <h3>Thông tin chuyên môn</h3>
                <p>Liên hệ admin để thay đổi</p>
              </div>
            </div>
            <dl>
              <div>
                <dt>Chuyên khoa</dt>
                <dd>Tim mạch</dd>
              </div>
              <div>
                <dt>Phòng khám</dt>
                <dd>{doctor.room}</dd>
              </div>
              <div>
                <dt>Kinh nghiệm</dt>
                <dd>{doctor.years_experience} năm</dd>
              </div>
              <div>
                <dt>Phí tư vấn</dt>
                <dd>{money(doctor.consultation_fee)}</dd>
              </div>
              <div>
                <dt>Trạng thái</dt>
                <dd>
                  <span className="active-dot" />
                  Đang hoạt động
                </dd>
              </div>
              <div>
                <dt>Giới thiệu</dt>
                <dd>{doctor.bio}</dd>
              </div>
            </dl>
          </section>

          <section className="card settings-card">
            <button type="button" onClick={() => setPassword(true)}>
              <LockKeyhole />
              <span>
                <b>Đổi mật khẩu</b>
                <small>Cập nhật mật khẩu đăng nhập</small>
              </span>
              <ChevronRight />
            </button>
            <button type="button" className="logout" onClick={logout}>
              <LogOut />
              <span>
                <b>Đăng xuất</b>
                <small>Thoát khỏi tài khoản hiện tại</small>
              </span>
              <ChevronRight />
            </button>
          </section>
        </aside>
      </div>

      {password && (
        <PasswordDialog
          close={() => setPassword(false)}
          done={() => {
            setPassword(false);
            toast('Đã đổi mật khẩu thành công');
          }}
        />
      )}
    </div>
  );
}
