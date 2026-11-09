export type Gender = "male" | "female" | "other";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: "admin" | "doctor" | "patient";
  date_of_birth: string;
  gender: Gender;
  address: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface Specialty {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  profile_id: string;
  specialty_id: string;
  bio: string;
  room: string;
  years_experience: number;
  consultation_fee: number;
  is_active: boolean;
  created_at: string;
}

export interface TimeSlot {
  id: string;
  doctor_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  slot_id: string;
  status: AppointmentStatus;
  reason: string;
  doctor_note: string;
  cancel_reason: string;
  created_at: string;
  updated_at: string;
}

export const specialties: Specialty[] = [
  ["sp-01", "Nội tổng quát", "Khám và điều trị các bệnh lý nội khoa phổ biến."],
  ["sp-02", "Nhi khoa", "Chăm sóc sức khỏe trẻ em và thanh thiếu niên."],
  ["sp-03", "Tim mạch", "Khám, tư vấn và theo dõi các bệnh lý tim mạch."],
  ["sp-04", "Da liễu", "Khám và điều trị các bệnh lý da, tóc và móng."],
  ["sp-05", "Tai Mũi Họng", "Khám các bệnh lý tai, mũi, họng."],
].map(([id, name, description]) => ({
  id,
  name,
  description,
  created_at: "2024-01-05T08:00:00+07:00",
}));

export const doctorProfile: Profile = {
  id: "profile-doctor-01",
  email: "quan.tran@clinicbooking.vn",
  full_name: "BS. Trần Minh Quân",
  phone: "090 318 2030",
  role: "doctor",
  date_of_birth: "1984-09-18",
  gender: "male",
  address: "28 Nguyễn Đình Chiểu, Phường Đa Kao, TP. Hồ Chí Minh",
  avatar_url: "",
  created_at: "2024-01-06T09:00:00+07:00",
  updated_at: "2025-05-12T14:30:00+07:00",
};

export const doctor: Doctor = {
  id: "doctor-01",
  profile_id: doctorProfile.id,
  specialty_id: "sp-03",
  bio: "Bác sĩ chuyên khoa Tim mạch, tập trung vào phòng ngừa, chẩn đoán và quản lý bệnh tim mạch lâu dài.",
  room: "P.203",
  years_experience: 12,
  consultation_fee: 300000,
  is_active: true,
  created_at: "2024-01-06T09:00:00+07:00",
};

