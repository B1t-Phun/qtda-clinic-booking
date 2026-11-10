const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// 1. Dashboard Stats
router.get('/stats', adminController.getDashboardStats);

// 2. Doctors CRUD
router.get('/doctors', adminController.getDoctors);
router.get('/doctors/:id', adminController.getDoctorById);
router.post('/doctors', adminController.createDoctor);
router.put('/doctors/:id', adminController.updateDoctor);
router.delete('/doctors/:id', adminController.deleteDoctor);

// 3. Specialties CRUD
router.get('/specialties', adminController.getSpecialties);
router.post('/specialties', adminController.createSpecialty);
router.put('/specialties/:id', adminController.updateSpecialty);
router.delete('/specialties/:id', adminController.deleteSpecialty);

// 4. Appointments CRUD
router.get('/appointments', adminController.getAppointments);
router.post('/appointments', adminController.createAppointment);
router.put('/appointments/:id/status', adminController.updateAppointmentStatus);
router.delete('/appointments/:id', adminController.deleteAppointment);

// 5. Patients CRUD
router.get('/patients', adminController.getPatients);
router.post('/patients', adminController.createPatient);
router.put('/patients/:id', adminController.updatePatient);

// 6. Time Slots CRUD
router.get('/slots', adminController.getTimeSlots);
router.post('/slots', adminController.createTimeSlot);
router.delete('/slots/:id', adminController.deleteTimeSlot);

module.exports = router;
