'use client';
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useStore } from '@/modules/admin/store/store'
import type { Profile, Role } from '@/modules/admin/store/types'
import { fmtDate, fmtVND, normalize, ROLE_LABEL } from '@/lib/format'
import { Card, Chip, PageHeader, PersonCell, Tabs } from '@/components/ui/core'
import { DataTable } from '@/components/ui/DataTable'
import { Field, Input, SearchInput, Select } from '@/components/ui/form'
import { ConfirmDialog, useToast } from '@/components/ui/overlay'

const ROLE_TONE = { admin: 'blue', doctor: 'teal', patient: 'slate' } as const

export default function AccountsPage() {
  const { db, loading, error, reload, changeRole, roleChangeBlocker } = useStore()
  const toast = useToast()
  const [role, setRole] = useState<Role | 'all'>('all')
  const [q, setQ] = useState('')
  const [pending, setPending] = useState<{ p: Profile; role: Role } | null>(null)
  const [doc, setDoc] = useState({ specialty_id: '', room: '', consultation_fee: '' })
  const [touched, setTouched] = useState(false)
  const n = normalize(q)
  const list = db.profiles.filter((p) => (role === 'all' || p.role === role) && (!n || normalize(p.full_name).includes(n) || p.email.toLowerCase().includes(n) || (p.phone ?? '').includes(n)))
  const cnt = (r: Role) => db.profiles.filter((p) => p.role === r).length
  const blocker = pending ? roleChangeBlocker(pending.p, pending.role) : null
  const needsDoc = pending?.role === 'doctor' && !db.doctors.some((d) => d.profile_id === pending.p.id)
  const docErr = needsDoc && (!doc.specialty_id || !doc.room.trim() || !/^\d{4,}$/.test(doc.consultation_fee))
  const close = () => { setPending(null); setTouched(false); setDoc({ specialty_id: '', room: '', consultation_fee: '' }) }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Tài khoản và vai trò" description="Tất cả hồ sơ người dùng trong hệ thống" />
      <Card className="overflow-hidden">
        <Tabs className="px-3" value={role} onChange={setRole} tabs={[{ id: 'all', label: 'Tất cả', count: db.profiles.length }, { id: 'admin', label: 'Quản trị viên', count: cnt('admin') }, { id: 'doctor', label: 'Bác sĩ', count: cnt('doctor') }, { id: 'patient', label: 'Bệnh nhân', count: cnt('patient') }]} />
        <div className="border-b border-line p-3 sm:p-4"><SearchInput className="sm:max-w-xs" value={q} onChange={setQ} placeholder="Tên, email hoặc SĐT" /></div>
        <DataTable rows={list} rowKey={(p) => p.id} loading={loading} error={error} onRetry={reload} filtered={!!q || role !== 'all'} onClearFilters={() => { setQ(''); setRole('all') }} defaultSort={{ id: 'created', dir: 'desc' }}
          columns={[
            { id: 'name', header: 'Người dùng', cell: (p) => <PersonCell name={p.full_name} url={p.avatar_url} sub={p.email} />, sort: (p) => p.full_name },
            { id: 'phone', header: 'Số điện thoại', cell: (p) => <span className="num">{p.phone ?? '—'}</span>, className: 'hidden lg:table-cell' },
            { id: 'created', header: 'Ngày tạo', cell: (p) => <span className="num text-muted">{fmtDate(p.created_at)}</span>, sort: (p) => p.created_at, className: 'hidden xl:table-cell' },
            { id: 'updated', header: 'Cập nhật', cell: (p) => <span className="num text-muted">{fmtDate(p.updated_at)}</span>, sort: (p) => p.updated_at, className: 'hidden 2xl:table-cell' },
            { id: 'role', header: 'Vai trò', cell: (p) => <RoleSelect p={p} onPick={(r) => setPending({ p, role: r })} />, sort: (p) => p.role, width: 200 },
          ]}
          mobileCard={(p) => (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1"><PersonCell name={p.full_name} url={p.avatar_url} sub={p.email} /></div>
              <RoleSelect p={p} onPick={(r) => setPending({ p, role: r })} />
            </div>
          )} />
      </Card>
      <ConfirmDialog open={!!pending} onClose={close} tone={blocker ? 'danger' : 'primary'} disabled={!!blocker}
        title={blocker ? 'Không thể đổi vai trò' : 'Xác nhận đổi vai trò'} confirmLabel="Đổi vai trò"
        message={pending && (blocker ? blocker : <>Đổi vai trò của <b className="text-ink">{pending.p.full_name}</b> từ <Chip tone={ROLE_TONE[pending.p.role]}>{ROLE_LABEL[pending.p.role]}</Chip> sang <Chip tone={ROLE_TONE[pending.role]}>{ROLE_LABEL[pending.role]}</Chip>? Quyền truy cập sẽ thay đổi ngay.</>)}
        onConfirm={() => {
          setTouched(true)
          if (docErr) return
          changeRole(pending!.p.id, pending!.role, needsDoc ? { specialty_id: doc.specialty_id, room: doc.room.trim(), consultation_fee: Number(doc.consultation_fee) } : undefined)
          toast({ tone: 'success', title: 'Đã đổi vai trò', description: `${pending!.p.full_name} · ${ROLE_LABEL[pending!.role]}${needsDoc ? ' (hồ sơ bác sĩ ở trạng thái ngừng hoạt động)' : ''}` })
          close()
        }}>
        {!blocker && needsDoc && (
          <div className="space-y-3 rounded-lg border border-line p-3">
            <p className="text-xs text-muted">Cần thông tin chuyên môn để tạo hồ sơ bác sĩ. Hồ sơ sẽ ở trạng thái ngừng hoạt động cho đến khi được kích hoạt.</p>
            <Field label="Chuyên khoa" required error={touched && !doc.specialty_id ? 'Chọn chuyên khoa' : ''}><Select value={doc.specialty_id} onChange={(e) => setDoc({ ...doc, specialty_id: e.target.value })}><option value="">Chọn…</option>{db.specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phòng" required error={touched && !doc.room.trim() ? 'Nhập phòng' : ''}><Input value={doc.room} onChange={(e) => setDoc({ ...doc, room: e.target.value })} placeholder="P.101" /></Field>
              <Field label="Phí khám" required error={touched && !/^\d{4,}$/.test(doc.consultation_fee) ? 'Nhập phí (VND)' : ''} hint={/^\d{4,}$/.test(doc.consultation_fee) ? fmtVND(Number(doc.consultation_fee)) : undefined}><Input inputMode="numeric" value={doc.consultation_fee} onChange={(e) => setDoc({ ...doc, consultation_fee: e.target.value })} placeholder="300000" /></Field>
            </div>
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}

function RoleSelect({ p, onPick }: { p: Profile; onPick: (r: Role) => void }) {
  if (p.id === 'u-admin') return <span className="inline-flex items-center gap-1.5 text-13 font-medium text-primary"><ShieldCheck className="size-4" />Quản trị viên (bạn)</span>
  return (
    <Select aria-label={`Vai trò của ${p.full_name}`} className="w-40" value={p.role} onClick={(e) => e.stopPropagation()} onChange={(e) => onPick(e.target.value as Role)}>
      {(['admin', 'doctor', 'patient'] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
    </Select>
  )
}
