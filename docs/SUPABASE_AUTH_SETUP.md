# Cấu hình Supabase Auth cho ClinicCare

## Hiện trạng đã kiểm tra

Dự án dùng Next.js 16.4.5, React 19, Express 4 và Supabase.
Xác thực dùng Supabase Auth; dữ liệu và phân quyền dùng Supabase SDK/API qua HTTPS.
Ứng dụng chỉ cần Supabase URL và API key, không cần cấu hình kết nối database trực tiếp.
Ba vai trò trong schema hiện tại được giữ nguyên:

| Vai trò trong profiles.role | Trang sau đăng nhập | Quyền API Express |
|---|---|---|
| admin | /admin | /api/admin |
| doctor | /doctor | /api/doctor, dữ liệu của bác sĩ đang hoạt động |
| patient | /client | /api/patient/appointments, dữ liệu của chính bệnh nhân |

Ngày 12/11/2026 đã đọc /auth/v1/settings của project trong biến môi trường:
Email bật, đăng ký bật, xác nhận email bắt buộc. Kiểm tra mới nhất qua API settings cho thấy Google và Facebook đang bật; giao diện tự lấy trạng thái nhà cung cấp từ Supabase.
Endpoint công khai này không cho biết đầy đủ SMTP, CAPTCHA, MFA, gói dịch vụ,
Rate Limits hoặc RLS đang triển khai. Chưa thay đổi cấu hình project hoặc dữ liệu từ xa.

## Luồng truy cập và ghi nhớ đăng nhập

- Truy cập `/` khi chưa đăng nhập chuyển thẳng tới `/login`; không còn màn hình chọn cổng.
- Bệnh nhân vào `/client`, bác sĩ vào `/doctor`, quản trị viên vào `/admin` theo `profiles.role` do server đọc từ database.
- Đăng ký mới bằng email hoặc OAuth luôn là bệnh nhân; admin cấp quyền bác sĩ tại `/admin/accounts`.
- Tích ghi nhớ: bệnh nhân/bác sĩ giữ cookie trong 7 ngày. Không tích: cookie chỉ tồn tại trong phiên trình duyệt.
- Admin không được ghi nhớ dù có tích checkbox; truy cập lại `/` hoặc `/login` phải đăng nhập lại bằng mật khẩu.
- Điều hướng/reload trong cổng admin của phiên đang đăng nhập vẫn hoạt động. Cookie xác nhận admin chỉ tồn tại trong phiên trình duyệt và gắn với `session_id` đã được SDK xác minh.
- Cookie admin cũ thiếu xác nhận phiên, hoặc tài khoản vừa được nâng từ bệnh nhân lên admin, đều cần đăng nhập lại. OAuth/magic link không thay thế bước đăng nhập mật khẩu cho admin.
- Nếu tài khoản bật MFA, phải hoàn tất MFA trước khi vào cổng; cookie ghi nhớ chỉ được ghi lâu dài sau khi hoàn tất xác thực và kiểm tra vai trò.
- Gõ trực tiếp URL của vai trò khác bị chuyển về đúng cổng; gateway còn kiểm tra từng thao tác dữ liệu trước RLS. Đổi quyền/khóa bác sĩ được kiểm tra lại khi điều hướng, mở tab và mỗi 60 giây; API kiểm tra trên từng request.

## 1. Biến môi trường

