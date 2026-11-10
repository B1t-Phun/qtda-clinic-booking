// Định nghĩa kiểu dữ liệu cho Module Admin (Task 3.3 - Lê Đình Phương)

// 1. Chuyên khoa (Specialty)
export interface Specialty {
  id: string;
  code: string;           // Mã chuyên khoa (VD: CK-NOI, CK-NHI)
  name: string;           // Tên chuyên khoa (VD: Khoa Nội, Khoa Nhi)
  description?: string;   // Mô tả
  status: 'active' | 'inactive';
  createdAt?: string;
}

// 2. Bác sĩ (Doctor)
export type DoctorTitle = 'BS' | 'BS.CKI' | 'BS.CKII' | 'ThS.BS' | 'TS.BS' | 'PGS.TS.BS';

export interface Doctor {
  id: string;
  code: string;           // Mã bác sĩ (VD: BS001)
  fullName: string;       // Họ và tên
  title: DoctorTitle;     // Học hàm / học vị
  specialtyId: string;    // ID chuyên khoa trực thuộc
  specialtyName?: string;
  email?: string;
  phone: string;
  experienceYears: number;// Số năm kinh nghiệm
  consultationFee: number;// Giá khám (VNĐ)
  bio?: string;           // Tiểu sử / mô tả
  status: 'active' | 'inactive';
  createdAt?: string;
}

// 3. Khung giờ khám (Time Slot)
export type DaySession = 'morning' | 'afternoon' | 'evening';

export interface TimeSlot {
  id: string;
  startTime: string;      // Giờ bắt đầu (VD: "08:00")
  endTime: string;        // Giờ kết thúc (VD: "09:00")
  session: DaySession;    // Ca sáng / chiều / tối
  maxPatients: number;    // Giới hạn số bệnh nhân/slot
  isActive: boolean;
}

// 4. Lịch làm việc / Khung giờ phân ca bác sĩ (Doctor Schedule)
export interface DoctorSchedule {
  id: string;
  doctorId: string;
  date: string;           // Ngày khám (YYYY-MM-DD)
  timeSlotIds: string[];  // Các khung giờ được phân công
  roomNumber?: string;    // Phòng khám
  note?: string;
  status: 'active' | 'cancelled';
}
