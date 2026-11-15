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

## 2. Admin (FR-02, FR-03, FR-04, FR-10)
| TC | FR | Tiền điều kiện | Các bước | Kết quả mong đợi | Kết quả lần 1 | Pass/Fail lần 1 | Kết quả lần 2 | Pass/Fail lần 2 | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|
| TC-11 | FR-03 | Đăng nhập admin | Chuyên khoa > Thêm chuyên khoa, nhập tên `TEST Khoa`, lưu, bấm F5 | Chuyên khoa xuất hiện trong danh sách, số chuyên khoa tăng 1, F5 vẫn còn | Chưa test được, không đăng nhập được admin do lỗi CAPTCHA | Blocked | Chuyên khoa xuất hiện trong danh sách, số chuyên khoa tăng 1, F5 vẫn còn | Pass | Đã sửa #30, test lại 15/11 |
| TC-12 | FR-03 | Đã có chuyên khoa `TEST Khoa` | Thêm chuyên khoa, nhập lại đúng `TEST Khoa`, lưu | Báo lỗi trùng tên, danh sách chỉ có 1 dòng `TEST Khoa` | Chưa test được, không đăng nhập được admin do lỗi CAPTCHA | Blocked | Web báo lỗi trùng tên, danh sách chỉ có 1 dòng `TEST Khoa` | Pass | Đã sửa #30, test lại 15/11 |
| TC-07 | FR-02 | Đăng nhập admin, đã có `TEST Khoa` | Bác sĩ > Thêm bác sĩ, nhập tên `TEST Bác sĩ`, chọn chuyên khoa `TEST Khoa`, điền ô bắt buộc, lưu, bấm F5 | Bác sĩ xuất hiện trong danh sách, F5 vẫn còn | Chưa test được, không đăng nhập được admin do lỗi CAPTCHA | Blocked | Bác sĩ xuất hiện trong danh sách, F5 vẫn còn | Pass | Đã sửa #30, test lại 15/11 |
| TC-08 | FR-02 | Đăng nhập admin | Thêm bác sĩ, để trống ô tên, điền ô khác, lưu | Báo lỗi ở ô tên, không tạo bác sĩ mới | Chưa test được, không đăng nhập được admin do lỗi CAPTCHA | Blocked | Web báo lỗi ở ô tên, không tạo bác sĩ mới | Pass | Đã sửa #30, test lại 15/11 |
| TC-09 | FR-02 | Có `TEST Bác sĩ` trong danh sách | Bấm biểu tượng cây bút, đổi tên thành `TEST Bác sĩ 2`, lưu, bấm F5 | Danh sách hiện tên mới, F5 vẫn là tên mới | Chưa test được, không đăng nhập được admin do lỗi CAPTCHA | Blocked | Danh sách hiện tên mới, F5 vẫn là tên mới | Pass | Đã sửa #30, test lại 15/11 |
| TC-13 | FR-04 | Có `TEST Bác sĩ 2` | Khung giờ > tạo khung giờ, chọn `TEST Bác sĩ 2`, ngày 16/11, giờ 9:00, lưu | Khung giờ hiện đúng bác sĩ, ngày, giờ | Chưa test được, không đăng nhập được admin do lỗi CAPTCHA | Blocked | Khung giờ hiện đúng bác sĩ, ngày 16/11, giờ 9:00 | Pass | Đã sửa #30, test lại 15/11 |
| TC-14 | FR-04 | Đã có khung giờ 9:00 ngày 16/11 của `TEST Bác sĩ 2` | Tạo lại đúng khung giờ đó | Báo lỗi, chỉ còn 1 khung giờ | Chưa test được, không đăng nhập được admin do lỗi CAPTCHA | Blocked | Web báo lỗi, chỉ còn 1 khung giờ | Pass | Đã sửa #30, test lại 15/11 |
| TC-32 | FR-10 | Đăng nhập admin, có `TEST Bác sĩ 2` và khung giờ 9:00 ngày 16/11 còn trống | Bấm Tạo lịch hẹn (góc phải trên), chọn bệnh nhân, chọn `TEST Bác sĩ 2`, ngày 16/11, giờ 9:00, lưu, bấm F5 | Lịch hẹn mới xuất hiện trong trang Lịch hẹn, F5 vẫn còn | Chưa có test case này ở lần 1 | — | Lịch hẹn mới xuất hiện trong trang Lịch hẹn, F5 vẫn còn | Pass | Test case bổ sung, test ngày 15/11 |
| TC-33 | FR-10 | Đã có lịch hẹn 9:00 ngày 16/11 của `TEST Bác sĩ 2` | Tạo lịch hẹn mới, chọn lại đúng bác sĩ, ngày, giờ đó, lưu | Báo lỗi, không tạo lịch hẹn trùng | Chưa có test case này ở lần 1 | — | Web báo lỗi, không tạo lịch hẹn trùng | Pass | Test case bổ sung, test ngày 15/11 |
| TC-10 | FR-02 | Có `TEST Bác sĩ 2`, đã xóa các lịch hẹn TEST | Bác sĩ > bấm biểu tượng thùng rác ở `TEST Bác sĩ 2`, xác nhận, bấm F5 | Bác sĩ biến mất khỏi danh sách | Chưa test được, không đăng nhập được admin do lỗi CAPTCHA | Blocked | Bác sĩ biến mất khỏi danh sách, F5 vẫn không thấy | Pass | Đã sửa #30, test lại 15/11 |

