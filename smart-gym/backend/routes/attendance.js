// routes/attendance.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.get('/',                      verifyToken, ctrl.getAttendance);
router.get('/today',                 verifyToken, isAdmin, ctrl.getTodayAttendance);
router.get('/member/:memberId',      verifyToken, ctrl.getMemberAttendance);
router.post('/mark',                 verifyToken, ctrl.markAttendance);

module.exports = router;
