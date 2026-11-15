'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Camera, Check, ChevronRight, LoaderCircle, Pencil, Save, ShieldCheck, Trash2, Upload, UserRound, X } from 'lucide-react';
import { AVATAR_TYPES, MAX_AVATAR_BYTES, normalizeProfile, personalInput, profileChanged, profileErrors, todayInClinic,
  type PersonalInput, type PersonalProfile } from '@/lib/profile';
import styles from './Profile.module.css';

export async function profileRequest(method = 'GET', body?: PersonalInput & { expectedUpdatedAt: string }, signal?: AbortSignal) {
  const response = await fetch('/api/profile', { method, credentials: 'same-origin', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.profile) {
    throw Object.assign(new Error(data?.message || 'Không thể tải hồ sơ. Kiểm tra kết nối rồi thử lại.'), { status: response.status, fields: data?.fields });
  }
  return normalizeProfile(data.profile) as PersonalProfile;
}
function formatted(value: string, time = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', ...(time ? { timeStyle: 'short' as const } : {}) })
    .format(new Date(time ? value : value + 'T12:00:00+07:00'));
}
function Portrait({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState('');
  return <div className={styles.portrait}>{url && failed !== url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url} alt={'Ảnh đại diện của ' + name} onError={() => setFailed(url)} />
    : <span aria-label="Chưa có ảnh đại diện">{name.trim().split(/\s+/).slice(-2).map(word => word[0] || '').join('').toUpperCase() || <UserRound size={38} />}</span>}</div>;
}
export function PersonalProfilePanel({ initialProfile, onSaved, aside }: {
  initialProfile: PersonalProfile; onSaved?: (profile: PersonalProfile) => void; aside?: ReactNode;
}) {
  const [profile, setProfile] = useState(() => normalizeProfile(initialProfile));
  const [draft, setDraft] = useState(() => personalInput(normalizeProfile(initialProfile)));
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState<'profile' | 'photo' | 'reload' | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof PersonalInput, string>>>({});
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [conflict, setConflict] = useState(false);
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState(''), [removing, setRemoving] = useState(false);
  const lock = useRef(false), alive = useRef(true), request = useRef<AbortController | null>(null);
  const photoInput = useRef<HTMLInputElement>(null), nameInput = useRef<HTMLInputElement>(null), alertRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const dirty = JSON.stringify(draft) !== JSON.stringify(personalInput(profile));
  const [today] = useState(todayInClinic);
  const gender = { '': 'Chưa cập nhật', male: 'Nam', female: 'Nữ', other: 'Khác' }[profile.gender];
  const role = profile.role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân';

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; request.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // The preview URL belongs to this effect and is always released.
    queueMicrotask(() => setPreview(url));
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => { if (editing) nameInput.current?.focus(); }, [editing]);
  useEffect(() => { if (error) alertRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (!dirty && !file) return;
    const before = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [dirty, file]);

  function applied(next: PersonalProfile, resetDraft: boolean) {
    setProfile(next); if (resetDraft) setDraft(personalInput(next));
    onSaved?.(next); profileChanged();
  }
  async function perform(kind: 'profile' | 'photo' | 'reload', operation: (signal: AbortSignal) => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(kind); setError(''); setMessage('');
    const controller = new AbortController(); request.current = controller;
    try { await operation(controller.signal); }
    catch (caught) {
      if (!alive.current || controller.signal.aborted) return;
      const problem = caught as Error & { status?: number; fields?: typeof errors };
      if (problem.fields) setErrors(problem.fields);
      if (problem.status === 409) setConflict(true);
      setError(problem.name === 'TypeError' || problem.name === 'TimeoutError' ? 'Không thể kết nối hoặc yêu cầu mất quá lâu. Kiểm tra mạng rồi tải lại hồ sơ trước khi thử tiếp.' : problem.message || 'Không kết nối được. Kiểm tra mạng rồi thử lại.');
    } finally { lock.current = false; if (alive.current) setBusy(null); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const fields = profileErrors(draft);
    setErrors(fields);
    if (Object.keys(fields).length) { setError('Kiểm tra các thông tin được đánh dấu trong biểu mẫu.'); return; }
    await perform('profile', async signal => {
      const next = await profileRequest('PATCH', { ...draft, expectedUpdatedAt: profile.updated_at }, signal);
      if (!alive.current) return;
      applied(next, true); setEditing(false); setConflict(false); setMessage('Đã lưu hồ sơ của bạn.');
    });
  }
  async function photo(remove = false) {
    if (!remove && !file) return;
    await perform('photo', async signal => {
      const response = await fetch('/api/profile/avatar', { method: remove ? 'DELETE' : 'POST', credentials: 'same-origin',
        ...(remove ? {} : { headers: { 'Content-Type': file!.type }, body: file }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.profile) throw Object.assign(new Error(result?.message || 'Không thể lưu ảnh. Vui lòng thử lại.'), { status: response.status });
      if (!alive.current) return;
      const next = normalizeProfile(result.profile);
      const changedElsewhere = dirty && JSON.stringify(personalInput(next)) !== JSON.stringify(personalInput(profile));
      applied(next, !dirty); setFile(null); setRemoving(false);
      if (changedElsewhere) {
        setConflict(true); setError('Ảnh đã lưu, nhưng thông tin cá nhân vừa thay đổi ở phiên khác. Tải hồ sơ mới để kiểm tra trước khi lưu bản đang nhập.');
      } else setMessage(remove ? 'Đã gỡ ảnh đại diện.' : 'Đã lưu ảnh đại diện.');
    });
  }
  async function reload() {
    await perform('reload', async signal => {
      const next = await profileRequest('GET', undefined, signal);
      if (!alive.current) return;
      applied(next, false); setConflict(false);
      setMessage('Đã tải bản hồ sơ mới. Nội dung bạn đang nhập được giữ lại để kiểm tra trước khi lưu.');
    });
  }
  function select(selected?: File) {
    if (!selected) return;
    setError(''); setMessage('');
    if (!AVATAR_TYPES.includes(selected.type)) { setError('Chọn ảnh JPG, PNG hoặc WebP.'); return; }
    if (!selected.size || selected.size > MAX_AVATAR_BYTES) { setError('Ảnh cần có dung lượng từ 1 byte đến 5 MB.'); return; }
    setFile(selected); setRemoving(false);
  }
  const rows = [
    ['Họ và tên', profile.full_name || 'Chưa cập nhật'], ['Số điện thoại', profile.phone || 'Chưa cập nhật'],
    ['Ngày sinh', formatted(profile.date_of_birth)], ['Giới tính', gender], ['Email đăng nhập', profile.email], ['Địa chỉ liên hệ', profile.address || 'Chưa cập nhật'],
  ];
  const input = (key: keyof PersonalInput, label: string, type = 'text', required = false) => <div className={styles.field}>
    <label htmlFor={id + key}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    <input id={id + key} ref={key === 'full_name' ? nameInput : undefined} name={key} type={type} required={required}
      minLength={key === 'full_name' ? 2 : undefined} maxLength={key === 'full_name' ? 100 : key === 'phone' ? 10 : undefined}
      min={type === 'date' ? '1900-01-01' : undefined} max={type === 'date' ? today : undefined}
      autoComplete={key === 'full_name' ? 'name' : key === 'phone' ? 'tel' : key === 'date_of_birth' ? 'bday' : undefined}
      inputMode={type === 'tel' ? 'tel' : undefined} pattern={type === 'tel' ? '0[0-9]{9}' : undefined}
      value={draft[key]} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? id + key + '-error' : key === 'phone' ? id + '-phone-help' : undefined}
      onChange={event => setDraft(previous => ({ ...previous, [key]: key === 'phone' ? event.target.value.replace(/\D/g, '').slice(0, 10) : event.target.value }))}
      onBlur={() => setErrors(previous => ({ ...previous, [key]: profileErrors(draft)[key] }))} />
    {key === 'phone' && !errors.phone && <small id={id + '-phone-help'}>10 chữ số, bắt đầu bằng 0. Có thể để trống.</small>}
    {errors[key] && <small id={id + key + '-error'} className={styles.fieldError}>{errors[key]}</small>}
  </div>;

  return <div className={styles.root}>
    <div className={styles.banner}><div><span className={styles.eyebrow}>HỒ SƠ CỦA TÔI</span><h1>{profile.role === 'doctor' ? 'Thông tin cá nhân bác sĩ' : 'Hồ sơ bệnh nhân'}</h1>
      <p>Thông tin chính xác giúp phòng khám liên hệ và hỗ trợ bạn tốt hơn.</p></div><span className={styles.role}><Check size={14} />{role}</span></div>
    {error && <div className={styles.error} tabIndex={-1} ref={alertRef} role="alert"><strong>Chưa thể lưu thay đổi</strong><p>{error}</p>
      {conflict && <button type="button" disabled={!!busy} onClick={() => { void reload(); }}>Tải hồ sơ mới, giữ bản đang nhập</button>}</div>}
    {message && <div role="status" className={styles.success}><Check size={18} />{message}</div>}
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <section className={styles.identity}>
          <div className={styles.photoFrame}><Portrait url={file ? preview : profile.avatar_url} name={profile.full_name} /><span><Camera size={18} /></span></div>
          <h2>{profile.full_name || role}</h2><p>{profile.email}</p>
          <input ref={photoInput} className={styles.visuallyHidden} tabIndex={-1} type="file" accept={AVATAR_TYPES.join(',')}
            aria-label="Chọn ảnh đại diện từ máy" onChange={event => { select(event.target.files?.[0]); event.target.value = ''; }} disabled={!!busy} />
          <button className={styles.secondary} type="button" disabled={!!busy} onClick={() => photoInput.current?.click()}><Upload size={16} />Chọn ảnh từ máy</button>
          <small>JPG, PNG hoặc WebP · Tối đa 5 MB<br />Ảnh được căn giữa và cắt vuông khi lưu.</small>
          {file && <div className={styles.photoActions}><p>{file.name}</p><div><button type="button" className={styles.primary} disabled={!!busy} onClick={() => { void photo(); }}>{busy === 'photo' ? <LoaderCircle size={16} className={styles.spin} /> : <Save size={16} />}Lưu ảnh</button>
            <button type="button" className={styles.secondary} disabled={!!busy} onClick={() => setFile(null)}>Hủy</button></div></div>}
          {profile.avatar_url && !file && <button type="button" className={styles.remove} disabled={!!busy} onClick={() => setRemoving(true)}><Trash2 size={14} />Gỡ ảnh hiện tại</button>}
          {removing && <div className={styles.confirm}><p>Gỡ ảnh đại diện hiện tại?</p><div><button type="button" disabled={!!busy} onClick={() => { void photo(true); }}>Xác nhận gỡ</button><button type="button" disabled={!!busy} onClick={() => setRemoving(false)}>Giữ ảnh</button></div></div>}
        </section>
        <section className={styles.account}>
          <h2>Thông tin tài khoản</h2><dl><div><dt>Vai trò</dt><dd>{role}</dd></div><div><dt>Ngày tham gia</dt><dd>{formatted(profile.created_at, true)}</dd></div>
            <div><dt>Cập nhật gần nhất</dt><dd>{formatted(profile.updated_at, true)}</dd></div></dl>
          <details><summary>Mã hồ sơ</summary><p className={styles.identifier}>{profile.id}</p></details>
          <Link href="/account/security" className={styles.security}><ShieldCheck size={19} /><span>Mật khẩu & bảo mật<small>Quản lý xác thực hai bước</small></span><ChevronRight size={16} /></Link>
        </section>
        {aside}
      </aside>
      <section className={styles.details}>
        <header><div><h2>Thông tin cá nhân</h2><p>Thông tin dùng cho liên hệ và hồ sơ đặt lịch khám.</p></div>
          {!editing && <button type="button" className={styles.secondary} disabled={!!busy} onClick={() => { setEditing(true); setDraft(personalInput(profile)); setErrors({}); }}><Pencil size={16} />Chỉnh sửa</button>}</header>
        {!editing ? <dl className={styles.dataGrid}>{rows.map(([label, value]) => <div key={label} className={label === 'Địa chỉ liên hệ' ? styles.wide : ''}><dt>{label}</dt>
          <dd>{label === 'Số điện thoại' && profile.phone ? <a href={'tel:' + profile.phone}>{value}</a> : value}</dd></div>)}</dl> :
          <form onSubmit={save} noValidate>
            <fieldset disabled={!!busy} className={styles.formGrid}>
              {input('full_name', 'Họ và tên', 'text', true)}{input('phone', 'Số điện thoại', 'tel')}
              {input('date_of_birth', 'Ngày sinh', 'date')}
              <div className={styles.field}><label htmlFor={id + 'gender'}>Giới tính</label><select id={id + 'gender'} value={draft.gender} autoComplete="sex"
                onChange={event => setDraft(previous => ({ ...previous, gender: event.target.value as PersonalInput['gender'] }))}>
                <option value="">Chưa cập nhật</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option>
              </select>{errors.gender && <small className={styles.fieldError}>{errors.gender}</small>}</div>
              <div className={styles.field + ' ' + styles.wide}><label htmlFor={id + 'email'}>Email đăng nhập</label><input id={id + 'email'} type="email" value={profile.email} readOnly aria-readonly="true" />
                <small>Email được quản lý trong <Link href="/account/security">Bảo mật tài khoản</Link>.</small></div>
              <div className={styles.field + ' ' + styles.wide}><label htmlFor={id + 'address'}>Địa chỉ liên hệ</label><textarea id={id + 'address'} rows={3} maxLength={500} autoComplete="street-address"
                value={draft.address} aria-invalid={!!errors.address} aria-describedby={errors.address ? id + 'address-error' : undefined}
                onChange={event => setDraft(previous => ({ ...previous, address: event.target.value }))} />
                <small id={id + 'address-error'} className={errors.address ? styles.fieldError : ''}>{errors.address || draft.address.length + '/500 ký tự'}</small></div>
              <div className={styles.saveBar}><span>{dirty ? 'Có thay đổi chưa lưu' : 'Thông tin đã được đồng bộ'}</span><div>
                <button type="button" className={styles.secondary} onClick={() => { setDraft(personalInput(profile)); setEditing(false); setErrors({}); }}><X size={16} />Bỏ thay đổi</button>
                <button type="submit" className={styles.primary} disabled={!dirty || conflict}>{busy === 'profile' ? <LoaderCircle size={16} className={styles.spin} /> : <Save size={16} />}{busy === 'profile' ? 'Đang lưu…' : 'Lưu hồ sơ'}</button></div></div>
            </fieldset>
          </form>}
        {!editing && <div className={styles.hint}><ShieldCheck size={18} /><p>Chỉ bạn và nhân viên có quyền mới truy cập được thông tin hồ sơ. Ảnh đại diện được lưu riêng tư trên hệ thống.</p></div>}
      </section>
    </div>
  </div>;
}
