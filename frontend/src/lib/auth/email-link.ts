export const EMAIL_LINK_ERRORS: Record<string, string> = {
  email_expired: 'Liên kết đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu liên kết mới.',
  email_browser: 'Liên kết này cần mở trong trình duyệt đã yêu cầu email. Bạn có thể quay lại trình duyệt đó hoặc yêu cầu liên kết mới.',
  email_invalid: 'Liên kết đăng nhập không hợp lệ. Vui lòng yêu cầu liên kết mới.',
  email_unavailable: 'Chưa thể xác thực liên kết. Vui lòng thử lại sau.',
  email_account: 'Đã xác thực email nhưng tài khoản chưa thể truy cập. Vui lòng đăng nhập bằng mật khẩu hoặc liên hệ quản trị viên.',
  callback: 'Không thể hoàn tất đăng nhập. Vui lòng thử lại hoặc dùng email và mật khẩu.',
};

export function emailLinkError(error: unknown): string {
  const failure = error as { code?: string; name?: string; status?: number } | null;
  if (failure?.code === 'otp_expired' || failure?.code === 'flow_state_expired' || failure?.code === 'flow_state_not_found') return 'email_expired';
  if (failure?.code === 'pkce_code_verifier_not_found' || failure?.code === 'bad_code_verifier' ||
      failure?.name === 'AuthPKCECodeVerifierMissingError') return 'email_browser';
  if ((failure?.status || 0) >= 500 || failure?.name === 'AuthRetryableFetchError') return 'email_unavailable';
  return 'email_invalid';
}
