export type Role = 'admin' | 'doctor' | 'patient'
export type Gender = 'male' | 'female' | 'other'
export type Status = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: Role
  date_of_birth: string | null // yyyy-MM-dd
  gender: Gender | null
  address: string | null
  avatar_url: string | null
  created_at: string // ISO
  updated_at: string
}
export interface Specialty { id: string; name: string; description: string | null; created_at: string }
export interface Doctor {
  id: string
  profile_id: string
  specialty_id: string
  bio: string | null
  room: string | null
  years_experience: number
  consultation_fee: number
  is_active: boolean
  created_at: string
}
export interface TimeSlot {
  id: string
  doctor_id: string
  slot_date: string // yyyy-MM-dd
  start_time: string // HH:mm
  end_time: string
  is_booked: boolean
  created_at: string
}
export interface Appointment {
  id: number
  patient_id: string
  doctor_id: string
  slot_id: string
  status: Status
  reason: string | null
  doctor_note: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
}
export interface DB {
  profiles: Profile[]
  specialties: Specialty[]
  doctors: Doctor[]
  time_slots: TimeSlot[]
  appointments: Appointment[]
}
