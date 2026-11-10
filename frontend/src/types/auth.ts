// Định nghĩa kiểu dữ liệu cho Xác thực & Phân quyền (Task 3.2 - Authentication & Roles)

export type UserRole = 'admin' | 'doctor' | 'patient' | 'receptionist';

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
  role?: UserRole;
}

export interface RegisterFormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}
