const { supabase } = require('../config/supabase');

// ==========================================
// 1. SPECIALTIES
// ==========================================

// Lấy danh sách chuyên khoa
exports.getSpecialties = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('specialties')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      count: data ? data.length : 0,
      data: data || [],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 2. DOCTORS & SLOTS
// ==========================================

// Lấy danh sách bác sĩ đang hoạt động (kèm lọc theo chuyên khoa và tìm kiếm tên)
exports.getDoctors = async (req, res) => {
  try {
    const { specialty_id, search } = req.query;

    let query = supabase
      .from('doctors')
      .select(`
        id,
        bio,
        room,
        years_experience,
        consultation_fee,
        is_active,
        created_at,
        profiles (
          id,
          full_name,
          email,
          phone,
          avatar_url,
          gender
        ),
        specialties (
          id,
          name,
          description
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (specialty_id && specialty_id !== 'all') {
      query = query.eq('specialty_id', specialty_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    let filtered = data || [];

    // Lọc theo họ tên bác sĩ nếu có search param (không phân biệt chữ hoa thường)
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter((doc) => {
        const name = doc.profiles?.full_name || '';
        return name.toLowerCase().includes(term);
      });
    }

    // Định dạng đồng nhất cho client (cung cấp cả alias profile và specialty)
    const formatted = filtered.map((doc) => ({
      ...doc,
      profile: doc.profiles,
      specialty: doc.specialties,
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy chi tiết thông tin 1 bác sĩ
exports.getDoctorDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('doctors')
      .select(`
        *,
        profiles (*),
        specialties (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin bác sĩ' });
      }
      throw error;
    }

    if (!data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin bác sĩ' });
    }

    const formatted = {
      ...data,
      profile: data.profiles,
      specialty: data.specialties,
    };

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Helper: lấy ngày và giờ hiện tại theo giờ địa phương
function getLocalDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return {
    today: `${year}-${month}-${day}`,
    currentTime: `${hours}:${minutes}:${seconds}`,
  };
}

// Lấy danh sách khung giờ còn trống của bác sĩ
exports.getDoctorAvailableSlots = async (req, res) => {
  try {
    const doctor_id = req.params.id || req.query.doctor_id;
    const { date, from_date, to_date } = req.query;

    if (!doctor_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã bác sĩ (doctor_id)',
      });
    }

    const { today, currentTime } = getLocalDateTime();

    let query = supabase
      .from('time_slots')
      .select('*')
      .eq('doctor_id', doctor_id)
      .eq('is_booked', false)
      .gte('slot_date', today)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (date) {
      query = query.eq('slot_date', date);
    }
    if (from_date) {
      const effectiveFrom = from_date > today ? from_date : today;
      query = query.gte('slot_date', effectiveFrom);
    }
    if (to_date) {
      query = query.lte('slot_date', to_date);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Loại bỏ các khung giờ trong ngày hôm nay đã qua giờ bắt đầu
    const available = (data || []).filter(
      (slot) => slot.slot_date > today || slot.start_time > currentTime
    );

    return res.status(200).json({
      success: true,
      count: available.length,
      data: available,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 3. APPOINTMENTS (BOOKING & CANCELLATION)
// ==========================================

// Đặt lịch khám bệnh (chống trùng lặp ở mức Application & DB Unique Constraint)
exports.createAppointment = async (req, res) => {
  try {
    const { patient_id, doctor_id, slot_id, reason } = req.body;

    if (!patient_id || !doctor_id || !slot_id) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: patient_id, doctor_id, slot_id',
      });
    }

    // 1. Kiểm tra khung giờ tồn tại
    const { data: slot, error: slotErr } = await req.supabase
      .from('time_slots')
      .select('*')
      .eq('id', slot_id)
      .single();

    if (slotErr || !slot) {
      return res.status(404).json({
        success: false,
        message: 'Khung giờ khám không tồn tại',
      });
    }

    // Kiểm tra bác sĩ khớp với khung giờ
    if (slot.doctor_id !== doctor_id) {
      return res.status(400).json({
        success: false,
        message: 'Khung giờ không thuộc bác sĩ đã chọn',
      });
    }

    // Kiểm tra khung giờ chưa qua thời điểm hiện tại
    const { today, currentTime } = getLocalDateTime();
    if (slot.slot_date < today || (slot.slot_date === today && slot.start_time <= currentTime)) {
      return res.status(400).json({
        success: false,
        message: 'Không thể đặt khung giờ đã qua',
      });
    }

    // 2. Nếu khung giờ đã có người đặt, trả về HTTP 409
    if (slot.is_booked) {
      return res.status(409).json({
        success: false,
        message: 'Khung giờ này đã được đặt bởi người khác',
      });
    }

    // 2b. Chống bệnh nhân tự đặt trùng khung giờ (cùng ngày, giao thời gian)
    const { data: existingAppts, error: overlapErr } = await req.supabase
      .from('appointments')
      .select('id, slot:time_slots (slot_date, start_time, end_time)')
      .eq('patient_id', patient_id)
      .in('status', ['pending', 'confirmed']);

    if (overlapErr) throw overlapErr;

    const hasOverlap = (existingAppts || []).some((appt) => {
      const s = Array.isArray(appt.slot) ? appt.slot[0] : appt.slot;
      if (!s || s.slot_date !== slot.slot_date) return false;
      return slot.start_time < s.end_time && slot.end_time > s.start_time;
    });

    if (hasOverlap) {
      return res.status(409).json({
        success: false,
        message: 'Bạn đã có một lịch hẹn khác trùng khung giờ này',
      });
    }

    // 3. Chèn bản ghi lịch hẹn mới với trạng thái 'pending'
    // DB Trigger `sync_slot_booked` sẽ tự động cập nhật time_slots.is_booked = true
    const normalizedReason =
      typeof reason === 'string' && reason.trim() ? reason.trim() : 'Khám bệnh';

    const { data: appointment, error: insertErr } = await req.supabase
      .from('appointments')
      .insert([
        {
          patient_id,
          doctor_id,
          slot_id,
          reason: normalizedReason,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (insertErr) {
      // Bắt lỗi ràng buộc trùng lặp duy nhất uq_appt_active_slot (code 23505)
      if (insertErr.code === '23505' || insertErr.message?.includes('uq_appt_active_slot')) {
        return res.status(409).json({
          success: false,
          message: 'Khung giờ này đã được đặt bởi người khác',
        });
      }
      throw insertErr;
    }

    return res.status(201).json({
      success: true,
      message: 'Đặt lịch thành công',
      data: appointment,
    });
  } catch (err) {
    if (err.code === '23505' || err.message?.includes('uq_appt_active_slot')) {
      return res.status(409).json({
        success: false,
        message: 'Khung giờ này đã được đặt bởi người khác',
      });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy lịch sử và danh sách cuộc hẹn của bệnh nhân
exports.getMyAppointments = async (req, res) => {
  try {
    const { patient_id, status } = req.query;

    if (!patient_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu patient_id (mã bệnh nhân)',
      });
    }

    let query = req.supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        doctor_id,
        slot_id,
        status,
        reason,
        doctor_note,
        cancel_reason,
        created_at,
        updated_at,
        doctor:doctors (
          id,
          bio,
          room,
          consultation_fee,
          profile:profiles (
            id,
            full_name,
            phone,
            email,
            avatar_url
          ),
          specialty:specialties (
            id,
            name,
            description
          )
        ),
        slot:time_slots (
          id,
          slot_date,
          start_time,
          end_time,
          is_booked
        )
      `)
      .eq('patient_id', patient_id)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map((appt) => ({
      ...appt,
      time_slot: appt.slot,
      time_slots: appt.slot,
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Hủy lịch hẹn
exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { patient_id, cancel_reason } = req.body;

    if (!patient_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu patient_id để xác thực quyền hủy lịch',
      });
    }

    // 1. Kiểm tra lịch hẹn tồn tại
    const { data: appt, error: fetchErr } = await req.supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !appt) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hẹn',
      });
    }

    // 2. Xác minh lịch hẹn thuộc về bệnh nhân này
    if (appt.patient_id !== patient_id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy lịch hẹn của bệnh nhân khác',
      });
    }

    // 3. Chỉ được hủy khi trạng thái là pending hoặc confirmed
    if (!['pending', 'confirmed'].includes(appt.status)) {
      return res.status(400).json({
        success: false,
        message: `Chỉ có thể hủy lịch ở trạng thái 'pending' hoặc 'confirmed'. Trạng thái hiện tại: ${appt.status}`,
      });
    }

    // 4. Cập nhật trạng thái thành 'cancelled' (trigger sync_slot_booked sẽ tự động giải phóng time_slot)
    const { data: updatedAppt, error: updateErr } = await req.supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancel_reason: cancel_reason || 'Bệnh nhân chủ động hủy lịch',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return res.status(200).json({
      success: true,
      message: 'Hủy lịch thành công. Khung giờ đã được trả lại.',
      data: updatedAppt,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
