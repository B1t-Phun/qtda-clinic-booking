const pptxgen = require('pptxgenjs');
const path = require('path');

async function createPresentation() {
  const pres = new pptxgen();
  // Microsoft PowerPoint standard widescreen 16:9 (13.333" x 7.5")
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'Nhóm QTDA ClinicCare';
  pres.company = 'ClinicCare';
  pres.title = 'Báo cáo Tiến độ Dự án ClinicCare';

  // Professional Clinic Theme
  const C_NAVY = '1E3A8A';
  const C_BLUE = '2563EB';
  const C_TEAL = '0D9488';
  const C_DARK = '0F172A';
  const C_GRAY = '475569';
  const C_MUTED = '64748B';
  const C_LIGHT = 'F8FAFC';
  const C_WHITE = 'FFFFFF';
  const C_CARD = 'FFFFFF';
  const C_BORDER = 'E2E8F0';
  const C_GREEN = '16A34A';
  const C_AMBER = 'D97706';
  const C_RED = 'DC2626';

  // Standard Header for 13.333" x 7.5"
  function addHeader(slide, title, category = 'CLINICCARE · BÁO CÁO TIẾN ĐỘ DỰ ÁN QUẢN LÝ ĐẶT LỊCH KHÁM') {
    slide.addText(category.toUpperCase(), {
      x: 0.8,
      y: 0.45,
      w: 11.73,
      h: 0.25,
      fontSize: 10,
      fontFace: 'Arial',
      bold: true,
      color: C_BLUE,
      charSpacing: 1.2,
    });

    slide.addText(title, {
      x: 0.8,
      y: 0.75,
      w: 11.73,
      h: 0.55,
      fontSize: 22,
      fontFace: 'Arial',
      bold: true,
      color: C_DARK,
    });

    slide.addShape(pres.ShapeType.rect, {
      x: 0.8,
      y: 1.35,
      w: 11.73,
      h: 0.02,
      fill: { color: C_BORDER },
      line: { color: C_BORDER },
    });
  }

  function addFooter(slide, current, total = 15) {
    slide.addText(`Học phần Quản lý Dự án CNTT · Dự án ClinicCare · Trang ${current}/${total}`, {
      x: 0.8,
      y: 7.0,
      w: 11.73,
      h: 0.3,
      fontSize: 9.5,
      fontFace: 'Arial',
      color: C_MUTED,
      align: 'right',
    });
  }

  // ==========================================
  // SLIDE 1: BÌA (TITLE SLIDE)
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_NAVY };

    // Decorative vertical bar
    s.addShape(pres.ShapeType.rect, {
      x: 0.8,
      y: 1.5,
      w: 0.12,
      h: 4.5,
      fill: { color: C_TEAL },
      line: { color: C_TEAL },
    });

    s.addText('HỌC PHẦN: QUẢN LÝ DỰ ÁN CÔNG NGHỆ THÔNG TIN', {
      x: 1.2,
      y: 1.5,
      w: 11.0,
      h: 0.35,
      fontSize: 12,
      fontFace: 'Arial',
      bold: true,
      color: '93C5FD',
      charSpacing: 1.5,
    });

    s.addText('BÁO CÁO TIẾN ĐỘ DỰ ÁN\nCLINICCARE', {
      x: 1.2,
      y: 1.95,
      w: 11.0,
      h: 1.5,
      fontSize: 34,
      fontFace: 'Arial',
      bold: true,
      color: C_WHITE,
      lineSpacing: 40,
    });

    s.addText('Nền tảng Quản trị & Đặt lịch Khám bệnh Trực tuyến Thông minh', {
      x: 1.2,
      y: 3.65,
      w: 11.0,
      h: 0.45,
      fontSize: 16,
      fontFace: 'Arial',
      color: 'E2E8F0',
    });

    // Metadata card
    s.addShape(pres.ShapeType.roundRect, {
      x: 1.2,
      y: 4.4,
      w: 11.0,
      h: 1.8,
      rectRadius: 0.1,
      fill: { color: '1E293B' },
      line: { color: '334155', width: 1 },
    });

    s.addText([
      { text: '• Công nghệ: ', options: { bold: true, color: '93C5FD' } },
      { text: 'Next.js 16 (App Router) · Express.js · PostgreSQL 15 (Supabase Database)\n', options: { color: C_WHITE } },
      { text: '• Phân hệ: ', options: { bold: true, color: '93C5FD' } },
      { text: 'Cổng Bệnh nhân (/client) · Bác sĩ (/doctor) · Quản trị viên (/admin)\n', options: { color: C_WHITE } },
      { text: '• Tính năng nổi bật: ', options: { bold: true, color: '93C5FD' } },
      { text: 'Khóa chống trùng lịch GiST, Phân quyền RLS, Hồ sơ bệnh án điện tử\n', options: { color: C_WHITE } },
      { text: '• Repository: ', options: { bold: true, color: '93C5FD' } },
      { text: 'https://github.com/B1t-Phun/qtda-clinic-booking', options: { color: '67E8F9' } },
    ], {
      x: 1.5,
      y: 4.6,
      w: 10.4,
      h: 1.4,
      fontSize: 11,
      fontFace: 'Arial',
      lineSpacing: 18,
    });
  }

  // ==========================================
  // SLIDE 2: BỐI CẢNH & MỤC TIÊU DỰ ÁN
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_LIGHT };
    addHeader(s, '1. Bối cảnh, Vấn đề Thực tế & Mục tiêu Dự án');
    addFooter(s, 2);

    // Box 1: Pain Points (Left, w = 5.7)
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.8,
      y: 1.6,
      w: 5.7,
      h: 5.0,
      rectRadius: 0.08,
      fill: { color: C_CARD },
      line: { color: 'EF4444', width: 1.5 },
    });

    s.addText('⚠️ VẤN ĐỀ THỰC TẾ (PAIN POINTS)', {
      x: 1.1,
      y: 1.85,
      w: 5.1,
      h: 0.4,
      fontSize: 14,
      fontFace: 'Arial',
      bold: true,
      color: C_RED,
    });

    s.addText([
      { text: '• Thời gian chờ đợi kéo dài:\n', options: { bold: true, color: C_DARK } },
      { text: 'Bệnh nhân mất từ 2 - 3 giờ chỉ để bốc số thứ tự và chờ đến lượt tại phòng khám truyền thống.\n\n', options: { color: C_GRAY } },
      { text: '• Thiếu minh bạch thông tin bác sĩ & dịch vụ:\n', options: { bold: true, color: C_DARK } },
      { text: 'Người bệnh khó tra cứu lịch trực, trình độ chuyên môn, chi phí khám trước khi đến.\n\n', options: { color: C_GRAY } },
      { text: '• Quản lý lịch thủ công dễ gây sai sót:\n', options: { bold: true, color: C_DARK } },
      { text: 'Ghi sổ hoặc dùng bảng tính Excel phân tán dễ dẫn đến trùng lịch (double-booking) giữa các ca.\n\n', options: { color: C_GRAY } },
      { text: '• Bác sĩ bị động trong khâu tiếp đón:\n', options: { bold: true, color: C_DARK } },
      { text: 'Không nắm trước hồ sơ y tế và lý do khám của bệnh nhân để chuẩn bị kế hoạch khám chu đáo.', options: { color: C_GRAY } },
    ], {
      x: 1.1,
      y: 2.35,
      w: 5.1,
      h: 4.0,
      fontSize: 11,
      fontFace: 'Arial',
      lineSpacing: 16,
    });

    // Box 2: Solutions (Right, w = 5.7, x = 6.83)
    s.addShape(pres.ShapeType.roundRect, {
      x: 6.83,
      y: 1.6,
      w: 5.7,
      h: 5.0,
      rectRadius: 0.08,
      fill: { color: C_CARD },
      line: { color: C_BLUE, width: 1.5 },
    });

    s.addText('🎯 GIẢI PHÁP TỔNG THỂ CỦA CLINICCARE', {
      x: 7.13,
      y: 1.85,
      w: 5.1,
      h: 0.4,
      fontSize: 14,
      fontFace: 'Arial',
      bold: true,
      color: C_BLUE,
    });

    s.addText([
      { text: '• Đặt lịch 3 bước trực quan trong 1 phút:\n', options: { bold: true, color: C_DARK } },
      { text: 'Bệnh nhân chủ động chọn chuyên khoa, bác sĩ và khung giờ còn trống nhanh chóng.\n\n', options: { color: C_GRAY } },
      { text: '• Cơ chế chống trùng Slot tuyệt đối:\n', options: { bold: true, color: C_DARK } },
      { text: 'Áp dụng khóa giao dịch và ràng buộc GiST Exclusion trực tiếp tại database PostgreSQL.\n\n', options: { color: C_GRAY } },
      { text: '• Phân quyền 3 vai trò độc lập & bảo mật:\n', options: { bold: true, color: C_DARK } },
      { text: 'Cổng Bệnh nhân (/client), Bác sĩ (/doctor), Quản trị (/admin) được kiểm soát nghiêm ngặt bằng RLS.\n\n', options: { color: C_GRAY } },
      { text: '• Trải nghiệm hiện đại & Đa nền tảng:\n', options: { bold: true, color: C_DARK } },
      { text: 'Giao diện Responsive chuẩn Tailwind CSS tương thích từ điện thoại 375px đến máy tính để bàn.', options: { color: C_GRAY } },
    ], {
      x: 7.13,
      y: 2.35,
      w: 5.1,
      h: 4.0,
      fontSize: 11,
      fontFace: 'Arial',
      lineSpacing: 16,
    });
  }

  // ==========================================
  // SLIDE 3: KIẾN TRÚC TỔNG THỂ HỆ THỐNG
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_LIGHT };
    addHeader(s, '2. Kiến trúc Hệ thống Tổng thể (3-Tier Architecture)');
    addFooter(s, 3);

    const cols = [
      {
        title: 'CLIENT TIER (GIAO DIỆN)',
        badge: 'FRONTEND · PORT 3000',
        color: C_BLUE,
        items: [
          '• Framework: Next.js 16 (App Router) với Server & Client Components.',
          '• Ngôn ngữ: TypeScript nghiêm ngặt, kiểm soát 100% type safety.',
          '• Styling: Tailwind CSS responsive từ Mobile (375px) đến Desktop.',
          '• 3 Cổng tương tác: Bệnh nhân (/client), Bác sĩ (/doctor), Quản trị (/admin).',
          '• State & Context: Quản lý session qua HttpOnly Cookie an toàn.',
        ],
      },
      {
        title: 'APPLICATION TIER (NGHIỆP VỤ)',
        badge: 'BACKEND API · PORT 5000',
        color: C_TEAL,
        items: [
          '• Runtime: Node.js & Express.js RESTful API.',
          '• Modular Route Handlers: auth, patient, doctor, appointment, admin.',
          '• Middleware kiểm soát: Xác thực JWT, Rate Limiting, CORS, Error Handling.',
          '• Xử lý nghiệp vụ: Quản lý ca khám, cập nhật trạng thái hẹn, hoàn tất hồ sơ khám.',
          '• Đồng bộ môi trường: Kịch bản sync-env.mjs tự động đồng bộ biến môi trường.',
        ],
      },
      {
        title: 'DATA TIER (CƠ SỞ DỮ LIỆU)',
        badge: 'POSTGRESQL 15 (SUPABASE)',
        color: C_NAVY,
        items: [
          '• Hệ quản trị: PostgreSQL 15 quản trị đám mây trên Supabase.',
          '• Row Level Security (RLS): Kiểm soát truy cập trực tiếp tại tầng cơ sở dữ liệu.',
          '• Khóa bstraint: GiST Exclusion Constraint chống trùng lịch cùng ca.',
          '• Toàn vẹn tham chiếu: ON DELETE CASCADE / RESTRICT theo logic y tế.',
          '• Index tối ưu hóa: B-Tree Index trên doctor_id, patient_id, appointment_date.',
        ],
      },
    ];

    cols.forEach((col, i) => {
      const x = 0.8 + i * 4.0;
      s.addShape(pres.ShapeType.roundRect, {
        x,
        y: 1.6,
        w: 3.73,
        h: 5.0,
        rectRadius: 0.08,
        fill: { color: C_CARD },
        line: { color: col.color, width: 1.5 },
      });

      s.addText(col.title, {
        x: x + 0.25,
        y: 1.85,
        w: 3.23,
        h: 0.35,
        fontSize: 12,
        fontFace: 'Arial',
        bold: true,
        color: col.color,
      });

      s.addShape(pres.ShapeType.roundRect, {
        x: x + 0.25,
        y: 2.25,
        w: 3.23,
        h: 0.3,
        rectRadius: 0.05,
        fill: { color: 'F1F5F9' },
        line: { color: 'CBD5E1', width: 0.8 },
      });

      s.addText(col.badge, {
        x: x + 0.25,
        y: 2.25,
        w: 3.23,
        h: 0.3,
        fontSize: 9.5,
        fontFace: 'Arial',
        bold: true,
        color: C_DARK,
        align: 'center',
      });

      s.addText(col.items.join('\n\n'), {
        x: x + 0.25,
        y: 2.75,
        w: 3.23,
        h: 3.6,
        fontSize: 10.5,
        fontFace: 'Arial',
        color: C_GRAY,
        lineSpacing: 15,
      });
    });
  }

  // ==========================================
  // SLIDE 4: THIẾT KẾ CSDL & ERD
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_LIGHT };
    addHeader(s, '3. Thiết kế Cơ sở Dữ liệu & Mô hình Quan hệ (Database ERD)');
    addFooter(s, 4);

    const tableRows = [
      [
        { text: 'Bảng dữ liệu', options: { bold: true, fill: { color: C_NAVY }, color: C_WHITE } },
        { text: 'Mục đích & Phạm vi', options: { bold: true, fill: { color: C_NAVY }, color: C_WHITE } },
        { text: 'Khóa ngoại / Quan hệ', options: { bold: true, fill: { color: C_NAVY }, color: C_WHITE } },
        { text: 'Ràng buộc & Bảo mật RLS', options: { bold: true, fill: { color: C_NAVY }, color: C_WHITE } },
      ],
      [
        { text: 'profiles', options: { bold: true, fill: { color: 'F8FAFC' }, color: C_DARK } },
        { text: 'Thông tin tài khoản dùng chung (bệnh nhân, bác sĩ, admin).', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'id -> auth.users.id (1:1)', options: { fill: { color: 'F8FAFC' }, color: C_BLUE } },
        { text: 'Role CHECK (patient, doctor, admin); RLS xem sửa hồ sơ cá nhân.', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
      ],
      [
        { text: 'specialties', options: { bold: true, fill: { color: C_WHITE }, color: C_DARK } },
        { text: 'Danh mục chuyên khoa (Nội tổng quát, Tim mạch, Da liễu, Nhi khoa...).', options: { fill: { color: C_WHITE }, color: C_GRAY } },
        { text: 'id (PK), slug (UNIQUE)', options: { fill: { color: C_WHITE }, color: C_BLUE } },
        { text: 'Công khai đọc; chỉ Admin mới có quyền tạo mới/chỉnh sửa.', options: { fill: { color: C_WHITE }, color: C_GRAY } },
      ],
      [
        { text: 'doctors', options: { bold: true, fill: { color: 'F8FAFC' }, color: C_DARK } },
        { text: 'Hồ sơ chuyên môn bác sĩ, học vị, kinh nghiệm, giá khám.', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'profile_id -> profiles.id, specialty_id -> specialties.id', options: { fill: { color: 'F8FAFC' }, color: C_BLUE } },
        { text: 'is_active kiểm soát trạng thái trực; liên kết 1:1 với profile.', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
      ],
      [
        { text: 'working_hours', options: { bold: true, fill: { color: C_WHITE }, color: C_DARK } },
        { text: 'Khung giờ khám theo từng thứ trong tuần (day_of_week 0-6).', options: { fill: { color: C_WHITE }, color: C_GRAY } },
        { text: 'doctor_id -> doctors.id', options: { fill: { color: C_WHITE }, color: C_BLUE } },
        { text: 'start_time < end_time, slot_duration mặc định 30 phút.', options: { fill: { color: C_WHITE }, color: C_GRAY } },
      ],
      [
        { text: 'appointments', options: { bold: true, fill: { color: 'F8FAFC' }, color: C_DARK } },
        { text: 'Bảng trọng tâm lưu trữ lịch hẹn khám, triệu chứng và tiến trình ca.', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'patient_id, doctor_id, specialty_id', options: { fill: { color: 'F8FAFC' }, color: C_BLUE } },
        { text: 'CHECK status IN (pending, confirmed, completed, cancelled). Khóa GiST.', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
      ],
      [
        { text: 'medical_records', options: { bold: true, fill: { color: C_WHITE }, color: C_DARK } },
        { text: 'Hồ sơ bệnh án điện tử, chẩn đoán, toa thuốc và dặn dò sau khám.', options: { fill: { color: C_WHITE }, color: C_GRAY } },
        { text: 'appointment_id (1:1), doctor_id, patient_id', options: { fill: { color: C_WHITE }, color: C_BLUE } },
        { text: 'Bác sĩ phụ trách mới có quyền lập; bệnh nhân chỉ đọc hồ sơ của mình.', options: { fill: { color: C_WHITE }, color: C_GRAY } },
      ],
    ];

    s.addTable(tableRows, {
      x: 0.8,
      y: 1.6,
      w: 11.73,
      colW: [1.8, 3.8, 3.13, 3.0],
      fontSize: 10,
      fontFace: 'Arial',
      border: { pt: 0.5, color: C_BORDER },
      margin: [0.1, 0.12, 0.1, 0.12],
    });
  }

  // ==========================================
  // SLIDE 5: XÁC THỰC & PHÂN QUYỀN
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_LIGHT };
    addHeader(s, '4. Hệ thống Xác thực & Phân quyền 3 Vai trò (RBAC & RLS)');
    addFooter(s, 5);

    const roles = [
      {
        title: 'BỆNH NHÂN (PATIENT)',
        color: C_BLUE,
        items: [
          '• Cổng truy cập: /client/*',
          '• Đăng ký & Đăng nhập bằng Email/Password qua HttpOnly Session.',
          '• Tự do tra cứu danh bạ bác sĩ, bảng giá và chuyên khoa.',
          '• Đặt lịch hẹn trực tuyến trong 3 bước nhanh gọn.',
          '• Quản lý lịch sử khám, hủy lịch khi bận và cập nhật thông tin cá nhân.',
          '• Bảo mật: Chỉ được truy cập dữ liệu của chính mình (patient_id = auth.uid()).',
        ],
      },
      {
        title: 'BÁC SĨ (DOCTOR)',
        color: C_TEAL,
        items: [
          '• Cổng truy cập: /doctor/*',
          '• Đăng nhập bảo mật vào khu vực phòng khám dành riêng.',
          '• Xem danh sách ca khám theo ngày, tuần, tháng với bộ lọc trạng thái.',
          '• Tiếp nhận ca: Đổi trạng thái từ "Chờ khám" -> "Đang khám" (in_progress).',
          '• Lập hồ sơ bệnh án điện tử: Chẩn đoán, đơn thuốc, căn dặn bệnh nhân.',
          '• Bảo mật: Chỉ xem bệnh nhân được phân công đúng lịch hẹn của mình.',
        ],
      },
      {
        title: 'QUẢN TRỊ VIÊN (ADMIN)',
        color: C_NAVY,
        items: [
          '• Cổng truy cập: /admin/*',
          '• Quản lý danh mục chuyên khoa: Thêm, sửa, đổi trạng thái hoạt động.',
          '• Quản lý đội ngũ bác sĩ: Gán chuyên khoa, phân ca trực, cập nhật thông tin.',
          '• Giám sát toàn diện: Xem toàn bộ lịch hẹn trên toàn hệ thống phòng khám.',
          '• Báo cáo & Thống kê: Tỷ lệ hoàn thành ca, doanh thu, lượt hủy lịch hẹn.',
          '• Bảo mật: Xác thực bổ sung Admin Session Marker chống CSRF/leo thang quyền.',
        ],
      },
    ];

    roles.forEach((r, i) => {
      const x = 0.8 + i * 4.0;
      s.addShape(pres.ShapeType.roundRect, {
        x,
        y: 1.6,
        w: 3.73,
        h: 5.0,
        rectRadius: 0.08,
        fill: { color: C_CARD },
        line: { color: r.color, width: 1.5 },
      });

      s.addText(r.title, {
        x: x + 0.25,
        y: 1.85,
        w: 3.23,
        h: 0.35,
        fontSize: 12,
        fontFace: 'Arial',
        bold: true,
        color: r.color,
      });

      s.addText(r.items.join('\n\n'), {
        x: x + 0.25,
        y: 2.35,
        w: 3.23,
        h: 4.0,
        fontSize: 10.5,
        fontFace: 'Arial',
        color: C_GRAY,
        lineSpacing: 16,
      });
    });
  }

  // ==========================================
  // SLIDE 6: PHÂN HỆ BỆNH NHÂN (CLIENT PORTAL)
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_LIGHT };
    addHeader(s, '5. Phân hệ Bệnh nhân (Client Portal - /client)');
    addFooter(s, 6);

    const cards = [
      {
        title: '1. Đặt lịch khám 3 bước trực quan',
        desc: '• Bước 1: Chọn Chuyên khoa & Bác sĩ theo năng lực, giá khám.\n• Bước 2: Chọn Ngày khám & Khung giờ rảnh theo thời gian thực.\n• Bước 3: Điền triệu chứng & Xác nhận đặt hẹn ngay lập tức.',
        color: C_BLUE,
      },
      {
        title: '2. Quản lý Lịch hẹn & Hủy lịch an toàn',
        desc: '• Theo dõi trạng thái: Chờ duyệt, Đã xác nhận, Hoàn tất, Đã hủy.\n• Hỗ trợ bệnh nhân hủy lịch khám khi có việc bận đột xuất.\n• Tự động hoàn trả Slot trống cho hệ thống để người khác đăng ký.',
        color: C_TEAL,
      },
      {
        title: '3. Hồ sơ Cá nhân & Lịch sử Y tế',
        desc: '• Xem và chỉnh sửa họ tên, số điện thoại, ngày sinh, địa chỉ.\n• Lựa chọn ảnh đại diện nhanh với bộ Avatar thân thiện.\n• Thống kê trực quan: Tổng số lần khám, ca sắp tới, ca đã hoàn tất.',
        color: C_NAVY,
      },
      {
        title: '4. Tra cứu Danh bạ Bác sĩ & Chuyên khoa',
        desc: '• Tìm kiếm thông minh theo tên bác sĩ, học vị và kinh nghiệm.\n• Bộ lọc danh mục chuyên khoa linh hoạt kèm giá khám niêm yết.\n• Tối ưu hiển thị responsive hoàn hảo trên thiết bị di động.',
        color: C_AMBER,
      },
    ];

    cards.forEach((c, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 0.8 + col * 6.03;
      const y = 1.6 + row * 2.55;

      s.addShape(pres.ShapeType.roundRect, {
        x,
        y,
        w: 5.7,
        h: 2.35,
        rectRadius: 0.08,
        fill: { color: C_CARD },
        line: { color: c.color, width: 1.5 },
      });

      s.addText(c.title, {
        x: x + 0.3,
        y: y + 0.2,
        w: 5.1,
        h: 0.35,
        fontSize: 13,
        fontFace: 'Arial',
        bold: true,
        color: c.color,
      });

      s.addText(c.desc, {
        x: x + 0.3,
        y: y + 0.65,
        w: 5.1,
        h: 1.55,
        fontSize: 10.5,
        fontFace: 'Arial',
        color: C_GRAY,
        lineSpacing: 15,
      });
    });
  }

  // ==========================================
  // SLIDE 7: PHÂN HỆ BÁC SĨ (DOCTOR PORTAL)
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_LIGHT };
    addHeader(s, '6. Phân hệ Bác sĩ (Doctor Portal - /doctor)');
    addFooter(s, 7);

    const cards = [
      {
        title: '1. Dashboard Lịch trực & Thống kê Ngày',
        desc: '• Tổng quan số ca hôm nay: Đã tiếp đón, Đang khám, Hoàn tất.\n• Xem danh sách bệnh nhân theo thứ tự khung giờ khám.\n• Cảnh báo thời gian thực khi có ca mới đăng ký.',
        color: C_TEAL,
      },
      {
        title: '2. Tiến trình Khám bệnh (Workflow)',
        desc: '• Nút thao tác một chạm: "Bắt đầu khám" (chuyển sang in_progress).\n• Xem lý do khám, tiền sử bệnh án và thông tin liên hệ bệnh nhân.\n• Kiểm soát chính xác thời lượng khám thực tế của từng ca.',
        color: C_BLUE,
      },
      {
        title: '3. Hồ sơ Bệnh án Điện tử (EMR)',
        desc: '• Nhập chẩn đoán lâm sàng, triệu chứng chi tiết và kết luận bệnh.\n• Kê đơn thuốc với liều dùng, số lượng và hướng dẫn sử dụng.\n• Ghi chú dặn dò bệnh nhân và hẹn ngày tái khám định kỳ.',
        color: C_NAVY,
      },
      {
        title: '4. Quản lý Hồ sơ Chuyên môn & Ca trực',
        desc: '• Cập nhật tiểu sử, quá trình đào tạo, chứng chỉ chuyên môn.\n• Quản lý khung giờ nhận bệnh theo ngày trong tuần.\n• Bật/Tắt chế độ nhận lịch khám linh hoạt khi có lịch công tác.',
        color: C_GREEN,
      },
    ];

    cards.forEach((c, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 0.8 + col * 6.03;
      const y = 1.6 + row * 2.55;

      s.addShape(pres.ShapeType.roundRect, {
        x,
        y,
        w: 5.7,
        h: 2.35,
        rectRadius: 0.08,
        fill: { color: C_CARD },
        line: { color: c.color, width: 1.5 },
      });

      s.addText(c.title, {
        x: x + 0.3,
        y: y + 0.2,
        w: 5.1,
        h: 0.35,
        fontSize: 13,
        fontFace: 'Arial',
        bold: true,
        color: c.color,
      });

      s.addText(c.desc, {
        x: x + 0.3,
        y: y + 0.65,
        w: 5.1,
        h: 1.55,
        fontSize: 10.5,
        fontFace: 'Arial',
        color: C_GRAY,
        lineSpacing: 15,
      });
    });
  }

  // ==========================================
  // SLIDE 8: PHÂN HỆ QUẢN TRỊ (ADMIN PORTAL)
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_LIGHT };
    addHeader(s, '7. Phân hệ Quản trị (Admin Portal - /admin)');
    addFooter(s, 8);

    const cards = [
      {
        title: '1. Dashboard Trung tâm Điều hành',
        desc: '• Biểu đồ số lượng ca khám theo tuần, tháng và chuyên khoa.\n• Thống kê doanh thu dự kiến và tỷ lệ hoàn tất ca khám.\n• Giám sát tổng quan tình trạng vận hành trên toàn phòng khám.',
        color: C_NAVY,
      },
      {
        title: '2. Quản lý Đội ngũ Bác sĩ',
        desc: '• Danh sách bác sĩ kèm chuyên khoa, đánh giá và giá khám.\n• Thêm mới, chỉnh sửa thông tin hoặc tạm ngưng hoạt động.\n• Phân công ca trực và giám sát hiệu suất làm việc.',
        color: C_BLUE,
      },
      {
        title: '3. Quản lý Danh mục Chuyên khoa',
        desc: '• Khai báo các chuyên khoa mới, cập nhật mô tả và hình ảnh.\n• Điều chỉnh giá khám tiêu chuẩn của từng chuyên khoa.\n• Bật/Tắt hiển thị trên cổng thông tin bệnh nhân.',
        color: C_TEAL,
      },
      {
        title: '4. Giám sát Lịch hẹn Toàn hệ thống',
        desc: '• Tra cứu toàn bộ ca khám với bộ lọc đa tiêu chí (ngày, bác sĩ, khoa).\n• Hỗ trợ can thiệp xử lý khi có khiếu nại hoặc chuyển ca khẩn cấp.\n• Xuất dữ liệu báo cáo phục vụ công tác quản trị phòng khám.',
        color: C_AMBER,
      },
    ];

    cards.forEach((c, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 0.8 + col * 6.03;
      const y = 1.6 + row * 2.55;

      s.addShape(pres.ShapeType.roundRect, {
        x,
        y,
        w: 5.7,
        h: 2.35,
        rectRadius: 0.08,
        fill: { color: C_CARD },
        line: { color: c.color, width: 1.5 },
      });

      s.addText(c.title, {
        x: x + 0.3,
        y: y + 0.2,
        w: 5.1,
        h: 0.35,
        fontSize: 13,
        fontFace: 'Arial',
        bold: true,
        color: c.color,
      });

      s.addText(c.desc, {
        x: x + 0.3,
        y: y + 0.65,
        w: 5.1,
        h: 1.55,
        fontSize: 10.5,
        fontFace: 'Arial',
        color: C_GRAY,
        lineSpacing: 15,
      });
    });
  }

  // ==========================================
  // SLIDE 9: CƠ CHẾ CHỐNG TRÙNG LỊCH (ALGORITHM)
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_LIGHT };
    addHeader(s, '8. Thuật toán & Cơ chế Chống trùng Lịch (Concurrency Control)');
    addFooter(s, 9);

    // Left Box: 3 Tầng Bảo vệ (w = 5.7)
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.8,
      y: 1.6,
      w: 5.7,
      h: 5.0,
      rectRadius: 0.08,
      fill: { color: C_CARD },
      line: { color: C_BLUE, width: 1.5 },
    });

    s.addText('🛡️ 3 TẦNG BẢO VỆ CHỐNG TRÙNG LỊCH', {
      x: 1.1,
      y: 1.85,
      w: 5.1,
      h: 0.4,
      fontSize: 14,
      fontFace: 'Arial',
      bold: true,
      color: C_BLUE,
    });

    s.addText([
      { text: '1. Tầng Client (Giao diện người dùng):\n', options: { bold: true, color: C_DARK } },
      { text: '• Khi bệnh nhân chọn ngày khám, hệ thống truy vấn ngay các khung giờ đã được đặt trước.\n• Vô hiệu hóa (disable) nút chọn đối với các Slot đã kín, ngăn người dùng bấm nhầm.\n\n', options: { color: C_GRAY } },
      { text: '2. Tầng Backend API (Application Layer):\n', options: { bold: true, color: C_DARK } },
      { text: '• Kiểm tra tính hợp lệ: Khung giờ phải thuộc giờ làm việc và ở thì tương lai.\n• Sử dụng Database Transaction (Serializable / Repeatable Read) để giữ phiên đặt lịch an toàn.\n\n', options: { color: C_GRAY } },
      { text: '3. Tầng Database (PostgreSQL RLS & Exclusion):\n', options: { bold: true, color: C_DARK } },
      { text: '• Ràng buộc GiST Exclusion Constraint ngăn chặn 2 ca trùng bác sĩ và giờ khám.\n• Khóa cấp cơ sở dữ liệu đảm bảo 100% không bao giờ xảy ra lỗi double-booking khi có truy cập đồng thời.', options: { color: C_GRAY } },
    ], {
      x: 1.1,
      y: 2.35,
      w: 5.1,
      h: 4.0,
      fontSize: 11,
      fontFace: 'Arial',
      lineSpacing: 16,
    });

    // Right Box: Kịch bản Concurrency (w = 5.7, x = 6.83)
    s.addShape(pres.ShapeType.roundRect, {
      x: 6.83,
      y: 1.6,
      w: 5.7,
      h: 5.0,
      rectRadius: 0.08,
      fill: { color: C_CARD },
      line: { color: C_TEAL, width: 1.5 },
    });

    s.addText('⚡ XỬ LÝ CONCURRENCY KHI 2 BỆNH NHÂN ĐẶT CÙNG LÚC', {
      x: 7.13,
      y: 1.85,
      w: 5.1,
      h: 0.4,
      fontSize: 13,
      fontFace: 'Arial',
      bold: true,
      color: C_TEAL,
    });

    s.addText([
      { text: '• Tình huống giả định:\n', options: { bold: true, color: C_DARK } },
      { text: 'Bệnh nhân A và B cùng chọn ca 09:00 - 09:30 của Bác sĩ Hoàng vào ngày mai và nhấn "Xác nhận" cùng lúc trong mili-giây.\n\n', options: { color: C_GRAY } },
      { text: '• Cơ chế xử lý của hệ thống:\n', options: { bold: true, color: C_DARK } },
      { text: '1. Giao dịch của Bệnh nhân A được database tiếp nhận trước -> Ghi dữ liệu thành công -> Trả về mã hẹn.\n', options: { color: C_GRAY } },
      { text: '2. Giao dịch của Bệnh nhân B chạm vào ràng buộc Unique/GiST -> Database từ chối và ném lỗi 409 Conflict.\n\n', options: { color: C_GRAY } },
      { text: '• Phản hồi giao diện thân thiện (UX):\n', options: { bold: true, color: C_DARK } },
      { text: 'Toast thông báo ngay: "Khung giờ vừa được đặt bởi người khác. Vui lòng chọn khung giờ kế tiếp!". Bệnh nhân không bị mất thông tin đã điền.', options: { color: C_GRAY } },
    ], {
      x: 7.13,
      y: 2.35,
      w: 5.1,
      h: 4.0,
      fontSize: 11,
      fontFace: 'Arial',
      lineSpacing: 16,
    });
  }

  // ==========================================
  // SLIDE 10: QUY TRÌNH NGHIỆP VỤ (WORKFLOW)
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_LIGHT };
    addHeader(s, '9. Quy trình Nghiệp vụ Đặt khám & Tiếp đón (End-to-End Workflow)');
    addFooter(s, 10);

    const steps = [
      {
        step: 'BƯỚC 1',
        title: 'BỆNH NHÂN ĐẶT HẸN',
        color: C_BLUE,
        desc: '• Chọn chuyên khoa & bác sĩ.\n• Chọn ngày & khung giờ rảnh.\n• Điền triệu chứng ban đầu.\n• Trạng thái: "pending".',
      },
      {
        step: 'BƯỚC 2',
        title: 'HỆ THỐNG XÁC NHẬN',
        color: C_TEAL,
        desc: '• Kiểm tra khóa lịch an toàn.\n• Gửi mã xác nhận ca hẹn.\n• Bác sĩ thấy ca trong danh sách.\n• Trạng thái: "confirmed".',
      },
      {
        step: 'BƯỚC 3',
        title: 'TIẾP ĐÓN & KHÁM BỆNH',
        color: C_AMBER,
        desc: '• Bệnh nhân có mặt tại phòng khám.\n• Bác sĩ bấm "Bắt đầu khám".\n• Ghi nhận thời gian thực tế.\n• Trạng thái: "in_progress".',
      },
      {
        step: 'BƯỚC 4',
        title: 'HOÀN TẤT & LẬP BỆNH ÁN',
        color: C_GREEN,
        desc: '• Nhập chẩn đoán & đơn thuốc.\n• Dặn dò tái khám định kỳ.\n• Bệnh nhân xem bệnh án online.\n• Trạng thái: "completed".',
      },
    ];

    steps.forEach((st, i) => {
      const x = 0.8 + i * 3.0;
      s.addShape(pres.ShapeType.roundRect, {
        x,
        y: 1.8,
        w: 2.73,
        h: 4.6,
        rectRadius: 0.08,
        fill: { color: C_CARD },
        line: { color: st.color, width: 1.5 },
      });

      s.addShape(pres.ShapeType.roundRect, {
        x: x + 0.2,
        y: 2.05,
        w: 2.33,
        h: 0.35,
        rectRadius: 0.05,
        fill: { color: st.color },
        line: { color: st.color },
      });

      s.addText(st.step, {
        x: x + 0.2,
        y: 2.05,
        w: 2.33,
        h: 0.35,
        fontSize: 11,
        fontFace: 'Arial',
        bold: true,
        color: C_WHITE,
        align: 'center',
      });

      s.addText(st.title, {
        x: x + 0.2,
        y: 2.55,
        w: 2.33,
        h: 0.45,
        fontSize: 12,
        fontFace: 'Arial',
        bold: true,
        color: C_DARK,
        align: 'center',
      });

      s.addText(st.desc, {
        x: x + 0.2,
        y: 3.15,
        w: 2.33,
        h: 3.0,
        fontSize: 10.5,
        fontFace: 'Arial',
        color: C_GRAY,
        lineSpacing: 16,
      });

      // Arrow indicator between steps
      if (i < 3) {
        s.addText('➔', {
          x: x + 2.73,
          y: 3.6,
          w: 0.3,
          h: 0.4,
          fontSize: 16,
          fontFace: 'Arial',
          bold: true,
          color: C_MUTED,
          align: 'center',
        });
      }
    });
  }

  // ==========================================
  // SLIDE 11: KIỂM THỬ & QA
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_LIGHT };
    addHeader(s, '10. Kiểm thử & Đảm bảo Chất lượng (QA & Test Cases)');
    addFooter(s, 11);

    const testRows = [
      [
        { text: 'Mã Test Case', options: { bold: true, fill: { color: C_NAVY }, color: C_WHITE } },
        { text: 'Phân hệ / Chức năng', options: { bold: true, fill: { color: C_NAVY }, color: C_WHITE } },
        { text: 'Kịch bản kiểm thử (Test Scenario)', options: { bold: true, fill: { color: C_NAVY }, color: C_WHITE } },
        { text: 'Kết quả kỳ vọng', options: { bold: true, fill: { color: C_NAVY }, color: C_WHITE } },
        { text: 'Trạng thái', options: { bold: true, fill: { color: C_NAVY }, color: C_WHITE } },
      ],
      [
        { text: 'TC-AUTH-01', options: { bold: true, fill: { color: 'F8FAFC' }, color: C_DARK } },
        { text: 'Xác thực / Đăng ký', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'Đăng ký tài khoản bệnh nhân với email mới và mật khẩu mạnh.', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'Tạo tài khoản và profile thành công, tự động gán role "patient".', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'PASSED', options: { bold: true, fill: { color: 'DCFCE7' }, color: C_GREEN, align: 'center' } },
      ],
      [
        { text: 'TC-AUTH-02', options: { bold: true, fill: { color: C_WHITE }, color: C_DARK } },
        { text: 'Xác thực / Phân quyền', options: { fill: { color: C_WHITE }, color: C_GRAY } },
        { text: 'Tài khoản bệnh nhân cố ý truy cập URL khu vực quản trị (/admin).', options: { fill: { color: C_WHITE }, color: C_GRAY } },
        { text: 'Middleware chặn lại và tự động redirect về /client an toàn.', options: { fill: { color: C_WHITE }, color: C_GRAY } },
        { text: 'PASSED', options: { bold: true, fill: { color: 'DCFCE7' }, color: C_GREEN, align: 'center' } },
      ],
      [
        { text: 'TC-BOOK-01', options: { bold: true, fill: { color: 'F8FAFC' }, color: C_DARK } },
        { text: 'Đặt khám / Slot rảnh', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'Bệnh nhân chọn bác sĩ, ngày và khung giờ rảnh còn trống.', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'Tạo lịch hẹn thành công, trạng thái hiển thị "confirmed/pending".', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'PASSED', options: { bold: true, fill: { color: 'DCFCE7' }, color: C_GREEN, align: 'center' } },
      ],
      [
        { text: 'TC-BOOK-02', options: { bold: true, fill: { color: C_WHITE }, color: C_DARK } },
        { text: 'Đặt khám / Trùng lịch', options: { fill: { color: C_WHITE }, color: C_GRAY } },
        { text: '2 người dùng cùng lúc bấm đặt 1 khung giờ duy nhất của bác sĩ.', options: { fill: { color: C_WHITE }, color: C_GRAY } },
        { text: '1 người thành công, 1 người nhận thông báo lỗi 409 Conflict.', options: { fill: { color: C_WHITE }, color: C_GRAY } },
        { text: 'PASSED', options: { bold: true, fill: { color: 'DCFCE7' }, color: C_GREEN, align: 'center' } },
      ],
      [
        { text: 'TC-CANC-01', options: { bold: true, fill: { color: 'F8FAFC' }, color: C_DARK } },
        { text: 'Hủy lịch khám', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'Bệnh nhân nhấn "Hủy lịch" đối với ca hẹn sắp tới trong danh sách.', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'Trạng thái chuyển sang "cancelled", khung giờ được giải phóng.', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'PASSED', options: { bold: true, fill: { color: 'DCFCE7' }, color: C_GREEN, align: 'center' } },
      ],
      [
        { text: 'TC-DOC-01', options: { bold: true, fill: { color: C_WHITE }, color: C_DARK } },
        { text: 'Bác sĩ / Tiếp nhận ca', options: { fill: { color: C_WHITE }, color: C_GRAY } },
        { text: 'Bác sĩ nhấn "Bắt đầu khám" khi bệnh nhân bước vào phòng khám.', options: { fill: { color: C_WHITE }, color: C_GRAY } },
        { text: 'Trạng thái ca chuyển thành "in_progress", ghi nhận started_at.', options: { fill: { color: C_WHITE }, color: C_GRAY } },
        { text: 'PASSED', options: { bold: true, fill: { color: 'DCFCE7' }, color: C_GREEN, align: 'center' } },
      ],
      [
        { text: 'TC-DOC-02', options: { bold: true, fill: { color: 'F8FAFC' }, color: C_DARK } },
        { text: 'Bác sĩ / Lập bệnh án', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'Bác sĩ nhập chẩn đoán, kê đơn thuốc và nhấn "Hoàn tất ca khám".', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'Tạo bản ghi medical_records, chuyển trạng thái "completed".', options: { fill: { color: 'F8FAFC' }, color: C_GRAY } },
        { text: 'PASSED', options: { bold: true, fill: { color: 'DCFCE7' }, color: C_GREEN, align: 'center' } },
      ],
    ];

    s.addTable(testRows, {
      x: 0.8,
      y: 1.6,
      w: 11.73,
      colW: [1.6, 2.1, 4.4, 2.63, 1.0],
      fontSize: 9.5,
      fontFace: 'Arial',
      border: { pt: 0.5, color: C_BORDER },
      margin: [0.08, 0.1, 0.08, 0.1],
    });
  }

  // ==========================================
  // SLIDE 12: QUẢN LÝ DỰ ÁN & ROADMAP
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_LIGHT };
    addHeader(s, '11. Kế hoạch Triển khai & Quản lý Dự án (WBS & Roadmap)');
    addFooter(s, 12);

    const phases = [
      {
        phase: 'GIAI ĐOẠN 1: KHỞI TẠO & THIẾT KẾ',
        status: 'HOÀN THÀNH (100%)',
        color: C_GREEN,
        tasks: [
          '• Khảo sát yêu cầu nghiệp vụ phòng khám đa khoa thực tế.',
          '• Thiết kế kiến trúc tổng thể 3-Tier và sơ đồ quan hệ thực thể ERD.',
          '• Thiết lập kho mã nguồn GitHub, quy ước commit và phân chia nhánh.',
          '• Khởi tạo khung dự án Next.js 16, Express backend và Supabase DB.',
        ],
      },
      {
        phase: 'GIAI ĐOẠN 2: PHÁT TRIỂN TÍNH NĂNG CỐT LÕI',
        status: 'HOÀN THÀNH (100%)',
        color: C_GREEN,
        tasks: [
          '• Module xác thực tập trung và phân quyền 3 vai trò (Patient/Doctor/Admin).',
          '• Cổng bệnh nhân: Đặt lịch 3 bước, danh bạ bác sĩ, thông tin cá nhân.',
          '• Module chống trùng lịch bằng GiST Exclusion và Transaction Lock.',
          '• Cổng bác sĩ: Tiếp đón bệnh nhân, đổi trạng thái ca và lập bệnh án.',
        ],
      },
      {
        phase: 'GIAI ĐOẠN 3: TÍCH HỢP, KIỂM THỬ & BÁO CÁO',
        status: 'HIỆN TẠI (100%)',
        color: C_BLUE,
        tasks: [
          '• Giải quyết toàn bộ xung đột mã nguồn (Merge Conflicts) giữa các nhánh.',
          '• Kiểm thử toàn diện 31 Test Cases trên toàn bộ các phân hệ chức năng.',
          '• Tinh chỉnh giao diện responsive và trải nghiệm người dùng (UX).',
          '• Hoàn thiện slide thuyết trình báo cáo tiến độ và kịch bản Live Demo.',
        ],
      },
      {
        phase: 'GIAI ĐOẠN 4: MỞ RỘNG TƯƠNG LAI',
        status: 'KẾ HOẠCH',
        color: C_AMBER,
        tasks: [
          '• Tích hợp cổng thanh toán trực tuyến tự động (VNPay / MoMo).',
          '• Gửi thông báo nhắc lịch tự động qua SMS Brandname và Zalo ZNS.',
          '• Chat trực tuyến tư vấn từ xa giữa Bệnh nhân và Bác sĩ chuyên khoa.',
          '• Ứng dụng AI phân tích triệu chứng để gợi ý chuyên khoa khám phù hợp.',
        ],
      },
    ];

    phases.forEach((p, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 0.8 + col * 6.03;
      const y = 1.6 + row * 2.55;

      s.addShape(pres.ShapeType.roundRect, {
        x,
        y,
        w: 5.7,
        h: 2.35,
        rectRadius: 0.08,
        fill: { color: C_CARD },
        line: { color: p.color, width: 1.5 },
      });

      s.addText(p.phase, {
        x: x + 0.3,
        y: y + 0.18,
        w: 3.8,
        h: 0.35,
        fontSize: 12,
        fontFace: 'Arial',
        bold: true,
        color: C_DARK,
      });

      s.addShape(pres.ShapeType.roundRect, {
        x: x + 4.2,
        y: y + 0.18,
        w: 1.3,
        h: 0.3,
        rectRadius: 0.05,
        fill: { color: p.color === C_GREEN ? 'DCFCE7' : p.color === C_BLUE ? 'DBEAFE' : 'FEF3C7' },
        line: { color: p.color, width: 0.8 },
      });

      s.addText(p.status, {
        x: x + 4.2,
        y: y + 0.18,
        w: 1.3,
        h: 0.3,
        fontSize: 8.5,
        fontFace: 'Arial',
        bold: true,
        color: p.color,
        align: 'center',
      });

      s.addText(p.tasks.join('\n'), {
        x: x + 0.3,
        y: y + 0.62,
        w: 5.1,
        h: 1.6,
        fontSize: 10,
        fontFace: 'Arial',
        color: C_GRAY,
        lineSpacing: 15,
      });
    });
  }

  // ==========================================
  // SLIDE 13: KỊCH BẢN DEMO TRỰC TIẾP
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_LIGHT };
    addHeader(s, '12. Kịch bản Demo Trực tiếp Hệ thống (4 Bước Thao tác)');
    addFooter(s, 13);

    const demoSteps = [
      {
        num: 'DEMO 1',
        title: 'BỆNH NHÂN ĐẶT KHÁM',
        role: 'Role: Patient (Bệnh nhân)',
        color: C_BLUE,
        items: [
          '• Đăng nhập tài khoản bệnh nhân tại /login.',
          '• Vào cổng /client/booking, chọn Bác sĩ và Chuyên khoa.',
          '• Chọn ngày mai và khung giờ rảnh (ví dụ 09:00 - 09:30).',
          '• Nhập triệu chứng: "Đau đầu, sốt nhẹ 2 ngày nay".',
          '• Nhấn Xác nhận -> Nhận thông báo tạo lịch thành công.',
        ],
      },
      {
        num: 'DEMO 2',
        title: 'BÁC SĨ TIẾP ĐÓN & KHÁM',
        role: 'Role: Doctor (Bác sĩ phụ trách)',
        color: C_TEAL,
        items: [
          '• Đăng nhập tài khoản bác sĩ tại /login.',
          '• Truy cập /doctor/dashboard -> Thấy ngay ca hẹn vừa tạo.',
          '• Nhấn "Bắt đầu khám" khi tiếp nhận bệnh nhân vào phòng.',
          '• Trạng thái ca khám tự động chuyển thành "in_progress".',
          '• Xem hồ sơ tiền sử và lý do khám chi tiết của bệnh nhân.',
        ],
      },
      {
        num: 'DEMO 3',
        title: 'LẬP BỆNH ÁN & HOÀN TẤT',
        role: 'Role: Doctor (Bác sĩ phụ trách)',
        color: C_GREEN,
        items: [
          '• Nhập chẩn đoán: "Cảm cúm thông thường do thay đổi thời tiết".',
          '• Kê đơn thuốc điện tử: Paracetamol 500mg, Vitamin C 1000mg.',
          '• Nhập ghi chú: "Nghỉ ngơi nhiều, uống đủ 2 lít nước mỗi ngày".',
          '• Nhấn "Hoàn tất ca khám" -> Ca chuyển sang "completed".',
          '• Hồ sơ bệnh án điện tử (EMR) được lưu vĩnh viễn.',
        ],
      },
      {
        num: 'DEMO 4',
        title: 'QUẢN LÝ HỒ SƠ & BÁO CÁO',
        role: 'Role: Patient & Admin',
        color: C_NAVY,
        items: [
          '• Bệnh nhân vào /client/profile -> Thấy cập nhật số ca hoàn tất.',
          '• Xem lại đơn thuốc và kết quả chẩn đoán trong lịch sử.',
          '• Admin vào /admin/dashboard -> Kiểm tra doanh thu và số ca.',
          '• Giám sát toàn bộ tiến trình khám của phòng khám.',
          '• Hoàn tất chu trình vận hành khép kín của ClinicCare.',
        ],
      },
    ];

    demoSteps.forEach((d, i) => {
      const x = 0.8 + i * 3.0;
      s.addShape(pres.ShapeType.roundRect, {
        x,
        y: 1.8,
        w: 2.73,
        h: 4.6,
        rectRadius: 0.08,
        fill: { color: C_CARD },
        line: { color: d.color, width: 1.5 },
      });

      s.addShape(pres.ShapeType.roundRect, {
        x: x + 0.2,
        y: 2.05,
        w: 2.33,
        h: 0.35,
        rectRadius: 0.05,
        fill: { color: d.color },
        line: { color: d.color },
      });

      s.addText(d.num, {
        x: x + 0.2,
        y: 2.05,
        w: 2.33,
        h: 0.35,
        fontSize: 11,
        fontFace: 'Arial',
        bold: true,
        color: C_WHITE,
        align: 'center',
      });

      s.addText(d.title, {
        x: x + 0.2,
        y: 2.5,
        w: 2.33,
        h: 0.45,
        fontSize: 11,
        fontFace: 'Arial',
        bold: true,
        color: C_DARK,
        align: 'center',
      });

      s.addText(d.role, {
        x: x + 0.2,
        y: 2.95,
        w: 2.33,
        h: 0.25,
        fontSize: 9.5,
        fontFace: 'Arial',
        color: d.color,
        bold: true,
        align: 'center',
      });

      s.addText(d.items.join('\n\n'), {
        x: x + 0.2,
        y: 3.3,
        w: 2.33,
        h: 2.9,
        fontSize: 10,
        fontFace: 'Arial',
        color: C_GRAY,
        lineSpacing: 14,
      });
    });
  }

  // ==========================================
  // SLIDE 14: ĐÁNH GIÁ & ĐỊNH HƯỚNG
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_LIGHT };
    addHeader(s, '13. Đánh giá Dự án & Hướng Phát triển Tương lai');
    addFooter(s, 14);

    // Left Box: Thành tựu (w = 5.7)
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.8,
      y: 1.6,
      w: 5.7,
      h: 5.0,
      rectRadius: 0.08,
      fill: { color: C_CARD },
      line: { color: C_GREEN, width: 1.5 },
    });

    s.addText('🌟 THÀNH TỰU ĐẠT ĐƯỢC CỦA DỰ ÁN', {
      x: 1.1,
      y: 1.85,
      w: 5.1,
      h: 0.4,
      fontSize: 14,
      fontFace: 'Arial',
      bold: true,
      color: C_GREEN,
    });

    s.addText([
      { text: '• Hoàn thành trọn vẹn mục tiêu đề ra:\n', options: { bold: true, color: C_DARK } },
      { text: 'Xây dựng thành công hệ thống đặt lịch khám bệnh trực tuyến đa phân hệ với quy trình khép kín.\n\n', options: { color: C_GRAY } },
      { text: '• Kiến trúc chuẩn mực & Độ tin cậy cao:\n', options: { bold: true, color: C_DARK } },
      { text: 'Sử dụng Next.js 16 App Router kết hợp PostgreSQL Supabase với bảo mật cấp độ doanh nghiệp (RLS, HttpOnly Cookie).\n\n', options: { color: C_GRAY } },
      { text: '• Giải quyết triệt để bài toán trùng lịch:\n', options: { bold: true, color: C_DARK } },
      { text: 'Cơ chế khóa giao dịch 3 tầng đảm bảo không xảy ra xung đột slot khám khi có nhiều người truy cập đồng thời.\n\n', options: { color: C_GRAY } },
      { text: '• Mã nguồn hoàn thiện, không lỗi (0 Error):\n', options: { bold: true, color: C_DARK } },
      { text: 'Đã giải quyết sạch sẽ các merge conflict, vượt qua kiểm tra nghiêm ngặt của TypeScript và kiểm thử 31 test case.', options: { color: C_GRAY } },
    ], {
      x: 1.1,
      y: 2.35,
      w: 5.1,
      h: 4.0,
      fontSize: 11,
      fontFace: 'Arial',
      lineSpacing: 16,
    });

    // Right Box: Hướng phát triển (w = 5.7, x = 6.83)
    s.addShape(pres.ShapeType.roundRect, {
      x: 6.83,
      y: 1.6,
      w: 5.7,
      h: 5.0,
      rectRadius: 0.08,
      fill: { color: C_CARD },
      line: { color: C_BLUE, width: 1.5 },
    });

    s.addText('🚀 HƯỚNG NÂNG CẤP & MỞ RỘNG TƯƠNG LAI', {
      x: 7.13,
      y: 1.85,
      w: 5.1,
      h: 0.4,
      fontSize: 14,
      fontFace: 'Arial',
      bold: true,
      color: C_BLUE,
    });

    s.addText([
      { text: '• Cổng thanh toán viện phí trực tuyến:\n', options: { bold: true, color: C_DARK } },
      { text: 'Tích hợp thanh toán QR Code tự động qua cổng VNPay, MoMo, ZaloPay để đặt cọc giữ chỗ.\n\n', options: { color: C_GRAY } },
      { text: '• Thông báo đa kênh tự động (Omnichannel):\n', options: { bold: true, color: C_DARK } },
      { text: 'Gửi tin nhắn SMS Brandname và Zalo ZNS nhắc nhở trước giờ khám 24h và 2h để giảm tỷ lệ vắng mặt.\n\n', options: { color: C_GRAY } },
      { text: '• Tư vấn khám bệnh từ xa (Telemedicine):\n', options: { bold: true, color: C_DARK } },
      { text: 'Hỗ trợ gọi video WebRTC trực tuyến giữa bác sĩ và bệnh nhân cho các ca tư vấn sức khỏe từ xa.\n\n', options: { color: C_GRAY } },
      { text: '• Trợ lý AI phân tích triệu chứng ban đầu:\n', options: { bold: true, color: C_DARK } },
      { text: 'Gợi ý chuyên khoa khám phù hợp dựa trên mô tả triệu chứng tự nhiên của bệnh nhân.', options: { color: C_GRAY } },
    ], {
      x: 7.13,
      y: 2.35,
      w: 5.1,
      h: 4.0,
      fontSize: 11,
      fontFace: 'Arial',
      lineSpacing: 16,
    });
  }

  // ==========================================
  // SLIDE 15: KẾT LUẬN & HỎI ĐÁP (Q&A)
  // ==========================================
  {
    const s = pres.addSlide();
    s.background = { color: C_NAVY };

    s.addText('CLINICCARE · NỀN TẢNG ĐẶT LỊCH KHÁM THÔNG MINH', {
      x: 0.8,
      y: 1.3,
      w: 11.73,
      h: 0.4,
      fontSize: 14,
      fontFace: 'Arial',
      bold: true,
      color: '93C5FD',
      align: 'center',
      charSpacing: 2,
    });

    s.addText('KẾT LUẬN & HỎI ĐÁP (Q&A)', {
      x: 0.8,
      y: 1.8,
      w: 11.73,
      h: 0.8,
      fontSize: 34,
      fontFace: 'Arial',
      bold: true,
      color: C_WHITE,
      align: 'center',
    });

    s.addShape(pres.ShapeType.roundRect, {
      x: 2.2,
      y: 2.8,
      w: 8.93,
      h: 2.4,
      rectRadius: 0.1,
      fill: { color: '1E293B' },
      line: { color: '334155', width: 1.5 },
    });

    s.addText([
      { text: '• Hệ thống ClinicCare đã hoàn thành toàn diện các phân hệ Bệnh nhân, Bác sĩ và Quản trị viên.\n', options: { color: C_WHITE } },
      { text: '• Quy trình nghiệp vụ khép kín, an toàn dữ liệu, chống trùng lịch và giao diện thân thiện.\n', options: { color: C_WHITE } },
      { text: '• Dự án đã sẵn sàng cho buổi bảo vệ học phần Quản lý Dự án Công nghệ Thông tin.\n\n', options: { color: C_WHITE } },
      { text: 'Mã nguồn dự án: https://github.com/B1t-Phun/qtda-clinic-booking', options: { color: '67E8F9', bold: true } },
    ], {
      x: 2.5,
      y: 3.1,
      w: 8.33,
      h: 1.8,
      fontSize: 12,
      fontFace: 'Arial',
      lineSpacing: 20,
    });

    s.addText('XIN TRÂN TRỌNG CẢM ƠN THẦY CÔ VÀ CÁC BẠN ĐÃ LẮNG NGHE!\nKính mời Thầy Cô và Hội đồng đặt câu hỏi phản biện.', {
      x: 0.8,
      y: 5.6,
      w: 11.73,
      h: 1.0,
      fontSize: 15,
      fontFace: 'Arial',
      bold: true,
      color: 'FDE68A',
      align: 'center',
      lineSpacing: 22,
    });
  }

  // Save to root directory
  const outputPath = path.resolve(__dirname, '../../ClinicCare_Bao_Cao_Tien_Do.pptx');
  console.log('Generating PowerPoint presentation to:', outputPath);
  await pres.writeFile({ fileName: outputPath });
  console.log('PowerPoint generated successfully with exact 13.333x7.5 inch Widescreen format!');
}

createPresentation().catch(console.error);
