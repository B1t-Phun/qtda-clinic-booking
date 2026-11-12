'use client';

import { useAuth } from '@/lib/auth/context';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type Appointment,
  type AppointmentStatus,
  type Doctor,
  type Profile,
  type TimeSlot,
  createMockData,
  doctor as defaultDoctor,
  doctorProfile as initialDoctorProfile,
  patients as defaultPatients,
  statusLabel,
} from '../data';

export interface ToastData {
  id: number;
  text: string;
}

interface DoctorStoreContextType {
  profile: Profile;
  doctor: Doctor;
  patients: Profile[];
  appointments: Appointment[];
  slots: TimeSlot[];
  selectedAppointment: Appointment | null;
  toasts: ToastData[];
  loggedIn: boolean;
  setSelectedAppointment: (appointment: Appointment | null) => void;
  updateStatus: (status: AppointmentStatus, reason?: string) => void;
  updateNote: (note: string) => void;
  deleteSlot: (id: string) => void;
  addSlots: (newSlots: TimeSlot[]) => void;
  setProfile: (profile: Profile) => void;
  toast: (text: string) => void;
  logout: () => void;
}

const STORAGE_KEY = 'clinicbooking-doctor-db-v1';

const DoctorContext = createContext<DoctorStoreContextType | null>(null);

export function DoctorProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState(() => {
    const defaults = createMockData();
    let saved: Partial<{ appointments: Appointment[]; slots: TimeSlot[]; profile: Profile }> = {};
    if (typeof window !== 'undefined') {
      try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
      catch { /* Use the default display data if the saved snapshot is invalid. */ }
    }
    return {
      appointments: Array.isArray(saved.appointments) ? saved.appointments : defaults.appointments,
      slots: Array.isArray(saved.slots) ? saved.slots : defaults.timeSlots,
      profile: saved.profile && typeof saved.profile === 'object' ? saved.profile : initialDoctorProfile,
    };
  });
  const { user: authUser, logout } = useAuth();
  const loggedIn = authUser.role === 'doctor';
  const [profile, setProfileState] = useState<Profile>(initial.profile);
  const [doctor] = useState<Doctor>(defaultDoctor);
  const [patients] = useState<Profile[]>(defaultPatients);
  const [appointments, setAppointments] = useState<Appointment[]>(initial.appointments);
  const [slots, setSlots] = useState<TimeSlot[]>(initial.slots);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          appointments,
          slots,
          profile,
        })
      );
    } catch {
      // ignore
    }
  }, [appointments, slots, profile]);

  const toast = (text: string) => {
    const id = Date.now();
    setToasts((x) => [...x, { id, text }]);
    setTimeout(() => {
      setToasts((x) => x.filter((t) => t.id !== id));
    }, 2800);
  };

  const updateStatus = (status: AppointmentStatus, reason = '') => {
    if (!selectedAppointment) return;
    const id = selectedAppointment.id;
    const updated: Appointment = {
      ...selectedAppointment,
      status,
      cancel_reason: reason,
      updated_at: new Date().toISOString(),
    };

    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    setSlots((prev) =>
      prev.map((s) =>
        s.id === selectedAppointment.slot_id
          ? { ...s, is_booked: status === 'pending' || status === 'confirmed' }
          : s
      )
    );
    setSelectedAppointment(updated);
    toast(`Đã cập nhật: ${statusLabel[status]}`);
  };

  const updateNote = (note: string) => {
    if (!selectedAppointment) return;
    const updated: Appointment = {
      ...selectedAppointment,
      doctor_note: note,
      updated_at: new Date().toISOString(),
    };
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelectedAppointment(updated);
  };

  const deleteSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
    toast('Đã xóa khung giờ');
  };

  const addSlots = (newSlots: TimeSlot[]) => {
    setSlots((prev) => [...prev, ...newSlots]);
  };

  const setProfile = (newProfile: Profile) => {
    setProfileState(newProfile);
    toast('Đã lưu thay đổi hồ sơ');
  };



  const value: DoctorStoreContextType = {
    profile: { ...profile, id: authUser.id, email: authUser.email, full_name: authUser.fullName, phone: authUser.phone || '', role: authUser.role },
    doctor, patients, appointments, slots, selectedAppointment, toasts, loggedIn,
    setSelectedAppointment, updateStatus, updateNote, deleteSlot, addSlots, setProfile, toast, logout,
  };

  return <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>;
}

export function useDoctorStore() {
  const context = useContext(DoctorContext);
  if (!context) {
    throw new Error('useDoctorStore must be used within DoctorProvider');
  }
  return context;
}
