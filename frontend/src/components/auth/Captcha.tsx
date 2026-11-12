'use client';
import { useEffect, useRef, useState } from 'react';
import { loadHCaptcha, type HCaptchaApi } from '@/lib/auth/hcaptcha';

export function Captcha({ onToken, revision }: { onToken: (token: string) => void; revision: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const sitekey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
  useEffect(() => {
    if (!sitekey) return;
    let active = true;
    let api: HCaptchaApi | undefined;
    let widget: string | number | undefined;
    onToken('');
    loadHCaptcha().then(loaded => {
      if (!active || !container.current) return;
      api = loaded;
      widget = api.render(container.current, {
        sitekey, hl: 'vi',
        callback: (token: string) => { if (active) { setError(''); onToken(token); } },
        'expired-callback': () => { if (active) { onToken(''); setError('Phiên xác minh đã hết hạn. Vui lòng xác minh lại.'); } },
        'chalexpired-callback': () => { if (active) { onToken(''); setError('Vui lòng thử lại bước xác minh.'); } },
        'error-callback': () => { if (active) { onToken(''); setError('Không thể xác minh. Vui lòng thử lại.'); } },
      });
    }).catch(caught => {
      if (active) {
        onToken('');
        setError(caught instanceof Error ? caught.message : 'Không thể tải bước xác minh.');
      }
    });
    return () => {
      active = false;
      if (widget !== undefined) api?.remove(widget);
    };
  }, [sitekey, onToken, revision, attempt]);
  if (!sitekey) return null;
  return <div className="space-y-2">
    <div ref={container} className="overflow-x-auto" />
    {error && <div role="alert" className="text-sm text-red-700">
      <p>{error}</p>
      <button type="button" onClick={() => { onToken(''); setError(''); setAttempt(value => value + 1); }} className="mt-1 font-semibold underline">Thử lại xác minh</button>
    </div>}
  </div>;
}
