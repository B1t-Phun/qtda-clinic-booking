'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { cx } from '@/lib/format'
import { Button, EmptyState, ErrorState, Skeleton } from './core'
import { Checkbox } from './form'

export interface Column<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  sort?: (row: T) => string | number
  align?: 'left' | 'right' | 'center'
  className?: string
  width?: number | string
}

export function DataTable<T>({
  rows, rowKey, columns, defaultSort, pageSize = 10, selectable, selected, onSelectedChange, isSelectable, onRowClick, mobileCard,
  loading, error, onRetry, emptyTitle = 'Chưa có dữ liệu', emptyDescription, emptyAction, filtered, onClearFilters, maxHeight = 640,
}: {
  rows: T[]; rowKey: (r: T) => string | number; columns: Column<T>[]; defaultSort?: { id: string; dir: 'asc' | 'desc' }; pageSize?: number
  selectable?: boolean; selected?: Set<string | number>; onSelectedChange?: (s: Set<string | number>) => void; isSelectable?: (r: T) => boolean
  onRowClick?: (r: T) => void; mobileCard?: (r: T) => ReactNode; loading?: boolean; error?: boolean; onRetry?: () => void
  emptyTitle?: string; emptyDescription?: string; emptyAction?: ReactNode; filtered?: boolean; onClearFilters?: () => void; maxHeight?: number
}) {
  const [sort, setSort] = useState(defaultSort)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(pageSize)
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.id === sort?.id)
    if (!col?.sort || !sort) return rows
    const f = col.sort
    const m = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = f(a), y = f(b)
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'vi')) * m
    })
  }, [rows, sort, columns])
  const pages = Math.max(1, Math.ceil(sorted.length / size))
  useEffect(() => { if (page >= pages) setPage(0) }, [pages, page])
  const view = sorted.slice(page * size, page * size + size)

  const selectableRows = view.filter((r) => !isSelectable || isSelectable(r))
  const allOn = selectableRows.length > 0 && selectableRows.every((r) => selected?.has(rowKey(r)))
  const someOn = selectableRows.some((r) => selected?.has(rowKey(r)))
  const toggleAll = (v: boolean) => {
    const s = new Set(selected)
    selectableRows.forEach((r) => (v ? s.add(rowKey(r)) : s.delete(rowKey(r))))
    onSelectedChange?.(s)
  }
  const toggle = (r: T, v: boolean) => {
    const s = new Set(selected)
    v ? s.add(rowKey(r)) : s.delete(rowKey(r))
    onSelectedChange?.(s)
  }
  const clickSort = (c: Column<T>) => {
    if (!c.sort) return
    setSort((s) => (s?.id === c.id ? { id: c.id, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { id: c.id, dir: c.align === 'right' ? 'desc' : 'asc' }))
  }

  if (error) return <ErrorState onRetry={onRetry ?? (() => {})} />
  if (loading)
    return (
      <div className="divide-y divide-line" aria-busy="true" aria-label="Đang tải">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-1/5" /></div>
            <Skeleton className="hidden h-3 w-24 sm:block" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    )
  if (rows.length === 0)
    return filtered ? (
      <EmptyState kind="search" title="Không tìm thấy kết quả" description="Thử thay đổi từ khóa hoặc bộ lọc." action={onClearFilters && <Button variant="secondary" onClick={onClearFilters}>Xóa bộ lọc</Button>} />
    ) : (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    )

  return (
    <div>
      {/* Table: tablet & desktop */}
      <div className={cx('overflow-auto', mobileCard && 'hidden md:block')} style={{ maxHeight }}>
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {selectable && (
                <th className="sticky top-0 z-10 w-10 border-b border-line bg-slate-50 px-4 py-2.5 text-left">
                  <Checkbox label="Chọn tất cả" checked={allOn} indeterminate={!allOn && someOn} onChange={toggleAll} />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  style={{ width: c.width }}
                  aria-sort={sort?.id === c.id ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cx(
                    'sticky top-0 z-10 border-b border-line bg-slate-50 px-3 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase',
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                    c.className,
                  )}
                >
                  {c.sort ? (
                    <button onClick={() => clickSort(c)} className={cx('inline-flex items-center gap-1 uppercase hover:text-ink', c.align === 'right' && 'flex-row-reverse')}>
                      {c.header}
                      {sort?.id === c.id ? (sort.dir === 'asc' ? <ArrowUp className="size-3.5 text-primary" /> : <ArrowDown className="size-3.5 text-primary" />) : <ChevronsUpDown className="size-3.5 opacity-50" />}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r) => {
              const k = rowKey(r)
              const on = selected?.has(k)
              return (
                <tr
                  key={k}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={cx('group transition-colors duration-150', onRowClick && 'cursor-pointer', on ? 'bg-blue-50/60' : 'hover:bg-slate-50')}
                >
                  {selectable && (
                    <td className="border-b border-line px-4 py-3">
                      {(!isSelectable || isSelectable(r)) && <Checkbox label="Chọn dòng" checked={!!on} onChange={(v) => toggle(r, v)} />}
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.id} className={cx('border-b border-line px-3 py-3 align-middle', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : '', c.className)}>
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {/* Stacked cards: mobile */}
      {mobileCard && (
        <div className="space-y-2 p-3 md:hidden">
          {view.map((r) => {
            const k = rowKey(r)
            return (
              <div
                key={k}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={cx('relative rounded-xl border border-line bg-white p-3.5 transition-colors active:bg-slate-50', selected?.has(k) && 'border-primary bg-blue-50/40')}
              >
                {selectable && (!isSelectable || isSelectable(r)) && (
                  <div className="absolute right-3 top-3"><Checkbox label="Chọn" checked={!!selected?.has(k)} onChange={(v) => toggle(r, v)} /></div>
                )}
                {mobileCard(r)}
              </div>
            )
          })}
        </div>
      )}
      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-13 text-muted">
        <div className="flex items-center gap-2">
          <span>
            <span className="num font-semibold text-ink">{sorted.length === 0 ? 0 : page * size + 1}–{Math.min(sorted.length, (page + 1) * size)}</span> / <span className="num">{sorted.length}</span>
          </span>
          <select aria-label="Số dòng mỗi trang" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0) }} className="hidden h-8 rounded-md border border-line bg-white px-2 text-13 sm:block">
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n} / trang</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button aria-label="Trang trước" disabled={page === 0} onClick={() => setPage(page - 1)} className="flex size-8 items-center justify-center rounded-md border border-line bg-white disabled:opacity-40 hover:bg-slate-50"><ChevronLeft className="size-4" /></button>
          <span className="num px-2 text-ink">{page + 1} / {pages}</span>
          <button aria-label="Trang sau" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="flex size-8 items-center justify-center rounded-md border border-line bg-white disabled:opacity-40 hover:bg-slate-50"><ChevronRight className="size-4" /></button>
        </div>
      </div>
    </div>
  )
}
