export type UserRole = 'admin' | 'doctor' | 'patient';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
}

export interface LoginFormState {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterFormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}
