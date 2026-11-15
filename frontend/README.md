# ClinicCare frontend

Frontend dùng Next.js và đọc cấu hình từ `.env.local` ở thư mục gốc qua `next.config.ts`.
Xem [hướng dẫn thiết lập chung](../README.md) và [mẫu biến môi trường](../.env.example).

Từ thư mục gốc, sao chép `.env.example` thành `.env.local` rồi điền thông tin project.
Không tạo `frontend/.env.local`; frontend chỉ nạp các biến cần cho giao diện và `APP_URL`.
Service role, management token và các secret quản trị dùng ở backend/script Supabase.

Chạy tại thư mục `frontend/`:

```powershell
npm ci
npm run dev
```

Mở http://cliniccare.localhost:3000/login để dùng hCaptcha. Địa chỉ phải khớp APP_URL ở env gốc.
Sau khi sửa env, khởi động lại server.
Với production, chạy `npm run build` rồi `npm start`; các biến `NEXT_PUBLIC_*`
được đóng vào bản build nên phải build lại khi thay đổi.
