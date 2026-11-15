import type { Appointment, DB, Doctor, Gender, Profile, Specialty, Status, TimeSlot } from './types'
import { addDays, fromMin, todayISO, toMin } from '@/lib/format'

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const LAST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý']
const MALE_MID = ['Văn', 'Minh', 'Quốc', 'Đức', 'Hoàng', 'Thanh', 'Gia', 'Hữu']
const FEMALE_MID = ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Bảo', 'Khánh', 'Mai', 'Phương']
const MALE_FIRST = ['Anh', 'Bảo', 'Cường', 'Dũng', 'Đạt', 'Hải', 'Hiếu', 'Huy', 'Khang', 'Khoa', 'Long', 'Nam', 'Phúc', 'Quang', 'Sơn', 'Thắng', 'Tuấn', 'Việt']
const FEMALE_FIRST = ['An', 'Chi', 'Diệp', 'Giang', 'Hà', 'Hằng', 'Hương', 'Lan', 'Linh', 'Ly', 'My', 'Ngân', 'Nhung', 'Oanh', 'Quyên', 'Thảo', 'Trang', 'Vy', 'Yến']
const STREETS = ['Lê Lợi', 'Nguyễn Huệ', 'Hai Bà Trưng', 'Điện Biên Phủ', 'Cách Mạng Tháng Tám', 'Võ Văn Tần', 'Nguyễn Thị Minh Khai', 'Lý Thường Kiệt', 'Trần Hưng Đạo', 'Phan Xích Long']
const DISTRICTS = ['Quận 1', 'Quận 3', 'Quận 5', 'Quận 7', 'Quận 10', 'Bình Thạnh', 'Phú Nhuận', 'Tân Bình', 'Gò Vấp', 'Thủ Đức']

const SPECIALTIES: [string, string][] = [
  ['Nội tổng quát', 'Khám, chẩn đoán và điều trị các bệnh lý nội khoa thường gặp ở người lớn.'],
  ['Nhi khoa', 'Chăm sóc sức khỏe, tiêm chủng tư vấn và điều trị bệnh cho trẻ em từ sơ sinh đến 16 tuổi.'],
  ['Tim mạch', 'Tầm soát, chẩn đoán và theo dõi các bệnh lý tim mạch, tăng huyết áp.'],
  ['Da liễu', 'Điều trị các bệnh về da, tóc, móng và tư vấn chăm sóc da.'],
  ['Tai Mũi Họng', 'Khám và điều trị các bệnh lý tai, mũi, họng, xoang.'],
]

const REASONS: Record<number, string[]> = {
  0: ['Sốt, mệt mỏi kéo dài', 'Đau bụng, khó tiêu', 'Khám sức khỏe định kỳ', 'Đau đầu, chóng mặt', 'Ho kéo dài 2 tuần'],
  1: ['Bé sốt cao 2 ngày', 'Bé biếng ăn, chậm tăng cân', 'Tư vấn tiêm chủng', 'Bé ho, sổ mũi', 'Bé nổi mẩn đỏ'],
  2: ['Tức ngực khi gắng sức', 'Theo dõi huyết áp', 'Hồi hộp, tim đập nhanh', 'Tái khám sau điều trị', 'Khó thở về đêm'],
  3: ['Mụn trứng cá', 'Ngứa da, nổi mề đay', 'Viêm da cơ địa', 'Rụng tóc nhiều', 'Nám, tàn nhang'],
  4: ['Viêm họng, đau rát', 'Nghẹt mũi kéo dài', 'Ù tai', 'Viêm xoang tái phát', 'Khàn tiếng'],
}
const NOTES: Record<number, string[]> = {
  0: ['Viêm dạ dày nhẹ, kê thuốc 7 ngày, tái khám nếu còn đau.', 'Sức khỏe ổn định, duy trì chế độ ăn uống.', 'Nghi rối loạn tiền đình, hẹn xét nghiệm thêm.'],
  1: ['Viêm họng do virus, hạ sốt và theo dõi tại nhà.', 'Cân nặng trong ngưỡng bình thường, bổ sung vi chất.', 'Viêm mũi họng, tái khám sau 5 ngày.'],
  2: ['Huyết áp 140/90, điều chỉnh liều thuốc.', 'Điện tim bình thường, theo dõi thêm.', 'Rối loạn nhịp nhẹ, hẹn đo Holter.'],
  3: ['Mụn mức độ trung bình, kê thuốc bôi 4 tuần.', 'Viêm da tiếp xúc, tránh tác nhân kích ứng.', 'Rụng tóc do căng thẳng, bổ sung dưỡng chất.'],
  4: ['Viêm họng cấp, kê kháng sinh 5 ngày.', 'Viêm xoang mạn, súc rửa mũi hằng ngày.', 'Ráy tai, đã lấy sạch.'],
}
export const CANCEL_REASONS = ['Bệnh nhân bận việc đột xuất', 'Trùng lịch cá nhân', 'Đổi sang bác sĩ khác', 'Bác sĩ có lịch công tác', 'Đã khỏi bệnh', 'Đặt nhầm ngày']

