# ClinicCare / ClinicBooking Backend API

Backend REST API được xây dựng với **Express.js** và kết nối trực tiếp với cơ sở dữ liệu **Supabase PostgreSQL** theo cấu trúc `database_schema.sql`.

## 1. Cấu hình biến môi trường (`.env` hoặc `.env.local`)
Backend tự động tải cấu hình từ `.env` trong thư mục `backend/` hoặc `.env.local` ở thư mục gốc:

```env
NEXT_PUBLIC_SUPABASE_URL=https://bcvqtpyckdgeyazbuuio.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
DATABASE_URL=postgresql://postgres:...
PORT=5000
```

---

## 2. Cách khởi chạy Backend
```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt thư viện (nếu chưa cài)
npm install

# Khởi chạy server (chế độ dev tự reload khi sửa code)
npm run dev

# Hoặc chạy thông thường:
npm start
```
Server sẽ chạy tại: **`http://localhost:5000`**

---

## 3. Danh sách API CRUD cơ bản

### A. Kiểm tra kết nối
* `GET /api/health`: Kiểm tra trạng thái server và Supabase.

---

### B. Module Admin (`/api/admin/...`)

#### 1. Thống kê Dashboard (Figma 02 · Tổng quan):
* `GET /api/admin/stats`: Lấy 4 chỉ số KPI hôm nay (lịch hôm nay, chờ duyệt, đã xác nhận, hủy/vắng), danh sách chuyên khoa và lịch hẹn mới nhất.

#### 2. Quản lý Bác sĩ (CRUD Doctors):
* `GET /api/admin/doctors`: Lấy danh sách bác sĩ (kèm profile, chuyên khoa, số năm kinh nghiệm, phòng khám).
  * Hỗ trợ query params: `?specialty_id=1&is_active=true`
* `GET /api/admin/doctors/:id`: Xem chi tiết 1 bác sĩ.
* `POST /api/admin/doctors`: Tạo mới bác sĩ (tạo Profile + Doctor record).
  * Body: `{ full_name, email, phone, gender, specialty_id, room, consultation_fee, bio, years_experience }`
* `PUT /api/admin/doctors/:id`: Cập nhật thông tin bác sĩ (phòng, phí khám, chuyên khoa, trạng thái active/inactive).
* `DELETE /api/admin/doctors/:id`: Xóa hoặc ngừng hoạt động (`?permanent=true` để xóa vĩnh viễn).

#### 3. Quản lý Chuyên khoa (CRUD Specialties):
* `GET /api/admin/specialties`: Danh sách chuyên khoa.
* `POST /api/admin/specialties`: Thêm chuyên khoa `{ name, description }`.
* `PUT /api/admin/specialties/:id`: Sửa chuyên khoa `{ name, description }`.
* `DELETE /api/admin/specialties/:id`: Xóa chuyên khoa.

#### 4. Quản lý Lịch hẹn (CRUD Appointments):
* `GET /api/admin/appointments`: Lấy danh sách toàn bộ lịch hẹn.
  * Hỗ trợ query params: `?status=pending&doctor_id=...&date=YYYY-MM-DD`
* `POST /api/admin/appointments`: Đặt/tạo lịch hẹn mới `{ patient_id, doctor_id, slot_id, reason, status }`.
* `PUT /api/admin/appointments/:id/status`: Duyệt lịch, hủy lịch hoặc hoàn tất `{ status: 'confirmed'|'completed'|'cancelled'|'no_show', cancel_reason }`.
* `DELETE /api/admin/appointments/:id`: Hủy/xóa lịch hẹn.

#### 5. Quản lý Bệnh nhân (CRUD Patients):
* `GET /api/admin/patients`: Danh sách bệnh nhân (`?search=...`).
* `POST /api/admin/patients`: Thêm hồ sơ bệnh nhân mới `{ full_name, phone, email, gender, date_of_birth, address }`.
* `PUT /api/admin/patients/:id`: Sửa thông tin bệnh nhân.

#### 6. Quản lý Khung giờ (CRUD Time Slots):
* `GET /api/admin/slots`: Lấy danh sách khung giờ (`?doctor_id=...&date=YYYY-MM-DD`).
* `POST /api/admin/slots`: Mở khung giờ khám `{ doctor_id, slot_date, start_time, end_time }`.
* `DELETE /api/admin/slots/:id`: Xóa khung giờ trống.

---

### C. Module Doctor (`/api/doctor/...`)

#### 1. Tổng quan ngày làm việc:
* `GET /api/doctor/today-stats?doctor_id=...`: Lấy số liệu ca khám hôm nay, ca đang khám (`currentExamining`), yêu cầu chờ xác nhận.

#### 2. Quản lý Lịch hẹn Bác sĩ:
* `GET /api/doctor/appointments?doctor_id=...`: Danh sách lịch hẹn của bác sĩ (`?status=...&date=...`).
* `GET /api/doctor/appointments/:id`: Chi tiết lịch hẹn + bệnh nhân + kết quả.
* `PUT /api/doctor/appointments/:id/status`: Bác sĩ xác nhận (`confirmed`), bắt đầu khám, hoàn tất (`completed`), hoặc báo vắng (`no_show`).
* `PUT /api/doctor/appointments/:id/note`: Bác sĩ ghi chú khám bệnh, chẩn đoán, dặn dò `{ doctor_note: '...' }`.

#### 3. Lịch làm việc / Khung giờ Bác sĩ:
* `GET /api/doctor/slots?doctor_id=...`: Xem lịch khám của bác sĩ.
* `POST /api/doctor/slots`: Bác sĩ đăng ký thêm khung giờ khám `{ doctor_id, slot_date, start_time, end_time }`.
* `DELETE /api/doctor/slots/:id`: Bác sĩ xóa khung giờ chưa có người đặt.

#### 4. Danh sách Bệnh nhân của Bác sĩ:
* `GET /api/doctor/patients?doctor_id=...`: Danh sách bệnh nhân đã từng khám với bác sĩ.

#### 5. Hồ sơ Bác sĩ:
* `GET /api/doctor/profile?doctor_id=...`: Xem thông tin cá nhân.
* `PUT /api/doctor/profile/:id`: Cập nhật phòng khám, bio, giá khám, số điện thoại.