const patientSeeds: Array<[string, string, Gender, string, string, string]> = [
  [
    "Nguyễn Thị Lan",
    "1988-04-12",
    "female",
    "090 812 3456",
    "lan.nguyen@example.com",
    "Quận 3, TP. Hồ Chí Minh",
  ],
  [
    "Trần Văn Hùng",
    "1972-11-03",
    "male",
    "091 234 5678",
    "hung.tran@example.com",
    "Quận 10, TP. Hồ Chí Minh",
  ],
  [
    "Lê Minh Anh",
    "1995-06-21",
    "female",
    "093 456 7812",
    "minhanh.le@example.com",
    "TP. Thủ Đức, TP. Hồ Chí Minh",
  ],
  [
    "Phạm Quốc Bảo",
    "1968-02-16",
    "male",
    "098 765 4321",
    "bao.pham@example.com",
    "Quận Bình Thạnh, TP. Hồ Chí Minh",
  ],
  [
    "Võ Thị Hồng",
    "1981-08-28",
    "female",
    "090 334 4556",
    "hong.vo@example.com",
    "Quận Tân Bình, TP. Hồ Chí Minh",
  ],
  [
    "Đặng Hoàng Nam",
    "1990-01-09",
    "male",
    "091 876 2345",
    "nam.dang@example.com",
    "Quận 7, TP. Hồ Chí Minh",
  ],
  [
    "Bùi Ngọc Mai",
    "2000-12-14",
    "female",
    "094 332 1188",
    "mai.bui@example.com",
    "Quận 5, TP. Hồ Chí Minh",
  ],
  [
    "Đỗ Đức Thành",
    "1977-05-30",
    "male",
    "097 661 2345",
    "thanh.do@example.com",
    "Quận Gò Vấp, TP. Hồ Chí Minh",
  ],
  [
    "Huỳnh Kim Oanh",
    "1985-03-24",
    "female",
    "090 567 1223",
    "oanh.huynh@example.com",
    "Quận Phú Nhuận, TP. Hồ Chí Minh",
  ],
  [
    "Phan Tuấn Kiệt",
    "1992-07-18",
    "male",
    "093 229 4455",
    "kiet.phan@example.com",
    "Quận 4, TP. Hồ Chí Minh",
  ],
  [
    "Dương Mỹ Linh",
    "1998-10-02",
    "female",
    "096 774 2233",
    "linh.duong@example.com",
    "Quận 1, TP. Hồ Chí Minh",
  ],
  [
    "Ngô Quang Minh",
    "1965-09-11",
    "male",
    "091 445 6677",
    "minh.ngo@example.com",
    "Quận 8, TP. Hồ Chí Minh",
  ],
  [
    "Vũ Thanh Hà",
    "1989-11-26",
    "female",
    "090 998 7766",
    "ha.vu@example.com",
    "Quận 6, TP. Hồ Chí Minh",
  ],
  [
    "Trương Gia Huy",
    "2001-04-05",
    "male",
    "098 113 5577",
    "huy.truong@example.com",
    "Quận 12, TP. Hồ Chí Minh",
  ],
  [
    "Lý Thu Trang",
    "1975-06-09",
    "female",
    "092 661 3388",
    "trang.ly@example.com",
    "Huyện Bình Chánh, TP. Hồ Chí Minh",
  ],
  [
    "Mai Tiến Dũng",
    "1983-02-22",
    "male",
    "090 221 7744",
    "dung.mai@example.com",
    "Quận 11, TP. Hồ Chí Minh",
  ],
  [
    "Tạ Ngọc Diệp",
    "1993-08-17",
    "female",
    "097 331 5599",
    "diep.ta@example.com",
    "Quận Tân Phú, TP. Hồ Chí Minh",
  ],
  [
    "Cao Xuân Phúc",
    "1959-12-07",
    "male",
    "091 883 1155",
    "phuc.cao@example.com",
    "Huyện Hóc Môn, TP. Hồ Chí Minh",
  ],
  [
    "Hồ Bảo Châu",
    "1997-03-15",
    "female",
    "094 447 2288",
    "chau.ho@example.com",
    "Quận Bình Tân, TP. Hồ Chí Minh",
  ],
  [
    "Chu Mạnh Cường",
    "1970-07-01",
    "male",
    "090 334 8811",
    "cuong.chu@example.com",
    "Quận 2, TP. Hồ Chí Minh",
  ],
  [
    "La Thị Phương",
    "1986-09-29",
    "female",
    "096 225 7744",
    "phuong.la@example.com",
    "Quận 9, TP. Hồ Chí Minh",
  ],
  [
    "Quách Anh Khoa",
    "1994-01-19",
    "male",
    "093 880 2266",
    "khoa.quach@example.com",
    "Quận 3, TP. Hồ Chí Minh",
  ],
  [
    "Tôn Nữ Yến",
    "1980-05-08",
    "female",
    "090 773 1199",
    "yen.ton@example.com",
    "Quận 7, TP. Hồ Chí Minh",
  ],
  [
    "Lâm Nhật Long",
    "1987-10-13",
    "male",
    "098 335 7711",
    "long.lam@example.com",
    "TP. Thủ Đức, TP. Hồ Chí Minh",
  ],
  [
    "Kiều Thanh Thảo",
    "1999-02-27",
    "female",
    "091 226 5588",
    "thao.kieu@example.com",
    "Quận Bình Thạnh, TP. Hồ Chí Minh",
  ],
];

export const patients: Profile[] = patientSeeds.map(
  ([full_name, date_of_birth, gender, phone, email, address], i) => ({
    id: `patient-${String(i + 1).padStart(2, "0")}`,
    email,
    full_name,
    phone,
    role: "patient",
    date_of_birth,
    gender,
    address,
    avatar_url: "",
    created_at: "2024-05-10T09:00:00+07:00",
    updated_at: "2025-06-01T10:00:00+07:00",
  }),
);

