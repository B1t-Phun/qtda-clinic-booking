# ClinicCare / qtda-clinic-booking

Ứng dụng đặt lịch khám dùng Next.js, Express và Supabase.
Auth và dữ liệu dùng Supabase SDK/API; bảng và RLS cấu hình trong Supabase Dashboard → SQL Editor.

- [Cấu hình Supabase Auth, ba vai trò và bảo mật](docs/SUPABASE_AUTH_SETUP.md)
- [Migration auth cho project hiện tại](docs/auth_security.sql)
- [Mẫu email xác thực](docs/supabase-email-templates/)
- [Backend API](backend/README.md)

## Cấu hình trên máy mới

Dự án dùng duy nhất `.env.local` ở thư mục gốc cho frontend, backend và các script Supabase.
Sao chép mẫu tại thư mục gốc bằng PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Điền Supabase URL và publishable key của project đang dùng; nếu chạy API Express thì điền thêm
`SUPABASE_SERVICE_ROLE_KEY`. Với project đã bật CAPTCHA, điền `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`
khớp site hCaptcha đã cấu hình trong Supabase.
`.env.example` chỉ là mẫu; ứng dụng không đọc trực tiếp file này.

`SUPABASE_ACCESS_TOKEN`, secret hCaptcha và OAuth chỉ cần khi quản trị cấu hình Supabase bằng script.
Dùng lại cùng project thì không cần chạy lại cấu hình Supabase trên từng máy.
Giữ `.env.local` ngoài Git vì có secret; chỉ đưa `.env.example` lên GitHub.
Không tạo thêm env trong `frontend/`, `backend/` hoặc `supabase/`.
Biến môi trường của terminal/hosting được ưu tiên hơn file.

Áp dụng migration auth và cấu hình email/URL theo tài liệu Supabase Auth. Khởi chạy:

```powershell
npm --prefix frontend ci
npm --prefix frontend run dev
```

Mở http://cliniccare.localhost:3000/login (trình duyệt Chrome/Edge ánh xạ tên miền .localhost về máy này).
hCaptcha không hỗ trợ ổn định localhost/127.0.0.1; dùng đúng hostname khớp APP_URL.
Supabase cần cho phép /auth/callback, /auth/confirm và /reset-password trên origin này.
Backend chạy riêng theo backend/README.md.
Sau khi sửa `.env.local`, khởi động lại dịch vụ; nếu dùng bản production thì build lại frontend.

Truy cập `/` chuyển thẳng đến đăng nhập hoặc cổng đúng vai trò, không chọn quyền.
Ghi nhớ 7 ngày chỉ dành cho bệnh nhân/bác sĩ; admin phải đăng nhập lại khi quay về `/`.

Đăng nhập /login; đăng ký bệnh nhân /register; bảo mật và MFA /account/security.
Vai trò được kiểm tra phía server: admin → /admin, doctor → /doctor, patient → /client.

## Quản trị cấu hình Supabase

Điền các biến quản trị cần dùng trong cùng `.env.local` ở gốc.
Chạy `npm run supabase:configure` để xem trước; `npm run supabase:configure -- --apply` để áp dụng
và xác minh trên Supabase. Chỉ dùng `--apply` khi chủ động thay đổi cấu hình project.
Thiết lập Email, mẫu email, TOTP, URL và giới hạn nằm tại supabase/auth.config.json;
các nhóm chưa có secret giữ cấu hình hiện tại.

Kiểm tra cấu hình bằng `npm run test:config`; kiểm tra project từ xa bằng `npm run audit:supabase`.

Hồ sơ bác sĩ/bệnh nhân, tải ảnh và kiểm thử: [PROFILE_SETUP.md](docs/PROFILE_SETUP.md).
