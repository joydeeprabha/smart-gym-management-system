// routes/members.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/memberController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.get('/',          verifyToken, isAdmin, ctrl.getAllMembers);
router.get('/:id',       verifyToken, ctrl.getMemberById);
router.post('/',         verifyToken, isAdmin, ctrl.createMember);
router.put('/:id',       verifyToken, isAdmin, ctrl.updateMember);
router.delete('/:id',    verifyToken, isAdmin, ctrl.deleteMember);
router.get('/:id/qrcode',verifyToken, ctrl.getMemberQR);

module.exports = router;