Dùng project Supabase hiện có. Xem frontend/.env.example.
Trong frontend/.env.local:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-existing-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
APP_URL=http://localhost:3000
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=
NEXT_PUBLIC_AUTH_MANUAL_LINKING=false
```

APP_URL là origin tin cậy cho CSRF và callback. Khi triển khai phải thay bằng
origin HTTPS thực tế. Không có dấu / cuối hoặc đường dẫn con.

Auth của Next.js chỉ dùng publishable key và session người dùng.
SUPABASE_SERVICE_ROLE_KEY chỉ cần cho API quản trị Express tại backend/.env
(hoặc cấu hình server tương ứng); không đặt NEXT_PUBLIC_ trước secret.
Không đưa service key vào component, API response hoặc trình duyệt.

## 2. Áp dụng chính sách database

Trong Supabase Dashboard → SQL Editor của project hiện tại, chạy **docs/auth_security.sql**.
Đây là cấu hình bảng, trigger, RLS và RPC ngay trong Supabase; ứng dụng tiếp tục gọi qua Supabase SDK/API.
Không cần cài hoặc vận hành database riêng.
Nếu project chưa có các bảng của ứng dụng, chạy docs/database_schema.sql trước;
không chạy lại schema nền chỉ để triển khai auth vào một database đã có dữ liệu.

Migration auth không tạo database mới, không xóa bảng hay hồ sơ.
Migration bổ sung trigger, quyền cột, policy MFA và RPC đổi vai trò;
bổ sung profile patient cho auth.users đang thiếu profile, không sửa vai trò đã có.
Kiểm tra tương thích với policy tùy chỉnh nếu database thực tế khác schema trong repo.
Bản migration chưa được thực thi trên project từ xa trong lần triển khai mã nguồn này.

Các điểm được bảo vệ:

- Đăng ký email/OAuth chỉ tạo vai trò patient, bỏ qua role trong user_metadata; migration đặt lại default và cài trigger tạo profile.
- RLS lịch hẹn kiểm tra cả vai trò patient và chủ sở hữu; tài khoản bác sĩ không được dùng quyền bệnh nhân chỉ vì có cùng patient_id.
- Không được tự sửa id/email/role trong profiles; email đồng bộ từ Supabase Auth.
- Đổi quyền đi qua RPC admin_set_user_role, kiểm tra admin trong SQL và HTTP.
- Không cho admin tự đổi quyền; không đổi vai trò của tài khoản có lịch hẹn liên quan.
- Cấp quyền doctor cần chuyên khoa/phòng/phí khám; tạo hoặc kích hoạt liên kết doctors.
- Bác sĩ không hoạt động không được vào cổng; không tin doctor_id/patient_id từ client.
- RLS và trigger chặn thay đổi chủ sở hữu lịch hẹn; bệnh nhân chỉ được hủy lịch của mình.
- Khi tài khoản đã có MFA verified, dữ liệu yêu cầu AAL2, kể cả gọi PostgREST trực tiếp.

Tài khoản admin đầu tiên: đăng ký/xác nhận email bình thường, sau đó quản trị project
cập nhật đúng profile trong SQL Editor. Không lấy vai trò từ metadata hoặc public API.
Ví dụ dùng UUID đã kiểm tra tại Authentication → Users:

```sql
update public.profiles set role = 'admin' where id = 'UUID_CUA_TAI_KHOAN_QUAN_TRI';
```

Những lần phân quyền sau dùng /admin/accounts, đọc và cập nhật Supabase thật.

## 3. Email provider và mẫu email

Authentication → Providers → Email:
bật Email và Confirm email; đặt minimum password length = 12 và yêu cầu chữ hoa,
chữ thường, số, ký tự đặc biệt tương ứng kiểm tra trong ứng dụng.
Bật Secure email change và Secure password change/reauthentication nếu Dashboard hỗ trợ.
Bật cơ chế bắt buộc xác thực lại khi đổi mật khẩu; form bảo mật dùng reauthenticate + nonce.

Authentication → URL Configuration:

- Site URL = APP_URL.
- Redirect URLs: APP_URL/auth/callback, APP_URL/auth/confirm,
  APP_URL/reset-password và URL tương ứng của môi trường local.
- Production dùng origin chính xác; tránh wildcard quá rộng.

Authentication → Email Templates: sao chép HTML ở docs/supabase-email-templates/:

| Template Dashboard | File |
|---|---|
| Confirm signup | confirm-signup.html |
| Invite user | invite-user.html |
| Magic Link | magic-link.html |
| Change email address | change-email.html |
| Reset password | reset-password.html |
| Reauthentication | reauthentication.html |

**Phải cấu hình template Reset password**: trang nhận token_hash từ email và chỉ
đổi mật khẩu sau khi xác minh token recovery bằng Supabase. Không dùng mặc định
trả access_token/refresh_token trong URL fragment với phiên HttpOnly.
Các template còn lại cũng dùng token_hash; việc mở email không tự tiêu thụ token,
người dùng xác nhận bằng POST. Reauthentication dùng mã Token của Supabase.

### Magic Link mở từ ứng dụng mail

Trong Supabase Dashboard → Authentication → Email Templates → Magic Link,
áp dụng mẫu `docs/supabase-email-templates/magic-link.html`. Liên kết nút đăng nhập phải là:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=magiclink">Tiếp tục đăng nhập</a>
```

