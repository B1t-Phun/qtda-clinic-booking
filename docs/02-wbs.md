# WBS và WBS Dictionary

- **Dự án:** Hệ thống quản lý đặt lịch phòng khám
- **Phiên bản:** 1.0, ngày 08/11/2026
- **Người lập:** Arất Thị Bích Phượng
- **Thời gian dự án:** 04/11/2026 đến 17/11/2026 (2 tuần)

## 1. Nguyên tắc lập WBS
- Phân rã theo deliverable, tuân thủ quy tắc 100%: các gói con cộng lại bằng đúng phạm vi gói cha.
- Dự án chỉ kéo dài 2 tuần nên gói công việc dài 1-4 ngày (thay vì 1-2 tuần) để đủ chi tiết cho việc giao việc và theo dõi.
- Mỗi gói công việc có một người chịu trách nhiệm chính và gắn với Issue trên GitHub.

## 2. Cấu trúc phân rã công việc
0. Hệ thống quản lý đặt lịch phòng khám
    1. Quản lý dự án
        - 1.1 Project Charter
        - 1.2 WBS và WBS Dictionary
        - 1.3 Risk Register (v1, v2)
        - 1.4 Họp nhóm và biên bản
    2. Phân tích và thiết kế
        - 2.1 Đặc tả yêu cầu và use case
        - 2.2 Thiết kế database
        - 2.3 Wireframe giao diện
    3. Phát triển
        - 3.1 Khởi tạo project và kết nối Supabase
        - 3.2 Đăng nhập và phân quyền
        - 3.3 Module Admin
        - 3.4 Module Bệnh nhân
        - 3.5 Module Bác sĩ
        - 3.6 Validate form và responsive
    4. Kiểm thử và sửa lỗi
        - 4.1 Viết test case
        - 4.2 Thực hiện test và báo lỗi
        - 4.3 Sửa lỗi
    5. Triển khai
        - 5.1 Deploy lên Vercel
    6. Báo cáo và bảo vệ
        - 6.1 Final Report và Evidence Checklist
        - 6.2 Slide bảo vệ và tự đánh giá Rubric

## 3. WBS Dictionary
Bảng chi tiết 19 gói công việc nằm trong file `WBS_Dictionary.xlsx` cùng thư mục.

## 4. Kiểm tra quy tắc 100%
- Mọi deliverable của dự án (báo cáo 1-5, code, bản deploy) đều có trong WBS.
- Các mục ngoài phạm vi (thanh toán online, hồ sơ bệnh án, gửi SMS) không có trong WBS, đúng như Project Charter.