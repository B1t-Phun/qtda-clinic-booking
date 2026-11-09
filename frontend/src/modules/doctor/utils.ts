import { AppointmentStatus, TimeSlot, genderLabel, statusLabel } from './data';

export { genderLabel, statusLabel };

export const todayISO = () => {
  if (typeof window === 'undefined') return '2026-11-09';
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dateVN = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN').format(new Date(`${iso}T12:00:00`));

export const longDate = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${iso}T12:00:00`));

export const ageOf = (birth: string) => {
  const b = new Date(birth);
  const n = new Date();
  let age = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) age--;
  return age;
};

export const initials = (name: string) =>
  name
    .replace('BS. ', '')
    .split(' ')
    .slice(-2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();

export const money = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(n) + ' ₫';

export const isSlotLive = (slot: TimeSlot, status: AppointmentStatus) => {
  if (typeof window === 'undefined') return false;
  const time = new Date().toTimeString().slice(0, 5);
  return (
    status === 'confirmed' &&
    slot.slot_date === todayISO() &&
    slot.start_time <= time &&
    time < slot.end_time
  );
};
