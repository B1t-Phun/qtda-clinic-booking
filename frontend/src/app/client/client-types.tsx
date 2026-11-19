'use client';

import React from 'react';
import { cx } from '@/lib/format';

export type PatientAppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface PatientStatusMeta {
  label: string;
  color: string;
  bg: string;
  text: string;
}

export const PATIENT_STATUS_META: Record<PatientAppointmentStatus, PatientStatusMeta> = {
  pending: {
    label: 'Chờ duyệt',
    color: '#F59E0B',
    bg: '#FEF3C7',
    text: '#B45309',
  },
  confirmed: {
    label: 'Đã xác nhận',
    color: '#16A34A',
    bg: '#DCFCE7',
    text: '#15803D',
  },
  completed: {
    label: 'Hoàn thành',
    color: '#64748B',
    bg: '#F1F5F9',
    text: '#475569',
  },
  cancelled: {
    label: 'Đã hủy',
    color: '#DC2626',
    bg: '#FEE2E2',
    text: '#B91C1C',
  },
  no_show: {
    label: 'Vắng mặt',
    color: '#7C3AED',
    bg: '#EDE9FE',
    text: '#6D28D9',
  },
};

export function PatientStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const s = (status as PatientAppointmentStatus) in PATIENT_STATUS_META
    ? (status as PatientAppointmentStatus)
    : 'pending';
  const meta = PATIENT_STATUS_META[s];

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        className
      )}
      style={{ backgroundColor: meta.bg, color: meta.text }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {meta.label}
    </span>
  );
}

export interface SpecialtyItem {
  id: string | number;
  name: string;
  description: string | null;
  created_at?: string;
}

export interface DoctorProfileItem {
  id: string;
  full_name: string;
  email?: string;
  phone?: string | null;
  avatar_url?: string | null;
  gender?: string | null;
}

export interface DoctorItem {
  id: string;
  profile_id?: string;
  specialty_id?: string | number;
  bio?: string | null;
  room?: string | null;
  years_experience?: number;
  consultation_fee?: number;
  is_active?: boolean;
  profiles?: DoctorProfileItem | DoctorProfileItem[] | null;
  profile?: DoctorProfileItem | DoctorProfileItem[] | null;
  specialties?: SpecialtyItem | SpecialtyItem[] | null;
  specialty?: SpecialtyItem | SpecialtyItem[] | null;
}

export interface TimeSlotItem {
  id: string | number;
  doctor_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

export interface AppointmentItem {
  id: number;
  patient_id: string;
  doctor_id: string;
  slot_id: string | number;
  status: string;
  reason: string | null;
  doctor_note: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at?: string;
  doctor?: DoctorItem | DoctorItem[] | null;
  slot?: TimeSlotItem | TimeSlotItem[] | null;
}

// Helpers to safely extract single profile/specialty/doctor/slot regardless of array or object
export function getDoctorProfile(doctor: DoctorItem | null | undefined): DoctorProfileItem | null {
  if (!doctor) return null;
  if (doctor.profile) {
    if (Array.isArray(doctor.profile)) return doctor.profile[0] || null;
    return doctor.profile;
  }
  if (doctor.profiles) {
    if (Array.isArray(doctor.profiles)) return doctor.profiles[0] || null;
    return doctor.profiles;
  }
  return null;
}

export function getDoctorSpecialty(doctor: DoctorItem | null | undefined): SpecialtyItem | null {
  if (!doctor) return null;
  if (doctor.specialty) {
    if (Array.isArray(doctor.specialty)) return doctor.specialty[0] || null;
    return doctor.specialty;
  }
  if (doctor.specialties) {
    if (Array.isArray(doctor.specialties)) return doctor.specialties[0] || null;
    return doctor.specialties;
  }
  return null;
}

export function getAppointmentDoctor(appt: AppointmentItem): DoctorItem | null {
  if (!appt.doctor) return null;
  if (Array.isArray(appt.doctor)) return appt.doctor[0] || null;
  return appt.doctor;
}

export function getAppointmentSlot(appt: AppointmentItem): TimeSlotItem | null {
  if (!appt.slot) return null;
  if (Array.isArray(appt.slot)) return appt.slot[0] || null;
  return appt.slot;
}

export interface PatientProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role?: string;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  address?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
  stats?: {
    totalAppointments: number;
    pendingAppointments: number;
    completedAppointments: number;
  };
}
