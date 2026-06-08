// routes/payments.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.get('/',          verifyToken, ctrl.getPayments);
router.get('/pending',   verifyToken, isAdmin, ctrl.getPendingPayments);
router.get('/summary',   verifyToken, isAdmin, ctrl.getRevenueSummary);
router.post('/',         verifyToken, isAdmin, ctrl.addPayment);
router.put('/:id',       verifyToken, isAdmin, ctrl.updatePayment);

module.exports = router;
