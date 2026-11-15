# Hồ sơ bác sĩ, bệnh nhân và ảnh đại diện

- Bác sĩ: /doctor/profile, màu chủ đạo teal theo --doctor-primary hiện có (#087F72).
- Bệnh nhân: /client/profile, màu chủ đạo xanh dương (#2563EB).
- Bác sĩ xem chi tiết bệnh nhân: /doctor/patients/[id], mở bằng “Xem hồ sơ” từ danh sách bệnh nhân. Giao diện vẫn dùng màu của phân quyền đang thao tác là Doctor.

Trang hồ sơ dùng hai cột cân chiều cao: ảnh và tài khoản bên trái; thống kê ở trên, thông tin cá nhân ở dưới bên phải. Bệnh nhân xem tổng lịch hẹn và lượt khám hoàn thành; bác sĩ xem tổng lịch khám, đã hoàn thành, đã hủy và chờ xác nhận. Bấm thẻ thống kê để mở danh sách lịch; số liệu lấy từ Supabase theo tài khoản hiện tại. Trên màn hình nhỏ các cột tự xếp dọc.

Form cá nhân hiển thị toàn bộ trường profiles: id, email, full_name, phone, role, date_of_birth, gender, address, avatar_url, created_at, updated_at.
Chỉ họ tên, điện thoại, ngày sinh, giới tính, địa chỉ và ảnh được người dùng thay đổi. Email đồng bộ từ Auth; role/id/ngày tạo là thông tin chỉ đọc.
Hồ sơ bác sĩ còn hiển thị chuyên khoa, phòng, kinh nghiệm, giới thiệu, giá khám, trạng thái hoạt động, ngày tạo và mã bác sĩ. Chuyên khoa, kinh nghiệm và trạng thái thuộc quyền quản trị viên như cơ chế hiện có.

## Tải ảnh

“Chọn ảnh từ máy” → xem ảnh xem trước → “Lưu ảnh”. Có thể hủy ảnh chưa lưu hoặc xác nhận gỡ ảnh hiện tại.
JPG, PNG hoặc WebP tĩnh, tối đa 5 MB. Server giải mã ảnh thật, giới hạn 25 triệu điểm ảnh, căn giữa/cắt vuông tối đa 512×512, chuyển WebP và bỏ metadata.
File lưu dưới thư mục UUID của chủ sở hữu trong bucket riêng tư profile-avatars. Không lưu base64 vào database, không dùng service role trong API ảnh.
profiles.avatar_url lưu đường dẫn /api/profile/avatar/[userId]/[filename].webp; route ảnh dùng cookie HttpOnly và Storage RLS, response private,no-store.
Ảnh cũ thuộc đúng người dùng chỉ được dọn sau khi ghi hồ sơ thành công. Khi kết nối bị gián đoạn và chưa biết giao dịch đã commit hay chưa, giữ ảnh để tránh liên kết bị hỏng.

Đã kiểm tra project ngày 15/11/2026: bucket profile-avatars và các policy profile_avatar_read/insert/delete đã tồn tại.
Không cần tạo bucket hoặc chạy lại schema. Tác vụ này không thay đổi schema hay chính sách của project.
Nếu chạy trên project khác, cần cấu hình bucket riêng tư: allowed_mime_types=image/webp, file_size_limit=1048576 và policy sở hữu tương đương.
Ảnh bệnh nhân chỉ được đọc bởi chính họ, admin hoặc bác sĩ có lịch hẹn với họ; ảnh bác sĩ hiển thị trong danh sách bác sĩ cho người đã đăng nhập. MFA được giữ nguyên.

## Đồng bộ và xử lý lỗi

Lưu form có kiểm tra phiên bản updated_at để tránh ghi đè dữ liệu từ tab khác. Xung đột có nút tải bản mới nhưng giữ nội dung đang nhập để đối chiếu.
Chặn double submit, vô hiệu nút khi xử lý, lỗi hiển thị tiếng Việt theo trường. Có cảnh báo khi tải lại/đóng trang với thay đổi chưa lưu.
Tên và ảnh header được cập nhật lại theo session sau khi lưu.
Trang chi tiết bệnh nhân chỉ đọc bệnh nhân có lịch hẹn với bác sĩ từ snapshot được server lọc theo doctors.id của phiên đăng nhập.

## Kiểm tra

- npm --prefix frontend test
- npm --prefix frontend run lint
- npm --prefix frontend run build
- node scripts/test-profile-db.mjs: chạy kiểm thử quyền hồ sơ/Storage bằng role authenticated trên bucket hiện có, với fixture trong giao dịch rollback.
- node frontend/test/review-doctor-ui.cjs: kiểm tra SSR và chụp bố cục desktop/mobile/tablet dùng dữ liệu thật chỉ đọc. Báo cáo màu vai trò và overflow nằm trong artifacts/doctor/visual-review.json; ảnh lưu local, không đưa lên Git.

Các bài kiểm thử local giải mã ảnh bằng byte thật; kiểm thử SQL xác minh sở hữu/MFA. Chúng không thay thế kiểm thử upload binary qua trình duyệt với session đăng nhập thật.