## 3. Bệnh nhân (FR-05, FR-06, FR-07)
| TC | FR | Tiền điều kiện | Các bước | Kết quả mong đợi | Kết quả thực tế | Pass/Fail | Ghi chú |
|---|---|---|---|---|---|---|---|
| TC-15 | FR-05 | Đăng nhập bệnh nhân | Mở danh sách bác sĩ | Hiện đủ bác sĩ đã được admin tạo | Hiện danh sách bác sĩ đầy đủ (ví dụ có BS Nguyễn Văn An, chuyên khoa Nội tổng quát) | Pass | Test bằng tài khoản Google, localhost, Chrome |
| TC-16 | FR-05 | Có nhiều chuyên khoa | Lọc theo một chuyên khoa | Chỉ hiện bác sĩ thuộc chuyên khoa đó | Lọc theo chuyên khoa (Nội tổng quát), chỉ hiện bác sĩ thuộc chuyên khoa đó | Pass | Test bằng tài khoản Google, localhost, Chrome |
| TC-17 | FR-06 | Có khung giờ trống | Chọn bác sĩ, chọn giờ, bấm Đặt lịch | Đặt thành công, hiện trong lịch sử | Không đặt được lịch: nhóm đã tạo lịch khoảng ngày 9, 13/11, nhưng bác sĩ Nguyễn Văn An, 14 ngày thử (15/11 đến 28/11) đều báo 0 giờ còn trống, nút Tiếp theo bị khóa | Fail | Bug #31 |
| TC-18 | FR-06 | Khung giờ đã có người đặt | Đặt lại đúng khung giờ đó | Báo lỗi, không đặt trùng | Chưa test được, không đặt được lịch nào | Blocked | Phụ thuộc TC-17, Bug #31 |
| TC-19 | FR-06 | Hai bệnh nhân cùng mở một khung giờ | Cả hai bấm Đặt gần như cùng lúc | Chỉ một người thành công | Chưa test được, không đặt được lịch nào | Blocked | Phụ thuộc TC-17, Bug #31 |
| TC-20 | FR-07 | Đã có lịch đặt | Mở lịch sử | Hiện đúng các lịch đã đặt | Chưa test được, chưa đặt được lịch nào | Blocked | Phụ thuộc TC-17, Bug #31 |
| TC-21 | FR-07 | Đã có lịch đặt | Hủy lịch | Lịch chuyển sang đã hủy, khung giờ trống lại | Chưa test được, chưa đặt được lịch nào | Blocked | Phụ thuộc TC-17, Bug #31 |
| TC-31 | FR-06 | Đăng nhập bệnh nhân, bác sĩ chưa có khung giờ ngày đã chọn | Vào Đặt lịch, chọn bác sĩ, chọn ngày không có khung giờ | Hiện thông báo không có lịch, không cho sang bước xác nhận | Hiện "Bác sĩ chưa có lịch khám vào ngày này", nút Tiếp theo bị khóa | Pass | Test trên localhost, Chrome |

## 4. Bác sĩ (FR-08, FR-09)
| TC | FR | Tiền điều kiện | Các bước | Kết quả mong đợi | Kết quả thực tế | Pass/Fail | Ghi chú |
|---|---|---|---|---|---|---|---|
| TC-22 | FR-08 | Đăng nhập bác sĩ, có lịch hôm nay | Mở lịch khám trong ngày | Hiện đúng lịch của bác sĩ đó | Chưa test được, không đăng nhập được tài khoản bác sĩ do lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |
| TC-23 | FR-08 | Bác sĩ không có lịch hôm nay | Mở lịch khám trong ngày | Hiện thông báo không có lịch | Chưa test được, không đăng nhập được tài khoản bác sĩ do lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |
| TC-24 | FR-09 | Có lịch chờ xác nhận | Bấm Xác nhận | Trạng thái chuyển thành đã xác nhận | Chưa test được, không đăng nhập được tài khoản bác sĩ do lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |
| TC-25 | FR-09 | Có lịch đã xác nhận | Bấm Hoàn thành | Trạng thái chuyển thành hoàn thành | Chưa test được, không đăng nhập được tài khoản bác sĩ do lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |

## 5. Giao diện và kiểm tra dữ liệu nhập
| TC | FR | Tiền điều kiện | Các bước | Kết quả mong đợi | Kết quả thực tế | Pass/Fail | Ghi chú |
|---|---|---|---|---|---|---|---|
| TC-26 | Chung | Mở trang bằng điện thoại (hoặc thu nhỏ trình duyệt) | Mở trang đặt lịch | Hiển thị đủ, không vỡ bố cục | Hiển thị đủ nội dung, không vỡ bố cục (ghi kích thước màn hình đã thử, ví dụ iPhone SE 375px) | Pass | Test bằng Chrome DevTools, localhost |
| TC-27 | Chung | Bất kỳ form nào | Để trống ô bắt buộc rồi bấm Gửi | Báo lỗi rõ ràng ở đúng ô | Chưa test được, các form hiện chỉ trả về lỗi CAPTCHA | Blocked | Chờ sửa Bug #30 |