// routes/progress.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/progressController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.get('/',                   verifyToken, ctrl.getProgress);
router.post('/',                  verifyToken, ctrl.addProgress);
router.get('/member/:memberId',   verifyToken, isAdmin, ctrl.getMemberProgress);

module.exports = router;
