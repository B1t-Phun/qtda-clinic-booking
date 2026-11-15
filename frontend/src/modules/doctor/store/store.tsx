'use client';

import { useAuth } from '@/lib/auth/context';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Appointment, DoctorAction, DoctorSnapshot, NewSlot, ProfessionalInput, Profile, ProfileInput } from '../data';

class DoctorRequestError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}
export function doctorSessionRedirect(status: number, code?: string) {
  if (status === 401) return '/login';
  if (status === 403 && code === 'mfa_required') return '/auth/mfa';
  return null;
}
export async function doctorRequest<T>(action: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/doctor/' + action, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Không thể kết nối. Kiểm tra mạng rồi thử lại; thay đổi chưa được xác nhận lưu.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new DoctorRequestError(data?.message || 'Không thể tải dữ liệu khám bệnh.', response.status, typeof data?.code === 'string' ? data.code : undefined);
  if (!data || typeof data !== 'object') throw new Error('Dữ liệu phản hồi không hợp lệ. Vui lòng tải lại.');
  return data as T;
}

function profileValues(profile: Profile): Profile {
  return { ...profile, full_name: profile.full_name || '', email: profile.email || '', phone: profile.phone || '',
    date_of_birth: profile.date_of_birth || '', gender: profile.gender || '', address: profile.address || '', avatar_url: profile.avatar_url || '' };
}
function snapshotValues(snapshot: DoctorSnapshot): DoctorSnapshot {
  return { ...snapshot, profile: profileValues(snapshot.profile),
    doctor: { ...snapshot.doctor, bio: snapshot.doctor.bio || '', room: snapshot.doctor.room || '' },
    patients: snapshot.patients.map(profileValues),
    appointments: snapshot.appointments.map(a => ({ ...a, reason: a.reason || '', doctor_note: a.doctor_note || '', cancel_reason: a.cancel_reason || '' })),
    events: snapshot.events || [],
  };
}
interface ToastData { id: number; text: string; error?: boolean }
interface DoctorStore extends DoctorSnapshot {
  now: Date;
  selectedAppointment: Appointment | null;
  setSelectedAppointment: (appointment: Appointment | null) => void;
  pending: string | null;
  refreshing: boolean;
  error: string;
  toasts: ToastData[];
  toast: (text: string, error?: boolean) => void;
  refresh: () => Promise<boolean>;
  act: (appointment: Appointment, action: DoctorAction, input?: { note?: string; reason?: string; slotId?: string }) => Promise<boolean>;
  addSlots: (slots: NewSlot[]) => Promise<boolean>;
  deleteSlot: (id: string) => Promise<boolean>;
  saveProfile: (profile: ProfileInput) => Promise<boolean>;
  syncProfile: (profile: Profile) => void;
  saveProfessional: (doctor: ProfessionalInput) => Promise<boolean>;
  logout: () => Promise<void>;
}
const DoctorContext = createContext<DoctorStore | null>(null);

