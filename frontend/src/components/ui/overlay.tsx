'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cx } from '@/lib/format'
import { Button, IconButton } from './core'

function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', h)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
}

/** Right-side panel on desktop/tablet, full screen on mobile. */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 520 }: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; width?: number
}) {
  useEsc(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 animate-fade-in" onClick={onClose} />
      <div
        className="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl animate-slide-in sm:inset-y-2 sm:right-2 sm:rounded-2xl"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {subtitle && <div className="mt-0.5 text-13 text-muted">{subtitle}</div>}
          </div>
          <IconButton label="Đóng" onClick={onClose}><X className="size-5" /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 [scrollbar-gutter:stable]">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/** Centered dialog; becomes full screen on mobile when `fullscreenMobile`. */
export function Modal({ open, onClose, title, children, footer, size = 'md', fullscreenMobile }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; fullscreenMobile?: boolean
}) {
  useEsc(open, onClose)
  if (!open) return null
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' }[size]
  return createPortal(
    <div className={cx('fixed inset-0 z-[60] flex justify-center', fullscreenMobile ? 'items-stretch sm:items-center sm:p-4' : 'items-end sm:items-center sm:p-4')} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 animate-fade-in" onClick={onClose} />
      <div
        className={cx(
          'relative flex w-full flex-col bg-white shadow-2xl animate-fade-in sm:max-h-[90vh] sm:rounded-2xl',
          w,
          fullscreenMobile ? 'h-full sm:h-auto' : 'max-h-[92vh] rounded-t-2xl',
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <IconButton label="Đóng" onClick={onClose}><X className="size-5" /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 [scrollbar-gutter:stable]">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Xác nhận', tone = 'primary', children, disabled }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: ReactNode; confirmLabel?: string; tone?: 'primary' | 'danger'; children?: ReactNode; disabled?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Hủy bỏ</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={disabled}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-[#DC2626]"><AlertTriangle className="size-5" /></div>
        )}
        <div className="min-w-0 flex-1 text-sm text-slate-600">{message}</div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </Modal>
  )
}

export function BottomSheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEsc(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 animate-fade-in" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-2xl animate-slide-up">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300" />
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label="Đóng" onClick={onClose}><X className="size-5" /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="flex gap-2 border-t border-line px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

// ---------- Toasts ----------
type Toast = { id: number; tone: 'success' | 'error' | 'info'; title: string; description?: string }
const ToastCtx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setToasts((x) => [...x, { ...t, id }])
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 3800)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-auto md:left-auto md:right-4 md:top-4 md:items-end" aria-live="polite">
        {toasts.map((t) => {
          const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'error' ? XCircle : Info
          const color = t.tone === 'success' ? 'text-[#16A34A]' : t.tone === 'error' ? 'text-[#DC2626]' : 'text-primary'
          return (
            <div key={t.id} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-white p-3.5 shadow-soft animate-slide-in">
              <Icon className={cx('mt-0.5 size-5 shrink-0', color)} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink">{t.title}</div>
                {t.description && <div className="mt-0.5 text-13 text-muted">{t.description}</div>}
              </div>
              <button aria-label="Đóng thông báo" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-slate-400 hover:text-ink"><X className="size-4" /></button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