const DOCTORS: { name: string; gender: Gender; sp: number; room: string; years: number; fee: number; active: boolean; bio: string }[] = [
  { name: 'Nguyễn Văn Hùng', gender: 'male', sp: 0, room: 'P.101', years: 15, fee: 300000, active: true, bio: 'Bác sĩ chuyên khoa II Nội tổng quát, nhiều năm công tác tại bệnh viện tuyến trung ương.' },
  { name: 'Lê Thị Mai Anh', gender: 'female', sp: 0, room: 'P.102', years: 8, fee: 250000, active: true, bio: 'Thạc sĩ Y khoa, có thế mạnh về bệnh lý tiêu hóa và chuyển hóa.' },
  { name: 'Phạm Ngọc Lan', gender: 'female', sp: 1, room: 'P.201', years: 12, fee: 300000, active: true, bio: 'Bác sĩ Nhi khoa tận tâm, chuyên dinh dưỡng và bệnh hô hấp ở trẻ.' },
  { name: 'Trần Quốc Bảo', gender: 'male', sp: 1, room: 'P.202', years: 6, fee: 250000, active: true, bio: 'Bác sĩ Nhi khoa, được đào tạo về hồi sức sơ sinh.' },
  { name: 'Hoàng Minh Tuấn', gender: 'male', sp: 2, room: 'P.301', years: 20, fee: 500000, active: true, bio: 'Phó giáo sư, Tiến sĩ chuyên ngành Tim mạch can thiệp.' },
  { name: 'Đặng Thu Hà', gender: 'female', sp: 2, room: 'P.302', years: 10, fee: 400000, active: false, bio: 'Bác sĩ Tim mạch, chuyên siêu âm tim và tăng huyết áp.' },
  { name: 'Vũ Khánh Linh', gender: 'female', sp: 3, room: 'P.401', years: 9, fee: 350000, active: true, bio: 'Bác sĩ Da liễu, thế mạnh điều trị mụn và viêm da cơ địa.' },
  { name: 'Bùi Đức Thắng', gender: 'male', sp: 4, room: 'P.402', years: 14, fee: 300000, active: true, bio: 'Bác sĩ chuyên khoa I Tai Mũi Họng, nội soi chẩn đoán.' },
]

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '.')

