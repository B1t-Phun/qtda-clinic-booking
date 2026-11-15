import 'server-only';
import type { createServerSupabase } from '@/lib/auth/server';
import { AuthHttpError } from '@/lib/auth/http';

export type PersonalProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'patient';
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type Client = Awaited<ReturnType<typeof createServerSupabase>>;
const PROFILE_FIELDS = 'id,email,full_name,phone,role,date_of_birth,gender,address,avatar_url,created_at,updated_at';

export function profileDatabaseError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === '42501') throw new AuthHttpError(403, 'Bạn không có quyền xem hoặc cập nhật hồ sơ này.');
  if (error.code === 'PGRST116') throw new AuthHttpError(404, 'Không tìm thấy hồ sơ bệnh nhân.');
  throw new Error('Không thể tải dữ liệu hồ sơ.');
}

export async function ownProfile(client: Client, userId: string): Promise<PersonalProfile> {
  const { data, error } = await client.from('profiles').select(PROFILE_FIELDS).eq('id', userId).single();
  profileDatabaseError(error);
  if (!data || data.role !== 'patient') throw new AuthHttpError(404, 'Không tìm thấy hồ sơ bệnh nhân.');
  return data as PersonalProfile;
}
