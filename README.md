# ClinicCare / qtda-clinic-booking

Ứng dụng đặt lịch khám dùng Next.js, Express và Supabase.
Auth và dữ liệu dùng Supabase SDK/API; bảng và RLS cấu hình trong Supabase Dashboard → SQL Editor.

- [Cấu hình Supabase Auth, ba vai trò và bảo mật](docs/SUPABASE_AUTH_SETUP.md)
- [Migration auth cho project hiện tại](docs/auth_security.sql)
- [Mẫu email xác thực](docs/supabase-email-templates/)
- [Backend API](backend/README.md)

Thiết lập frontend/.env.local theo frontend/.env.example, áp dụng migration auth,
cấu hình email/URL trong Supabase Dashboard rồi chạy npm ci và npm run dev
trong frontend/. Backend chạy riêng theo backend/README.md.

Truy cập `/` chuyển thẳng đến đăng nhập hoặc cổng đúng vai trò, không chọn quyền.
Ghi nhớ 7 ngày chỉ dành cho bệnh nhân/bác sĩ; admin phải đăng nhập lại khi quay về `/`.

Đăng nhập /login; đăng ký bệnh nhân /register; bảo mật và MFA /account/security.
Vai trò được kiểm tra phía server: admin → /admin, doctor → /doctor, patient → /client.

Cấu hình Auth: sao chép supabase/.env.example thành supabase/.env.local và điền các thông tin dịch vụ đang dùng.
Chạy npm run supabase:configure để kiểm tra đầu vào; chạy npm run supabase:configure -- --apply để áp dụng và xác minh trên Supabase.
Thiết lập Email, mẫu email, TOTP, URL và giới hạn nằm tại supabase/auth.config.json; các nhóm chưa có secret giữ cấu hình hiện tại.
