'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CalendarDays, CircleCheck, CircleX, Clock3, Camera, Check, ChevronRight, LoaderCircle, Pencil, Save, ShieldCheck, Trash2, Upload, UserRound } from 'lucide-react';
import { AVATAR_TYPES, MAX_AVATAR_BYTES, clinicToday, normalizeProfile, notifyProfileChanged, personalInput, profileErrors,
  type PersonalInput, type PersonalProfile } from '@/lib/profile';
import styles from './Profile.module.css';

export async function profileRequest(method = 'GET', body?: PersonalInput & { expectedUpdatedAt: string }, signal?: AbortSignal) {
  const response = await fetch('/api/profile', { method, credentials: 'same-origin', cache: 'no-store',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.profile) throw Object.assign(new Error(data?.message || 'Không thể tải hồ sơ.'), { status: response.status, fields: data?.fields });
  return normalizeProfile(data.profile);
}
function dateLabel(value: string, time = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', ...(time ? { timeStyle: 'short' as const } : {}) })
    .format(new Date(time ? value : value + 'T12:00:00+07:00'));
}
export function ProfilePortrait({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState('');
  return <div className={styles.portrait}>{url && failed !== url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url} alt={'Ảnh đại diện của ' + name} onError={() => setFailed(url)} />
    : <span aria-label="Chưa có ảnh đại diện">{name.trim().split(/\s+/).slice(-2).map(word => word[0] || '').join('').toUpperCase() || <UserRound size={34} />}</span>}</div>;
}
export interface ProfileStatistic {
  label: string;
  value: number;
  href: string;
  kind: 'all' | 'completed' | 'cancelled' | 'pending';
}
const statisticIcons = { all: CalendarDays, completed: CircleCheck, cancelled: CircleX, pending: Clock3 };

export function PersonalProfilePanel({ initialProfile, onSaved, statistics = [], summaryAction }: {
  initialProfile: PersonalProfile;
  onSaved?: (profile: PersonalProfile) => void;
  statistics?: ProfileStatistic[];
  summaryAction?: { href: string; label: string };
}) {
  const [profile, setProfile] = useState(() => normalizeProfile(initialProfile));
  const [draft, setDraft] = useState(() => personalInput(normalizeProfile(initialProfile)));
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState<'profile' | 'photo' | 'reload' | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof PersonalInput, string>>>({});
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [conflict, setConflict] = useState(false);
  const [selection, setSelection] = useState<{ file: File; url: string } | null>(null), [removing, setRemoving] = useState(false);
  const lock = useRef(false), alive = useRef(true), request = useRef<AbortController | null>(null);
  const photoInput = useRef<HTMLInputElement>(null), nameInput = useRef<HTMLInputElement>(null), alertRef = useRef<HTMLDivElement>(null);
  const id = useId(), [today] = useState(clinicToday);
  const dirty = JSON.stringify(draft) !== JSON.stringify(personalInput(profile));
  const gender = { '': 'Chưa cập nhật', male: 'Nam', female: 'Nữ', other: 'Khác' }[profile.gender];
  const role = profile.role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân';

  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); }; }, []);
  useEffect(() => { if (selection) return () => URL.revokeObjectURL(selection.url); }, [selection]);
  useEffect(() => { if (editing) nameInput.current?.focus(); }, [editing]);
  useEffect(() => { if (error) alertRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (!dirty && !selection) return;
    const before = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [dirty, selection]);

  function applied(next: PersonalProfile, resetDraft: boolean) {
    setProfile(next); if (resetDraft) setDraft(personalInput(next));
    onSaved?.(next); notifyProfileChanged();
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
      setError(['TypeError', 'TimeoutError'].includes(problem.name) ? 'Kết nối bị gián đoạn. Tải lại hồ sơ để kiểm tra trước khi thử lại.' : problem.message || 'Không thể lưu thay đổi.');
    } finally { lock.current = false; if (alive.current) setBusy(null); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const fields = profileErrors(draft); setErrors(fields);
    if (Object.keys(fields).length) { setError('Kiểm tra thông tin được đánh dấu trong biểu mẫu.'); return; }
    await perform('profile', async signal => {
      const next = await profileRequest('PATCH', { ...draft, expectedUpdatedAt: profile.updated_at }, signal);
      if (!alive.current) return;
      applied(next, true); setEditing(false); setConflict(false); setMessage('Đã lưu thông tin cá nhân.');
    });
  }
  async function photo(remove = false) {
    if (!remove && !selection) return;
    await perform('photo', async signal => {
      const response = await fetch('/api/profile/avatar', { method: remove ? 'DELETE' : 'POST', credentials: 'same-origin',
        ...(remove ? {} : { headers: { 'Content-Type': selection!.file.type }, body: selection!.file }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.profile) throw Object.assign(new Error(result?.message || 'Không lưu được ảnh.'), { status: response.status });
      if (!alive.current) return;
      const next = normalizeProfile(result.profile);
      const changedElsewhere = dirty && JSON.stringify(personalInput(next)) !== JSON.stringify(personalInput(profile));
      applied(next, !dirty); setSelection(null); setRemoving(false);
      if (changedElsewhere) { setConflict(true); setError('Ảnh đã lưu nhưng thông tin cá nhân vừa thay đổi ở phiên khác. Tải bản mới để kiểm tra trước khi lưu.'); }
      else setMessage(remove ? 'Đã gỡ ảnh đại diện.' : 'Đã lưu ảnh đại diện.');
    });
  }
  async function reload() {
    await perform('reload', async signal => {
      const next = await profileRequest('GET', undefined, signal);
      if (!alive.current) return;
      applied(next, false); setConflict(false); setMessage('Đã tải hồ sơ mới. Bản bạn đang nhập được giữ lại để đối chiếu trước khi lưu.');
    });
  }
  function select(file?: File) {
    if (!file) return;
    setError(''); setMessage('');
    if (!AVATAR_TYPES.includes(file.type)) { setError('Chọn ảnh JPG, PNG hoặc WebP.'); return; }
    if (!file.size || file.size > MAX_AVATAR_BYTES) { setError('Ảnh cần có dung lượng tối đa 5 MB.'); return; }
    setSelection({ file, url: URL.createObjectURL(file) }); setRemoving(false);
  }
  const rows = [['Họ và tên', profile.full_name || 'Chưa cập nhật'], ['Số điện thoại', profile.phone || 'Chưa cập nhật'],
    ['Ngày sinh', dateLabel(profile.date_of_birth)], ['Giới tính', gender], ['Email đăng nhập', profile.email || 'Chưa cập nhật'],
    ['Địa chỉ liên hệ', profile.address || 'Chưa cập nhật']];
  function field(key: keyof PersonalInput, label: string, type = 'text', required = false) {
    return <div className={styles.field}><label htmlFor={id + key}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      <input id={id + key} ref={key === 'full_name' ? nameInput : undefined} name={key} type={type} required={required}
        minLength={key === 'full_name' ? 2 : undefined} maxLength={key === 'phone' ? 10 : key === 'full_name' ? 100 : undefined}
        min={type === 'date' ? '1900-01-01' : undefined} max={type === 'date' ? today : undefined}
        autoComplete={key === 'full_name' ? 'name' : key === 'phone' ? 'tel' : 'bday'} inputMode={type === 'tel' ? 'tel' : undefined}
        value={draft[key]} aria-invalid={!!errors[key]} aria-describedby={id + key + '-help'}
        onChange={event => setDraft(previous => ({ ...previous, [key]: key === 'phone' ? event.target.value.replace(/\D/g, '').slice(0, 10) : event.target.value }))}
        onBlur={() => setErrors(previous => ({ ...previous, [key]: profileErrors(draft)[key] }))} />
      <small id={id + key + '-help'} className={errors[key] ? styles.fieldError : ''}>{errors[key] || (key === 'phone' ? '10 chữ số, bắt đầu bằng 0. Có thể để trống.' : '')}</small></div>;
  }

  return <div className={styles.root} data-role={profile.role}>
    <div className={styles.banner}><div><span className={styles.eyebrow}>HỒ SƠ CỦA TÔI</span><h1>{profile.role === 'doctor' ? 'Thông tin cá nhân bác sĩ' : 'Hồ sơ bệnh nhân'}</h1>
      <p>Cập nhật thông tin để phòng khám liên hệ và hỗ trợ bạn chính xác hơn.</p></div><span className={styles.role}><Check size={14} />{role}</span></div>
    {error && <div className={styles.error} ref={alertRef} tabIndex={-1} role="alert"><strong>Chưa thể hoàn tất thay đổi</strong><p>{error}</p>
      {conflict && <button type="button" disabled={!!busy} onClick={() => { void reload(); }}>Tải hồ sơ mới, giữ bản đang nhập</button>}</div>}
    {message && <div role="status" className={styles.success}><Check size={18} />{message}</div>}
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <section className={styles.identity}><div className={styles.photoFrame}><ProfilePortrait url={selection?.url || profile.avatar_url} name={profile.full_name} /><span><Camera size={18} /></span></div>
          <h2>{profile.full_name || role}</h2><p>{profile.email}</p>
          <input ref={photoInput} className={styles.hidden} tabIndex={-1} type="file" accept={AVATAR_TYPES.join(',')} aria-label="Chọn ảnh đại diện từ máy"
            disabled={!!busy} onChange={event => { select(event.target.files?.[0]); event.target.value = ''; }} />
          <button type="button" className={styles.secondary} disabled={!!busy} onClick={() => photoInput.current?.click()}><Upload size={16} />Chọn ảnh từ máy</button>
          <small>JPG, PNG hoặc WebP · Tối đa 5 MB<br />Ảnh được căn giữa và cắt vuông khi lưu.</small>
          {selection && <div className={styles.photoActions}><p>{selection.file.name}</p><div>
            <button type="button" className={styles.primary} disabled={!!busy} onClick={() => { void photo(); }}>{busy === 'photo' ? <LoaderCircle size={16} className={styles.spin} /> : <Save size={16} />}Lưu ảnh</button>
            <button type="button" className={styles.secondary} disabled={!!busy} onClick={() => setSelection(null)}>Hủy chọn</button></div></div>}
          {profile.avatar_url && !selection && <button type="button" className={styles.remove} disabled={!!busy} onClick={() => setRemoving(true)}><Trash2 size={14} />Gỡ ảnh hiện tại</button>}
          {removing && <div className={styles.confirm}><p>Gỡ ảnh đại diện hiện tại?</p><div><button type="button" disabled={!!busy} onClick={() => { void photo(true); }}>Xác nhận gỡ</button><button type="button" disabled={!!busy} onClick={() => setRemoving(false)}>Giữ ảnh</button></div></div>}
        </section>
        <section className={styles.account}><h2>Thông tin tài khoản</h2><dl><div><dt>Vai trò</dt><dd>{role}</dd></div><div><dt>Ngày tham gia</dt><dd>{dateLabel(profile.created_at, true)}</dd></div>
          <div><dt>Cập nhật gần nhất</dt><dd>{dateLabel(profile.updated_at, true)}</dd></div></dl>
          <details><summary>Mã hồ sơ</summary><p className={styles.identifier}>{profile.id}</p></details>
          <Link href="/account/security" className={styles.security}><ShieldCheck size={19} /><span>Mật khẩu & bảo mật<small>Quản lý xác thực hai bước</small></span><ChevronRight size={16} /></Link>
        </section>
      </aside>
      <div className={styles.content}>
        
      <section className={styles.details}><header><div><h2>Thông tin cá nhân</h2><p>Thông tin liên hệ và hồ sơ đặt lịch của bạn.</p></div>
        {!editing && <button type="button" className={styles.secondary} disabled={!!busy} onClick={() => { setEditing(true); setDraft(personalInput(profile)); setErrors({}); }}><Pencil size={16} />Chỉnh sửa</button>}</header>
        {!editing ? <dl className={styles.dataGrid}>{rows.map(([label, value]) => <div key={label} className={label === 'Địa chỉ liên hệ' ? styles.wide : ''}><dt>{label}</dt>
          <dd>{label === 'Số điện thoại' && profile.phone ? <a href={'tel:' + profile.phone}>{value}</a> : value}</dd></div>)}</dl> :
          <form onSubmit={save} noValidate><fieldset disabled={!!busy} className={styles.formGrid}>
            {field('full_name', 'Họ và tên', 'text', true)}{field('phone', 'Số điện thoại', 'tel')}{field('date_of_birth', 'Ngày sinh', 'date')}
            <div className={styles.field}><label htmlFor={id + 'gender'}>Giới tính</label><select id={id + 'gender'} autoComplete="sex" value={draft.gender}
              onChange={event => setDraft(previous => ({ ...previous, gender: event.target.value as PersonalInput['gender'] }))}><option value="">Chưa cập nhật</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select>
              {errors.gender && <small className={styles.fieldError}>{errors.gender}</small>}</div>
            <div className={styles.field + ' ' + styles.wide}><label htmlFor={id + 'email'}>Email đăng nhập</label><input id={id + 'email'} type="email" readOnly value={profile.email} /><small>Email được đồng bộ từ tài khoản đăng nhập và chỉ hiển thị tại đây.</small></div>
            <div className={styles.field + ' ' + styles.wide}><label htmlFor={id + 'address'}>Địa chỉ liên hệ</label><textarea id={id + 'address'} rows={3} maxLength={500} autoComplete="street-address"
              value={draft.address} aria-invalid={!!errors.address} aria-describedby={id + 'address-help'} onChange={event => setDraft(previous => ({ ...previous, address: event.target.value }))} />
              <small id={id + 'address-help'} className={errors.address ? styles.fieldError : ''}>{errors.address || draft.address.length + '/500 ký tự'}</small></div>
            <div className={styles.saveBar}><span>{dirty ? 'Có thay đổi chưa lưu' : 'Thông tin đã được đồng bộ'}</span><div>
              <button type="button" className={styles.secondary} onClick={() => { setDraft(personalInput(profile)); setEditing(false); setErrors({}); }}>Bỏ thay đổi</button>
              <button type="submit" className={styles.primary} disabled={!dirty || conflict}>{busy === 'profile' ? <LoaderCircle size={16} className={styles.spin} /> : <Save size={16} />}{busy === 'profile' ? 'Đang lưu…' : 'Lưu hồ sơ'}</button></div></div>
          </fieldset></form>}
        <div className={styles.hint}><ShieldCheck size={18} /><p>Thông tin định danh, email và vai trò được bảo vệ. Chỉ người được cấp quyền mới truy cập được hồ sơ của bạn.</p></div>
      </section>
      {statistics.length > 0 && <section className={styles.summary} aria-label="Tổng quan lịch khám">
          <header><h2>Tổng quan lịch khám</h2>{summaryAction && <Link href={summaryAction.href} className={styles.summaryAction}>{summaryAction.label}<ChevronRight size={15} /></Link>}</header>
          <div className={styles.statistics}>{statistics.map(statistic => {
            const Icon = statisticIcons[statistic.kind];
            return <Link key={statistic.kind} href={statistic.href} className={styles.statistic}>
              <span className={styles.statisticIcon}><Icon size={18} aria-hidden="true" /></span>
              <span className={styles.statisticLabel}>{statistic.label}</span>
              <strong>{statistic.value.toLocaleString('vi-VN')}</strong>
              <ChevronRight size={16} className={styles.statisticArrow} aria-hidden="true" />
            </Link>;
          })}</div>
        </section>}
      </div>
    </div>
  </div>;
}
