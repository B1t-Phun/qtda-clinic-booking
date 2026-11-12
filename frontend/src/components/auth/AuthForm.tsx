'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Mail, MailCheck, Phone, UserRound } from 'lucide-react';
import { authRequest, AuthRequestError } from '@/lib/auth/client';
import { EMAIL_LINK_ERRORS } from '@/lib/auth/email-link';
import { PASSWORD_HINT, validPassword, validTokenHash, validAuthCode } from '@/lib/auth/policy';
import { AuthFrame } from './AuthFrame';
import { Captcha } from './Captcha';
import styles from './AuthForm.module.css';

export type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'confirm' | 'resend' | 'magic-link';
type Provider = 'google' | 'facebook';
const content: Record<AuthMode, { title: string; description: string; button: string }> = {
  login: { title: 'Chào mừng trở lại', description: 'Đăng nhập để tiếp tục chăm sóc sức khỏe của bạn.', button: 'Đăng nhập' },
  register: { title: 'Bắt đầu cùng ClinicCare', description: 'Tạo tài khoản, đặt lịch khám theo cách của bạn.', button: 'Tạo tài khoản' },
  'forgot-password': { title: 'Quên mật khẩu?', description: 'Nhập email để nhận liên kết đặt lại mật khẩu.', button: 'Gửi liên kết khôi phục' },
  'reset-password': { title: 'Mật khẩu mới', description: 'Chọn mật khẩu mới để tiếp tục sử dụng tài khoản.', button: 'Lưu mật khẩu mới' },
  confirm: { title: 'Xác nhận email', description: 'Chỉ còn một bước để hoàn tất xác nhận của bạn.', button: 'Xác nhận email' },
  resend: { title: 'Gửi lại xác nhận', description: 'Nhập email đã dùng để đăng ký tài khoản.', button: 'Gửi email xác nhận' },
  'magic-link': { title: 'Đăng nhập qua email', description: 'Nhận liên kết đăng nhập trực tiếp trong hộp thư.', button: 'Gửi liên kết đăng nhập' },
};

