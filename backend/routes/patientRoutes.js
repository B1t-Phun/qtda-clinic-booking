const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

// 1. Chuyên khoa
router.get('/specialties', patientController.getSpecialties);

// 2. Bác sĩ & Khung giờ khám
router.get('/doctors', patientController.getDoctors);
router.get('/doctors/:id', patientController.getDoctorDetail);
router.get('/doctors/:id/slots', patientController.getDoctorAvailableSlots);
router.get('/slots', patientController.getDoctorAvailableSlots);

// 3. Đặt lịch & Lịch hẹn
router.post('/appointments', patientController.createAppointment);
router.get('/appointments', patientController.getMyAppointments);
router.put('/appointments/:id/cancel', patientController.cancelAppointment);

// 4. Hồ sơ cá nhân bệnh nhân
router.get('/profile/:id', patientController.getProfile);
router.put('/profile/:id', patientController.updateProfile);

module.exports = router;
