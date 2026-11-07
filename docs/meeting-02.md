# PROJECT CHARTER
## CLINICCARE – HỆ THỐNG QUẢN LÝ VÀ ĐẶT LỊCH KHÁM PHÒNG KHÁM ĐA KHOA

**Môn học:** Quản trị dự án phần mềm

**Đơn vị:** Trường Đại học Công nghệ Thông tin và Truyền thông Việt – Hàn (VKU)

**Phiên bản:** 1.0 – Draft

**Ngày lập:** 07/11/2026

**Thời gian thực hiện:** Chưa xác định

**Project Manager:** Đỗ Lê Viết Tài

**Phương pháp quản lý:** Agile/Scrum

---

# 1. THÔNG TIN TỔNG QUAN DỰ ÁN (PROJECT INFORMATION)

| Thuộc tính | Nội dung |
|---|---|
| Tên dự án | ClinicCare |
| Tên đầy đủ | Hệ thống quản lý và đặt lịch khám phòng khám đa khoa |
| Mã dự án | CC-2026 |
| Lĩnh vực | Y tế – Healthcare |
| Loại dự án | Phát triển phần mềm ứng dụng Web |
| Quy mô áp dụng | Phòng khám đa khoa quy mô nhỏ |
| Nền tảng | Web Application |
| Frontend | Next.js |
| Backend / Database | Supabase |
| Quản lý mã nguồn | GitHub |
| Thiết kế giao diện | Figma |
| Phương pháp quản lý | Agile/Scrum |
| Project Manager | Đỗ Lê Viết Tài |
| Thời gian dự kiến | Chưa xác định |

# 2. BUSINESS CASE – CƠ SỞ HÌNH THÀNH DỰ ÁN

## 2.1. Bối cảnh

Trong hoạt động của các phòng khám đa khoa quy mô nhỏ, việc quản lý thông tin bệnh nhân, bác sĩ, lịch khám, hồ sơ khám bệnh và hóa đơn có thể được thực hiện thông qua sổ sách, bảng tính hoặc nhiều công cụ riêng lẻ.

Cách quản lý này có thể dẫn đến một số bất cập như:

- Khó khăn trong việc tìm kiếm và tra cứu thông tin bệnh nhân.
- Khó kiểm soát lịch làm việc và lịch hẹn của bác sĩ.
- Dễ xảy ra tình trạng trùng lịch khám.
- Tốn thời gian trong quá trình tiếp nhận bệnh nhân.
- Khó khăn trong việc lưu trữ và theo dõi lịch sử khám bệnh.
- Việc tổng hợp và thống kê hoạt động phòng khám mất nhiều thời gian.

## 2.2. Lý do thực hiện dự án

Dự án ClinicCare được đề xuất nhằm xây dựng một hệ thống quản lý tập trung trên nền tảng Web, hỗ trợ số hóa các quy trình quản lý và đặt lịch khám tại phòng khám đa khoa quy mô nhỏ.

Hệ thống giúp các nhóm người dùng có thể truy cập và sử dụng những chức năng phù hợp với vai trò của mình, từ đó cải thiện hiệu quả quản lý và nâng cao trải nghiệm của bệnh nhân.

## 2.3. Giá trị mang lại

- Giảm các thao tác quản lý thủ công.
- Hạn chế sai sót trong quá trình quản lý lịch khám.
- Tăng khả năng tra cứu thông tin bệnh nhân.
- Hỗ trợ bác sĩ theo dõi lịch khám và hồ sơ bệnh nhân.
- Giúp lễ tân tiếp nhận và quản lý lịch hẹn thuận tiện hơn.
- Hỗ trợ quản lý phòng khám theo dõi tình hình hoạt động.

# 3. PROJECT OBJECTIVES – MỤC TIÊU DỰ ÁN

## 3.1. Mục tiêu tổng quát

