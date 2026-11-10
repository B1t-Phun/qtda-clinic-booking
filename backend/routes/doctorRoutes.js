const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');

// 1. Dashboard Today Stats
router.get('/today-stats', doctorController.getDoctorTodayStats);

// 2. Doctor Appointments CRUD & Notes
router.get('/appointments', doctorController.getDoctorAppointments);
router.get('/appointments/:id', doctorController.getDoctorAppointmentById);
router.put('/appointments/:id/status', doctorController.updateAppointmentStatus);
router.put('/appointments/:id/note', doctorController.updateDoctorNote);

// 3. Doctor Working Slots CRUD
router.get('/slots', doctorController.getDoctorSlots);
router.post('/slots', doctorController.createDoctorSlot);
router.delete('/slots/:id', doctorController.deleteDoctorSlot);

// 4. Doctor Patients
router.get('/patients', doctorController.getDoctorPatients);

// 5. Doctor Profile
router.get('/profile', doctorController.getDoctorProfile);
router.put('/profile/:id', doctorController.updateDoctorProfile);

module.exports = router;
