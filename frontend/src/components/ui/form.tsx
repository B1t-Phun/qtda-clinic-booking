'use client';
import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cx } from '@/lib/format'

const base = 'w-full rounded-lg border bg-white px-3 text-sm text-ink placeholder:text-slate-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary disabled:bg-slate-50 disabled:text-slate-500'

export function Field({ label, error, hint, required, children, className }: { label: string; error?: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-13 font-medium text-slate-700">
        {label} {required && <span className="text-[#DC2626]">*</span>}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-[#B91C1C]" role="alert">{error}</span> : hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}
export function Input({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...rest} aria-invalid={invalid} className={cx(base, 'h-10', invalid ? 'border-[#DC2626]' : 'border-line', className)} />
}
export function Textarea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea {...rest} aria-invalid={invalid} className={cx(base, 'min-h-[88px] py-2', invalid ? 'border-[#DC2626]' : 'border-line', className)} />
}
export function Select({ invalid, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className={cx('relative', className)}>
      <select {...rest} aria-invalid={invalid} className={cx(base, 'h-10 appearance-none pr-9', invalid ? 'border-[#DC2626]' : 'border-line')}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
}
export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={cx(base, 'h-10 border-line pl-9 pr-8')} />
      {value && (
        <button aria-label="Xóa tìm kiếm" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-ink">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export function MultiSelect<T extends string>({ options, value, onChange, placeholder, renderOption }: {
  options: { id: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; placeholder: string; renderOption?: (id: T) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const label = value.length === 0 ? placeholder : value.length === 1 ? options.find((o) => o.id === value[0])?.label : `${value.length} đã chọn`
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={cx(base, 'flex h-10 items-center justify-between border-line text-left')}>
        <span className={cx('truncate', value.length === 0 && 'text-slate-400')}>{label}</span>
        <ChevronDown className="size-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[200px] rounded-lg border border-line bg-white p-1 shadow-soft animate-fade-in">
          {options.map((o) => {
            const on = value.includes(o.id)
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id])}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className={cx('flex size-4 items-center justify-center rounded border', on ? 'border-primary bg-primary text-white' : 'border-slate-300')}>
                  {on && <Check className="size-3" strokeWidth={3} />}
                </span>
                {renderOption ? renderOption(o.id) : o.label}
              </button>
            )
          })}
          {value.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="mt-1 w-full rounded-md border-t border-line px-2 py-2 text-left text-13 font-medium text-primary hover:bg-slate-50">
              Bỏ chọn tất cả
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function Checkbox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.checked)}
      className="size-4 cursor-pointer rounded border-slate-300 accent-primary"
    />
  )
}
