const { supabase } = require('../config/supabase');

// ==========================================
// 1. DOCTOR APPOINTMENTS CRUD
// ==========================================

// Lấy danh sách lịch hẹn của bác sĩ
exports.getDoctorAppointments = async (req, res) => {
  try {
    const { doctor_id, status, date } = req.query;

    let query = supabase
      .from('appointments')
      .select(`
        id,
        status,
        reason,
        doctor_note,
        cancel_reason,
        created_at,
        updated_at,
        patient:profiles!appointments_patient_id_fkey (
          id,
          full_name,
          phone,
          email,
          gender,
          date_of_birth,
          avatar_url,
          address
        ),
        slot:time_slots (
          id,
          slot_date,
          start_time,
          end_time,
          is_booked
        )
      `)
      .order('created_at', { ascending: false });

    // Lọc theo bác sĩ (nếu có truyền doctor_id)
    if (doctor_id) {
      query = query.eq('doctor_id', doctor_id);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    let filtered = data;
    if (date) {
      filtered = data.filter((item) => item.slot?.slot_date === date);
    }

    return res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy chi tiết 1 lịch hẹn
exports.getDoctorAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey (*),
        slot:time_slots (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Bác sĩ cập nhật trạng thái lịch hẹn (Xác nhận, Đang khám, Hoàn tất, Hủy, Vắng mặt)
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancel_reason, doctor_note } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Thiếu status' });
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Trạng thái không hợp lệ. Phải là một trong: ${validStatuses.join(', ')}`,
      });
    }

    const updates = { status, updated_at: new Date().toISOString() };
    if (cancel_reason !== undefined) updates.cancel_reason = cancel_reason;
    if (doctor_note !== undefined) updates.doctor_note = doctor_note;

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái thành: ${status}`,
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Bác sĩ cập nhật bệnh án / chẩn đoán / ghi chú khám
exports.updateDoctorNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctor_note } = req.body;

    if (doctor_note === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu doctor_note' });
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ doctor_note, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Lưu ghi chú khám bệnh thành công',
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 2. DOCTOR SCHEDULE & TIME SLOTS CRUD
// ==========================================

// Xem danh sách khung giờ khám của bác sĩ
exports.getDoctorSlots = async (req, res) => {
  try {
    const { doctor_id, date, from_date, to_date } = req.query;

    let query = supabase
      .from('time_slots')
      .select('*')
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (doctor_id) query = query.eq('doctor_id', doctor_id);
    if (date) query = query.eq('slot_date', date);
    if (from_date) query = query.gte('slot_date', from_date);
    if (to_date) query = query.lte('slot_date', to_date);

    const { data, error } = await query;
    if (error) throw error;

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Bác sĩ mở thêm khung giờ khám mới
exports.createDoctorSlot = async (req, res) => {
  try {
    const { doctor_id, slot_date, start_time, end_time } = req.body;

    if (!doctor_id || !slot_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu doctor_id, slot_date, start_time hoặc end_time',
      });
    }

    const { data, error } = await supabase
      .from('time_slots')
      .insert([{ doctor_id, slot_date, start_time, end_time, is_booked: false }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: 'Tạo khung giờ khám thành công',
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Bác sĩ xóa khung giờ (nếu chưa có người đặt)
exports.deleteDoctorSlot = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra slot đã có người đặt chưa
    const { data: slot, error: fetchErr } = await supabase
      .from('time_slots')
      .select('is_booked')
      .eq('id', id)
      .single();

    if (fetchErr || !slot) {
      return res.status(404).json({ success: false, message: 'Khung giờ không tồn tại' });
    }

    if (slot.is_booked) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa khung giờ đã có bệnh nhân đặt lịch',
      });
    }

    const { error } = await supabase.from('time_slots').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Đã xóa khung giờ thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 3. DOCTOR PATIENTS CRUD
// ==========================================

// Danh sách bệnh nhân đã từng khám hoặc có hẹn với bác sĩ
exports.getDoctorPatients = async (req, res) => {
  try {
    const { doctor_id } = req.query;

    let query = supabase
      .from('appointments')
      .select(`
        patient:profiles!appointments_patient_id_fkey (
          id,
          full_name,
          phone,
          email,
          gender,
          date_of_birth,
          address
        ),
        created_at,
        status,
        reason
      `);

    if (doctor_id) {
      query = query.eq('doctor_id', doctor_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Lọc danh sách bệnh nhân duy nhất (distinct)
    const patientMap = new Map();
    (data || []).forEach((row) => {
      if (row.patient && !patientMap.has(row.patient.id)) {
        patientMap.set(row.patient.id, {
          ...row.patient,
          lastAppointmentDate: row.created_at,
          lastReason: row.reason,
        });
      }
    });

    const uniquePatients = Array.from(patientMap.values());

    return res.status(200).json({
      success: true,
      count: uniquePatients.length,
      data: uniquePatients,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 4. DOCTOR PROFILE & STATS
// ==========================================

// Xem hồ sơ bác sĩ
exports.getDoctorProfile = async (req, res) => {
  try {
    const { doctor_id } = req.query;
    let query = supabase
      .from('doctors')
      .select(`
        *,
        profiles (*),
        specialties (*)
      `);

    if (doctor_id) {
      query = query.eq('id', doctor_id);
    }

    const { data, error } = await query.limit(1).single();
    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Bác sĩ cập nhật hồ sơ cá nhân
exports.updateDoctorProfile = async (req, res) => {
  try {
    const { id } = req.params; // doctor_id
    const { bio, room, consultation_fee, full_name, phone } = req.body;

    const docUpdates = {};
    if (bio !== undefined) docUpdates.bio = bio;
    if (room !== undefined) docUpdates.room = room;
    if (consultation_fee !== undefined) docUpdates.consultation_fee = consultation_fee;

    const { data: updatedDoc, error: docErr } = await supabase
      .from('doctors')
      .update(docUpdates)
      .eq('id', id)
      .select()
      .single();

    if (docErr) throw docErr;

    // Cập nhật profile nếu có
    if ((full_name || phone) && updatedDoc?.profile_id) {
      const profUpdates = {};
      if (full_name) profUpdates.full_name = full_name;
      if (phone) profUpdates.phone = phone;

      await supabase.from('profiles').update(profUpdates).eq('id', updatedDoc.profile_id);
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin bác sĩ thành công',
      data: updatedDoc,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy chỉ số tổng quan trong ngày cho Bác sĩ (Figma Tổng quan · Ngày làm việc)
exports.getDoctorTodayStats = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { doctor_id } = req.query;

    let apptQuery = supabase
      .from('appointments')
      .select(`
        id,
        status,
        reason,
        patient_id,
        slot_id,
        time_slots (
          slot_date,
          start_time,
          end_time
        ),
        patient:profiles!appointments_patient_id_fkey (
          id,
          full_name,
          gender,
          date_of_birth
        )
      `);

    if (doctor_id) {
      apptQuery = apptQuery.eq('doctor_id', doctor_id);
    }

    const { data: allAppts, error } = await apptQuery;
    if (error) throw error;

    const todayList = (allAppts || []).filter(
      (a) => a.time_slots?.slot_date === today
    );

    const pending = todayList.filter((a) => a.status === 'pending');
    const confirmed = todayList.filter((a) => a.status === 'confirmed');
    const completed = todayList.filter((a) => a.status === 'completed');
    const cancelled = todayList.filter((a) => a.status === 'cancelled' || a.status === 'no_show');

    // Ca đang khám (Figma: Ca đang khám)
    const currentExamining = confirmed[0] || pending[0] || null;

    return res.status(200).json({
      success: true,
      data: {
        today,
        totalToday: todayList.length,
        pendingCount: pending.length,
        confirmedCount: confirmed.length,
        completedCount: completed.length,
        cancelledCount: cancelled.length,
        currentExamining,
        todayAppointments: todayList,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