Xây dựng hệ thống ClinicCare trên nền tảng Web nhằm hỗ trợ quản lý các hoạt động cơ bản của phòng khám đa khoa quy mô nhỏ, bao gồm quản lý bệnh nhân, bác sĩ, lịch khám, hồ sơ khám bệnh và các hoạt động liên quan.

## 3.2. Mục tiêu cụ thể

1. Xây dựng hệ thống đăng nhập và phân quyền theo vai trò người dùng.
2. Xây dựng chức năng quản lý thông tin bệnh nhân.
3. Xây dựng chức năng quản lý bác sĩ và chuyên khoa.
4. Xây dựng chức năng đặt lịch và quản lý lịch khám.
5. Hỗ trợ bác sĩ xem lịch khám và quản lý hồ sơ khám bệnh.
6. Hỗ trợ lễ tân tiếp nhận bệnh nhân và xác nhận lịch hẹn.
7. Hỗ trợ quản lý hóa đơn và thanh toán tại phòng khám.
8. Xây dựng giao diện Web thân thiện, dễ sử dụng.
9. Hoàn thành các tài liệu quản trị dự án và sản phẩm theo kế hoạch được nhóm và GVHD thống nhất.

# 4. PROJECT SCOPE – PHẠM VI DỰ ÁN

## 4.1. Phạm vi thực hiện (In Scope)

Dự án tập trung xây dựng các nhóm chức năng sau:

| STT | Module | Mô tả |
|---|---|---|
| 1 | Authentication | Đăng nhập, đăng xuất, phân quyền người dùng |
| 2 | Patient Management | Quản lý thông tin bệnh nhân |
| 3 | Doctor Management | Quản lý bác sĩ và chuyên khoa |
| 4 | Appointment Management | Đặt lịch, xác nhận, hủy và theo dõi lịch khám |
| 5 | Schedule Management | Quản lý lịch làm việc của bác sĩ |
| 6 | Medical Records | Lưu trữ và tra cứu hồ sơ khám bệnh |
| 7 | Invoice Management | Quản lý hóa đơn và trạng thái thanh toán |
| 8 | Dashboard | Thống kê tổng quan hoạt động phòng khám |

### Các nhóm người dùng

**Admin (Quản trị viên):**
- Quản lý tài khoản và phân quyền.
- Quản lý thông tin bác sĩ.
- Quản lý chuyên khoa và dịch vụ.
- Theo dõi hoạt động hệ thống.

**Bác sĩ (Doctor):**
- Xem lịch khám cá nhân.
- Xem thông tin bệnh nhân được phân công.
- Tạo và cập nhật hồ sơ khám bệnh.
- Ghi nhận kết quả khám và đơn thuốc trong phạm vi hệ thống.

**Lễ tân (Receptionist):**
- Tiếp nhận thông tin bệnh nhân.
- Tạo và quản lý lịch hẹn.
- Xác nhận lịch khám.
- Hỗ trợ quản lý hóa đơn.

**Bệnh nhân (Patient):**
- Đăng ký và đăng nhập.
- Xem thông tin bác sĩ.
- Xem lịch khám khả dụng.
- Đặt lịch khám.
- Theo dõi trạng thái lịch hẹn.
- Xem lịch sử khám bệnh được cấp quyền truy cập.

## 4.2. Ngoài phạm vi thực hiện (Out of Scope)

Để đảm bảo dự án phù hợp với nguồn lực và thời gian của nhóm sinh viên, các chức năng sau chưa nằm trong phạm vi triển khai ban đầu:

- Ứng dụng di động Android và iOS riêng biệt.
- Tích hợp thiết bị y tế và máy xét nghiệm.
- Chẩn đoán bệnh bằng trí tuệ nhân tạo (AI).
- Tích hợp bảo hiểm y tế và hệ thống dữ liệu bệnh viện bên ngoài.
- Thanh toán trực tuyến qua ngân hàng hoặc ví điện tử.
- Quản lý nhiều chi nhánh phòng khám.
- Kết nối hệ thống quản lý bệnh án điện tử cấp quốc gia.

