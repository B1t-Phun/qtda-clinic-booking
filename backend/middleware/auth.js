const { createClient } = require('@supabase/supabase-js');

function createAuthMiddleware({ verifier, userClient }) {
  const deny = (res, status, message) => res.status(status).json({ success: false, message });

  async function requireUser(req, res, next) {
    try {
      const authorization = req.get('authorization') || '';
      const match = /^Bearer ([A-Za-z0-9_.-]{20,8192})$/.exec(authorization);
      if (!match) return deny(res, 401, 'Vui lòng đăng nhập.');
      const token = match[1];
      const { data: { user }, error } = await verifier.auth.getUser(token);
      if (error || !user || !user.email_confirmed_at) return deny(res, 401, 'Phiên đăng nhập không hợp lệ.');
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      if (user.factors?.some((factor) => factor.status === 'verified') && claims.aal !== 'aal2') {
        return deny(res, 403, 'Vui lòng hoàn tất xác thực MFA.');
      }
      req.supabase = userClient(token);
      const { data: profile, error: profileError } = await req.supabase.from('profiles')
        .select('id,role').eq('id', user.id).single();
      if (profileError || !profile || !['admin', 'doctor', 'patient'].includes(profile.role)) {
        return deny(res, 403, 'Bạn không có quyền truy cập.');
      }
      req.auth = { userId: user.id, role: profile.role };
      if (profile.role === 'doctor') {
        const { data: doctor, error: doctorError } = await req.supabase.from('doctors')
          .select('id').eq('profile_id', user.id).eq('is_active', true).maybeSingle();
        if (doctorError || !doctor) return deny(res, 403, 'Bạn không có quyền truy cập.');
        req.auth.doctorId = doctor.id;
      }
      res.set('Cache-Control', 'private, no-store');
      return next();
    } catch { return deny(res, 503, 'Dịch vụ xác thực tạm thời không khả dụng.'); }
  }

  function requireRole(role) {
    return (req, res, next) => {
      if (!req.auth) return deny(res, 401, 'Vui lòng đăng nhập.');
      if (req.auth.role !== role) return deny(res, 403, 'Bạn không có quyền truy cập.');
      return next();
    };
  }

  function bindIdentity(field, key) {
    return (req, res, next) => {
      const expected = req.auth[key];
      const supplied = [req.query?.[field], req.body?.[field]].filter((value) => value !== undefined);
      if (!expected || supplied.some((value) => typeof value !== 'string' || value !== expected)) {
        return deny(res, 403, 'Bạn không có quyền truy cập dữ liệu này.');
      }
      req.query[field] = expected; // Express 4 query object.
      req.body = { ...(req.body || {}), [field]: expected };
      return next();
    };
  }
  return { requireUser, requireRole, bindPatient: bindIdentity('patient_id', 'userId'), bindDoctor: bindIdentity('doctor_id', 'doctorId') };
}

function configuredAuth() {
  const { supabase } = require('../config/supabase');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required');
  return createAuthMiddleware({
    verifier: supabase,
    userClient: (token) => createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: 'Bearer ' + token } },
    }),
  });
}

module.exports = { createAuthMiddleware, configuredAuth };
