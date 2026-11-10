'use client';
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2, RefreshCw, SearchX } from 'lucide-react'
import { cx, STATUS_META } from '@/lib/format'
import type { Status } from '@/modules/admin/store/types'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'accent'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-[#1d4fd8] shadow-sm',
  accent: 'bg-accent text-white hover:bg-[#0f9f90] shadow-sm',
  secondary: 'bg-white text-ink border border-line hover:bg-slate-50 hover:border-slate-300',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm',
  success: 'bg-[#16A34A] text-white hover:bg-[#15803D] shadow-sm',
}
export function Button({
  variant = 'primary', size = 'md', icon, loading, className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors duration-150 ease-out disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-13' : size === 'lg' ? 'h-11 px-5 text-[15px]' : 'h-10 px-4 text-sm',
        VARIANTS[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}
export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...rest}
      className={cx('inline-flex size-9 items-center justify-center rounded-lg text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-ink disabled:opacity-40', className)}
    >
      {children}
    </button>
  )
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const m = STATUS_META[status]
  return (
    <span
      className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold whitespace-nowrap', className)}
      style={{ backgroundColor: `${m.color}24`, color: m.text }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: m.color }} />
      {m.label}
    </span>
  )
}
export function Chip({ tone = 'slate', children, className }: { tone?: 'slate' | 'blue' | 'teal' | 'amber' | 'red' | 'violet' | 'green'; children: ReactNode; className?: string }) {
  const t = {
    slate: 'bg-slate-100 text-slate-700', blue: 'bg-blue-50 text-blue-700', teal: 'bg-teal-50 text-teal-700', amber: 'bg-amber-50 text-amber-800',
    red: 'bg-red-50 text-red-700', violet: 'bg-violet-50 text-violet-700', green: 'bg-green-50 text-green-700',
  }[tone]
  return <span className={cx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap', t, className)}>{children}</span>
}

const AV_COLORS = ['#2563EB', '#14B8A6', '#7C3AED', '#DB2777', '#EA580C', '#0891B2', '#4F46E5', '#059669']
export function Avatar({ name, url, size = 36, className }: { name: string; url?: string | null; size?: number; className?: string }) {
  const parts = name.trim().split(/\s+/)
  const initials = ((parts.length > 1 ? parts[parts.length - 2][0] : '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0
  const color = AV_COLORS[Math.abs(h) % AV_COLORS.length]
  return url ? (
    <img src={url} alt={name} className={cx('shrink-0 rounded-full object-cover', className)} style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', className)}
      style={{ width: size, height: size, fontSize: size * 0.36, backgroundColor: `${color}1f`, color }}
    >
      {initials}
    </span>
  )
}
export function PersonCell({ name, sub, url, size = 32 }: { name: string; sub?: ReactNode; url?: string | null; size?: number }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} url={url} size={size} />
      <div className="min-w-0">
        <div className="truncate font-medium text-ink leading-snug">{name}</div>
        {sub && <div className="truncate text-xs text-muted leading-snug">{sub}</div>}
      </div>
    </div>
  )
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx('rounded-xl border border-line bg-white shadow-soft', className)}>{children}</div>
}
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} />
}

export function EmptyState({ kind = 'empty', title, description, action }: { kind?: 'empty' | 'search'; title: string; description?: string; action?: ReactNode }) {
  const Icon = kind === 'search' ? SearchX : Inbox
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center animate-fade-in">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon className="size-6" strokeWidth={1.75} />
      </div>
      <div className="font-semibold text-ink">{title}</div>
      {description && <p className="mt-1 max-w-sm text-13 text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center animate-fade-in" role="alert">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-red-50 text-[#DC2626]">
        <AlertTriangle className="size-6" strokeWidth={1.75} />
      </div>
      <div className="font-semibold text-ink">Không tải được dữ liệu</div>
      <p className="mt-1 max-w-sm text-13 text-muted">Đã xảy ra lỗi kết nối. Vui lòng thử lại.</p>
      <Button variant="secondary" className="mt-4" icon={<RefreshCw className="size-4" />} onClick={onRetry}>Thử lại</Button>
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      className={cx('relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-150', checked ? 'bg-accent' : 'bg-slate-300', disabled && 'opacity-50')}
    >
      <span className={cx('inline-block size-5 rounded-full bg-white shadow transition-transform duration-150 ease-out', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cx('flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            '-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150',
            value === t.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className={cx('num rounded-full px-1.5 text-[11px]', value === t.id ? 'bg-blue-50' : 'bg-slate-100')}>{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string; icon?: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cx('inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-13 font-medium transition-colors duration-150', value === o.id ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100')}
        >
          {o.icon}
          <span className={o.icon ? 'hidden sm:inline' : ''}>{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100">
        {text}
      </span>
    </span>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