function ProviderIcon({ provider }: { provider: Provider }) {
  return provider === 'google'
    ? <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" /><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.05v2.59A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.4 13.91a6 6 0 0 1 0-3.82V7.5H3.05a10 10 0 0 0 0 9l3.35-2.59Z" /><path fill="#EA4335" d="M12 5.96c1.47 0 2.8.5 3.83 1.5L18.7 4.6A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.5l3.35 2.59A5.99 5.99 0 0 1 12 5.96Z" /></svg>
    : <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.8-4.67 4.54-4.67 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12Z" /></svg>;
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const params = useSearchParams();
  const tokenHash = params.get('token_hash') || '';
  const recoveryCode = params.get('code') || '';
  const recoveryFlowId = params.get('sb_flow_id') || undefined;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const submitting = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(EMAIL_LINK_ERRORS[params.get('error') || ''] || '');
  const [message, setMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [revision, setRevision] = useState(0);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [recoveryFactors, setRecoveryFactors] = useState<{ id: string; friendlyName?: string }[]>([]);
  const [factorId, setFactorId] = useState('');
  const [otp, setOtp] = useState('');
  const isPrimary = mode === 'login' || mode === 'register';
  const passwordMode = mode === 'login' || mode === 'register' || mode === 'reset-password';
  const newPassword = mode === 'register' || mode === 'reset-password';
  const needsCaptcha = ['login', 'register', 'forgot-password', 'resend', 'magic-link'].includes(mode);
  const validRecovery = (validTokenHash(tokenHash) && !recoveryCode) || (!tokenHash && validAuthCode(recoveryCode) && (!recoveryFlowId || /^[A-Za-z0-9_-]{8,64}$/.test(recoveryFlowId)));
  const invalidLink = mode === 'confirm' ? !validTokenHash(tokenHash) : mode === 'reset-password' ? !validRecovery : false;
  const mismatch = !!confirmPassword && password !== confirmPassword;
  const details = mode === 'confirm' && params.get('type') === 'magiclink'
    ? { title: 'Đăng nhập qua email', description: 'Tiếp tục đăng nhập bằng liên kết bạn vừa nhận.', button: 'Tiếp tục đăng nhập' }
    : content[mode];
  const next = params.get('next');
  const pathTo = (path: string) => next ? path + '?next=' + encodeURIComponent(next) : path;
  const strength = [password.length >= 12, /\p{Lu}/u.test(password) && /\p{Ll}/u.test(password), /\d/.test(password), /[^\p{L}\p{N}\s]/u.test(password)].filter(Boolean).length;

  useEffect(() => {
    if (!isPrimary) return;
    const controller = new AbortController();
    fetch('/api/auth/providers', { signal: controller.signal, cache: 'no-store' })
      .then(async response => response.ok ? response.json() : null)
      .then(data => { if (Array.isArray(data?.providers)) setProviders(data.providers.filter((value: unknown): value is Provider => value === 'google' || value === 'facebook')); })
      .catch(() => {});
    return () => controller.abort();
  }, [isPrimary]);

  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  useEffect(() => {
    if (retrySeconds <= 0) return;
    const timer = window.setTimeout(() => setRetrySeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [retrySeconds]);

  function handleError(caught: unknown, fallback: string) {
    setError(caught instanceof Error ? caught.message : fallback);
    if (caught instanceof AuthRequestError && caught.retryAfter > 0) {
      setRetrySeconds(caught.retryAfter);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || invalidLink || retrySeconds > 0) return;
    setError('');
    if (newPassword && !validPassword(password)) { setError(PASSWORD_HINT); return; }
    if (newPassword && mismatch) { setError('Mật khẩu xác nhận chưa khớp.'); return; }
    submitting.current = true; setBusy(true);
    try {
      const body = mode === 'login' ? { email, password, remember, next, captchaToken }
        : mode === 'register' ? { email, fullName, phone, password, confirmPassword, agree, captchaToken }
        : mode === 'reset-password' ? { ...(recoveryCode ? { code: recoveryCode, ...(recoveryFlowId ? { flowId: recoveryFlowId } : {}) } : { tokenHash }), password, confirmPassword }
        : mode === 'confirm' ? { tokenHash, type: params.get('type') || 'email' }
        : { email, captchaToken };
      const data = await authRequest(mode === 'reset-password' && recoveryFactors.length ? 'reset-password-mfa' : mode,
        recoveryFactors.length ? { factorId, code: otp, password, confirmPassword } : body);
      if (data.recoveryFactors?.length) { setRecoveryFactors(data.recoveryFactors); setFactorId(data.recoveryFactors[0].id); return; }
      if (data.redirect) window.location.replace(data.redirect);
      else { setMessage(data.message || 'Yêu cầu đã hoàn tất.'); setPassword(''); setConfirmPassword(''); }
    } catch (caught) { handleError(caught, 'Không thể thực hiện yêu cầu.'); }
    finally { submitting.current = false; setCaptchaToken(''); setBusy(false); setRevision(value => value + 1); }
  }

  async function oauth(provider: Provider) {
    if (submitting.current || retrySeconds > 0) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const result = await authRequest('oauth', { provider, remember, next });
      if (!result.url) throw new Error('Không thể kết nối. Vui lòng thử lại.');
      window.location.assign(result.url);
    } catch (caught) { handleError(caught, 'Không thể kết nối.'); submitting.current = false; setBusy(false); }
  }

  return <AuthFrame>
    {isPrimary ? <nav className={styles.tabs} aria-label="Đăng nhập hoặc đăng ký">
      <Link href={pathTo('/login')} aria-current={mode === 'login' ? 'page' : undefined} className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}>Đăng nhập</Link>
      <Link href={pathTo('/register')} aria-current={mode === 'register' ? 'page' : undefined} className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}>Đăng ký</Link>
    </nav> : <Link href={pathTo('/login')} className={`${styles.link} ${styles.backLink}`}><ArrowLeft size={14} aria-hidden="true" />Về đăng nhập</Link>}
    <header className={styles.heading}><h1>{details.title}</h1><p>{details.description}</p></header>
    {error && <div ref={errorRef} tabIndex={-1} role="alert" className={styles.alert}><AlertCircle size={16} aria-hidden="true" /><span>{error}</span></div>}
    {retrySeconds > 0 && <p role="status" className={styles.help}>Bạn có thể thử lại sau {retrySeconds} giây.</p>}
    {invalidLink && <div role="alert" className={styles.alert}><AlertCircle size={16} aria-hidden="true" /><span>Liên kết không hợp lệ hoặc đã hết hạn. <Link className={styles.link} href={mode === 'reset-password' ? '/forgot-password' : '/resend-confirmation'}>Yêu cầu liên kết mới</Link></span></div>}
    {message ? <section role="status" className={styles.success}>
      <span className={styles.successIcon}>{mode === 'confirm' || mode === 'reset-password' ? <Check size={25} /> : <MailCheck size={25} />}</span>
      <h2>{mode === 'confirm' || mode === 'reset-password' ? 'Hoàn tất!' : 'Kiểm tra hộp thư của bạn'}</h2>
      <p>{message}</p><Link href={pathTo('/login')} className={styles.submit}>Về đăng nhập<ArrowRight size={16} aria-hidden="true" /></Link>
    </section> : <>
      <form onSubmit={submit} className={styles.form} aria-label={mode === 'register' ? 'Đăng ký tài khoản' : details.button}>
        <fieldset disabled={busy || invalidLink} className={styles.fieldset}>
          {mode === 'register' && <div className={styles.twoColumns}>
            <div className={styles.field}><label htmlFor="fullName" className={styles.label}>Họ và tên</label><div className={styles.inputWrap}><UserRound size={17} className={styles.inputIcon} aria-hidden="true" /><input id="fullName" name="fullName" className={styles.input} autoComplete="name" placeholder="Nguyễn Minh Anh" minLength={2} maxLength={100} required value={fullName} onChange={event => setFullName(event.target.value)} /></div></div>
            <div className={styles.field}><label htmlFor="phone" className={styles.label}>Số điện thoại</label><div className={styles.inputWrap}><Phone size={16} className={styles.inputIcon} aria-hidden="true" /><input id="phone" name="phone" className={styles.input} type="tel" inputMode="tel" autoComplete="tel" placeholder="0912345678" pattern="0[0-9]{9}" title="Số điện thoại gồm 10 chữ số, bắt đầu bằng 0" maxLength={20} required value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} /></div></div>
          </div>}
          {!['confirm', 'reset-password'].includes(mode) && <div className={styles.field}><label htmlFor="email" className={styles.label}>Địa chỉ email</label><div className={styles.inputWrap}><Mail size={17} className={styles.inputIcon} aria-hidden="true" /><input id="email" name="email" className={styles.input} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="ban@email.com" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} /></div></div>}
          {passwordMode && <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>{mode === 'reset-password' ? 'Mật khẩu mới' : 'Mật khẩu'}</label>
            <div className={styles.inputWrap}><LockKeyhole size={17} className={styles.inputIcon} aria-hidden="true" /><input id="password" name="password" className={`${styles.input} ${styles.passwordInput}`} type={showPassword ? 'text' : 'password'} autoComplete={newPassword ? 'new-password' : 'current-password'} placeholder={newPassword ? 'Tạo mật khẩu của bạn' : 'Nhập mật khẩu của bạn'} minLength={newPassword ? 12 : 1} maxLength={128} required value={password} aria-describedby={newPassword ? 'password-help' : undefined} onChange={event => setPassword(event.target.value)} /><button type="button" className={styles.eyeButton} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            {newPassword && <>{!!password && <div className={styles.passwordStrength} aria-hidden="true">{[1, 2, 3, 4].map(level => <span className={strength >= level ? styles.strengthFilled : ''} key={level} />)}</div>}<p id="password-help" className={styles.help}>Từ 12 ký tự, gồm chữ hoa, chữ thường, số và ký hiệu.</p></>}
          </div>}
          {newPassword && <div className={styles.field}><label htmlFor="confirmPassword" className={styles.label}>Xác nhận mật khẩu</label><div className={styles.inputWrap}><KeyRound size={17} className={styles.inputIcon} aria-hidden="true" /><input id="confirmPassword" name="confirmPassword" className={`${styles.input} ${styles.passwordInput}`} type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Nhập lại mật khẩu" maxLength={128} required value={confirmPassword} aria-invalid={mismatch || undefined} aria-describedby={mismatch ? 'confirm-error' : undefined} onChange={event => setConfirmPassword(event.target.value)} /><button type="button" className={styles.eyeButton} aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword(value => !value)}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{mismatch && <p id="confirm-error" className={styles.fieldError}>Mật khẩu xác nhận chưa khớp.</p>}</div>}
          {!!recoveryFactors.length && <div className={styles.recovery}>
            <label className={styles.field}><span className={styles.label}>Ứng dụng xác thực</span><select className={styles.input} value={factorId} onChange={event => setFactorId(event.target.value)}>{recoveryFactors.map(factor => <option value={factor.id} key={factor.id}>{factor.friendlyName || 'Authenticator'}</option>)}</select></label>
            <label className={styles.field}><span className={styles.label}>Mã xác thực</span><input className={styles.input} required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, ''))} /></label>
          </div>}
          {mode === 'login' && <div className={styles.options}><label className={styles.checkbox}><input type="checkbox" name="remember" checked={remember} onChange={event => setRemember(event.target.checked)} />Ghi nhớ đăng nhập</label><Link href="/forgot-password" className={styles.link}>Quên mật khẩu?</Link></div>}
          {mode === 'register' && <label className={styles.checkbox}><input type="checkbox" name="agree" required checked={agree} onChange={event => setAgree(event.target.checked)} />Tôi đồng ý sử dụng thông tin để đặt lịch và chăm sóc sức khỏe.</label>}
          {needsCaptcha && <Captcha onToken={setCaptchaToken} revision={revision} />}
          <button type="submit" disabled={busy || invalidLink || retrySeconds > 0 || (needsCaptcha && !!process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY && !captchaToken)} className={styles.submit}>{busy ? <><LoaderCircle className={styles.spinner} size={17} aria-hidden="true" />Đang xử lý…</> : <>{details.button}<ArrowRight size={17} aria-hidden="true" /></>}</button>
        </fieldset>
      </form>
      {isPrimary && providers.length > 0 && <div className={styles.socialSection}><div className={styles.divider}>hoặc tiếp tục với</div><div className={styles.socialButtons}>{providers.map(provider => <button type="button" key={provider} disabled={busy || retrySeconds > 0} onClick={() => oauth(provider)} className={styles.socialButton}><ProviderIcon provider={provider} />{provider === 'google' ? 'Google' : 'Facebook'}</button>)}</div></div>}
      {mode === 'login' && <nav className={styles.bottomLinks} aria-label="Hỗ trợ đăng nhập"><Link className={styles.link} href="/magic-link">Đăng nhập bằng liên kết email</Link><Link className={styles.link} href="/resend-confirmation">Gửi lại xác nhận</Link></nav>}
    </>}
  </AuthFrame>;
}
