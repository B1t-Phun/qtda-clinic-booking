import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  LayoutDashboard,
  Layers,
  Shield,
  Stethoscope,
  Users,
} from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon: any
  section: 'QUẢN LÝ' | 'HỆ THỐNG'
}

export const NAV: NavItem[] = [
  // Nhóm QUẢN LÝ
  { path: '/admin', label: 'Tổng quan', icon: LayoutDashboard, section: 'QUẢN LÝ' },
  { path: '/admin/appointments', label: 'Lịch hẹn', icon: CalendarDays, section: 'QUẢN LÝ' },
  { path: '/admin/doctors', label: 'Bác sĩ', icon: Stethoscope, section: 'QUẢN LÝ' },
  { path: '/admin/slots', label: 'Khung giờ', icon: CalendarClock, section: 'QUẢN LÝ' },
  { path: '/admin/patients', label: 'Bệnh nhân', icon: Users, section: 'QUẢN LÝ' },
  { path: '/admin/specialties', label: 'Chuyên khoa', icon: Layers, section: 'QUẢN LÝ' },

  // Nhóm HỆ THỐNG
  { path: '/admin/accounts', label: 'Tài khoản', icon: Shield, section: 'HỆ THỐNG' },
  { path: '/admin/reports', label: 'Báo cáo', icon: BarChart3, section: 'HỆ THỐNG' },
]