export function DoctorProvider({ initialSnapshot, children }: { initialSnapshot: DoctorSnapshot; children: ReactNode }) {
  const { user, logout } = useAuth();
  const [snapshot, setSnapshot] = useState(() => snapshotValues(initialSnapshot));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [now, setNow] = useState(() => new Date(initialSnapshot.loadedAt || Date.now()));
  const busy = useRef(false);
  const alive = useRef(true);
  const sequence = useRef(0);
  const request = useRef<AbortController | null>(null);
  const toastIds = useRef(0);
  const toastTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const channel = useRef<BroadcastChannel | null>(null);

  const toast = useCallback((text: string, failed = false) => {
    const id = ++toastIds.current;
    setToasts(previous => [...previous.slice(-3), { id, text, error: failed }]);
    const timer = setTimeout(() => {
      if (alive.current) setToasts(previous => previous.filter(item => item.id !== id));
      toastTimers.current.delete(timer);
    }, failed ? 7000 : 4000);
    toastTimers.current.add(timer);
  }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return false;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const version = ++sequence.current;
    setRefreshing(true);
    try {
      const data = await doctorRequest<DoctorSnapshot>('snapshot', undefined, controller.signal);
      if (!alive.current || version !== sequence.current) return false;
      if (data.profile.id !== user.id) { window.location.replace('/login'); return false; }
      setSnapshot(snapshotValues(data)); setError('');
      return true;
    } catch (caught) {
      if (controller.signal.aborted || !alive.current) return false;
      if (caught instanceof DoctorRequestError) {
        const redirect = doctorSessionRedirect(caught.status, caught.code);
        if (redirect) { setSelectedId(null); window.location.replace(redirect); }
      }
      setError(caught instanceof Error ? caught.message : 'Không tải được dữ liệu.');
      return false;
    } finally { if (alive.current && version === sequence.current) setRefreshing(false); }
  }, [user.id]);

  useEffect(() => {
    alive.current = true;
    const timers = toastTimers.current;
    channel.current = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cliniccare-doctor-' + user.id) : null;
    if (channel.current) channel.current.onmessage = () => { void refresh(); };
    const onFocus = () => { if (document.visibilityState !== 'hidden') void refresh(); };
    const clock = setInterval(() => setNow(new Date()), 15_000);
    const polling = setInterval(onFocus, 45_000);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      alive.current = false; request.current?.abort(); channel.current?.close();
      clearInterval(clock); clearInterval(polling);
      timers.forEach(clearTimeout);
      window.removeEventListener('focus', onFocus); window.removeEventListener('pageshow', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh, user.id]);

  async function perform(key: string, operation: () => Promise<void>, message: string) {
    if (busy.current) return false;
    busy.current = true; request.current?.abort(); ++sequence.current;
    setPending(key); setError(''); setRefreshing(false);
    let conflict = false;
    try {
      await operation();
      if (alive.current) { toast(message); channel.current?.postMessage('changed'); }
      return true;
    } catch (caught) {
      if (alive.current) {
        const message = caught instanceof Error ? caught.message : 'Không thực hiện được thao tác.';
        toast(message, true);
        conflict = caught instanceof DoctorRequestError && caught.status === 409;
        if (caught instanceof DoctorRequestError) {
          const redirect = doctorSessionRedirect(caught.status, caught.code);
          if (redirect) { setSelectedId(null); window.location.replace(redirect); }
        }
      }
      return false;
    } finally {
      busy.current = false;
      if (alive.current) { setPending(null); if (conflict) void refresh(); }
    }
  }
  async function act(appointment: Appointment, action: DoctorAction, input: { note?: string; reason?: string; slotId?: string } = {}) {
    return perform(appointment.id, async () => {
      const result = await doctorRequest<{ appointment: Appointment }>('appointment', {
        appointmentId: appointment.id, action, expectedUpdatedAt: appointment.updated_at, ...input,
      });
      if (!alive.current) return;
      setSnapshot(previous => {
        const appointments = previous.appointments.map(a => a.id === result.appointment.id
          ? { ...result.appointment, doctor_note: result.appointment.doctor_note || '', reason: result.appointment.reason || '', cancel_reason: result.appointment.cancel_reason || '' } : a);
        const affected = new Set([appointment.slot_id, result.appointment.slot_id]);
        return { ...previous, appointments, slots: previous.slots.map(slot => affected.has(slot.id)
          ? { ...slot, is_booked: appointments.some(a => a.slot_id === slot.id && ['pending', 'confirmed', 'completed'].includes(a.status)) } : slot) };
      });
      // Refresh only this appointment's audit trail after a mutation.
      void doctorRequest<{ events: DoctorSnapshot['events'] }>('history?appointmentId=' + appointment.id).then(history => {
        if (alive.current) setSnapshot(previous => ({ ...previous,
          events: [...history.events, ...previous.events.filter(event => event.appointment_id !== appointment.id)]
            .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100) }));
      }).catch(() => { /* The saved appointment remains usable; history can be retried in its panel. */ });
    }, action === 'save_note' ? 'Đã lưu ghi chú khám.' : 'Đã cập nhật lịch hẹn.');
  }
  async function addSlots(slots: NewSlot[]) {
    return perform('slots', async () => {
      const result = await doctorRequest<{ slots: DoctorSnapshot['slots'] }>('slots', { slots });
      if (alive.current) setSnapshot(previous => ({ ...previous, slots: [...previous.slots, ...result.slots] }));
    }, 'Đã tạo ' + slots.length + ' khung giờ.');
  }
  async function deleteSlot(slotId: string) {
    return perform('slot-' + slotId, async () => {
      await doctorRequest('delete-slot', { slotId });
      if (alive.current) setSnapshot(previous => ({ ...previous, slots: previous.slots.filter(slot => slot.id !== slotId) }));
    }, 'Đã xóa khung giờ trống.');
  }
  async function saveProfile(profile: ProfileInput) {
    return perform('profile', async () => {
      const result = await doctorRequest<{ profile: Profile }>('profile', profile);
      if (alive.current) setSnapshot(previous => ({ ...previous, profile: profileValues(result.profile) }));
    }, 'Đã lưu hồ sơ.');
  }
  async function saveProfessional(doctor: ProfessionalInput) {
    return perform('professional', async () => {
      const result = await doctorRequest<{ doctor: DoctorSnapshot['doctor'] }>('professional', doctor);
      if (alive.current) setSnapshot(previous => ({ ...previous, doctor: result.doctor }));
    }, 'Đã lưu thông tin chuyên môn.');
  }

  return <DoctorContext.Provider value={{ ...snapshot, now, pending, refreshing, error, toasts, toast, refresh,
    selectedAppointment: snapshot.appointments.find(a => a.id === selectedId) || null,
    setSelectedAppointment: appointment => setSelectedId(appointment?.id || null),
    act, addSlots, deleteSlot, saveProfile, saveProfessional, syncProfile: profile => setSnapshot(previous => ({ ...previous, profile: profileValues(profile) })), logout: () => logout((message: string) => toast(message, true)),
  }}>{children}</DoctorContext.Provider>;
}
export function useDoctorStore() {
  const context = useContext(DoctorContext);
  if (!context) throw new Error('useDoctorStore must be used within DoctorProvider');
  return context;
}
