'use client';

export type HCaptchaApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string | number;
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
