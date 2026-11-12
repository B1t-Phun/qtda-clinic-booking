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

const { configuredAuth } = require('../middleware/auth');
const { requireUser, requireRole, bindPatient } = configuredAuth();
router.use(requireUser, requireRole('patient'), bindPatient);

// 3. Đặt lịch & Lịch hẹn
router.post('/appointments', patientController.createAppointment);
router.get('/appointments', patientController.getMyAppointments);
router.put('/appointments/:id/cancel', patientController.cancelAppointment);

module.exports = router;