Đặt Site URL bằng địa chỉ website thực tế. Liên kết này xác minh token qua Supabase
trên server và tạo cookie HttpOnly sau khi người dùng nhấn Tiếp tục đăng nhập;
có thể mở ở trình duyệt khác mà không cần cookie PKCE lúc yêu cầu email.
Hash email có thể dài 56 ký tự và mang tiền tố `pkce_`; ứng dụng chấp nhận
đúng các định dạng này và để Supabase quyết định token còn hiệu lực hay không.

Nếu vẫn dùng `{{ .ConfirmationURL }}` mặc định với PKCE, phải mở bằng trình duyệt
đã yêu cầu email. Thiếu cookie, trình duyệt trong ứng dụng mail hoặc link đã dùng
sẽ nhận hướng dẫn yêu cầu liên kết mới. Callback cũng hỗ trợ `sb_flow_id` của SDK.
Không thể phục hồi link đã bị dùng/hết hạn: cần yêu cầu email mới sau khi cập nhật mẫu.
Việc sửa file HTML trong repo không tự thay đổi mẫu đang cấu hình trên Supabase Dashboard.

Ứng dụng dùng dịch vụ gửi email mặc định của Supabase, không cấu hình máy chủ gửi thư riêng.
Dịch vụ này chỉ gửi tới địa chỉ email thuộc nhóm quản trị project và hiện giới hạn khoảng 2 email/giờ.
Email/Confirm Email, các mẫu email, đăng ký và khôi phục mật khẩu tiếp tục do Supabase Auth xử lý.

## 4. Google và Facebook

Google Cloud Console:

1. Tạo OAuth web client cho ứng dụng hiện có.
2. Thêm redirect URI do Supabase Google Provider hiển thị:
   https://YOUR_PROJECT.supabase.co/auth/v1/callback.
3. Nhập client ID và secret vào Authentication → Providers → Google rồi bật provider.
4. Cấu hình consent screen, domain và test users/publishing phù hợp.

Meta for Developers:

1. Cấu hình Facebook Login cho app.
2. Thêm OAuth redirect URI Supabase hiển thị, domain và privacy policy theo yêu cầu Meta.
3. Nhập App ID/secret vào Supabase Facebook Provider, bật provider và quyền email.
4. Hoàn tất app review/live mode theo phạm vi triển khai.

Nút Google/Facebook gọi signInWithOAuth; callback dùng PKCE exchangeCodeForSession.
Tài khoản mới nhận vai trò patient. Tên/ảnh từ provider được lưu khi tạo profile.
Supabase tự liên kết danh tính theo email đã xác minh khi đáp ứng điều kiện bảo mật.
Provider không cung cấp email đã xác minh sẽ không được vào cổng; dùng đăng nhập email
hoặc cấu hình nhà cung cấp để cấp email. Không tự ghép tài khoản bằng email trong frontend.

Nếu muốn liên kết thủ công, bật Allow manual linking trong Supabase và đặt
NEXT_PUBLIC_AUTH_MANUAL_LINKING=true. /account/security gọi linkIdentity cho phiên đã xác thực,
yêu cầu hoàn tất MFA nếu tài khoản đã bật. Không tự bật provider qua mã nguồn.

## 5. Rate Limits và Attack Protection

Authentication → Rate Limits: cấu hình giới hạn password login, signup,
OTP verification, resend, recovery, magic link và token refresh theo lưu lượng thực tế.
Giữ khoảng chờ giữa các email; giảm quota phù hợp môi trường thử nghiệm.
Ứng dụng chuyển lỗi Supabase 429 thành thông báo chờ, khóa nút khi đang gửi.
Không có bảng limiter hoặc cơ chế khóa tài khoản tự tạo.

Các lệnh Auth chạy qua Next.js nên Supabase có thể nhìn thấy IP của server;
kiểm tra quota/IP khi triển khai sau proxy và dùng CAPTCHA.
Không tự tin cậy X-Forwarded-For từ Internet.

