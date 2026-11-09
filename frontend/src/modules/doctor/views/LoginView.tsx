'use client';

import React, { useState } from 'react';
import {
  BadgeCheck,
  ChevronLeft,
  Eye,
  EyeOff,
  HeartPulse,
  Mail,
} from 'lucide-react';
import { DoctorButton, Field } from '../components/DoctorUI';
import { useDoctorStore } from '../store/store';

export default function LoginView() {
  const { setLoggedIn } = useDoctorStore();
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);
  const [show, setShow] = useState(false);

  return (
    <div className="login-page">
      <section className="login-aside">
        <div className="brand light">
          <div>
            <HeartPulse />
          </div>
          <span>
            Clinic<strong>Booking</strong>
          </span>
        </div>
        <div>
          <span className="secure-pill">
            <BadgeCheck /> Cổng thông tin bảo mật
          </span>
          <h1>
            Nhịp làm việc
            <br />
            nhẹ nhàng hơn.
          </h1>
          <p>
            Mọi lịch hẹn, khung giờ và thông tin bệnh nhân cần thiết — trong một không gian tập
            trung.
          </p>
          <div className="quote">
            <p>“Dành nhiều thời gian hơn cho người bệnh, ít thời gian hơn cho việc quản lý.”</p>
          </div>
        </div>
        <small>© 2025 ClinicBooking · Bảo mật và riêng tư</small>
      </section>

      <main className="login-main">
        <div className="login-box">
          {forgot ? (
            <>
              {sent ? (
                <div className="sent-state">
                  <div>
                    <Mail />
                  </div>
                  <h2>Kiểm tra email của bạn</h2>
                  <p>Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email của bạn.</p>
                  <DoctorButton
                    onClick={() => {
                      setForgot(false);
                      setSent(false);
                    }}
                  >
                    Quay lại đăng nhập
                  </DoctorButton>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="back-link"
                    onClick={() => setForgot(false)}
                  >
                    <ChevronLeft /> Quay lại đăng nhập
                  </button>
                  <p className="eyebrow">KHÔI PHỤC TÀI KHOẢN</p>
                  <h2>Quên mật khẩu?</h2>
                  <p>Nhập email đã đăng ký, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSent(true);
                    }}
                  >
                    <Field label="Email">
                      <input
                        type="email"
                        defaultValue="quan.tran@clinicbooking.vn"
                        required
                      />
                    </Field>
                    <DoctorButton type="submit">Gửi hướng dẫn</DoctorButton>
                  </form>
                </>
              )}
            </>
          ) : (
            <>
              <div className="login-mobile-brand">
                <HeartPulse />
                <b>ClinicBooking</b>
              </div>
              <p className="eyebrow">CỔNG DÀNH CHO BÁC SĨ</p>
              <h2>Chào mừng trở lại</h2>
              <p>Đăng nhập để tiếp tục ngày làm việc của bạn.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setLoggedIn(true);
                }}
              >
                <Field label="Email">
                  <input
                    type="email"
                    defaultValue="quan.tran@clinicbooking.vn"
                    required
                  />
                </Field>
                <Field label="Mật khẩu">
                  <div className="password-input">
                    <input
                      type={show ? 'text' : 'password'}
                      defaultValue="password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-label="Hiện mật khẩu"
                    >
                      {show ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </Field>
                <div className="login-meta">
                  <label>
                    <input type="checkbox" defaultChecked /> Ghi nhớ đăng nhập
                  </label>
                  <button type="button" onClick={() => setForgot(true)}>
                    Quên mật khẩu?
                  </button>
                </div>
                <DoctorButton type="submit">Đăng nhập</DoctorButton>
              </form>
              <p className="support">
                Cần hỗ trợ? Liên hệ <b>admin@clinicbooking.vn</b>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