Các chức năng ngoài phạm vi chỉ được xem xét nếu có sự thống nhất và phê duyệt thay đổi.

# 5. PROJECT DELIVERABLES – SẢN PHẨM BÀN GIAO

| STT | Deliverable | Mô tả |
|---|---|---|
| 1 | Project Charter | Điều lệ dự án |
| 2 | Project Management Plan | Kế hoạch quản lý dự án |
| 3 | WBS | Cấu trúc phân rã công việc |
| 4 | Gantt Chart | Biểu đồ tiến độ |
| 5 | Risk Register | Bảng quản lý rủi ro |
| 6 | SRS | Tài liệu đặc tả yêu cầu phần mềm |
| 7 | UI/UX Design | Thiết kế giao diện trên Figma |
| 8 | Database Design | Thiết kế cơ sở dữ liệu và ERD |
| 9 | Source Code | Mã nguồn Frontend và Backend |
| 10 | Test Documentation | Kế hoạch và các trường hợp kiểm thử |
| 11 | Deployed Application | Phiên bản ứng dụng Web được triển khai |
| 12 | User Guide | Tài liệu hướng dẫn sử dụng |
| 13 | Final Report | Báo cáo tổng kết dự án |

# 6. PROJECT MILESTONES – CÁC CỘT MỐC QUAN TRỌNG

Do thời gian thực hiện chưa được xác định, các mốc dưới đây được xây dựng theo trình tự triển khai, chưa ấn định ngày hoàn thành.

| STT | Milestone | Nội dung hoàn thành |
|---|---|---|
| M1 | Project Initiation | Khởi động dự án, thống nhất nhóm và Project Charter |
| M2 | Planning Completion | Hoàn thành WBS, Gantt Chart, Risk Register và kế hoạch dự án |
| M3 | Requirements Analysis | Hoàn thành khảo sát và phân tích yêu cầu |
| M4 | System Design | Hoàn thành thiết kế kiến trúc, database và UI/UX |
| M5 | Development | Hoàn thành các chức năng cốt lõi |
| M6 | Integration | Tích hợp các module |
| M7 | Testing | Hoàn thành kiểm thử và sửa lỗi |
| M8 | Deployment | Triển khai phiên bản ứng dụng |
| M9 | Project Closure | Nghiệm thu, báo cáo và đóng dự án |

# 7. PROJECT RESOURCES – NGUỒN LỰC DỰ ÁN

## 7.1. Nguồn nhân lực

Dự án có 5 thành viên, đảm nhiệm các vai trò quản lý, phân tích nghiệp vụ, phát triển phần mềm và kiểm thử.

| STT | Họ và tên | MSSV | Vai trò dự kiến | Trách nhiệm |
|---|---|---|---|---|
| 1 | Đỗ Lê Viết Tài | 23IT.B191 | Project Manager + Tech Lead | Quản lý dự án, Project Charter, Risk Register, GitHub, setup kỹ thuật, deploy và điều phối nhóm |
| 2 | Nguyễn Văn Hoàng | 23IT.B066 | Business Analyst | Khảo sát nghiệp vụ, phân tích yêu cầu, Use Case và User Story |
| 3 | Nguyễn Đức Nhị | 23IT.B156 | Backend Developer + Database | Thiết kế database, xây dựng nghiệp vụ backend và tích hợp Supabase |
| 4 | Lê Đình Phương | 23IT.B170 | Frontend Developer + UI/UX | Thiết kế Figma, xây dựng giao diện Next.js |
| 5 | Arất Thị Bích Phượng | 23IT.B173 | QA + Documentation | Kiểm thử, Test Case, theo dõi lỗi và tài liệu dự án |

*Phân công trên là phương án dự kiến, cần được các thành viên xác nhận chính thức.*

## 7.2. Nguồn lực công nghệ

| Công nghệ / Công cụ | Mục đích |
|---|---|
| Next.js | Phát triển giao diện và ứng dụng Web |
| TypeScript | Ngôn ngữ phát triển |
| Supabase | Backend-as-a-Service, PostgreSQL, Authentication |
| PostgreSQL | Hệ quản trị cơ sở dữ liệu |
| GitHub | Quản lý mã nguồn và cộng tác |
| GitHub Issues / Projects | Theo dõi nhiệm vụ |
| Figma | Thiết kế giao diện |
| Google Drive | Lưu trữ tài liệu |
| Vercel | Dự kiến triển khai ứng dụng Web |

## 7.3. Nguồn lực tài chính

Dự án được thực hiện trong khuôn khổ học phần tại trường đại học.

Nguồn lực tài chính dự kiến:
- Sử dụng các công cụ và nền tảng có gói miễn phí trong phạm vi cho phép.
- Tận dụng máy tính cá nhân và kết nối Internet của thành viên.
- Ưu tiên các dịch vụ miễn phí hoặc chi phí thấp.
- Nếu phát sinh chi phí hosting, tên miền hoặc dịch vụ bên ngoài, nhóm sẽ thống nhất và phê duyệt trước khi sử dụng.

Ngân sách cụ thể sẽ được xác định sau khi hoàn thiện kế hoạch nguồn lực và tiến độ.

# 8. STAKEHOLDER REGISTER – CÁC BÊN LIÊN QUAN

| Stakeholder | Vai trò / Mối quan tâm | Mức độ ảnh hưởng |
|---|---|---|
| GVHD | Hướng dẫn, đánh giá và phê duyệt các nội dung học thuật | Cao |
| Project Manager | Quản lý tiến độ, phạm vi và nguồn lực | Cao |
| Development Team | Phân tích, thiết kế, phát triển và kiểm thử | Cao |
| Chủ phòng khám | Định hướng nhu cầu và quy trình nghiệp vụ | Cao |
| Admin | Quản lý hoạt động và tài khoản hệ thống | Trung bình – Cao |
| Bác sĩ | Sử dụng lịch khám và hồ sơ bệnh nhân | Cao |
| Lễ tân | Tiếp nhận bệnh nhân và quản lý lịch hẹn | Trung bình – Cao |
| Bệnh nhân | Sử dụng chức năng đặt lịch và tra cứu thông tin | Trung bình |

Lưu ý: Chủ phòng khám và người dùng nghiệp vụ hiện là các stakeholder mục tiêu giả định phục vụ phân tích dự án. Nhóm cần khảo sát hoặc xác nhận nhu cầu thực tế nếu có điều kiện tiếp cận phòng khám.

# 9. ASSUMPTIONS – CÁC GIẢ ĐỊNH

Dự án được lập kế hoạch dựa trên các giả định sau:

1. Các thành viên có đủ thiết bị cá nhân và kết nối Internet để tham gia dự án.
2. Các thành viên có khả năng tiếp cận và học tập các công nghệ được lựa chọn.
3. Nhóm có thể sử dụng các dịch vụ miễn phí của Next.js, Supabase, GitHub và Figma trong phạm vi dự án.
4. Các yêu cầu nghiệp vụ được xác định và thống nhất trước khi phát triển từng chức năng.
5. GVHD hỗ trợ định hướng và phản hồi trong quá trình thực hiện.
6. Dự án tập trung mô phỏng hoạt động của một phòng khám đa khoa quy mô nhỏ.
7. Dữ liệu bệnh nhân sử dụng trong quá trình phát triển và kiểm thử là dữ liệu giả lập, không sử dụng thông tin sức khỏe cá nhân thật nếu chưa có cơ sở pháp lý và sự cho phép phù hợp.

# 10. CONSTRAINTS – CÁC RÀNG BUỘC

1. Dự án phải hoàn thành theo thời hạn của học phần do GVHD và nhà trường quy định.
2. Nhân lực dự án giới hạn trong 5 sinh viên.
3. Các thành viên có thể bị giới hạn thời gian do lịch học và các môn học khác.
4. Ngân sách dự án hạn chế, ưu tiên sử dụng công cụ miễn phí.
5. Công nghệ triển khai sử dụng Next.js và Supabase theo định hướng kỹ thuật ban đầu.
6. Sản phẩm cần đáp ứng các yêu cầu đã được nhóm và GVHD thống nhất.
7. Hệ thống phải chú trọng bảo mật thông tin, đặc biệt đối với dữ liệu bệnh nhân và hồ sơ khám bệnh.
8. Chưa triển khai tích hợp với các hệ thống y tế bên ngoài.

# 11. INITIAL RISKS – CÁC RỦI RO SƠ BỘ

| ID | Rủi ro | Xác suất | Tác động | Hướng xử lý |
|---|---|---|---|---|
| R01 | Thành viên không hoàn thành nhiệm vụ đúng thời hạn | Trung bình | Cao | Theo dõi tiến độ, chia nhỏ task và có phương án hỗ trợ |
| R02 | Yêu cầu dự án thay đổi trong quá trình phát triển | Trung bình | Cao | Quản lý thay đổi và đánh giá ảnh hưởng trước khi thực hiện |
| R03 | Thành viên chưa thành thạo Next.js và Supabase | Trung bình | Trung bình | Chia sẻ tài liệu và tổ chức hướng dẫn kỹ thuật |
| R04 | Lỗi cấu hình hoặc kết nối Supabase | Trung bình | Cao | Kiểm tra môi trường và chuẩn bị phương án khắc phục |
| R05 | Xung đột mã nguồn khi tích hợp | Trung bình | Trung bình | Sử dụng Git Branch, Pull Request và Code Review |
| R06 | Thiết kế cơ sở dữ liệu chưa phù hợp nghiệp vụ | Trung bình | Cao | Phân tích yêu cầu và review ERD trước khi triển khai |
| R07 | Thiếu thời gian kiểm thử | Cao | Cao | Bố trí thời gian kiểm thử trong từng Sprint |
| R08 | Phạm vi dự án vượt quá năng lực nhóm | Trung bình | Rất cao | Ưu tiên chức năng cốt lõi và kiểm soát phạm vi |
| R09 | Lộ thông tin cấu hình hoặc khóa truy cập | Thấp | Rất cao | Sử dụng biến môi trường và kiểm soát quyền truy cập |
| R10 | Mất dữ liệu hoặc lỗi trong quá trình triển khai | Thấp | Cao | Sao lưu dữ liệu và kiểm tra trước khi cập nhật hệ thống |

Các rủi ro trên là danh sách sơ bộ. Chi tiết về nguyên nhân, xác suất, tác động, điểm rủi ro, chủ sở hữu và trạng thái sẽ được quản lý trong tài liệu Risk Register riêng.

# 12. SUCCESS CRITERIA – TIÊU CHÍ THÀNH CÔNG

Dự án được xem là thành công khi đáp ứng các tiêu chí sau:

## 12.1. Tiêu chí về quản lý dự án

- Project Charter được các thành viên và GVHD xác nhận.
- Hoàn thành WBS và kế hoạch tiến độ.
- Có Risk Register và được cập nhật định kỳ.
- Có biên bản các cuộc họp quan trọng.
- Các thành viên thực hiện đúng nhiệm vụ đã thống nhất.
- Có báo cáo theo dõi và đánh giá tiến độ.

## 12.2. Tiêu chí về sản phẩm phần mềm

- Ứng dụng Web có thể truy cập và sử dụng được.
- Các chức năng cốt lõi được triển khai theo phạm vi đã thống nhất.
- Người dùng có thể đăng nhập và sử dụng chức năng theo quyền hạn.
- Chức năng quản lý bệnh nhân và đặt lịch hoạt động đúng yêu cầu.
- Bác sĩ và lễ tân có thể thực hiện các nghiệp vụ tương ứng.
- Dữ liệu được lưu trữ và truy xuất chính xác.
- Các lỗi nghiêm trọng được xử lý trước khi nghiệm thu.
- Hệ thống có cơ chế bảo vệ thông tin và phân quyền truy cập phù hợp.

## 12.3. Tiêu chí nghiệm thu

- Hoàn thành các Deliverables đã thống nhất.
- Có tài liệu hướng dẫn sử dụng.
- Có kết quả kiểm thử.
- Có phiên bản ứng dụng được triển khai để trình diễn.
- Được GVHD đánh giá và xác nhận kết quả theo yêu cầu học phần.

# 13. PROJECT GOVERNANCE – CƠ CHẾ QUẢN LÝ DỰ ÁN

## 13.1. Phương pháp quản lý

Dự án áp dụng Agile/Scrum để chia quá trình phát triển thành các Sprint.

Các hoạt động chính:
- Sprint Planning: Xác định mục tiêu và công việc Sprint.
- Daily/Weekly Check-in: Cập nhật tiến độ và khó khăn.
- Sprint Review: Đánh giá kết quả sau Sprint.
- Sprint Retrospective: Đánh giá cách làm việc và cải tiến.

## 13.2. Quy trình quản lý mã nguồn

- Repository chính được quản lý trên GitHub.
- Nhánh `main` lưu phiên bản ổn định.
- Nhánh `develop` dùng để tích hợp chức năng.
- Các chức năng phát triển trên nhánh `feature/*`.
- Các thay đổi được gửi qua Pull Request.
- Thành viên thực hiện review chéo trước khi merge.
- Project Manager/Tech Lead chịu trách nhiệm kiểm soát việc tích hợp.

## 13.3. Quản lý thay đổi

Mọi thay đổi ảnh hưởng đến phạm vi, thời gian, chi phí hoặc chức năng chính của dự án cần được ghi nhận, đánh giá tác động và thống nhất trước khi triển khai.

Project Manager chịu trách nhiệm điều phối việc đánh giá thay đổi với các thành viên và trình GVHD xem xét khi cần thiết.

# 14. PROJECT AUTHORIZATION – PHÊ DUYỆT DỰ ÁN

Việc phê duyệt Project Charter xác nhận rằng các bên liên quan đã xem xét và thống nhất định hướng, mục tiêu và phạm vi ban đầu của dự án.

Project Manager được trao quyền điều phối các hoạt động, phân công nhiệm vụ, theo dõi tiến độ và quản lý nguồn lực trong phạm vi đã thống nhất.

## 14.1. Thông tin xác nhận của nhóm dự án

**Trưởng nhóm / Project Manager + Tech Lead**

- Họ và tên: Đỗ Lê Viết Tài
- MSSV: 23IT.B191
- Số điện thoại: 0384406365
- Email: taidlv.23itb@vku.udn.vn

Chữ ký: ....................................................

**Thành viên 2**

- Họ và tên: Nguyễn Văn Hoàng
- MSSV: 23IT.B066
- Email: hoangnv3.23itb@vku.udn.vn

Chữ ký: ....................................................

**Thành viên 3**

- Họ và tên: Nguyễn Đức Nhị
- MSSV: 23IT.B156
- Email: nhind.23itb@vku.udn.vn

Chữ ký: ....................................................

**Thành viên 4**

- Họ và tên: Lê Đình Phương
- MSSV: 23IT.B170
- Email: phuongld.23itb@vku.udn.vn

Chữ ký: ....................................................

**Thành viên 5**

- Họ và tên: Arất Thị Bích Phượng
- MSSV: 23IT.B173
- Email: phuongatb.23itb@vku.udn.vn

Chữ ký: ....................................................

