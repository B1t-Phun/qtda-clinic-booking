'use client';

export type HCaptchaApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string | number;
  reset: (id: string | number) => void;
  remove: (id: string | number) => void;
};
declare global {
  interface Window {
    hcaptcha?: HCaptchaApi;
    cliniccareHCaptchaReady?: () => void;
  }
}
let loading: Promise<HCaptchaApi> | undefined;
let loaded = false;
export function loadHCaptcha(): Promise<HCaptchaApi> {
  if (loaded && window.hcaptcha) return Promise.resolve(window.hcaptcha);
  if (loading) return loading;
  loading = new Promise<HCaptchaApi>((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      delete window.cliniccareHCaptchaReady;
      script.onerror = null;
      if (error || !window.hcaptcha) {
        script.remove();
        reject(error || new Error('Không tải được bước xác minh. Vui lòng thử lại.'));
      } else { loaded = true; resolve(window.hcaptcha); }
    };
    const timeout = window.setTimeout(() => finish(new Error('Bước xác minh tải quá lâu. Kiểm tra kết nối rồi thử lại.')), 15000);
    // hCaptcha calls this after its API is ready, which can be later than script.onload.
    window.cliniccareHCaptchaReady = () => finish();
    script.src = 'https://js.hcaptcha.com/1/api.js?onload=cliniccareHCaptchaReady&render=explicit&recaptchacompat=off&hl=vi';
    script.async = true;
    script.defer = true;
    script.onerror = () => finish(new Error('Không tải được bước xác minh. Kiểm tra kết nối rồi thử lại.'));
    document.head.appendChild(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}

export function hcaptchaFailure(reason: unknown) {
  const code = typeof reason === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(reason)
    ? reason : 'unknown-error';
  const messages: Record<string, string> = {
    'network-error': 'Không kết nối được với hCaptcha. Kiểm tra mạng hoặc tiện ích chặn nội dung rồi thử lại.',
    'challenge-error': 'Không khởi tạo được thử thách xác minh. Vui lòng thử lại.',
    'internal-error': 'Dịch vụ hCaptcha gặp lỗi. Vui lòng thử lại.',
    'rate-limited': 'Bạn đã thử xác minh quá nhiều lần. Vui lòng chờ một lúc rồi thử lại.',
    'invalid-data': 'hCaptcha không chấp nhận cấu hình hoặc địa chỉ truy cập hiện tại.',
  };
  return { code, message: messages[code] || 'Không thể xác minh. Vui lòng thử lại.' };
}
