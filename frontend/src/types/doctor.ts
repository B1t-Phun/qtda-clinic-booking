// Định nghĩa kiểu dữ liệu cho Module Bác sĩ (Task 3.5)

export interface DoctorAppointmentView {
  id: string;
  patientName: string;
  patientPhone: string;
  appointmentDate: string;
  timeSlot: string;
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  symptoms?: string;
  notes?: string;
}

export interface MedicalRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  diagnosis: string;       // Chẩn đoán bệnh
  prescription?: string;   // Đơn thuốc
  doctorNotes?: string;    // Lời dặn của bác sĩ
  createdAt: string;
}
