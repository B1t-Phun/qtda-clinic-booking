'use client';
import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, MailCheck } from 'lucide-react'
import { useStore } from '@/modules/admin/store/store'
import { Button } from '@/components/ui/core'
import { Field, Input } from '@/components/ui/form'
import { Logo } from '@/modules/admin/layout/Shell'

const IMG = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400'

export default function Login() {
  const { login, db } = useStore()
  const [mode, setMode] = useState<'login' | 'forgot' | 'sent'>('login')
  const [email, setEmail] = useState('admin@clinicbooking.vn')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [touched, setTouched] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const emailErr = !/^\S+@\S+\.\S+$/.test(email) ? 'Email không hợp lệ' : ''
  const pwErr = pw.length < 6 ? 'Mật khẩu tối thiểu 6 ký tự' : ''

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    setErr('')
    if (mode === 'login') {
      if (emailErr || pwErr) return
      setBusy(true)
      setTimeout(() => {
        setBusy(false)
        const p = db.profiles.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
        if (!p || p.role !== 'admin') return setErr('Tài khoản không có quyền quản trị hoặc không tồn tại.')
        login()
      }, 600)
    } else {
      if (emailErr) return
      setBusy(true)
      setTimeout(() => { setBusy(false); setMode('sent') }, 600)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={IMG} alt="Sảnh tiếp đón phòng khám" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-dark via-primary-dark/70 to-primary-dark/20" />
        <div className="absolute left-10 top-10"><Logo /></div>
        <div className="absolute inset-x-10 bottom-12 text-white">
          <h2 className="max-w-md text-[32px] leading-tight font-bold">Điều phối lịch khám gọn gàng, mọi lúc.</h2>
          <p className="mt-3 max-w-md text-blue-100">Theo dõi lịch hẹn, bác sĩ, khung giờ và hiệu suất phòng khám trong một nơi duy nhất.</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo light={false} /></div>
          {mode === 'sent' ? (
            <div className="animate-fade-in">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-teal-50 text-accent"><MailCheck className="size-6" /></div>
              <h1 className="text-2xl font-bold">Kiểm tra email của bạn</h1>
              <p className="mt-2 text-sm text-muted">Nếu <b className="text-ink">{email}</b> tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.</p>
              <Button className="mt-6 w-full" size="lg" onClick={() => setMode('login')}>Quay lại đăng nhập</Button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="animate-fade-in">
              {mode === 'forgot' && (
                <button type="button" onClick={() => setMode('login')} className="mb-4 inline-flex items-center gap-1 text-13 font-medium text-muted hover:text-ink"><ArrowLeft className="size-4" />Đăng nhập</button>
              )}
              <h1 className="text-2xl font-bold">{mode === 'login' ? 'Đăng nhập quản trị' : 'Quên mật khẩu'}</h1>
              <p className="mt-1.5 text-sm text-muted">{mode === 'login' ? 'Dành cho quản trị viên ClinicBooking.' : 'Nhập email để nhận liên kết đặt lại mật khẩu.'}</p>
              <div className="mt-7 space-y-4">
                <Field label="Email" required error={touched ? emailErr : ''}>
                  <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={touched && !!emailErr} />
                </Field>
                {mode === 'login' && (
                  <Field label="Mật khẩu" required error={touched ? pwErr : ''}>
                    <div className="relative">
                      <Input type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} invalid={touched && !!pwErr} className="pr-10" placeholder="••••••" />
                      <button type="button" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-ink">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                    </div>
                  </Field>
                )}
              </div>
              {mode === 'login' && (
                <div className="mt-3 flex items-center justify-between text-13">
                  <label className="flex items-center gap-2 text-slate-600"><input type="checkbox" defaultChecked className="accent-primary" />Ghi nhớ đăng nhập</label>
                  <button type="button" onClick={() => { setMode('forgot'); setTouched(false) }} className="font-medium text-primary hover:underline">Quên mật khẩu?</button>
                </div>
              )}
              {err && <div role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-13 font-medium text-[#B91C1C]">{err}</div>}
              <Button type="submit" size="lg" className="mt-6 w-full" loading={busy}>{mode === 'login' ? 'Đăng nhập' : 'Gửi liên kết'}</Button>
              {mode === 'login' && <p className="mt-6 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-muted">Bản mẫu: dùng <b className="text-ink">admin@clinicbooking.vn</b> và mật khẩu bất kỳ từ 6 ký tự.</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
