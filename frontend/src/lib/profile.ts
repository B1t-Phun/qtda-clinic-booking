import type { UserRole } from '@/types/auth';

export const PROFILE_COLUMNS = 'id,email,full_name,phone,role,date_of_birth,gender,address,avatar_url,created_at,updated_at';
export const AVATAR_BUCKET = 'profile-avatars';
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export interface PersonalProfile {
  id: string; email: string; full_name: string; phone: string; role: UserRole; date_of_birth: string;
  gender: '' | 'male' | 'female' | 'other'; address: string; avatar_url: string; created_at: string; updated_at: string;
}
export type PersonalInput = Pick<PersonalProfile, 'full_name' | 'phone' | 'date_of_birth' | 'gender' | 'address'>;
export function normalizeProfile(value: PersonalProfile): PersonalProfile {
  return { ...value, email: value.email || '', full_name: value.full_name || '', phone: value.phone || '',
    gender: value.gender || '', date_of_birth: value.date_of_birth || '', address: value.address || '', avatar_url: value.avatar_url || '' };
}
export function personalInput(profile: PersonalProfile): PersonalInput {
  return { full_name: profile.full_name, phone: profile.phone, date_of_birth: profile.date_of_birth, gender: profile.gender, address: profile.address };
}
export function clinicToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function profileErrors(input: Record<string, unknown>, today = clinicToday()) {
  const errors: Partial<Record<keyof PersonalInput, string>> = {};
  if (typeof input.full_name !== 'string' || input.full_name.trim().length < 2 || input.full_name.trim().length > 100) errors.full_name = 'Nhập họ tên từ 2 đến 100 ký tự.';
  if (typeof input.phone !== 'string' || input.phone && !/^0\d{9}$/.test(input.phone.trim())) errors.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.';
  const dob = input.date_of_birth;
  if (typeof dob !== 'string' || dob && (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !Number.isFinite(Date.parse(dob)) ||
    new Date(dob).toISOString().slice(0, 10) !== dob || dob < '1900-01-01' || dob > today)) errors.date_of_birth = 'Chọn ngày sinh hợp lệ từ năm 1900 đến hôm nay.';
  if (!['', 'male', 'female', 'other'].includes(String(input.gender))) errors.gender = 'Chọn giới tính hợp lệ.';
  if (typeof input.address !== 'string' || input.address.length > 500) errors.address = 'Địa chỉ tối đa 500 ký tự.';
  return errors;
}
export function avatarPath(url: string, owner?: string) {
  const match = /^\/api\/profile\/avatar\/([a-f0-9-]{36})\/([a-f0-9-]{36}\.webp)$/.exec(url);
  return match && (!owner || match[1] === owner) ? match[1] + '/' + match[2] : null;
}
export function notifyProfileChanged() {
  window.dispatchEvent(new Event('cliniccare-profile-updated'));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('cliniccare-auth'); channel.postMessage('profile-updated'); channel.close();
  }
}
