'use client';
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '@/modules/admin/store/store'
import type { Specialty } from '@/modules/admin/store/types'
import { fmtDate, normalize } from '@/lib/format'
import { Button, Card, IconButton, PageHeader, Tooltip } from '@/components/ui/core'
import { DataTable } from '@/components/ui/DataTable'
import { Field, Input, SearchInput, Textarea } from '@/components/ui/form'
import { ConfirmDialog, Drawer, useToast } from '@/components/ui/overlay'

export default function SpecialtiesPage() {
  const { db, loading, error, reload, deleteSpecialty } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Specialty | 'new' | null>(null)
  const [del, setDel] = useState<Specialty | null>(null)
  const count = (id: string) => db.doctors.filter((d) => d.specialty_id === id).length
  const list = db.specialties.filter((s) => !q || normalize(s.name).includes(normalize(q)))
  const DeleteBtn = ({ s }: { s: Specialty }) => {
    const n = count(s.id)
    return n > 0 ? (
      <Tooltip text={`Không thể xóa: còn ${n} bác sĩ thuộc chuyên khoa này. Hãy chuyển bác sĩ sang chuyên khoa khác trước.`}>
        <IconButton label="Xóa (bị chặn)" disabled><Trash2 className="size-4" /></IconButton>
      </Tooltip>
    ) : <IconButton label="Xóa" className="hover:bg-red-50 hover:text-[#B91C1C]" onClick={(e) => { e.stopPropagation(); setDel(s) }}><Trash2 className="size-4" /></IconButton>
  }
  return (
    <div className="animate-fade-in">
      <PageHeader title="Chuyên khoa" description={<><span className="num font-semibold text-ink">{db.specialties.length}</span> chuyên khoa</>} actions={<Button icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Thêm chuyên khoa</Button>} />
      <Card className="overflow-hidden">
        <div className="border-b border-line p-3 sm:p-4"><SearchInput className="sm:max-w-xs" value={q} onChange={setQ} placeholder="Tìm chuyên khoa" /></div>
        <DataTable rows={list} rowKey={(s) => s.id} loading={loading} error={error} onRetry={reload} filtered={!!q} onClearFilters={() => setQ('')} defaultSort={{ id: 'name', dir: 'asc' }}
          emptyTitle="Chưa có chuyên khoa" emptyAction={<Button onClick={() => setEdit('new')}>Thêm chuyên khoa</Button>} onRowClick={(s) => setEdit(s)}
          columns={[
            { id: 'name', header: 'Tên chuyên khoa', cell: (s) => <span className="font-semibold">{s.name}</span>, sort: (s) => s.name },
            { id: 'desc', header: 'Mô tả', cell: (s) => <span className="line-clamp-2 max-w-md text-slate-600">{s.description ?? '—'}</span>, className: 'hidden lg:table-cell' },
            { id: 'count', header: 'Số bác sĩ', align: 'right', cell: (s) => <span className="num font-semibold">{count(s.id)}</span>, sort: (s) => count(s.id) },
            { id: 'created', header: 'Ngày tạo', cell: (s) => <span className="num text-muted">{fmtDate(s.created_at)}</span>, sort: (s) => s.created_at },
            { id: 'act', header: '', align: 'right', cell: (s) => <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}><IconButton label="Sửa" onClick={() => setEdit(s)}><Pencil className="size-4" /></IconButton><DeleteBtn s={s} /></div> },
          ]}
          mobileCard={(s) => (
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{s.name}</div>
                <div className="mt-0.5 line-clamp-2 text-13 text-muted">{s.description}</div>
                <div className="mt-1.5 text-xs text-muted"><b className="num text-ink">{count(s.id)}</b> bác sĩ · Tạo <span className="num">{fmtDate(s.created_at)}</span></div>
              </div>
              <div onClick={(e) => e.stopPropagation()}><DeleteBtn s={s} /></div>
            </div>
          )} />
      </Card>
      {edit && <SpecialtyDrawer s={edit === 'new' ? null : edit} doctorCount={edit === 'new' ? 0 : count(edit.id)} onClose={() => setEdit(null)} onDelete={(s) => { setEdit(null); setDel(s) }} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} tone="danger" title="Xóa chuyên khoa" confirmLabel="Xóa" message={<>Xóa chuyên khoa <b className="text-ink">{del?.name}</b>? Thao tác không thể hoàn tác.</>}
        onConfirm={() => { const r = deleteSpecialty(del!.id); toast(r.ok ? { tone: 'success', title: `Đã xóa ${del!.name}` } : { tone: 'error', title: r.error }); setDel(null) }} />
    </div>
  )
}

function SpecialtyDrawer({ s, doctorCount, onClose, onDelete }: { s: Specialty | null; doctorCount: number; onClose: () => void; onDelete: (s: Specialty) => void }) {
  const { saveSpecialty, db } = useStore()
  const toast = useToast()
  const [name, setName] = useState(s?.name ?? '')
  const [desc, setDesc] = useState(s?.description ?? '')
  const [touched, setTouched] = useState(false)
  const dup = db.specialties.some((x) => x.id !== s?.id && x.name.trim().toLowerCase() === name.trim().toLowerCase())
  const err = !name.trim() ? 'Nhập tên chuyên khoa' : dup ? 'Tên chuyên khoa đã tồn tại' : ''
  const submit = () => {
    setTouched(true)
    if (err) return
    const r = saveSpecialty({ id: s?.id, name, description: desc.trim() || null })
    if (!r.ok) return toast({ tone: 'error', title: r.error })
    toast({ tone: 'success', title: s ? 'Đã cập nhật chuyên khoa' : 'Đã thêm chuyên khoa', description: name.trim() })
    onClose()
  }
  return (
    <Drawer open onClose={onClose} title={s ? 'Sửa chuyên khoa' : 'Thêm chuyên khoa'} width={460}
      footer={<>
        {s && (doctorCount > 0 ? <span className="mr-auto self-center text-xs text-muted">Không thể xóa: còn {doctorCount} bác sĩ</span> : <Button variant="ghost" className="mr-auto text-[#B91C1C]" icon={<Trash2 className="size-4" />} onClick={() => onDelete(s)}>Xóa</Button>)}
        <Button variant="secondary" onClick={onClose}>Hủy bỏ</Button><Button onClick={submit}>{s ? 'Lưu' : 'Thêm'}</Button>
      </>}>
      <div className="space-y-4">
        <Field label="Tên chuyên khoa" required error={touched ? err : ''}><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} invalid={touched && !!err} /></Field>
        <Field label="Mô tả"><Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        {s && <p className="text-13 text-muted">Đang có <b className="num text-ink">{doctorCount}</b> bác sĩ · Tạo ngày <span className="num">{fmtDate(s.created_at)}</span></p>}
      </div>
    </Drawer>
  )
}
