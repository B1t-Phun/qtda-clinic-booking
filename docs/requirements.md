# Đặc tả yêu cầu - ClinicCare (Hệ thống quản lý và đặt lịch khám phòng khám đa khoa)

- **Phiên bản:** 1.0
- **Người lập:** Arất Thị Bích Phượng
- **Ngày lập:** 19/11/2026
- **Vai trò người dùng:** Bệnh nhân, Bác sĩ, Quản trị viên (Admin)
- **Module:** Auth, Admin, Bệnh nhân, Bác sĩ

## 1. Yêu cầu chức năng

| ID | Vai trò | Chức năng | Mô tả | Module | Test case |
|---|---|---|---|---|---|
| FR-01 | Chung | Đăng ký, đăng nhập | Đăng ký và đăng nhập bằng email, mật khẩu hoặc tài khoản Google. Phân quyền theo 3 vai trò, mỗi vai trò chỉ vào được trang của mình | Auth | TC-01 đến TC-06, TC-28 đến TC-30 |
| FR-02 | Admin | Quản lý bác sĩ | Xem danh sách, thêm, sửa, xóa bác sĩ. Tên bác sĩ là bắt buộc | Admin | TC-07 đến TC-10 |
| FR-03 | Admin | Quản lý chuyên khoa | Thêm, sửa, xóa chuyên khoa. Tên chuyên khoa không được trùng | Admin | TC-11, TC-12 |
| FR-04 | Admin | Tạo khung giờ khám | Tạo khung giờ khám theo bác sĩ, ngày, giờ. Không tạo trùng khung giờ của cùng bác sĩ | Admin | TC-13, TC-14 |
| FR-05 | Bệnh nhân | Xem bác sĩ | Xem danh sách bác sĩ, lọc theo chuyên khoa | Bệnh nhân | TC-15, TC-16 |
| FR-06 | Bệnh nhân | Đặt lịch khám | Chọn bác sĩ, ngày, khung giờ còn trống, nhập lý do khám và xác nhận đặt lịch. Không cho đặt khung giờ đã có người đặt. Đặt xong thì form quay về trạng thái ban đầu | Bệnh nhân | TC-17 đến TC-19, TC-31, TC-34 |
| FR-07 | Bệnh nhân | Xem lịch sử, hủy lịch | Xem các lịch đã đặt, hủy lịch thì khung giờ được trả lại | Bệnh nhân | TC-20, TC-21 |
| FR-08 | Bác sĩ | Xem lịch khám trong ngày | Xem danh sách lịch khám của bác sĩ trong ngày, báo rõ khi không có lịch | Bác sĩ | TC-22, TC-23 |
| FR-09 | Bác sĩ | Xác nhận, hoàn thành lịch | Chuyển lịch từ "Chờ xác nhận" sang "Đã xác nhận", và từ "Đang khám" sang "Hoàn thành" | Bác sĩ | TC-24, TC-25 |
| FR-10 | Admin | Tạo lịch hẹn | Admin tạo lịch hẹn thay bệnh nhân (chọn bệnh nhân, bác sĩ, ngày, giờ). Không tạo trùng lịch | Admin | TC-32, TC-33 |
| FR-11 | Bác sĩ | Tiếp nhận, khám, ghi chú | Tiếp nhận bệnh nhân khi lịch đã xác nhận và đúng ngày khám, bắt đầu khám (chuyển "Đang khám"), nhập và lưu ghi chú, kết luận | Bác sĩ | TC-35 đến TC-38 |
| FR-12 | Bác sĩ, Admin | Tìm kiếm, lọc lịch hẹn | Tìm lịch theo tên bệnh nhân, số điện thoại, mã lịch. Lọc theo ngày hoặc trạng thái, xóa bộ lọc thì hiện lại danh sách đầy đủ | Bác sĩ, Admin | TC-39 đến TC-45 |

## 2. Luồng trạng thái lịch hẹn

Chờ xác nhận → Đã xác nhận → Đã tiếp nhận → Đang khám → Hoàn thành

Lịch có thể chuyển sang "Đã hủy" khi bệnh nhân hủy (FR-07).

## 3. Yêu cầu phi chức năng

| ID | Yêu cầu | Mô tả | Test case |
|---|---|---|---|
| NFR-01 | Triển khai | Bản chạy công khai qua HTTPS tại https://qtda-clinic-booking.vercel.app | Toàn bộ test lần 2 |
| NFR-02 | Giao diện | Hiển thị tốt trên điện thoại (responsive) | TC-26 |
| NFR-03 | Phân quyền | Người dùng không vào được trang của vai trò khác | TC-05, TC-06 |
| NFR-04 | Toàn vẹn dữ liệu | Không đặt trùng khung giờ khám, kể cả khi 2 người đặt cùng lúc | TC-14, TC-18, TC-19, TC-33 |
| NFR-05 | Kiểm tra dữ liệu nhập | Báo lỗi rõ ràng khi để trống ô bắt buộc | TC-08, TC-27 |

## 4. Ngoài phạm vi

- Thanh toán trực tuyến
- Hồ sơ bệnh án điện tử
- Gửi SMS nhắc lịch khám