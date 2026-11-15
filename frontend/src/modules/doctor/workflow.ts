import type { Appointment, TimeSlot } from './data';
export function clinicDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return value('year') + '-' + value('month') + '-' + value('day');
}
export function clinicTime(now = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}
export function slotInstant(slot: TimeSlot, end = false) {
  return new Date(slot.slot_date + 'T' + (end ? slot.end_time : slot.start_time) + '+07:00').getTime();
}
export function stage(a: Appointment) {
  if (a.status === 'confirmed' && a.started_at) return 'ongoing';
  if (a.status === 'confirmed' && a.checked_in_at) return 'waiting';
  return a.status;
}
export function stageLabel(a: Appointment) {
  const key = stage(a);
  return ({ ongoing: 'Đang khám', waiting: 'Đã đến · Chờ khám', pending: 'Chờ xác nhận', confirmed: 'Sắp khám', completed: 'Hoàn thành', cancelled: 'Đã hủy', no_show: 'Vắng mặt' })[key];
}
export function queueAppointments(appointments: Appointment[], slots: TimeSlot[], now = new Date()) {
  const map = new Map(slots.map(slot => [slot.id, slot]));
  return appointments.filter(a => a.status === 'confirmed' && a.checked_in_at && map.get(a.slot_id)?.slot_date === clinicDate(now))
    .sort((a,b) => Number(Boolean(b.started_at)) - Number(Boolean(a.started_at)) ||
      a.checked_in_at!.localeCompare(b.checked_in_at!) || slotInstant(map.get(a.slot_id)!) - slotInstant(map.get(b.slot_id)!));
}
export function csvText(rows: unknown[][]) {
  return '\uFEFF' + rows.map(row => row.map(value => {
    let text = String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');
}
export function downloadCsv(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  URL.revokeObjectURL(url);
}

export function addClinicDays(date: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const value = new Date(date + 'T12:00:00Z');
  if (!Number.isFinite(value.getTime()) || value.toISOString().slice(0, 10) !== date) return '';
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
