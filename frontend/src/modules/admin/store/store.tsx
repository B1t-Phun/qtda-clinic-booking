'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Appointment, DB, Doctor, Profile, Role, Specialty, Status, TimeSlot } from './types'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'
import { toMin } from '@/lib/format'

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
function useStoreValue() {
  const [db, setDb] = useState<DB>({ profiles: [], specialties: [], doctors: [], time_slots: [], appointments: [] })
  const { user: authUser, logout } = useAuth()
  const authed = authUser.role === 'admin'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const loadSequence = useRef(0)
  const invalidateLoads = useCallback(() => { loadSequence.current += 1 }, [])

  const reload = useCallback(() => {
    const sequence = ++loadSequence.current
    setLoading(true)
    setError(false)
    let active = true
    const client = createClient()
    const readAll = async (table: 'profiles' | 'specialties' | 'doctors' | 'time_slots' | 'appointments') => {
      const rows: Record<string, unknown>[] = []
      for (let from = 0; ; from += 500) {
        const { data, error } = await client.from(table).select('*').order('id').range(from, from + 499)
        if (error) throw error
        rows.push(...((data || []) as Record<string, unknown>[]))
        if (!data || data.length < 500) return rows
      }
    }
    void Promise.all([
      readAll('profiles'), readAll('specialties'), readAll('doctors'), readAll('time_slots'), readAll('appointments'),
    ]).then(([profiles, specialties, doctors, time_slots, appointments]) => {
      if (!active || sequence !== loadSequence.current) return
      const idsToString = <T extends Record<string, unknown>>(rows: T[]): T[] => rows.map(row => Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, (key === 'id' || key.endsWith('_id')) && value != null && !(key === 'id' && 'patient_id' in row) ? String(value) : value]),
      ) as T)
      setDb({
        profiles: idsToString(profiles) as unknown as Profile[],
        specialties: idsToString(specialties) as unknown as DB['specialties'],
        doctors: idsToString(doctors) as unknown as Doctor[],
        time_slots: idsToString(time_slots) as unknown as TimeSlot[],
        appointments: appointments.map(row => ({ ...row, patient_id: String(row.patient_id), doctor_id: String(row.doctor_id), slot_id: String(row.slot_id) })) as unknown as Appointment[],
      })
      setError(false)
    }).catch(() => { if (active && sequence === loadSequence.current) setError(true) }).finally(() => { if (active && sequence === loadSequence.current) setLoading(false) })
    return () => { active = false }
  }, [])
  const dbClient = useMemo(() => createClient(), [])
  const persist = useCallback((write: () => PromiseLike<{ error: { message?: string } | null }>) => {
    void (async () => {
      const { error: writeError } = await write()
      if (writeError) throw writeError
      void reload()
    })().catch(() => setError(true))
  }, [reload])
  useEffect(() => {
    if (!authed) return
    let stop: (() => void) | undefined
    const initial = setTimeout(() => { stop = reload() }, 0)
    const sync = () => { if (document.visibilityState !== 'hidden') reload() }
    const poll = setInterval(sync, 45_000)
    window.addEventListener('focus', sync)
    return () => { clearTimeout(initial); stop?.(); invalidateLoads(); clearInterval(poll); window.removeEventListener('focus', sync) }
  }, [authed, invalidateLoads, reload])

  const simulateError = () => setError(true)

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
  const setStatus = (ids: number[], status: Status, extra: Partial<Appointment> = {}) => {
    persist(() => dbClient.from('appointments').update({ status, ...extra, updated_at: new Date().toISOString() }).in('id', ids))
  }

  const confirm = (ids: number[]) => setStatus(ids, 'confirmed')
  const cancel = (id: number, cancel_reason: string) => setStatus([id], 'cancelled', { cancel_reason })
  const complete = (id: number, doctor_note?: string) => setStatus([id], 'completed', doctor_note ? { doctor_note } : {})
  const noShow = (id: number) => setStatus([id], 'no_show')

  const reschedule = (id: number, slotId: string): Result => {
    const slot = maps.slots.get(slotId)
    if (!slot || slot.is_booked) return { ok: false, error: 'Khung giờ đã được đặt' }
    persist(() => dbClient.from('appointments').update({ slot_id: slotId, updated_at: new Date().toISOString() }).eq('id', id))
    return { ok: true }
  }

  const createAppointment = async (input: { patient_id: string; doctor_id: string; slot_id: string; reason: string; status: Status }): Promise<number> => {
    const { data, error } = await dbClient.rpc('admin_create_appointment', {
      p_patient_id: input.patient_id,
      p_doctor_id: input.doctor_id,
      p_slot_id: Number(input.slot_id),
      p_reason: input.reason.trim(),
      p_status: input.status,
    })
    if (error) throw error
    if (typeof data !== 'number' && typeof data !== 'string') throw new Error('Supabase không trả về mã lịch hẹn.')
    void reload()
    return Number(data)
  }

  const emailTaken = (email: string, exceptId?: string) =>
    db.profiles.some((p) => p.email.toLowerCase() === email.trim().toLowerCase() && p.id !== exceptId)
  const patientAccountExists = (email: string) => db.profiles.some(p => p.role === 'patient' && p.email.toLowerCase() === email.trim().toLowerCase())

  const createPatientRecord = async (input: {
    full_name: string
    email: string
    phone: string
    gender: Profile['gender']
    date_of_birth: string | null
    address: string | null
    avatar_url: string | null
  }): Promise<Profile> => {
    const { data, error } = await dbClient.rpc('admin_create_patient', {
      p_full_name: input.full_name.trim(),
      p_email: input.email.trim() || null,
      p_phone: input.phone,
      p_gender: input.gender,
      p_date_of_birth: input.date_of_birth,
      p_address: input.address,
      p_avatar_url: input.avatar_url,
    })
    if (error) throw error
    if (!data || typeof data !== 'object') throw new Error('Supabase did not return the patient profile.')
    const created = { ...(data as Profile), email: (data as Profile).email || '' }
    setDb(current => ({ ...current, profiles: [...current.profiles, created] }))
    return created
  }
  const saveProfile = (p: Partial<Profile> & { id?: string }, role: Role = 'patient'): Profile => {
    const linked = p.id ? maps.profiles.get(p.id) : db.profiles.find(profile => profile.email.toLowerCase() === (p.email || '').trim().toLowerCase() && profile.role === role)
    if (linked) {
      const existing = linked
      const next = { ...existing, ...p, email: existing.email, updated_at: new Date().toISOString() } as Profile
      const t = next.updated_at
      persist(() => dbClient.from('profiles').update({ full_name: next.full_name, phone: next.phone, date_of_birth: next.date_of_birth, gender: next.gender, address: next.address, avatar_url: next.avatar_url, updated_at: t }).eq('id', existing.id))
      return next
    }
    throw new Error(`Cần tạo tài khoản ${role} trong Supabase Auth trước khi thêm hồ sơ.`)
  }

  const saveDoctor = async (profile: Partial<Profile>, doc: Omit<Doctor, 'id' | 'profile_id' | 'created_at'>, doctorId?: string): Promise<string> => {
    const existing = doctorId ? maps.doctors.get(doctorId) : undefined
    if (doctorId && !existing) throw new Error('Doctor profile not found.')
    const account = existing
      ? maps.profiles.get(existing.profile_id)
      : db.profiles.find(item => item.email.toLowerCase() === (profile.email || '').trim().toLowerCase())
    if (!account) throw new Error('Email chưa có tài khoản. Bác sĩ cần đăng ký trước.')
    if (doctorId && account.role !== 'doctor') throw new Error('Tài khoản liên kết không có vai trò bác sĩ.')
    if (!doctorId && account.role !== 'patient' && account.role !== 'doctor') throw new Error('Chỉ tài khoản bệnh nhân hoặc tài khoản bác sĩ chưa có hồ sơ mới được liên kết.')
    if (!doctorId && db.doctors.some(item => item.profile_id === account.id)) throw new Error('Tài khoản này đã có hồ sơ bác sĩ.')

    const { data, error } = await dbClient.rpc('admin_save_doctor', {
      p_doctor_id: doctorId || null,
      p_profile_id: account.id,
      p_full_name: profile.full_name?.trim(),
      p_phone: profile.phone || null,
      p_avatar_url: profile.avatar_url || null,
      p_specialty_id: doc.specialty_id,
      p_room: doc.room,
      p_years_experience: doc.years_experience,
      p_consultation_fee: doc.consultation_fee,
      p_bio: doc.bio,
      p_is_active: doc.is_active,
    })
    if (error) throw error
    if (typeof data !== 'string') throw new Error('Supabase không trả về mã hồ sơ bác sĩ.')
    void reload()
    return data
  }
  const setDoctorActive = async (id: string, is_active: boolean): Promise<void> => {
    const { error } = await dbClient.rpc('admin_set_doctor_active', { p_doctor_id: id, p_is_active: is_active })
    if (error) throw error
    void reload()
  }
  const deleteDoctor = async (id: string): Promise<void> => {
    const { error } = await dbClient.rpc('admin_delete_doctor', { p_doctor_id: id })
    if (error) throw error
    void reload()
  }
  const slotConflicts = (doctor_id: string, slot_date: string, start: string, end: string, ignore = new Set<string>()) =>
    db.time_slots.filter(
      (s) => s.doctor_id === doctor_id && s.slot_date === slot_date && !ignore.has(s.id) &&
        (s.start_time === start || (toMin(s.start_time) < toMin(end) && toMin(start) < toMin(s.end_time))),
    )
  const addSlots = (slots: Omit<TimeSlot, 'id' | 'created_at' | 'is_booked'>[]) => {
    persist(() => dbClient.from('time_slots').insert(slots.map(slot => ({ ...slot, is_booked: false }))))
  }
  /** Returns why a slot cannot be deleted, or null when it is free. */
  const slotLock = (slot: TimeSlot): string | null => {
    if (slot.is_booked) return 'Khung giờ đã có lịch hẹn nên không thể xóa'
    if (db.appointments.some((a) => a.slot_id === slot.id)) return 'Khung giờ còn được tham chiếu bởi lịch hẹn đã hủy'
    return null
  }
  const deleteSlots = (ids: string[]) => {
    const removable = new Set(ids.filter((id) => { const s = maps.slots.get(id); return s && !slotLock(s) }))
    if (removable.size) persist(() => dbClient.from('time_slots').delete().in('id', [...removable]))
    return { deleted: removable.size, skipped: ids.length - removable.size }
  }

  const saveSpecialty = async (s: { id?: string; name: string; description: string | null }): Promise<Result> => {
    if (db.specialties.some((x) => x.name.trim().toLowerCase() === s.name.trim().toLowerCase() && x.id !== s.id))
      return { ok: false, error: 'Tên chuyên khoa đã tồn tại' }
    const { error } = await dbClient.rpc('admin_save_specialty', {
      p_specialty_id: s.id ? Number(s.id) : null,
      p_name: s.name.trim(),
      p_description: s.description,
    })
    if (error) return { ok: false, error: error.message }
    void reload()
    return { ok: true }
  }
  const deleteSpecialty = (id: string): Result => {
    if (db.doctors.some((d) => d.specialty_id === id)) return { ok: false, error: 'Chuyên khoa vẫn có bác sĩ' }
    persist(() => dbClient.from('specialties').delete().eq('id', id))
    return { ok: true }
  }

  const me = maps.profiles.get(authUser.id) || { id: authUser.id, email: authUser.email, full_name: authUser.fullName, phone: authUser.phone || null, role: authUser.role, date_of_birth: null, gender: null, address: null, avatar_url: null, created_at: '', updated_at: '' }
  return {
    db, maps, appts, doctorViews, authed, loading, error, reload, simulateError, logout,
    me,
    confirm, cancel, complete, noShow, reschedule, createAppointment, saveProfile, createPatientRecord, emailTaken, patientAccountExists,
    saveDoctor, setDoctorActive, deleteDoctor, slotConflicts, addSlots, deleteSlots, slotLock,
    saveSpecialty, deleteSpecialty,
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
