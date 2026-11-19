# Test case - Hệ thống quản lý đặt lịch phòng khám

- **Phiên bản:** 1.1
- **Người lập:** Arất Thị Bích Phượng
- **Môi trường test:** lần 1 trên localhost, Chrome; lần 2 trên môi trường thực https://qtda-clinic-booking.vercel.app, Chrome
- **Ngày test lần 1:** 14/11/2026, người test: Arất Thị Bích Phượng
- **Ngày test lần 2:** từ 15 đến 19 tháng 11/2026, sau khi sửa lỗi CAPTCHA (#30) và lỗi đặt lịch (#31). Ngày cụ thể ghi ở cột Ghi chú từng dòng.
- **Cách điền:** cột "Kết quả lần 1" và "Pass/Fail lần 1" giữ nguyên kết quả lần chạy đầu. Cột "lần 2" điền khi chạy lại sau khi sửa lỗi. Mỗi test Fail tạo một Issue label `bug` và ghi số Issue vào cột Ghi chú.

Mã FR tương ứng với `docs/requirements.md`:
FR-01 Đăng ký, đăng nhập | FR-02 Admin quản lý bác sĩ | FR-03 Admin quản lý chuyên khoa | FR-04 Admin tạo khung giờ | FR-05 Bệnh nhân xem bác sĩ | FR-06 Bệnh nhân đặt lịch | FR-07 Bệnh nhân xem lịch sử, hủy lịch | FR-08 Bác sĩ xem lịch trong ngày | FR-09 Bác sĩ xác nhận, hoàn thành lịch | FR-10 Admin tạo lịch hẹn | FR-11 Tiếp nhận, bắt đầu khám, ghi chú và kết luận | FR-12 Tìm kiếm, lọc lịch hẹn

## 1. Auth (FR-01)
| TC | FR | Tiền điều kiện | Các bước | Kết quả mong đợi | Kết quả lần 1 | Pass/Fail lần 1 | Kết quả lần 2 | Pass/Fail lần 2 | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|
| TC-01 | FR-01 | Chưa có tài khoản | Vào trang đăng ký, nhập email hợp lệ và mật khẩu, bấm Đăng ký | Tạo tài khoản thành công | Không đăng ký được, báo "CAPTCHA không hợp lệ hoặc đã hết hạn" dù trang không hiện ô CAPTCHA | Fail | Tạo tài khoản thành công | Pass | Đã sửa #30, test lại 17/11 |
| TC-02 | FR-01 | Email đã được đăng ký | Đăng ký lại bằng email đó | Báo lỗi email đã tồn tại | Chưa test được, form đăng ký bị chặn bởi lỗi CAPTCHA | Blocked | Báo lỗi email đã tồn tại | Pass | Đã sửa #30, test lại 17/11 |
| TC-03 | FR-01 | Có tài khoản | Đăng nhập đúng email, mật khẩu | Vào trang chính theo đúng vai trò | Không đăng nhập được, báo "CAPTCHA không hợp lệ hoặc đã hết hạn" dù trang không hiện ô CAPTCHA | Fail | Đăng nhập thành công, vào đúng trang theo vai trò | Pass | Đã sửa #30, test lại 17/11 |
| TC-04 | FR-01 | Có tài khoản | Đăng nhập sai mật khẩu | Báo lỗi rõ ràng, không đăng nhập được | Chưa test được, luôn báo lỗi CAPTCHA nên không phân biệt được sai mật khẩu | Blocked | Báo lỗi sai mật khẩu, không đăng nhập được | Pass | Đã sửa #30, test lại 17/11 |
| TC-05 | FR-01 | Chưa đăng nhập | Gõ trực tiếp đường dẫn trang bệnh nhân | Chuyển về trang đăng nhập | Bị chuyển về trang đăng nhập, không vào được trang bệnh nhân | Pass | Không cần test lại | — | Test trên localhost, Chrome |
| TC-06 | FR-01 | Đăng nhập bằng tài khoản bệnh nhân | Gõ đường dẫn trang admin (/admin) | Bị chặn, không vào được | Bị chuyển về trang bệnh nhân (/client), không vào được trang admin | Pass | Không cần test lại | — | Test bằng tài khoản Google, Chrome |
| TC-28 | FR-01 | Mở trang đăng nhập hoặc đăng ký | Quan sát form trước khi bấm gửi | Nếu bật CAPTCHA thì ô CAPTCHA hiển thị và hoàn thành được, nếu không bật thì không báo lỗi CAPTCHA | Không thấy ô CAPTCHA, bấm gửi vẫn báo lỗi CAPTCHA ở cả đăng ký và đăng nhập | Fail | Không còn báo lỗi CAPTCHA khi đăng ký và đăng nhập | Pass | Đã sửa #30, test lại 17/11 |
| TC-29 | FR-01 | Có tài khoản Google | Bấm nút Google, chọn tài khoản | Đăng nhập thành công, vào trang theo đúng vai trò | Đăng nhập thành công | Pass | Không cần test lại | — | Đăng nhập email lúc đó bị lỗi riêng, xem TC-03 |
| TC-30 | FR-01 | Đăng nhập Google bằng email chưa có trong hệ thống | Đăng nhập Google | Tự tạo tài khoản vai trò bệnh nhân | Đăng nhập thành công, được tạo tài khoản mới với vai trò bệnh nhân | Pass | Không cần test lại | — | Test bằng tài khoản Google, Chrome |

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
| TC | FR | Tiền điều kiện | Các bước | Kết quả mong đợi | Kết quả lần 1 | Pass/Fail lần 1 | Kết quả lần 2 | Pass/Fail lần 2 | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|
| TC-15 | FR-05 | Đăng nhập bệnh nhân | Mở danh sách bác sĩ | Hiện đủ bác sĩ đã được admin tạo | Hiện danh sách bác sĩ đầy đủ (ví dụ có BS Nguyễn Văn An, chuyên khoa Nội tổng quát) | Pass | Không cần test lại | — | Test bằng tài khoản Google, localhost, Chrome |
| TC-16 | FR-05 | Có nhiều chuyên khoa | Lọc theo một chuyên khoa | Chỉ hiện bác sĩ thuộc chuyên khoa đó | Lọc theo chuyên khoa (Nội tổng quát), chỉ hiện bác sĩ thuộc chuyên khoa đó | Pass | Không cần test lại | — | Test bằng tài khoản Google, localhost, Chrome |
| TC-17 | FR-06 | Có khung giờ trống | Chọn bác sĩ, chọn giờ, bấm Đặt lịch | Đặt thành công, hiện trong lịch sử | Không đặt được lịch: nhóm đã tạo lịch khoảng ngày 9, 13/11, nhưng bác sĩ Nguyễn Văn An, 14 ngày thử (15/11 đến 28/11) đều báo 0 giờ còn trống, nút Tiếp theo bị khóa | Fail | Hiện khung giờ trống, chọn giờ, đặt lịch thành công, lịch hiện trong Lịch hẹn | Pass | Đã sửa #31, test lại 17/11 trên Vercel |
| TC-18 | FR-06 | Khung giờ đã có người đặt | Đặt lại đúng khung giờ đó | Báo lỗi, không đặt trùng | Chưa test được, không đặt được lịch nào | Blocked | Báo lỗi hoặc khung giờ không còn hiện trống, không đặt trùng | Pass | Đã sửa #31, test lại 17/11 trên Vercel |
| TC-19 | FR-06 | Hai bệnh nhân cùng mở một khung giờ | Cả hai bấm Đặt gần như cùng lúc | Chỉ một người thành công | Chưa test được, không đặt được lịch nào | Blocked | Chỉ một người đặt thành công, người còn lại không đặt được | Pass | Đã sửa #31, test lại 17/11 trên Vercel bằng 2 tài khoản |
| TC-20 | FR-07 | Đã có lịch đặt | Mở lịch sử | Hiện đúng các lịch đã đặt | Chưa test được, chưa đặt được lịch nào | Blocked | Trang Lịch hẹn hiện đúng lịch đã đặt (đúng bác sĩ, ngày, giờ) | Pass | Đã sửa #31, test lại 17/11 trên Vercel |
| TC-21 | FR-07 | Đã có lịch đặt | Hủy lịch | Lịch chuyển sang đã hủy, khung giờ trống lại | Chưa test được, chưa đặt được lịch nào | Blocked | Lịch chuyển sang đã hủy, khung giờ trống lại | Pass | Đã sửa #31, test lại 17/11 trên Vercel |
| TC-31 | FR-06 | Đăng nhập bệnh nhân, bác sĩ chưa có khung giờ ngày đã chọn | Vào Đặt lịch, chọn bác sĩ, chọn ngày không có khung giờ | Hiện thông báo không có lịch, không cho sang bước xác nhận | Hiện "Bác sĩ chưa có lịch khám vào ngày này", nút Tiếp theo bị khóa | Pass | Không cần test lại | — | Test trên localhost, Chrome |
| TC-34 | FR-06 | Vừa đặt lịch thành công | Đặt lịch thành công, rồi bấm lại trang Đặt lịch ở menu | Quay về bước 1 (chọn bác sĩ), không còn dữ liệu của lần đặt trước | Chưa có test case này ở lần 1 | — | Vẫn hiện bước xác nhận của lần đặt trước: bác sĩ Nguyễn Minh Khang và lý do khám còn nguyên, Ngày khám và Khung giờ trống ("—"). Bấm F5 thì quay về bước 1 | Fail | Bug #38 (mức độ thấp), test ngày 17/11 trên Vercel |

## 4. Bác sĩ và xử lý lịch hẹn (FR-08, FR-09, FR-11, FR-12)
| TC | FR | Tiền điều kiện | Các bước | Kết quả mong đợi | Kết quả lần 1 | Pass/Fail lần 1 | Kết quả lần 2 | Pass/Fail lần 2 | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|
| TC-22 | FR-08 | Đăng nhập bác sĩ, có lịch hôm nay | Mở lịch khám trong ngày | Hiện đúng lịch của bác sĩ đó | Chưa test được, không đăng nhập được tài khoản bác sĩ do lỗi CAPTCHA | Blocked | Hiện đúng lịch của bác sĩ đó | Pass | Đã sửa #30, test lại 19/11 trên Vercel |
| TC-23 | FR-08 | Đăng nhập bác sĩ, không có lịch hôm nay | Mở lịch khám trong ngày | Hiện thông báo không có lịch | Chưa test được, không đăng nhập được tài khoản bác sĩ do lỗi CAPTCHA | Blocked | Hiện thông báo không có lịch | Pass | Đã sửa #30, test lại 19/11 trên Vercel |
| TC-24 | FR-09 | Có lịch ở trạng thái "Chờ xác nhận" | Bấm Xác nhận | Trạng thái chuyển thành "Đã xác nhận" | Chưa test được, không đăng nhập được tài khoản bác sĩ do lỗi CAPTCHA | Blocked | Trạng thái chuyển thành "Đã xác nhận" | Pass | Đã sửa #30, test lại 19/11 trên Vercel |
| TC-35 | FR-11 | Có lịch "Đã xác nhận", đúng ngày khám | Bấm Tiếp nhận bệnh nhân | Lịch được ghi nhận đã tiếp nhận | Chưa có test case này ở lần 1 | — | Lịch được ghi nhận đã tiếp nhận | Pass | Test case bổ sung, test 19/11 trên Vercel |
| TC-36 | FR-11 | Có lịch "Đã xác nhận", không phải ngày khám | Thử Tiếp nhận bệnh nhân | Không cho tiếp nhận (nút bị ẩn hoặc khóa, hoặc báo lỗi) | Chưa có test case này ở lần 1 | — | Không cho tiếp nhận lịch ngoài ngày khám | Pass | Test case bổ sung, test 19/11 trên Vercel |
| TC-37 | FR-11 | Có lịch đã tiếp nhận | Bấm Bắt đầu khám | Lịch chuyển sang "Đang khám" | Chưa có test case này ở lần 1 | — | Lịch chuyển sang "Đang khám" | Pass | Test case bổ sung, test 19/11 trên Vercel |
| TC-25 | FR-09 | Có lịch đang khám | Bấm Hoàn thành khám | Lịch chuyển sang "Hoàn thành" | Chưa test được, không đăng nhập được tài khoản bác sĩ do lỗi CAPTCHA | Blocked | Lịch chuyển sang "Hoàn thành" | Pass | Đã sửa #30, test lại 19/11 trên Vercel, điều kiện theo luồng mới |
| TC-38 | FR-11 | Có lịch đang khám | Nhập ghi chú, kết luận, bấm Lưu, đóng rồi mở lại lịch | Ghi chú, kết luận được lưu và hiển thị đúng | Chưa có test case này ở lần 1 | — | Ghi chú, kết luận được lưu và hiển thị đúng khi mở lại | Pass | Test case bổ sung, test 19/11 trên Vercel |
| TC-39 | FR-12 | Có nhiều lịch hẹn | Tìm theo tên bệnh nhân | Danh sách chỉ hiện lịch khớp tên | Chưa có test case này ở lần 1 | — | Danh sách chỉ hiện lịch khớp tên | Pass | Test case bổ sung, test 19/11 trên Vercel |
| TC-40 | FR-12 | Có nhiều lịch hẹn | Tìm theo số điện thoại | Danh sách chỉ hiện lịch khớp số điện thoại | Chưa có test case này ở lần 1 | — | Danh sách chỉ hiện lịch khớp số điện thoại | Pass | Test case bổ sung, test 19/11 trên Vercel |
| TC-41 | FR-12 | Có nhiều lịch hẹn | Tìm theo mã lịch | Hiện đúng lịch có mã đó | Chưa có test case này ở lần 1 | — | Hiện đúng lịch có mã đó | Pass | Test case bổ sung, test 19/11 trên Vercel |
| TC-42 | FR-12 | Có lịch ở nhiều ngày | Lọc theo một ngày | Danh sách chỉ hiện lịch của ngày đó | Chưa có test case này ở lần 1 | — | Danh sách chỉ hiện lịch của ngày đó | Pass | Test case bổ sung, test 19/11 trên Vercel |
| TC-43 | FR-12 | Có lịch ở nhiều trạng thái | Lọc theo một trạng thái | Danh sách chỉ hiện lịch ở trạng thái đó | Chưa có test case này ở lần 1 | — | Danh sách chỉ hiện lịch ở trạng thái đó | Pass | Test case bổ sung, test 19/11 trên Vercel |
| TC-44 | FR-12 | Đang áp dụng bộ lọc hoặc từ khóa tìm kiếm | Xóa bộ lọc | Hiện lại danh sách phù hợp, không còn điều kiện lọc | Chưa có test case này ở lần 1 | — | Hiện lại danh sách phù hợp, không còn điều kiện lọc | Pass | Test case bổ sung, test 19/11 trên Vercel |
| TC-45 | FR-12 | Có nhiều lịch hẹn | Tìm bằng từ khóa không có trong dữ liệu | Hiện thông báo không có kết quả, không hiện lịch nào | Chưa có test case này ở lần 1 | — | Hiện thông báo không có kết quả, không hiện lịch nào | Pass | Test case bổ sung, test 19/11 trên Vercel |

## 5. Giao diện và kiểm tra dữ liệu nhập
| TC | FR | Tiền điều kiện | Các bước | Kết quả mong đợi | Kết quả lần 1 | Pass/Fail lần 1 | Kết quả lần 2 | Pass/Fail lần 2 | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|
| TC-26 | Chung | Mở trang bằng điện thoại (hoặc thu nhỏ trình duyệt) | Mở trang đặt lịch | Hiển thị đủ, không vỡ bố cục | Hiển thị đủ nội dung, không vỡ bố cục | Pass | Không cần test lại | — | Test bằng Chrome DevTools, localhost |
| TC-27 | Chung | Bất kỳ form nào | Để trống ô bắt buộc rồi bấm Gửi | Báo lỗi rõ ràng ở đúng ô | Chưa test được, các form hiện chỉ trả về lỗi CAPTCHA | Blocked | Báo lỗi rõ ràng ở đúng ô bắt buộc để trống | Pass | Đã sửa #30, test lại 19/11 trên Vercel |