Authentication → Attack Protection → CAPTCHA:
tạo hCaptcha site/secret, cấu hình domain local/production, bật CAPTCHA trong Supabase,
đặt secret trên Dashboard và site key công khai trong NEXT_PUBLIC_HCAPTCHA_SITE_KEY.
Các form email/password/signup/resend/recovery/magic link gửi captchaToken đến Supabase.
Token hết hạn được xóa, widget làm mới sau mỗi lần gửi; secret không đi tới trình duyệt.
Chưa bật CAPTCHA thì để site key rỗng. Chỉ code giao diện không bật CAPTCHA trên project.

Leaked Password Protection: bật trên Dashboard nếu gói cho phép.
Theo tài liệu Supabase tại thời điểm kiểm tra, tính năng này yêu cầu Pro trở lên.
Ứng dụng xử lý weak_password khi đăng ký/đổi mật khẩu; chưa bật thì không được coi là đã
kiểm tra danh sách mật khẩu rò rỉ. Không tự tải hoặc lưu danh sách mật khẩu.

## 6. MFA TOTP và quản lý phiên

Bật TOTP trong Authentication → Multi-Factor Authentication.
Sau đăng nhập, vào /account/security để đăng ký Authenticator, quét QR và xác minh mã.
QR/secret chỉ hiển thị trong phiên đăng ký, không lưu trong localStorage/database ứng dụng.
Tài khoản đã bật MFA được chuyển đến /auth/mfa trước khi vào cổng.
Xóa thiết bị verified cần AAL2 và mã hiện tại của chính thiết bị.
Nếu mất thiết bị, dùng quy trình khôi phục do quản trị project kiểm soát,
không thêm public endpoint bỏ qua MFA.

Đặt lại mật khẩu cho tài khoản có MFA vẫn cần mã Authenticator.
Việc khôi phục không tự hủy yếu tố MFA.
Session do Supabase quản lý, cookie HttpOnly/SameSite=Lax, Secure khi production,
không trả access/refresh token qua endpoint session.
Làm mới token trên server; không dùng localStorage/sessionStorage làm bằng chứng đăng nhập.
Đăng xuất/đổi mật khẩu gọi signOut global và xóa cookie; trạng thái đồng bộ giữa các tab.
Theo cơ chế JWT của Supabase, access token đã cấp có thể còn hiệu lực đến khi hết hạn;
cấu hình JWT lifetime và session policy theo nhu cầu, một số session controls phụ thuộc gói.

## 7. Chạy và kiểm thử

```powershell
cd frontend
npm ci
npm test
npm run build
npm run dev
```

Backend:

```powershell
cd backend
npm ci
npm test
npm run dev
```

API Express yêu cầu Authorization: Bearer <Supabase access token> của người dùng.
Trang Next.js sử dụng /api/data cùng origin; gateway lấy token từ HttpOnly cookie,
giữ nguyên RLS theo user, không dùng service key để truy vấn thay user.

Tự kiểm thử trên project sau khi chạy migration và cấu hình Dashboard:

| Chức năng | Điều kiện kiểm tra |
|---|---|
| Đăng ký/xác nhận | Hộp thư thật, template/email; chưa xác nhận không vào cổng |
| Trùng email | Cùng thông báo chung, không tiết lộ email tồn tại |
| Đăng nhập | Sai mật khẩu/user/chưa xác nhận/bị ban đều thất bại |
| 3 vai trò | Login chuyển đúng cổng; gõ URL cổng khác bị chuyển về cổng của mình |
| Session | Bệnh nhân/bác sĩ tích nhớ: 7 ngày; không tích: phiên trình duyệt; admin không được ghi nhớ, vào lại `/` phải đăng nhập lại; logout đồng bộ tab |
| Google/Facebook | Bật provider và cấu hình external console; callback thành công và từ chối |
| Recovery | Token đúng/sai/hết hạn/đã dùng; tài khoản MFA vẫn yêu cầu OTP |
| CAPTCHA | Token đúng/sai/hết hạn; bỏ token không được Supabase chấp nhận |
| Rate limit | Vượt quota trả 429; không spam project thật để kiểm tra tự động |
| MFA | Enroll/verify/login/challenge/remove, AAL1 không đọc dữ liệu đã bật MFA |
| Mật khẩu rò rỉ | Chỉ xác nhận hoạt động khi Pro+ và đã bật tính năng |
| RBAC/RLS | Tự sửa role bị từ chối; đổi patient_id/doctor_id không truy cập được dữ liệu khác |

