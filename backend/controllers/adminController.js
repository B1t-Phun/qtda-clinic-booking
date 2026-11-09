const { supabase } = require('../config/supabase');

// ==========================================
// 1. DOCTORS CRUD
// ==========================================

// Lấy danh sách bác sĩ (kèm profile và chuyên khoa)
exports.getDoctors = async (req, res) => {
  try {
    const { specialty_id, is_active } = req.query;
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
      .order('created_at', { ascending: false });

    if (specialty_id) {
      query = query.eq('specialty_id', specialty_id);
    }
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy chi tiết bác sĩ theo ID
exports.getDoctorById = async (req, res) => {
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

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bác sĩ' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Tạo bác sĩ mới (Tạo Profile + Doctor record)
exports.createDoctor = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      gender,
      specialty_id,
      bio,
      room,
      years_experience,
      consultation_fee,
      is_active,
    } = req.body;

    if (!full_name || !specialty_id) {
      return res.status(400).json({
        success: false,
        message: 'Họ tên và mã chuyên khoa là bắt buộc',
      });
    }

    // 1. Tạo auth user hoặc profile mới
    // Nếu chưa có auth user, ta sinh UUID cho profile
    const profileId = req.body.profile_id || crypto.randomUUID();

    const { error: profError } = await supabase.from('profiles').insert([
      {
        id: profileId,
        full_name,
        email: email || null,
        phone: phone || null,
        gender: gender || 'other',
        role: 'doctor',
      },
    ]);

    if (profError) throw profError;

    // 2. Tạo record bác sĩ
    const { data: doctor, error: docError } = await supabase
      .from('doctors')
      .insert([
        {
          profile_id: profileId,
          specialty_id,
          bio: bio || '',
          room: room || 'P.101',
          years_experience: years_experience || 0,
          consultation_fee: consultation_fee || 150000,
          is_active: is_active !== undefined ? is_active : true,
        },
      ])
      .select(`*, profiles (*), specialties (*)`)
      .single();

    if (docError) throw docError;

    return res.status(201).json({
      success: true,
      message: 'Tạo bác sĩ thành công',
      data: doctor,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Cập nhật thông tin bác sĩ
exports.updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      phone,
      bio,
      room,
      years_experience,
      consultation_fee,
      specialty_id,
      is_active,
    } = req.body;

    // Cập nhật bảng doctors
    const updateDoctorData = {};
    if (bio !== undefined) updateDoctorData.bio = bio;
    if (room !== undefined) updateDoctorData.room = room;
    if (years_experience !== undefined) updateDoctorData.years_experience = years_experience;
    if (consultation_fee !== undefined) updateDoctorData.consultation_fee = consultation_fee;
    if (specialty_id !== undefined) updateDoctorData.specialty_id = specialty_id;
    if (is_active !== undefined) updateDoctorData.is_active = is_active;

    const { data: updatedDoc, error: docErr } = await supabase
      .from('doctors')
      .update(updateDoctorData)
      .eq('id', id)
      .select()
      .single();

    if (docErr) throw docErr;

    // Cập nhật profile nếu có gửi full_name hoặc phone
    if ((full_name || phone) && updatedDoc?.profile_id) {
      const updateProf = {};
      if (full_name) updateProf.full_name = full_name;
      if (phone) updateProf.phone = phone;

      await supabase.from('profiles').update(updateProf).eq('id', updatedDoc.profile_id);
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật bác sĩ thành công',
      data: updatedDoc,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Xóa hoặc chuyển trạng thái ngừng hoạt động
exports.deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      const { error } = await supabase.from('doctors').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Đã xóa bác sĩ vĩnh viễn' });
    } else {
      // Soft-delete / deactivate
      const { data, error } = await supabase
        .from('doctors')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Đã ngừng kích hoạt bác sĩ', data });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 2. SPECIALTIES CRUD
// ==========================================

exports.getSpecialties = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('specialties')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createSpecialty = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Tên chuyên khoa là bắt buộc' });
    }

    const { data, error } = await supabase
      .from('specialties')
      .insert([{ name, description }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, message: 'Tạo chuyên khoa thành công', data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSpecialty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const { data, error } = await supabase
      .from('specialties')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Cập nhật chuyên khoa thành công', data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteSpecialty = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('specialties').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Đã xóa chuyên khoa' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 3. APPOINTMENTS CRUD
// ==========================================

exports.getAppointments = async (req, res) => {
  try {
    const { status, doctor_id, date } = req.query;
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
          avatar_url,
          gender,
          date_of_birth
        ),
        doctor:doctors (
          id,
          room,
          consultation_fee,
          profile:profiles (
            id,
            full_name,
            phone
          ),
          specialty:specialties (
            id,
            name
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
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (doctor_id) {
      query = query.eq('doctor_id', doctor_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    let result = data;
    if (date) {
      result = data.filter((item) => item.slot?.slot_date === date);
    }

    return res.status(200).json({ success: true, count: result.length, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const { patient_id, doctor_id, slot_id, reason, status } = req.body;

    if (!patient_id || !doctor_id || !slot_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu patient_id, doctor_id hoặc slot_id',
      });
    }

    // Kiểm tra slot đã được đặt chưa
    const { data: slot, error: slotErr } = await supabase
      .from('time_slots')
      .select('*')
      .eq('id', slot_id)
      .single();

    if (slotErr || !slot) {
      return res.status(404).json({ success: false, message: 'Khung giờ không tồn tại' });
    }
    if (slot.is_booked) {
      return res.status(400).json({ success: false, message: 'Khung giờ này đã có người đặt' });
    }

    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .insert([
        {
          patient_id,
          doctor_id,
          slot_id,
          reason: reason || 'Khám bệnh',
          status: status || 'pending',
        },
      ])
      .select()
      .single();

    if (apptErr) throw apptErr;

    return res.status(201).json({
      success: true,
      message: 'Đặt lịch hẹn thành công',
      data: appt,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancel_reason, doctor_note } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Trạng thái (status) là bắt buộc' });
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
      message: `Đã cập nhật trạng thái thành ${status}`,
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Đã hủy/xóa lịch hẹn thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 4. PATIENTS CRUD
// ==========================================

exports.getPatients = async (req, res) => {
  try {
    const { search } = req.query;
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'patient')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('full_name', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPatient = async (req, res) => {
  try {
    const { full_name, email, phone, gender, date_of_birth, address } = req.body;
    if (!full_name) {
      return res.status(400).json({ success: false, message: 'Họ tên là bắt buộc' });
    }

    const patientId = req.body.id || crypto.randomUUID();
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: patientId,
          full_name,
          email: email || null,
          phone: phone || null,
          gender: gender || 'other',
          date_of_birth: date_of_birth || null,
          address: address || null,
          role: 'patient',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, message: 'Tạo hồ sơ bệnh nhân thành công', data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, email, gender, date_of_birth, address } = req.body;

    const updates = {};
    if (full_name) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (gender) updates.gender = gender;
    if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth;
    if (address !== undefined) updates.address = address;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Cập nhật bệnh nhân thành công', data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 5. TIME SLOTS CRUD
// ==========================================

exports.getTimeSlots = async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    let query = supabase
      .from('time_slots')
      .select(`
        *,
        doctor:doctors (
          id,
          room,
          profile:profiles (full_name)
        )
      `)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (doctor_id) query = query.eq('doctor_id', doctor_id);
    if (date) query = query.eq('slot_date', date);

    const { data, error } = await query;
    if (error) throw error;

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTimeSlot = async (req, res) => {
  try {
    const { doctor_id, slot_date, start_time, end_time } = req.body;

    if (!doctor_id || !slot_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'doctor_id, slot_date, start_time và end_time là bắt buộc',
      });
    }

    const { data, error } = await supabase
      .from('time_slots')
      .insert([{ doctor_id, slot_date, start_time, end_time, is_booked: false }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, message: 'Tạo khung giờ thành công', data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteTimeSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('time_slots').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Đã xóa khung giờ' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 6. DASHBOARD KPI STATS (Figma 02 · Tổng quan)
// ==========================================

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Truy vấn song song các chỉ số
    const [apptsRes, doctorsRes, patientsRes, specsRes, slotsRes] = await Promise.all([
      supabase.from('appointments').select('id, status, created_at, slot_id, time_slots(slot_date)'),
      supabase.from('doctors').select('id, is_active, specialty_id'),
      supabase.from('profiles').select('id').eq('role', 'patient'),
      supabase.from('specialties').select('id, name'),
      supabase.from('time_slots').select('id, is_booked, slot_date'),
    ]);

    const allAppts = apptsRes.data || [];
    const todayAppts = allAppts.filter(
      (a) => a.time_slots?.slot_date === today && a.status !== 'cancelled'
    );
    const pendingAppts = allAppts.filter((a) => a.status === 'pending');
    const confirmedAppts = allAppts.filter((a) => a.status === 'confirmed');
    const cancelledAppts = allAppts.filter((a) => ['cancelled', 'no_show'].includes(a.status));

    const activeDoctors = (doctorsRes.data || []).filter((d) => d.is_active).length;
    const totalPatients = (patientsRes.data || []).length;

    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          todayAppointments: todayAppts.length,
          pending: pendingAppts.length,
          confirmed: confirmedAppts.length,
          cancelledOrNoShow: cancelledAppts.length,
          activeDoctors,
          totalDoctors: (doctorsRes.data || []).length,
          totalPatients,
        },
        specialties: specsRes.data || [],
        recentAppointments: allAppts.slice(0, 10),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
