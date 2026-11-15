export type Gender = 'male' | 'female' | 'other';
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type DoctorAction = 'confirm' | 'check_in' | 'start' | 'complete' | 'cancel' | 'no_show' | 'save_note' | 'reschedule';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'doctor' | 'patient';
  date_of_birth: string;
  gender: Gender | '';
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
  years_experience: number | null;
  consultation_fee: number | null;
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
export type DoctorAction = 'confirm' | 'check_in' | 'start' | 'complete' | 'cancel' | 'no_show' | 'save_note' | 'reschedule';

export interface DoctorSnapshot {
  profile: Profile;
  specialty: Specialty;
  doctor: Doctor;
  patients: Profile[];
  appointments: Appointment[];
  slots: TimeSlot[];
  events: any[];
}

export type NewSlot = Pick<TimeSlot, 'slot_date' | 'start_time' | 'end_time'>;
export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  slot_id: string;
  status: AppointmentStatus;
  reason: string;
  doctor_note: string;
  cancel_reason: string;
  checked_in_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface AppointmentEvent {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  actor_id: string | null;
  action: string;
  old_status: AppointmentStatus | null;
  new_status: AppointmentStatus;
  old_slot_id: string | null;
  new_slot_id: string;
  reason: string | null;
  created_at: string;
}
export interface DoctorSnapshot {
  profile: Profile;
  doctor: Doctor;
  specialty: Specialty | null;
  patients: Profile[];
  appointments: Appointment[];
  slots: TimeSlot[];
  events: AppointmentEvent[];
  loadedAt?: string;
}
export type ProfileInput = Pick<Profile, 'full_name' | 'phone' | 'date_of_birth' | 'gender' | 'address' | 'avatar_url'>;
export type ProfessionalInput = Pick<Doctor, 'bio' | 'room' | 'consultation_fee'>;

export const genderLabel: Record<Gender | '', string> = { male: 'Nam', female: 'Nữ', other: 'Khác', '': 'Chưa cập nhật' };
export const statusLabel: Record<AppointmentStatus, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', completed: 'Hoàn thành',
  cancelled: 'Đã hủy', no_show: 'Vắng mặt',
};
export const actionLabel: Record<string, string> = {
  created: 'Đặt lịch', confirm: 'Xác nhận lịch', check_in: 'Tiếp nhận bệnh nhân',
  start: 'Bắt đầu khám', complete: 'Hoàn thành khám', cancel: 'Hủy lịch',
  no_show: 'Đánh dấu vắng', reschedule: 'Đổi lịch', save_note: 'Lưu ghi chú',
};
