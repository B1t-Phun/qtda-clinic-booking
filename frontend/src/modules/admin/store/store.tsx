'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Appointment, DB, Doctor, Profile, Role, Specialty, Status, TimeSlot } from './types'
import { buildSeed } from './seed'
import { todayISO, toMin, uid } from '@/lib/format'

const KEY = 'clinicbooking-admin-db-v2'
const AUTH = 'clinicbooking-admin-auth'

export interface ApptView extends Appointment {
  patient: Profile
  doctor: Doctor
  doctorProfile: Profile
  specialty: Specialty
  slot: TimeSlot
}
export interface DoctorView extends Doctor {
  profile: Profile
  specialty: Specialty
}

type Result = { ok: true } | { ok: false; error: string }
const now = () => (typeof window === 'undefined' ? '2026-11-09T08:00:00.000Z' : new Date().toISOString())

// Seed dates are relative to today, so a stored snapshot from a previous day is re-seeded.
function load(): DB {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { day: string; db: DB }
        if (parsed.day === todayISO()) return parsed.db
      }
    } catch {}
  }
  return buildSeed()
}

function useStoreValue() {
  const [db, setDb] = useState<DB>(buildSeed)
  const [authed, setAuthed] = useState(() => (typeof window === 'undefined' ? true : sessionStorage.getItem(AUTH) !== '0'))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const failNext = useRef(false)

  useEffect(() => {
    setDb(load())
  }, [])

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ day: todayISO(), db }))
  }, [db])

  const reload = useCallback(() => {
    setLoading(true)
    setError(false)
    const t = setTimeout(() => {
      setLoading(false)
      if (failNext.current) {
        failNext.current = false
        setError(true)
      }
    }, 650)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => (authed ? reload() : undefined), [authed, reload])

  const simulateError = () => {
    failNext.current = true
    reload()
  }

  // ---------- lookups ----------
  const maps = useMemo(() => {
    const profiles = new Map(db.profiles.map((p) => [p.id, p]))
    const specialties = new Map(db.specialties.map((s) => [s.id, s]))
    const doctors = new Map(db.doctors.map((d) => [d.id, d]))
    const slots = new Map(db.time_slots.map((s) => [s.id, s]))
    return { profiles, specialties, doctors, slots }
  }, [db])

  const doctorViews: DoctorView[] = useMemo(
    () => db.doctors.map((d) => ({ ...d, profile: maps.profiles.get(d.profile_id)!, specialty: maps.specialties.get(d.specialty_id)! })).filter((d) => d.profile && d.specialty),
    [db.doctors, maps],
  )
  const appts: ApptView[] = useMemo(
    () =>
      db.appointments
        .map((a) => {
          const doctor = maps.doctors.get(a.doctor_id)!
          return {
            ...a,
            patient: maps.profiles.get(a.patient_id)!,
            doctor,
            doctorProfile: doctor && maps.profiles.get(doctor.profile_id)!,
            specialty: doctor && maps.specialties.get(doctor.specialty_id)!,
            slot: maps.slots.get(a.slot_id)!,
          }
        })
        .filter((a) => a.patient && a.doctor && a.slot),
    [db.appointments, maps],
  )

  // ---------- mutations ----------
  const setStatus = (ids: number[], status: Status, extra: Partial<Appointment> = {}) =>
    setDb((d) => {
      const idSet = new Set(ids)
      const freeSlots = new Set<string>()
      const appointments = d.appointments.map((a) => {
        if (!idSet.has(a.id)) return a
        if (status === 'cancelled') freeSlots.add(a.slot_id)
        return { ...a, ...extra, status, updated_at: now() }
      })
      return { ...d, appointments, time_slots: d.time_slots.map((s) => (freeSlots.has(s.id) ? { ...s, is_booked: false } : s)) }
    })

  const confirm = (ids: number[]) => setStatus(ids, 'confirmed')
  const cancel = (id: number, cancel_reason: string) => setStatus([id], 'cancelled', { cancel_reason })
  const complete = (id: number, doctor_note?: string) => setStatus([id], 'completed', doctor_note ? { doctor_note } : {})
  const noShow = (id: number) => setStatus([id], 'no_show')

  const reschedule = (id: number, slotId: string): Result => {
    const slot = maps.slots.get(slotId)
    if (!slot || slot.is_booked) return { ok: false, error: 'Khung giờ đã được đặt' }
    setDb((d) => {
      const a = d.appointments.find((x) => x.id === id)!
      return {
        ...d,
        appointments: d.appointments.map((x) => (x.id === id ? { ...x, slot_id: slotId, updated_at: now() } : x)),
        time_slots: d.time_slots.map((s) => (s.id === a.slot_id ? { ...s, is_booked: false } : s.id === slotId ? { ...s, is_booked: true } : s)),
      }
    })
    return { ok: true }
  }

  const createAppointment = (input: { patient_id: string; doctor_id: string; slot_id: string; reason: string; status: Status }): number => {
    const id = Math.max(1000, ...db.appointments.map((a) => a.id)) + 1
    const t = now()
    setDb((d) => ({
      ...d,
      appointments: [...d.appointments, { id, ...input, doctor_note: null, cancel_reason: null, created_at: t, updated_at: t }],
      time_slots: d.time_slots.map((s) => (s.id === input.slot_id ? { ...s, is_booked: true } : s)),
    }))
    return id
  }

  const emailTaken = (email: string, exceptId?: string) =>
    db.profiles.some((p) => p.email.toLowerCase() === email.trim().toLowerCase() && p.id !== exceptId)

  const saveProfile = (p: Partial<Profile> & { id?: string }, role: Role = 'patient'): Profile => {
    const t = now()
    if (p.id) {
      const existing = maps.profiles.get(p.id)!
      const next = { ...existing, ...p, updated_at: t } as Profile
      setDb((d) => ({ ...d, profiles: d.profiles.map((x) => (x.id === p.id ? next : x)) }))
      return next
    }
    const created: Profile = {
      id: `u-${uid()}`, email: '', full_name: '', phone: null, date_of_birth: null, gender: null, address: null, avatar_url: null,
      ...p, role, created_at: t, updated_at: t,
    } as Profile
    setDb((d) => ({ ...d, profiles: [...d.profiles, created] }))
    return created
  }

  const saveDoctor = (profile: Partial<Profile>, doc: Omit<Doctor, 'id' | 'profile_id' | 'created_at'>, doctorId?: string): string => {
    if (doctorId) {
      const existing = maps.doctors.get(doctorId)!
      saveProfile({ ...profile, id: existing.profile_id })
      setDb((d) => ({ ...d, doctors: d.doctors.map((x) => (x.id === doctorId ? { ...x, ...doc } : x)) }))
      return doctorId
    }
    const p = saveProfile(profile, 'doctor')
    const id = `d-${uid()}`
    setDb((d) => ({ ...d, doctors: [...d.doctors, { id, profile_id: p.id, created_at: now(), ...doc }] }))
    return id
  }
  const setDoctorActive = (id: string, is_active: boolean) =>
    setDb((d) => ({ ...d, doctors: d.doctors.map((x) => (x.id === id ? { ...x, is_active } : x)) }))
  const deleteDoctor = (id: string): Result => {
    if (db.appointments.some((a) => a.doctor_id === id)) return { ok: false, error: 'Bác sĩ đã có lịch hẹn' }
    const doc = maps.doctors.get(id)!
    setDb((d) => ({
      ...d,
      doctors: d.doctors.filter((x) => x.id !== id),
      time_slots: d.time_slots.filter((s) => s.doctor_id !== id),
      profiles: d.profiles.filter((p) => p.id !== doc.profile_id),
    }))
    return { ok: true }
  }

  const slotConflicts = (doctor_id: string, slot_date: string, start: string, end: string, ignore = new Set<string>()) =>
    db.time_slots.filter(
      (s) =>
        s.doctor_id === doctor_id &&
        s.slot_date === slot_date &&
        !ignore.has(s.id) &&
        start < s.end_time &&
        end > s.start_time,
    )
  const addSlots = (slots: Omit<TimeSlot, 'id' | 'created_at' | 'is_booked'>[]) => {
    const t = now()
    setDb((d) => ({ ...d, time_slots: [...d.time_slots, ...slots.map((s) => ({ ...s, id: `s-${uid()}`, is_booked: false, created_at: t }))] }))
  }
  /** Returns why a slot cannot be deleted, or null when it is free. */
  const slotLock = (slot: TimeSlot): string | null => {
    if (slot.is_booked) return 'Khung giờ đã có lịch hẹn nên không thể xóa'
    if (db.appointments.some((a) => a.slot_id === slot.id)) return 'Khung giờ còn được tham chiếu bởi lịch hẹn đã hủy'
    return null
  }
  const deleteSlots = (ids: string[]) => {
    const removable = new Set(ids.filter((id) => { const s = maps.slots.get(id); return s && !slotLock(s) }))
    setDb((d) => ({ ...d, time_slots: d.time_slots.filter((s) => !removable.has(s.id)) }))
    return { deleted: removable.size, skipped: ids.length - removable.size }
  }

  const saveSpecialty = (s: { id?: string; name: string; description: string | null }): Result => {
    if (db.specialties.some((x) => x.name.trim().toLowerCase() === s.name.trim().toLowerCase() && x.id !== s.id))
      return { ok: false, error: 'Tên chuyên khoa đã tồn tại' }
    setDb((d) =>
      s.id
        ? { ...d, specialties: d.specialties.map((x) => (x.id === s.id ? { ...x, name: s.name.trim(), description: s.description } : x)) }
        : { ...d, specialties: [...d.specialties, { id: `sp-${uid()}`, name: s.name.trim(), description: s.description, created_at: now() }] },
    )
    return { ok: true }
  }
  const deleteSpecialty = (id: string): Result => {
    if (db.doctors.some((d) => d.specialty_id === id)) return { ok: false, error: 'Chuyên khoa vẫn có bác sĩ' }
    setDb((d) => ({ ...d, specialties: d.specialties.filter((x) => x.id !== id) }))
    return { ok: true }
  }

  const roleChangeBlocker = (p: Profile, role: Role): string | null => {
    if (p.id === 'u-admin') return 'Không thể tự thay đổi vai trò của chính bạn.'
    if (p.role === 'doctor') {
      const doc = db.doctors.find((d) => d.profile_id === p.id)
      if (doc && db.appointments.some((a) => a.doctor_id === doc.id)) return 'Bác sĩ đã có lịch hẹn. Hãy ngừng hoạt động bác sĩ thay vì đổi vai trò.'
    }
    if (p.role === 'patient' && role !== 'patient' && db.appointments.some((a) => a.patient_id === p.id))
      return 'Bệnh nhân đã có lịch hẹn nên không thể đổi vai trò.'
    return null
  }
  const changeRole = (profileId: string, role: Role, doctorInfo?: { specialty_id: string; consultation_fee: number; room: string }) =>
    setDb((d) => {
      const t = now()
      let doctors = d.doctors.filter((x) => !(x.profile_id === profileId && role !== 'doctor'))
      if (role === 'doctor' && doctorInfo && !doctors.some((x) => x.profile_id === profileId))
        doctors = [...doctors, { id: `d-${uid()}`, profile_id: profileId, bio: null, years_experience: 0, is_active: false, created_at: t, ...doctorInfo }]
      return { ...d, doctors, profiles: d.profiles.map((p) => (p.id === profileId ? { ...p, role, updated_at: t } : p)) }
    })

  const resetData = () => setDb(buildSeed())
  const login = () => {
    sessionStorage.setItem(AUTH, '1')
    setAuthed(true)
  }
  const logout = () => {
    sessionStorage.removeItem(AUTH)
    setAuthed(false)
  }

  return {
    db, maps, appts, doctorViews, authed, loading, error, reload, simulateError, login, logout, resetData,
    me: maps.profiles.get('u-admin')!,
    confirm, cancel, complete, noShow, reschedule, createAppointment, saveProfile, emailTaken,
    saveDoctor, setDoctorActive, deleteDoctor, slotConflicts, addSlots, deleteSlots, slotLock,
    saveSpecialty, deleteSpecialty, changeRole, roleChangeBlocker,
  }
}

type Store = ReturnType<typeof useStoreValue>
const Ctx = createContext<Store | null>(null)
export function StoreProvider({ children }: { children: ReactNode }) {
  const v = useStoreValue()
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}
export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider missing')
  return v
}