export function buildSeed(): DB {
  const r = rng(20240611)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const today = todayISO()
  const now = typeof window === 'undefined' ? new Date('2026-11-09T08:00:00Z') : new Date()
  const isoAt = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00`).toISOString()
  const daysAgoISO = (n: number) => isoAt(addDays(today, -n), fromMin(8 * 60 + Math.floor(r() * 600)))

  const specialties: Specialty[] = SPECIALTIES.map(([name, description], i) => ({
    id: `sp-${i + 1}`, name, description, created_at: daysAgoISO(400 - i * 3),
  }))

  const profiles: Profile[] = []
  const created = daysAgoISO(420)
  profiles.push({
    id: 'u-admin', email: 'admin@clinicbooking.vn', full_name: 'Lê Đình Phương', phone: '0901234567', role: 'admin',
    date_of_birth: '1988-04-12', gender: 'male', address: '12 Lê Lợi, Quận 1, TP.HCM', avatar_url: null, created_at: created, updated_at: created,
  })

  const doctors: Doctor[] = DOCTORS.map((d, i) => {
    const pid = `u-doc-${i + 1}`
    const c = daysAgoISO(380 - i * 20)
    profiles.push({
      id: pid, email: `bs.${slug(d.name.split(' ').slice(-2).join(' '))}@clinicbooking.vn`, full_name: d.name,
      phone: `09${Math.floor(10000000 + r() * 89999999)}`, role: 'doctor', date_of_birth: `${1970 + Math.floor(r() * 20)}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`,
      gender: d.gender, address: `${10 + Math.floor(r() * 200)} ${pick(STREETS)}, ${pick(DISTRICTS)}, TP.HCM`, avatar_url: null, created_at: c, updated_at: c,
    })
    return { id: `d-${i + 1}`, profile_id: pid, specialty_id: specialties[d.sp].id, bio: d.bio, room: d.room, years_experience: d.years, consultation_fee: d.fee, is_active: d.active, created_at: c }
  })

  for (let i = 0; i < 60; i++) {
    const gender: Gender = i % 23 === 7 ? 'other' : r() < 0.5 ? 'male' : 'female'
    const fem = gender === 'female' || (gender === 'other' && r() < 0.5)
    const name = `${pick(LAST)} ${pick(fem ? FEMALE_MID : MALE_MID)} ${pick(fem ? FEMALE_FIRST : MALE_FIRST)}`
    const age = i % 6 === 0 ? 2 + Math.floor(r() * 12) : 18 + Math.floor(r() * 55)
    const y = now.getFullYear() - age
    const c = daysAgoISO(i < 8 ? Math.floor(r() * 13) : i < 14 ? 14 + Math.floor(r() * 13) : 30 + Math.floor(r() * 330))
    profiles.push({
      id: `u-p-${String(i + 1).padStart(3, '0')}`,
      email: `${slug(name.split(' ').slice(-1)[0])}.${slug(name.split(' ')[0])}${i + 1}@gmail.com`,
      full_name: name, phone: `0${pick(['90', '91', '93', '97', '98', '86', '83'])}${Math.floor(1000000 + r() * 8999999)}`, role: 'patient',
      date_of_birth: `${y}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`,
      gender, address: r() < 0.08 ? null : `${1 + Math.floor(r() * 300)} ${pick(STREETS)}, ${pick(DISTRICTS)}, TP.HCM`, avatar_url: null, created_at: c, updated_at: c,
    })
  }
  const patients = profiles.filter((p) => p.role === 'patient')

  // Slots: each doctor works on 2 fixed weekdays (+ alternate Saturdays), a morning or afternoon block.
  const time_slots: TimeSlot[] = []
  const schedule = [[1, 4], [2, 5], [1, 3], [2, 4], [3, 5], [1, 4], [2, 6], [3, 5]]
  const blockStart = [480, 810, 480, 840, 510, 480, 810, 480]
  let sid = 1
  for (let off = -30; off <= 14; off++) {
    const date = addDays(today, off)
    const wd = new Date(date + 'T00:00:00').getDay()
    doctors.forEach((d, di) => {
      if (!d.is_active && off > -15) return
      const works = schedule[di].includes(wd) || (wd === 6 && di % 4 === 0 && Math.abs(off) % 14 < 7)
      if (!works) return
      const len = di === 4 ? 45 : 30
      const count = 3 + (Math.abs(off + di) % 3 === 0 ? 1 : 0)
      for (let k = 0; k < count; k++) {
        const st = blockStart[di] + k * len
        time_slots.push({ id: `s-${sid++}`, doctor_id: d.id, slot_date: date, start_time: fromMin(st), end_time: fromMin(st + len), is_booked: false, created_at: isoAt(addDays(date, -21), '09:00') })
      }
    })
  }

  const appointments: Appointment[] = []
  let aid = 1001
  for (const s of time_slots) {
    const off = Math.round((new Date(s.slot_date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)
    const book = off < 0 ? r() < 0.5 : off === 0 ? r() < 0.8 : r() < 0.38
    if (!book) continue
    const x = r()
    let status: Status
    if (off < 0) status = x < 0.68 ? 'completed' : x < 0.85 ? 'cancelled' : 'no_show'
    else if (off === 0) status = toMin(s.start_time) < now.getHours() * 60 + now.getMinutes() ? (x < 0.8 ? 'completed' : 'no_show') : x < 0.7 ? 'confirmed' : 'pending'
    else status = x < 0.45 ? 'pending' : x < 0.9 ? 'confirmed' : 'cancelled'
    const d = doctors.find((dd) => dd.id === s.doctor_id)!
    const spIdx = specialties.findIndex((sp) => sp.id === d.specialty_id)
    const pts = spIdx === 1 ? patients.filter((_, i) => i % 6 === 0) : patients
    const pat = pick(pts)
    const createdMs = Math.min(new Date(isoAt(s.slot_date, '08:00')).getTime() - (1 + Math.floor(r() * 9)) * 86400000 - Math.floor(r() * 36e6), now.getTime() - 3600e3)
    const createdAt = new Date(Math.max(createdMs, new Date(pat.created_at).getTime() + 3600e3)).toISOString()
    let updatedAt = createdAt
    if (status === 'completed' || status === 'no_show') updatedAt = isoAt(s.slot_date, s.end_time)
    else if (status === 'confirmed') updatedAt = new Date(Math.min(new Date(createdAt).getTime() + 5 * 3600e3, now.getTime())).toISOString()
    else if (status === 'cancelled') updatedAt = new Date(Math.min(new Date(createdAt).getTime() + 30 * 3600e3, now.getTime())).toISOString()
    appointments.push({
      id: aid++, patient_id: pat.id, doctor_id: d.id, slot_id: s.id, status, reason: pick(REASONS[spIdx]),
      doctor_note: status === 'completed' ? pick(NOTES[spIdx]) : null,
      cancel_reason: status === 'cancelled' ? pick(CANCEL_REASONS) : null,
      created_at: createdAt, updated_at: updatedAt,
    })
    s.is_booked = status !== 'cancelled'
  }
  return { profiles, specialties, doctors, time_slots, appointments }
}
