import { clinicDate, slotInstant } from './workflow';
import type { AppointmentStatus, TimeSlot } from './data';
export { genderLabel, statusLabel } from './data';
export const todayISO = clinicDate;

export function dateVN(iso: string) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '—';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso.slice(0, 10) + 'T12:00:00+07:00'));
}
export function longDate(iso: string) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '—';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    .format(new Date(iso.slice(0, 10) + 'T12:00:00+07:00'));
}
export function dateTimeVN(iso: string | null) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '—';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}
export function ageOf(birth: string, now = new Date()) {
  if (!birth || !Number.isFinite(Date.parse(birth))) return '—';
  const today = clinicDate(now);
  const years = Number(today.slice(0, 4)) - Number(birth.slice(0, 4)) - Number(today.slice(5) < birth.slice(5));
  return years < 0 ? '—' : years;
}
export const initials = (name: string) => name.replace(/^BS\.\s*/i, '').trim().split(/\s+/).slice(-2).map(word => word[0] || '').join('').toUpperCase() || 'BS';
export const money = (value: number | null) => value == null ? 'Chưa cập nhật' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
export const timeLabel = (value: string) => value.slice(0, 5);
export function isSlotLive(slot: TimeSlot, status: AppointmentStatus, now = new Date()) {
  return status === 'confirmed' && slotInstant(slot) <= now.getTime() && now.getTime() < slotInstant(slot, true);
}
export function searchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}