const reasons = [
  "Tái khám huyết áp định kỳ",
  "Đau tức ngực khi vận động",
  "Tim đập nhanh, khó ngủ",
  "Kiểm tra kết quả điện tim",
  "Khó thở khi leo cầu thang",
  "Theo dõi rối loạn nhịp tim",
  "Tư vấn phòng ngừa tim mạch",
  "Chóng mặt, mệt mỏi kéo dài",
  "Tái khám sau điều trị",
  "Kiểm tra huyết áp cao",
];

const isoDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const shiftedDate = (days: number) => {
  const date = typeof window === 'undefined' ? new Date('2026-11-09T12:00:00') : new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return isoDate(date);
};

const slotTimes = [
  ["08:00", "08:30"],
  ["08:30", "09:00"],
  ["09:00", "09:30"],
  ["09:30", "10:00"],
  ["10:00", "10:30"],
  ["10:30", "11:00"],
  ["13:30", "14:00"],
  ["14:00", "14:30"],
  ["14:30", "15:00"],
  ["15:00", "15:30"],
];

export function createMockData() {
  const timeSlots: TimeSlot[] = [];
  const appointments: Appointment[] = [];
  let index = 0;

  for (let day = -5; day <= 7; day += 1) {
    const count = day === 0 ? 10 : day < 0 ? 5 : 6;
    for (let j = 0; j < count; j += 1) {
      const [start, end] = slotTimes[j];
      const slotId = `slot-${day + 6}-${j + 1}`;
      const isFree = (day >= 0 && (j === 4 || j === 8)) || (day === 0 && j === 6);
      let status: AppointmentStatus;
      if (day < 0)
        status = (
          ["completed", "completed", "no_show", "cancelled", "completed"] as AppointmentStatus[]
        )[j % 5];
      else if (day === 0)
        status = (
          [
            "completed",
            "completed",
            "confirmed",
            "pending",
            "confirmed",
            "pending",
            "confirmed",
            "confirmed",
            "pending",
            "confirmed",
          ] as AppointmentStatus[]
        )[j];
      else
        status = (
          [
            "confirmed",
            "pending",
            "confirmed",
            "cancelled",
            "pending",
            "confirmed",
          ] as AppointmentStatus[]
        )[j];
      const booked = !isFree && (status === "pending" || status === "confirmed");
      timeSlots.push({
        id: slotId,
        doctor_id: doctor.id,
        slot_date: shiftedDate(day),
        start_time: start,
        end_time: end,
        is_booked: booked,
        created_at: `${shiftedDate(Math.min(day - 4, -1))}T08:00:00+07:00`,
      });
      if (!isFree && appointments.length < 60) {
        const createdDay = Math.min(day - 3, -1);
        appointments.push({
          id: `appointment-${String(index + 1).padStart(3, "0")}`,
          patient_id: patients[index % patients.length].id,
          doctor_id: doctor.id,
          slot_id: slotId,
          status,
          reason: reasons[index % reasons.length],
          doctor_note:
            status === "completed"
              ? [
                  "Huyết áp ổn định, tiếp tục theo dõi tại nhà.",
                  "Nhịp tim đều, hẹn tái khám sau 4 tuần.",
                  "Đã tư vấn thay đổi lối sống và vận động nhẹ.",
                ][index % 3]
              : "",
          cancel_reason:
            status === "cancelled"
              ? ["Bệnh nhân bận đột xuất", "Bệnh nhân đề nghị đổi lịch"][index % 2]
              : "",
          created_at: `${shiftedDate(createdDay)}T09:${String((index * 7) % 60).padStart(2, "0")}:00+07:00`,
          updated_at: `${shiftedDate(Math.min(day, 0))}T10:${String((index * 11) % 60).padStart(2, "0")}:00+07:00`,
        });
        index += 1;
      }
    }
  }
  return { timeSlots, appointments };
}

export const genderLabel: Record<Gender, string> = { male: "Nam", female: "Nữ", other: "Khác" };
export const statusLabel: Record<AppointmentStatus, string> = {
  pending: "Chờ duyệt",
  confirmed: "Đã xác nhận",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  no_show: "Vắng mặt",
};
