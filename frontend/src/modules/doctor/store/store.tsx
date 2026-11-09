'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
  setLoggedIn: (val: boolean) => void;
  logout: () => void;
}

const STORAGE_KEY = 'clinicbooking-doctor-db-v1';

const DoctorContext = createContext<DoctorStoreContextType | null>(null);

export function DoctorProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(true);
  const [profile, setProfileState] = useState<Profile>(initialDoctorProfile);
  const [doctor] = useState<Doctor>(defaultDoctor);
  const [patients] = useState<Profile[]>(defaultPatients);
  const [appointments, setAppointments] = useState<Appointment[]>(() => createMockData().appointments);
  const [slots, setSlots] = useState<TimeSlot[]>(() => createMockData().timeSlots);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.appointments) setAppointments(parsed.appointments);
        if (parsed.slots) setSlots(parsed.slots);
        if (parsed.profile) setProfileState(parsed.profile);
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    if (!mounted) return;
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
  }, [appointments, slots, profile, mounted]);

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

  const logout = () => {
    setLoggedIn(false);
  };

  const value = useMemo(
    () => ({
      profile,
      doctor,
      patients,
      appointments,
      slots,
      selectedAppointment,
      toasts,
      loggedIn,
      setSelectedAppointment,
      updateStatus,
      updateNote,
      deleteSlot,
      addSlots,
      setProfile,
      toast,
      setLoggedIn,
      logout,
    }),
    [
      profile,
      doctor,
      patients,
      appointments,
      slots,
      selectedAppointment,
      toasts,
      loggedIn,
    ]
  );

  return <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>;
}

export function useDoctorStore() {
  const context = useContext(DoctorContext);
  if (!context) {
    throw new Error('useDoctorStore must be used within DoctorProvider');
  }
  return context;
}
