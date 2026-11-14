# Test case - Hệ thống quản lý đặt lịch phòng khám

- **Phiên bản:** 1.0
- **Người lập:** Arất Thị Bích Phượng
- **Môi trường test:** localhost, Chrome (cập nhật link Vercel sau khi deploy)
- **Ngày test lần 1:** 14/11/2026, người test: Arất Thị Bích Phượng
- **Cách điền:** cột "Kết quả thực tế" và "Pass/Fail" điền khi chạy test. Mỗi test Fail tạo một Issue label `bug` và ghi số Issue vào cột Ghi chú.

Mã FR tương ứng với `docs/requirements.md`:
FR-01 Đăng ký, đăng nhập | FR-02 Admin quản lý bác sĩ | FR-03 Admin quản lý chuyên khoa | FR-04 Admin tạo khung giờ | FR-05 Bệnh nhân xem bác sĩ | FR-06 Bệnh nhân đặt lịch | FR-07 Bệnh nhân xem lịch sử, hủy lịch | FR-08 Bác sĩ xem lịch trong ngày | FR-09 Bác sĩ xác nhận, hoàn thành lịch

## 1. Auth (FR-01)
| TC | FR | Tiền điều kiện | Các bước | Kết quả mong đợi | Kết quả thực tế | Pass/Fail | Ghi chú |
|---|---|---|---|---|---|---|---|
| TC-01 | FR-01 | Chưa có tài khoản | Vào trang đăng ký, nhập email hợp lệ và mật khẩu, bấm Đăng ký | Tạo tài khoản thành công | Không đăng ký được, báo "CAPTCHA không hợp lệ hoặc đã hết hạn" dù trang không hiện ô CAPTCHA | Fail | Bug #30 |
| TC-02 | FR-01 | Email đã được đăng ký | Đăng ký lại bằng email đó | Báo lỗi email đã tồn tại | Chưa test được, form đăng ký bị chặn bởi lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |
| TC-03 | FR-01 | Có tài khoản | Đăng nhập đúng email, mật khẩu | Vào trang chính theo đúng vai trò | Không đăng nhập được, báo "CAPTCHA không hợp lệ hoặc đã hết hạn" dù trang không hiện ô CAPTCHA | Fail | Bug #30 |
| TC-04 | FR-01 | Có tài khoản | Đăng nhập sai mật khẩu | Báo lỗi rõ ràng, không đăng nhập được | Chưa test được, luôn báo lỗi CAPTCHA nên không phân biệt được sai mật khẩu | Blocked | Chờ sửa Bug #30 |
| TC-05 | FR-01 | Chưa đăng nhập | Gõ trực tiếp đường dẫn trang bệnh nhân | Chuyển về trang đăng nhập | Bị chuyển về trang đăng nhập, không vào được trang bệnh nhân | Pass | Test trên localhost, Chrome |
| TC-06 | FR-01 | Đăng nhập bằng tài khoản bệnh nhân | Gõ đường dẫn trang admin (/admin) | Bị chặn, không vào được | Bị chuyển về trang bệnh nhân (/client), không vào được trang admin | Pass | Test bằng tài khoản Google, Chrome |
| TC-28 | FR-01 | Mở trang đăng nhập hoặc đăng ký | Quan sát form trước khi bấm gửi | Nếu bật CAPTCHA thì ô CAPTCHA hiển thị và hoàn thành được, nếu không bật thì không báo lỗi CAPTCHA | Không thấy ô CAPTCHA, bấm gửi vẫn báo lỗi CAPTCHA ở cả đăng ký và đăng nhập | Fail | Bug #30 |
| TC-29 | FR-01 | Có tài khoản Google | Bấm nút Google, chọn tài khoản | Đăng nhập thành công, vào trang theo đúng vai trò | Đăng nhập thành công | Pass | Đăng nhập email bị lỗi riêng, xem TC-03 |
| TC-30 | FR-01 | Đăng nhập Google bằng email chưa có trong hệ thống | Đăng nhập Google | Tự tạo tài khoản vai trò bệnh nhân | Đăng nhập thành công, được tạo tài khoản mới với vai trò bệnh nhân | Pass | Test bằng tài khoản Google, Chrome |

## 2. Admin (FR-02, FR-03, FR-04)
| TC | FR | Tiền điều kiện | Các bước | Kết quả mong đợi | Kết quả thực tế | Pass/Fail | Ghi chú |
|---|---|---|---|---|---|---|---|
| TC-07 | FR-02 | Đăng nhập admin | Thêm bác sĩ mới với đủ thông tin | Bác sĩ xuất hiện trong danh sách | Chưa test được, không đăng nhập được tài khoản admin do lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |
| TC-08 | FR-02 | Đăng nhập admin | Thêm bác sĩ, để trống tên | Báo lỗi, không lưu | Chưa test được, không đăng nhập được tài khoản admin do lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |
| TC-09 | FR-02 | Có bác sĩ trong danh sách | Sửa thông tin rồi lưu | Thông tin cập nhật đúng | Chưa test được, không đăng nhập được tài khoản admin do lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |
| TC-10 | FR-02 | Có bác sĩ trong danh sách | Xóa bác sĩ | Bác sĩ biến mất khỏi danh sách | Chưa test được, không đăng nhập được tài khoản admin do lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |
| TC-11 | FR-03 | Đăng nhập admin | Thêm chuyên khoa mới | Chuyên khoa xuất hiện trong danh sách | Chưa test được, không đăng nhập được tài khoản admin do lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |
| TC-12 | FR-03 | Đã có một chuyên khoa | Thêm chuyên khoa trùng tên | Báo lỗi trùng tên | Chưa test được, không đăng nhập được tài khoản admin do lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |
| TC-13 | FR-04 | Có bác sĩ | Tạo khung giờ 9:00 ngày mai cho bác sĩ | Khung giờ được tạo | Chưa test được, không đăng nhập được tài khoản admin do lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |
| TC-14 | FR-04 | Đã có khung giờ 9:00 ngày mai của bác sĩ đó | Tạo lại đúng khung giờ đó | Báo lỗi, không tạo trùng | Chưa test được, không đăng nhập được tài khoản admin do lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |