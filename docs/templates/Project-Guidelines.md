# HƯỚNG DẪN & YÊU CẦU ĐỒ ÁN MÔN HỌC QUẢN TRỊ DỰ ÁN PHẦN MỀM (QLDA)

**Học phần:** Quản Trị Dự Án Phần Mềm (Software Project Management)  
**Đơn vị đào tạo:** Khoa Khoa học Máy tính — Trường Đại học Công nghệ Thông tin & Truyền thông Việt - Hàn (VKU)  
**Giảng viên phụ trách:** TS. Nguyễn Thanh Tuấn  
**Lớp học phần áp dụng:** `Quản trị dự án phần mềm (4)` và `Quản trị dự án phần mềm (5)`  
**Trọng số đánh giá:** 50% tổng điểm học phần  
**Hình thức nộp:** Nộp một lần duy nhất qua 01 đường link **Thư mục Google Drive** tổng hợp toàn bộ hồ sơ  
**Bảo vệ cuối kỳ:** Thuyết trình & Live Demo 16 phút trước Hội đồng chuyên môn

---

## 🎯 1. Triết Lý & Yêu Cầu Cốt Lõi: "DỰ ÁN PHẦN MỀM THẬT" (THE AUTHENTIC PROJECT RULE)

Khác với các môn lý thuyết thuần túy, đồ án môn Quản trị dự án phần mềm tại VKU yêu cầu sinh viên chuyển đổi từ tư duy **"lập trình viên đơn lẻ"** sang tư duy **"nhà quản trị dự án kỹ thuật chuyên nghiệp"**.

⚠️ **MANDATORY POLICY — DỰ ÁN THẬT, BẰNG CHỨNG THẬT:**
Đồ án bắt buộc phải là một **dự án phần mềm THẬT quy mô nhỏ** (Small-scale Authentic Software Project). Tuyệt đối **không chấp nhận** các đồ án giả lập trên giấy (paper-only plans) hoặc các sản phẩm chỉ dừng lại ở giao diện tĩnh (mockups).

### Tiêu chuẩn một "Dự án thật" (Authentic Project):
1. **Kho mã nguồn thực tế (Authentic Git Repository):** Lịch sử commit trải đều liên tục suốt 15 tuần học kỳ từ tất cả các thành viên trong nhóm; cấm tuyệt đối hành vi "dump commit" (dồn cả chục nghìn dòng code nộp trước giờ G).
2. **Sản phẩm chạy thực tế (Live Runnable Deliverable):** Được triển khai hoàn chỉnh trên môi trường cloud công khai qua giao thức HTTPS (Cloudflare Pages, Vercel, Supabase, Render...) hoặc file cài đặt di động (APK).
3. **Người thụ hưởng thật (Real Stakeholder):** Khách hàng doanh nghiệp, đối tác freelance, giảng viên, phòng ban, thư viện, hoặc các câu lạc bộ sinh viên tại VKU.
4. **Xử lý ít nhất 01 thách thức quản lý thực tế:** Trong suốt học kỳ, nhóm phải chứng minh đã đối mặt và giải quyết thành công ít nhất 01 biến cố quản lý dự án (yêu cầu thay đổi phạm vi - Scope Change, rủi ro kỹ thuật phát sinh, hoặc xử lý trễ hạn tiến độ).

---

## 🧭 2. Ba Hướng Nguồn Gốc Đề Tài (3 Sourcing Pathways)

Sinh viên lựa chọn 1 trong 3 con đường theo Điều lệ dự án ([`Project-Charter-Template.md`](Project-Charter-Template.md) mục 2):

| Sourcing Pathway | Mô tả chi tiết | Khách hàng / Stakeholder nghiệm thu |
|---|---|---|
| **Pathway 1: Kế thừa / Song hành Đồ án chuyên ngành (Khuyến nghị)** | Bao bọc khung quản trị dự án chuyên nghiệp quanh Đồ án môn học song hành (Phát triển ứng dụng di động đa nền tảng, Kỹ thuật AI, Công nghệ Web). Môn QLDA không bắt code lại từ đầu mà tập trung đánh giá **quy trình, chỉ số quản trị, bảng task và bằng chứng kiểm soát**. | Giảng viên hướng dẫn chuyên ngành / Nhóm người dùng thử nghiệm |
| **Pathway 2: Khách hàng bên ngoài / Freelance / Doanh nghiệp** | Xây dựng sản phẩm giải quyết bài toán thực tế cho một doanh nghiệp, cửa hàng kinh doanh, startup hoặc dự án freelance có thật bên ngoài. | Khách hàng đại diện doanh nghiệp (có ký xác nhận hoặc gửi email nghiệm thu chính thức) |
| **Pathway 3: Bài toán vận hành thực tế tại VKU** | Giải quyết nhu cầu chuyển đổi số cho các phòng ban, thư viện, phòng thí nghiệm, trung tâm khởi nghiệp hoặc câu lạc bộ sinh viên VKU. | Cán bộ phụ trách phòng ban / Ban chủ nhiệm CLB sinh viên |

---

## 👥 3. Quy Mô Nhóm & 5 Vai Trò Kỹ Thuật Chuẩn

Mỗi nhóm gồm **3 đến 5 sinh viên**, phân công rõ ràng 5 vai trò theo chuẩn công nghiệp ([`Project-Charter-Template.md`](Project-Charter-Template.md) mục 10):

1. **Project Lead / Project Manager (PM) / Scrum Master:** Quản lý tiến độ tổng thể, duy trì bảng GitHub Projects, điều phối rủi ro, kiểm soát thay đổi phạm vi (Scope Creep) và liên lạc với Stakeholder.
2. **Technical Lead / System Architect:** Quyết định kiến trúc hệ thống, thiết kế cơ sở dữ liệu, thiết lập đường ống tự động CI/CD (GitHub Actions) và kiểm duyệt các Pull Request cốt lõi.
3. **Backend Engineer:** Xây dựng API endpoints, xử lý logic nghiệp vụ phía máy chủ, bảo mật phân quyền và giao dịch dữ liệu.
4. **Frontend / Mobile Engineer:** Phát triển giao diện người dùng đáp ứng (Responsive UI), trải nghiệm người dùng (UX), tích hợp API và luồng tương tác thực tế.
5. **QA & Test Engineer:** Thiết kế ma trận kiểm thử (Test Matrix), viết Unit/Integration Tests, kiểm tra tiêu chí nghiệm thu (Acceptance Criteria), đảm bảo Definition of Done (DoD) và tổng hợp Gói bằng chứng.

---

## 🛠️ 4. Hệ Sinh Thái Quản Trị Dự Án Thống Nhất: GITHUB ECOSYSTEM

Theo quy định tại Mục 7 của Project Charter, toàn bộ các nhóm sử dụng **nền tảng GitHub thống nhất** làm bộ công cụ quản lý dự án (không sử dụng rời rạc Trello hay Notion):

* **GitHub Repository:** Quản lý mã nguồn tập trung, bật Branch Protection trên nhánh `main`, tuân thủ quy chuẩn **Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`).
* **GitHub Projects (Board & Table):** Quản lý luồng công việc Agile/Kanban với các cột: `Backlog`, `Ready`, `In Progress`, `In Review`, `Done`. Xuất biểu đồ Burndown Chart theo từng Sprint.
* **GitHub Issues:** Mỗi nhiệm vụ WBS hoặc User Story tương ứng với 01 Issue có tiêu chí chấp nhận (Acceptance Criteria), người phụ trách và mốc Milestone.
* **GitHub Pull Requests (PRs):** Mọi dòng code nhập vào nhánh chính đều phải thông qua PR, có ghi chú tự kiểm thử và ít nhất 01 thành viên duyệt (Peer Review Approval).
* **GitHub Actions:** Tự động hóa kiểm tra mã nguồn (Linting, Formatting, Build Test) trên mỗi PR.

---

## 📦 5. Gói Bằng Chứng 7 Hạng Mục Bắt Buộc + Slide (Evidence Package) & Thư Mục Google Drive

Căn cứ trên tài liệu Gói bằng chứng đồ án môn học, sinh viên nộp **MỘT LẦN DUY NHẤT** toàn bộ hồ sơ thông qua **01 đường link Thư mục Google Drive** được tổ chức khoa học:

### Cấu trúc chuẩn của Thư mục Google Drive:
```text
📁 [TÊN_NHÓM] - [MÃ_DỰ_ÁN] - GOI_BANG_CHUNG_QLDA/
├── 📄 01_Final_Technical_Report.pdf          # Báo cáo tổng kết kỹ thuật 15-25 trang (7 chương chuẩn)
├── 📄 02_Project_Charter_Signed.pdf          # Điều lệ dự án 13 mục chuẩn hóa có chữ ký PO & Thầy
├── 📄 03_WBS_and_WBS_Dictionary.pdf          # Cây phân rã công việc WBS & Từ điển WBS (100% Rule)
├── 📄 04_Risk_Register_Evolution.xlsx        # Bảng theo dõi rủi ro cập nhật qua Sprint 1 & Sprint 2
├── 📄 05_Sprint_Retrospectives.pdf           # Biên bản Sprint 1 Retro & Final Retro (4Ls / Sailboat)
├── 📄 06_Scope_Change_Control_Record.pdf     # Hồ sơ xử lý thay đổi phạm vi thực tế (Approved CR)
├── 📄 07_Stakeholder_Acceptance_Signoff.pdf  # Biên bản nghiệm thu UAT hoặc email từ Client/Stakeholder thật
└── 📄 08_Presentation_Slide_Deck.pdf         # Bộ slide thuyết trình bảo vệ trước Hội đồng (8-10 slides)
```

> [!IMPORTANT]
> **Yêu cầu bảo mật & phân quyền Thư mục Drive:**  
> Thư mục Google Drive BẮT BUỘC phải mở quyền: **"Bất kỳ ai có đường liên kết đều có thể xem" (Anyone with the link can view)**. Nếu để chế độ riêng tư (Private) khiến Hội đồng không thể thẩm định, hồ sơ sẽ bị đánh trượt Cổng chân thực!

---

## 📑 6. Cấu Trúc 7 Chương Chuẩn Của Báo Cáo Tổng Kết Kỹ Thuật (Final Technical Report)

Báo cáo tổng kết kỹ thuật (15–25 trang PDF) là tài liệu tổng hợp toàn diện cả học kỳ, được cấu trúc theo 7 chương chuẩn mực:

1. **Chương 1: Tổng quan dự án & Bối cảnh nghiệp vụ (Executive Summary & Business Case)**  
   * Bối cảnh thực tế, vấn đề cốt lõi cần giải quyết, giải pháp phần mềm đề xuất và các mục tiêu SMART (kế thừa từ Project Charter).
2. **Chương 2: Lựa chọn phương pháp luận & Cơ cấu quản trị (Methodology & Team Governance)**  
   * Giải trình lý do lựa chọn Agile/Scrum, Kanban hoặc Hybrid; quy định vai trò 5 thành viên và tỷ lệ đóng góp (%).
3. **Chương 3: Đường cơ sở phạm vi & Phân rã công việc (Scope Baseline, WBS & WBS Dictionary)**  
   * Đặc tả In-Scope và Out-of-Scope; sơ đồ cây WBS tuân thủ 100% Rule; bảng từ điển WBS chi tiết cho các gói công việc 1–2 tuần.
4. **Chương 4: Ước lượng, Lịch trình & Vận tốc đội ngũ (Estimation, CPM Schedule & Velocity)**  
   * Phương pháp ước lượng Story Points qua Planning Poker; sơ đồ CPM xác định đường găng; vận tốc thực tế (Velocity) qua các Sprint.
5. **Chương 5: Thực thi & Kiểm soát chất lượng (Execution, Testing, CI/CD & DoD)**  
   * Phân tích lịch sử commit trên GitHub; báo cáo kiểm thử (Unit test, Integration test); quy trình CI/CD GitHub Actions; kiểm soát Definition of Done.
6. **Chương 6: Quản trị rủi ro & Kiểm soát thay đổi phạm vi (Risk Evolution & Scope Change Control)**  
   * Sự tiến hóa của bảng Risk Register qua 2 đợt (các rủi ro thực tế xảy ra và biện pháp xử lý); hồ sơ Change Request đã được CCB phê duyệt.
7. **Chương 7: Nghiệm thu, Đóng dự án & Bài học kinh nghiệm (Project Closure, UAT & Lessons Learned)**  
   * Kết quả kiểm thử chấp nhận người dùng (UAT); biên bản nghiệm thu của Stakeholder; bài học xương máu về quản lý phạm vi, ước lượng và phối hợp nhóm.

> [!CAUTION]
> **Quy tắc văn phong sống còn: VIẾT Ở THÌ QUÁ KHỨ (PAST TENSE):**  
> Báo cáo tổng kết là hồ sơ kiểm toán lịch sử đã diễn ra, tuyệt đối không dùng thì tương lai (*"Nhóm chúng em sẽ làm..."*). Phải viết: *"Trong Sprint 1, nhóm đã triển khai module xác thực OAuth2 (commit 4a2b1f). Khi thử nghiệm gặp lỗi rate limit, nhóm đã bổ sung Redis cache để khắc phục."*

---

## ⚖️ 7. Tiêu Chuẩn Đánh Giá & Rubric Chấm Điểm Bảo Vệ (Thang 10)

Căn cứ trên tiêu chuẩn đánh giá đồ án môn học, điểm đồ án được đánh giá theo 4 thành phần có trọng số sau khi đã vượt qua Cổng chân thực:

| Thành phần đánh giá | Trọng số | Tiêu chí thẩm định của Hội đồng |
|---|:---:|---|
| **Cổng chân thực (Authenticity Gate)** | **Pass / Fail** | **Điều kiện tiên quyết:** Repo thật có commit đều đặn cả kỳ; sản phẩm chạy thật trên cloud; có xác nhận nghiệm thu từ stakeholder thật; giải quyết ít nhất 1 biến cố quản lý thực tế.<br>⚠️ *Nếu không đạt: Điểm tổng kết đồ án bị khống chế tối đa 5.0/10.* |
| **1. Tính đầy đủ & khả thi của kế hoạch** | **30%** | Chất lượng Điều lệ dự án (Charter), mức độ phân rã WBS chuẩn 100% Rule, từ điển WBS và tính thực tế của bảng rủi ro ban đầu. |
| **2. Sự phù hợp phương pháp luận** | **20%** | Giải trình phương pháp luận Agile/Scrum/Hybrid phù hợp bối cảnh; bằng chứng tổ chức các cuộc họp Sprint và biên bản Retrospective chất lượng (Sprint 1 & Final Retro). |
| **3. Bằng chứng thực thi thực tế** | **30%** | Lịch sử commit đều đặn trên GitHub; chất lượng Pull Request và CI Actions; tiến độ đóng ticket trên bảng GitHub Projects; biểu đồ Burndown; hồ sơ Change Request thực tế. |
| **4. Thuyết trình, Live Demo & Trả lời Q&A** | **20%** | Thuyết trình 16 phút chuyên nghiệp, live demo mượt mà trên hệ thống thật (Zero Crash), bảo vệ thuyết phục các quyết định kỹ thuật trước Hội đồng. |

---

## 🎤 8. Quy Cách Buổi Bảo Vệ Đồ Án Cuối Kỳ (Capstone Defense Protocol)

Mỗi nhóm có tổng thời lượng **16 phút** (đồng hồ đếm ngược nghiêm ngặt):
```text
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ 1. Thuyết trình slide   │ 2. Trực tiếp Demo live  │ 3. Hội đồng phản biện   │
│    (6 Phút — 8-10 trang)│    sản phẩm (5 Phút)    │    & Hỏi - Đáp (5 Phút) │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

* **Bộ slide khuyến nghị (8–10 slides):**
  1. Slide 1: Tên dự án, Sourcing Pathway, danh sách thành viên & vai trò.
  2. Slide 2: Vấn đề thực tế cần giải quyết & Business Case.
  3. Slide 3: Kiến trúc hệ thống & Cơ cấu phân rã WBS.
  4. Slide 4: Chỉ số thực thi (Velocity, Burndown Chart, PR Throughput).
  5. Slide 5: Thách thức quản lý lớn nhất đã giải quyết (Risk hoặc Scope Change).
  6. Slide 6: Kết quả nghiệm thu từ Stakeholder (UAT Sign-off).
  7. Slide 7: Bài học kinh nghiệm hàng đầu (Top Lessons Learned).
* **Nguyên tắc Live Demo:** Chuẩn bị dữ liệu mẫu sạch sẽ, có phương án dự phòng ngoại tuyến (Docker local / Video backup) đề phòng sự cố mạng Wi-Fi, tập trung demo thẳng vào luồng giá trị cốt lõi (Core Workflow).

---

## 🔗 9. Hướng Dẫn Nộp Bài Trực Tuyến & Biểu Mẫu Chính Thức

1. **Biểu mẫu nộp bài Google Form (All-in-One Drive Link):**  
   Mỗi nhóm cử 01 đại diện (Project Lead / Scrum Master) điền thông tin và đính kèm đường link Thư mục Google Drive.
2. **Kịch bản tự động hóa cho Giảng viên:**  
   - Script tạo Google Form & kết nối Google Sheets: [`create_qlda_submission_form.gs`](create_qlda_submission_form.gs)
   - Cẩm nang hướng dẫn chi tiết cho Giảng viên: [`NOP_BAO_CAO_QLDA_GOOGLE_FORM.md`](NOP_BAO_CAO_QLDA_GOOGLE_FORM.md)
3. **Các tài liệu mẫu tham chiếu:**
   - [`Project-Charter-Template.md`](Project-Charter-Template.md) | [Bản in PDF](Project-Charter-Template.pdf) | [Bản xem HTML](Project-Charter-Template.html)
   - [`Project-Charter-Example.md`](Project-Charter-Example.md) (Ví dụ dự án mẫu tham khảo)
   - [`Risk-Register-Template.md`](Risk-Register-Template.md) (Mẫu bảng theo dõi rủi ro)
   - [`Week-14-Evidence-Package-Checklist.md`](Week-14-Evidence-Package-Checklist.md) (Checklist kiểm tra 8 Deliverables)
   - [`Milestone-Rubric.md`](Milestone-Rubric.md) (Rubric đánh giá chi tiết)
