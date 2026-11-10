'use client';
import { useState } from 'react'
import type { ApptView } from '@/modules/admin/store/store'
import type { Status } from '@/modules/admin/store/types'
import { cx, fmtDate, fmtDateTime, STATUS_META, STATUSES } from '@/lib/format'
import { PersonCell, StatusBadge } from '@/components/ui/core'
import { DataTable } from '@/components/ui/DataTable'
import { useAppointmentUI } from './AppointmentUI'

/** Appointment list with status chips, used on doctor & patient detail pages. */
export function ApptHistory({ rows, show, loading }: { rows: ApptView[]; show: 'doctor' | 'patient'; loading?: boolean }) {
  const { open } = useAppointmentUI()
  const [st, setSt] = useState<Status | ''>('')
  const list = st ? rows.filter((a) => a.status === st) : rows
  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto border-b border-line p-3">
        {(['', ...STATUSES] as (Status | '')[]).map((s) => (
          <button key={s} onClick={() => setSt(s)} className={cx('rounded-full border px-3 py-1 text-13 font-medium whitespace-nowrap transition-colors', st === s ? 'border-primary bg-blue-50 text-primary' : 'border-line text-slate-600 hover:bg-slate-50')}>
            {s ? STATUS_META[s].label : 'Tất cả'} <span className="num ml-1 text-xs opacity-70">{s ? rows.filter((a) => a.status === s).length : rows.length}</span>
          </button>
        ))}
      </div>
      <DataTable
        rows={list}
        rowKey={(a) => a.id}
        loading={loading}
        filtered={!!st}
        onClearFilters={() => setSt('')}
        emptyTitle="Chưa có lịch hẹn"
        defaultSort={{ id: 'date', dir: 'desc' }}
        onRowClick={(a) => open(a.id)}
        columns={[
          { id: 'id', header: 'Mã', cell: (a) => <span className="num font-bold text-primary">#{a.id}</span>, sort: (a) => a.id },
          { id: 'date', header: 'Ngày', cell: (a) => <span className="num font-semibold">{fmtDate(a.slot.slot_date)}</span>, sort: (a) => a.slot.slot_date + a.slot.start_time },
          { id: 'time', header: 'Giờ', cell: (a) => <span className="num">{a.slot.start_time}–{a.slot.end_time}</span> },
          show === 'doctor'
            ? { id: 'who', header: 'Bác sĩ', cell: (a) => <PersonCell name={`BS. ${a.doctorProfile.full_name}`} url={a.doctorProfile.avatar_url} sub={a.specialty.name} />, sort: (a) => a.doctorProfile.full_name }
            : { id: 'who', header: 'Bệnh nhân', cell: (a) => <PersonCell name={a.patient.full_name} url={a.patient.avatar_url} sub={<span className="num">{a.patient.phone}</span>} />, sort: (a) => a.patient.full_name },
          { id: 'status', header: 'Trạng thái', cell: (a) => <StatusBadge status={a.status} />, sort: (a) => a.status },
          { id: 'reason', header: 'Lý do khám', cell: (a) => <span className="line-clamp-1 text-slate-600">{a.reason}</span>, className: 'hidden lg:table-cell' },
          { id: 'created', header: 'Ngày tạo', cell: (a) => <span className="num text-13 text-muted">{fmtDateTime(a.created_at)}</span>, sort: (a) => a.created_at, className: 'hidden xl:table-cell' },
        ]}
        mobileCard={(a) => (
          <div>
            <div className="flex items-center justify-between"><span className="num text-13 font-bold text-primary">#{a.id}</span><StatusBadge status={a.status} /></div>
            <div className="num mt-1.5 text-sm font-semibold">{fmtDate(a.slot.slot_date)} · {a.slot.start_time}–{a.slot.end_time}</div>
            <div className="mt-0.5 text-13 text-muted">{show === 'doctor' ? `BS. ${a.doctorProfile.full_name} · ${a.specialty.name}` : a.patient.full_name} · {a.reason}</div>
          </div>
        )}
      />
    </div>
  )
}
