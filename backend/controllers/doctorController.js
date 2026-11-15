const APPOINTMENT_FIELDS = [
  'id', 'patient_id', 'doctor_id', 'slot_id', 'status', 'reason', 'doctor_note', 'cancel_reason',
  'checked_in_at', 'started_at', 'completed_at', 'created_at', 'updated_at',
  'patient:profiles!appointments_patient_id_fkey(id,full_name,phone,email,gender,date_of_birth,address,avatar_url)',
  'slot:time_slots!appointments_slot_fk(id,doctor_id,slot_date,start_time,end_time,is_booked)',
].join(',');
const ACTIONS = new Set(['confirm', 'check_in', 'start', 'complete', 'cancel', 'no_show', 'save_note', 'reschedule']);
function fail(res, status, message) { return res.status(status).json({ success: false, message }); }
function databaseError(res, error) {
  const status = ({ '40001': 409, '23505': 409, '23P01': 409, '23503': 409, '42501': 403, P0002: 404, PGRST116: 404, '22023': 400, '23514': 400, '22P02': 400 })[error?.code] || 503;
  const message = error?.code === '22023' ? error.message : ({
    409: 'Dữ liệu đã thay đổi hoặc khung giờ đã được sử dụng. Vui lòng tải lại.',
    403: 'Bạn không có quyền thực hiện thao tác này. Kiểm tra đăng nhập và MFA.',
    404: 'Không tìm thấy dữ liệu của bạn.', 400: 'Dữ liệu không hợp lệ.',
  })[status] || 'Dịch vụ dữ liệu tạm thời không khả dụng.';
  return fail(res, status, message);
}
function id(value) { return typeof value === 'string' && /^[1-9]\d{0,18}$/.test(value) && (value.length < 19 || value <= '9223372036854775807'); }
function date(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
function doctorId(req) { return req.auth?.doctorId; }
function page(req) {
  const offset = Number(req.query.offset || 0), limit = Number(req.query.limit || 50);
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error('pagination');
  return { offset, limit };
}
async function listAppointments(req, res, single = false) {
  if (!doctorId(req)) return fail(res, 403, 'Không xác định được bác sĩ.');
  if (single && !id(req.params.id)) return fail(res, 400, 'Mã lịch hẹn không hợp lệ.');
  const { status, date: day } = req.query;
  if (status && status !== 'all' && !['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(status)) return fail(res, 400, 'Trạng thái không hợp lệ.');
  if (day && !date(day)) return fail(res, 400, 'Ngày khám không hợp lệ.');
  try {
    let query = req.supabase.from('appointments').select(APPOINTMENT_FIELDS, { count: 'exact' }).eq('doctor_id', doctorId(req));
    if (single) {
      const result = await query.eq('id', req.params.id).single();
      if (result.error) return databaseError(res, result.error);
      return res.json({ success: true, data: result.data });
    }
    if (status && status !== 'all') query = query.eq('status', status);
    if (day) query = query.eq('slot.slot_date', day).not('slot', 'is', null);
    const { offset, limit } = page(req);
    const result = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (result.error) return databaseError(res, result.error);
    return res.json({ success: true, count: result.count, data: result.data || [] });
  } catch (error) { return error.message === 'pagination' ? fail(res, 400, 'Phân trang không hợp lệ.') : databaseError(res, error); }
}
exports.getDoctorAppointments = (req, res) => listAppointments(req, res);
exports.getDoctorAppointmentById = (req, res) => listAppointments(req, res, true);
async function manage(req, res, action, note, reason, slotId) {
  const body = req.body || {};
  if (!doctorId(req)) return fail(res, 403, 'Không xác định được bác sĩ.');
  if (!id(req.params.id) || !ACTIONS.has(action) || typeof body.expected_updated_at !== 'string' || !Number.isFinite(Date.parse(body.expected_updated_at)) ||
    (note !== undefined && (typeof note !== 'string' || note.length > 10000)) ||
    (reason !== undefined && (typeof reason !== 'string' || reason.length > 1000)) ||
    (slotId !== undefined && !id(slotId))) return fail(res, 400, 'Kiểm tra hành động, mã lịch hẹn và phiên bản cập nhật.');
  const allowed = ['doctor_id', 'action', 'status', 'doctor_note', 'note', 'cancel_reason', 'reason', 'slot_id', 'expected_updated_at'];
  if (Object.keys(body).some(key => !allowed.includes(key))) return fail(res, 400, 'Không được thay đổi thông tin định danh.');
  if (body.doctor_id !== undefined && body.doctor_id !== doctorId(req)) return fail(res, 403, 'Không được truy cập dữ liệu bác sĩ khác.');
  try {
    const result = await req.supabase.rpc('doctor_manage_appointment', {
      p_appointment_id: req.params.id, p_action: action, p_expected_updated_at: body.expected_updated_at,
      p_note: note ?? null, p_reason: reason ?? null, p_slot_id: slotId ?? null,
    });
    if (result.error) return databaseError(res, result.error);
    return res.json({ success: true, message: 'Đã cập nhật lịch hẹn.', data: result.data });
  } catch (error) { return databaseError(res, error); }
}
exports.manageAppointment = (req, res) => manage(req, res, req.body.action, req.body.note, req.body.reason, req.body.slot_id);
exports.updateAppointmentStatus = (req, res) => manage(req, res, ({ confirmed: 'confirm', completed: 'complete', cancelled: 'cancel', no_show: 'no_show' })[req.body.status], req.body.doctor_note, req.body.cancel_reason);
exports.updateDoctorNote = (req, res) => manage(req, res, 'save_note', req.body.doctor_note);
exports.getDoctorSlots = async (req, res) => {
  if (!doctorId(req)) return fail(res, 403, 'Không xác định được bác sĩ.');
  for (const key of ['date', 'from_date', 'to_date']) if (req.query[key] && !date(req.query[key])) return fail(res, 400, 'Ngày khám không hợp lệ.');
  try {
    let query = req.supabase.from('time_slots').select('*', { count: 'exact' }).eq('doctor_id', doctorId(req));
    if (req.query.date) query = query.eq('slot_date', req.query.date);
    if (req.query.from_date) query = query.gte('slot_date', req.query.from_date);
    if (req.query.to_date) query = query.lte('slot_date', req.query.to_date);
    const { offset, limit } = page(req);
    const result = await query.order('slot_date').order('start_time').range(offset, offset + limit - 1);
    if (result.error) return databaseError(res, result.error);
    return res.json({ success: true, count: result.count, data: result.data || [] });
  } catch (error) { return databaseError(res, error); }
};
exports.createDoctorSlot = async (req, res) => {
  const { slot_date, start_time, end_time, doctor_id } = req.body;
  if (!doctorId(req) || (doctor_id !== undefined && doctor_id !== doctorId(req))) return fail(res, 403, 'Không được tạo khung giờ của bác sĩ khác.');
  if (Object.keys(req.body).some(key => !['doctor_id', 'slot_date', 'start_time', 'end_time'].includes(key)) ||
    !date(slot_date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start_time || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end_time || '') ||
    end_time <= start_time || Date.parse(slot_date + 'T' + start_time + ':00+07:00') <= Date.now()) return fail(res, 400, 'Khung giờ phải hợp lệ và nằm trong tương lai.');
  try {
    const result = await req.supabase.from('time_slots').insert({ doctor_id: doctorId(req), slot_date, start_time, end_time, is_booked: false }).select().single();
    if (result.error) return databaseError(res, result.error);
    return res.status(201).json({ success: true, data: result.data });
  } catch (error) { return databaseError(res, error); }
};
exports.deleteDoctorSlot = async (req, res) => {
  if (!doctorId(req) || !id(req.params.id)) return fail(res, 400, 'Khung giờ không hợp lệ.');
  try {
    const result = await req.supabase.from('time_slots').delete().eq('id', req.params.id).eq('doctor_id', doctorId(req)).select('id');
    if (result.error) return databaseError(res, result.error);
    if (!result.data?.length) return fail(res, 404, 'Không tìm thấy khung giờ của bạn.');
    return res.json({ success: true, message: 'Đã xóa khung giờ trống.' });
  } catch (error) { return databaseError(res, error); }
};
exports.getDoctorPatients = async (req, res) => {
  if (!doctorId(req)) return fail(res, 403, 'Không xác định được bác sĩ.');
  try {
    const { offset, limit } = page(req);
    const result = await req.supabase.from('profiles').select('id,full_name,phone,email,gender,date_of_birth,address,avatar_url,appointments!inner(doctor_id,created_at,status,reason)')
      .eq('appointments.doctor_id', doctorId(req)).order('full_name').range(offset, offset + limit - 1);
    if (result.error) return databaseError(res, result.error);
    return res.json({ success: true, count: result.data?.length || 0, data: result.data || [] });
  } catch (error) { return databaseError(res, error); }
};
exports.getDoctorProfile = async (req, res) => {
  if (!doctorId(req)) return fail(res, 403, 'Không xác định được bác sĩ.');
  try {
    const result = await req.supabase.from('doctors').select('*,profiles(*),specialties(*)').eq('id', doctorId(req)).eq('profile_id', req.auth.userId).single();
    if (result.error) return databaseError(res, result.error);
    return res.json({ success: true, data: result.data });
  } catch (error) { return databaseError(res, error); }
};
exports.updateDoctorProfile = async (req, res) => {
  if (!doctorId(req) || req.params.id !== doctorId(req)) return fail(res, 403, 'Không được sửa hồ sơ bác sĩ khác.');
  const allowed = ['doctor_id', 'bio', 'room', 'consultation_fee', 'full_name', 'phone'];
  if (Object.keys(req.body).some(key => !allowed.includes(key))) return fail(res, 400, 'Không được thay đổi thông tin định danh hoặc phân quyền.');
  const profile = Object.fromEntries(['full_name', 'phone'].filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]));
  const doctor = Object.fromEntries(['bio', 'room', 'consultation_fee'].filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]));
  if (!Object.keys(profile).length && !Object.keys(doctor).length) return fail(res, 400, 'Chưa có thông tin thay đổi.');
  if (profile.full_name !== undefined && (typeof profile.full_name !== 'string' || profile.full_name.trim().length < 2 || profile.full_name.length > 100) ||
    profile.phone !== undefined && (typeof profile.phone !== 'string' || profile.phone && !/^0\d{9}$/.test(profile.phone)) ||
    doctor.bio !== undefined && (typeof doctor.bio !== 'string' || doctor.bio.length > 4000) ||
    doctor.room !== undefined && (typeof doctor.room !== 'string' || doctor.room.length > 100) ||
    doctor.consultation_fee !== undefined && doctor.consultation_fee !== null && (!Number.isSafeInteger(doctor.consultation_fee) || doctor.consultation_fee < 0 || doctor.consultation_fee > 999999999999)) return fail(res, 400, 'Thông tin hồ sơ không hợp lệ.');
  try {
    let result;
    if (!Object.keys(doctor).length) {
      result = await req.supabase.from('profiles').update(profile).eq('id', req.auth.userId).select('*').single();
    } else if (!Object.keys(profile).length) {
      result = await req.supabase.from('doctors').update(doctor).eq('id', doctorId(req)).eq('profile_id', req.auth.userId).select('*').single();
    } else {
      result = await req.supabase.rpc('doctor_update_profile', { p_profile: profile, p_doctor: doctor });
      if (result.error?.code === 'PGRST202' || result.error?.code === '42883') return fail(res, 409, 'Chưa thể lưu đồng thời hai nhóm thông tin. Lưu thông tin cá nhân và chuyên môn lần lượt.');
    }
    if (result.error) return databaseError(res, result.error);
    return res.json({ success: true, data: result.data, message: 'Đã lưu hồ sơ bác sĩ.' });
  } catch (error) { return databaseError(res, error); }
};
exports.getDoctorTodayStats = async (req, res) => {
  if (!doctorId(req)) return fail(res, 403, 'Không xác định được bác sĩ.');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  try {
    const rows = [];
    for (let offset = 0; offset < 20000; offset += 500) {
      const result = await req.supabase.from('appointments').select(APPOINTMENT_FIELDS).eq('doctor_id', doctorId(req))
        .eq('slot.slot_date', today).not('slot', 'is', null).order('id').range(offset, offset + 499);
      if (result.error) return databaseError(res, result.error);
      rows.push(...result.data || []);
      if ((result.data || []).length < 500) break;
    }
    rows.sort((a, b) => (a.slot?.start_time || '').localeCompare(b.slot?.start_time || ''));
    return res.json({ success: true, data: { today, totalToday: rows.length,
      pendingCount: rows.filter(a => a.status === 'pending').length, confirmedCount: rows.filter(a => a.status === 'confirmed').length,
      checkedInCount: rows.filter(a => a.checked_in_at).length, completedCount: rows.filter(a => a.status === 'completed').length,
      cancelledCount: rows.filter(a => a.status === 'cancelled').length, noShowCount: rows.filter(a => a.status === 'no_show').length,
      currentExamining: rows.find(a => a.status === 'confirmed' && a.started_at) || null, todayAppointments: rows,
    } });
  } catch (error) { return databaseError(res, error); }
};
