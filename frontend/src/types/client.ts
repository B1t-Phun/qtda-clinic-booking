// Định nghĩa kiểu dữ liệu cho Module Client / Bệnh nhân (Task 3.4)

export interface PatientInfo {
  fullName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface AppointmentBooking {
  id: string;
  patient: PatientInfo;
  doctorId: string;
  specialtyId: string;
  date: string;         // YYYY-MM-DD
  timeSlotId: string;
  symptoms?: string;    // Triệu chứng / Lý do khám
  status: AppointmentStatus;
  createdAt: string;
}