Kiểm thử tự động trong repo dùng mock SDK để kiểm tra logic request, chuyển hướng,
CSRF, CAPTCHA forwarding, rate error, MFA, recovery và middleware quyền.
Chúng không chứng minh Email/OAuth/CAPTCHA/MFA/RLS của project từ xa đã được cấu hình đúng.
Cần thử các tích hợp thật bằng tài khoản thử nghiệm thuộc quyền kiểm soát sau cấu hình.

Các màn hình nghiệp vụ admin/doctor còn dùng seed/localStorage từ trước;
phần auth và trang quản lý quyền đã kết nối thật. Việc đổi toàn bộ CRUD nghiệp vụ
sang dữ liệu thật nằm ngoài phạm vi auth và chưa được thực hiện.

## 8. File chính và tài liệu

- frontend/src/lib/auth/: policy, server session, HTTP validation, context.
- frontend/src/app/api/auth/[action]/route.ts: API Auth/MFA qua SDK chính thức.
- frontend/src/app/auth/callback/route.ts: OAuth PKCE.
- frontend/src/proxy.ts và components/auth/Authorized.tsx: bảo vệ trang phía server.
- frontend/src/app/api/data/[...path]/route.ts: dữ liệu qua user session/RLS.
- frontend/src/modules/admin/views/Accounts.tsx: tài khoản và phân quyền thật.
- backend/middleware/auth.js, routes và doctor/patient controllers: bảo vệ API/ownership.
- docs/auth_security.sql: migration quyền cột, trigger, RLS/AAL và RPC quản trị.

Tài liệu chính thức:
[SSR](https://supabase.com/docs/guides/auth/server-side/advanced-guide),
[OAuth](https://supabase.com/docs/guides/auth/social-login),
[MFA](https://supabase.com/docs/guides/auth/auth-mfa),
[Rate Limits](https://supabase.com/docs/guides/auth/rate-limits),
[CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha),
[Password Security](https://supabase.com/docs/guides/auth/password-security),
[Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates).

## Kết quả xác minh trong workspace (12/11/2026)

- 51 kiểm thử auth: 44 frontend + 7 backend, tất cả đạt.
- TypeScript và production build Next.js đạt; ESLint toàn dự án không còn lỗi chặn (vẫn có cảnh báo cũ ở các màn hình nghiệp vụ).
- Kiểm tra Chrome desktop/mobile ở 360, 390, 768, 1024 và 1440 px: không tràn ngang; hiện/ẩn mật khẩu, chống gửi lặp, lỗi API, xác nhận mật khẩu và dán số điện thoại hoạt động đúng. Yêu cầu đăng ký/đăng nhập trong kiểm thử tương tác được giả lập, không gửi email thật.
- Form đăng nhập, đăng ký và khôi phục dùng cùng bố cục mới; loại bỏ ghi chú về vai trò/cấu hình kỹ thuật. Sửa quy tắc Turbopack để CSS Module được xử lý đúng và gọi connection() trước khi khởi tạo Supabase phía server để tránh lỗi prerender.
- Kiểm thử bổ sung bao gồm SHA-224/PKCE token email, callback token hash, cookie PKCE sau đăng ký, thiếu verifier/hết hạn và SDK Supabase SSR thực tế với HTTP giả lập; cookie theo vai trò, MFA và ghi nhớ, admin phải đăng nhập lại, URL chéo quyền, cookie refresh qua redirect và chặn API phân quyền.
- Chưa áp dụng migration trên project Supabase. Thực hiện bước này bằng Supabase Dashboard → SQL Editor; không có dữ liệu/cấu hình Supabase từ xa bị thay đổi.
- Cần chạy docs/auth_security.sql trong Supabase SQL Editor, rồi kiểm thử RLS bằng tài khoản patient/doctor/admin thật. Các kiểm thử mock không thay thế kiểm thử database.
- SMTP, Google/Facebook, CAPTCHA, MFA thực tế vẫn phụ thuộc cấu hình Dashboard và kiểm thử tích hợp nêu trên.
