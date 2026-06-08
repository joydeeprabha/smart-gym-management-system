// ============================================================
// controllers/paymentController.js
// Fee payment tracking and history
// ============================================================

const db = require('../config/db');

// ---- GET /api/payments ----
// All payments (Admin) or own (Member)
exports.getPayments = async (req, res) => {
    try {
        let rows;
        if (req.user.role === 'admin') {
            [rows] = await db.query(`
                SELECT p.*, u.name, u.email, m.plan
                FROM payments p
                JOIN members m ON p.member_id = m.id
                JOIN users u ON m.user_id = u.id
                ORDER BY p.date DESC
            `);
        } else {
            const [member] = await db.query('SELECT id FROM members WHERE user_id = ?', [req.user.id]);
            if (member.length === 0) return res.json({ success: true, data: [] });

            [rows] = await db.query(
                'SELECT * FROM payments WHERE member_id = ? ORDER BY date DESC',
                [member[0].id]
            );
        }
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch payments.' });
    }
};

// ---- POST /api/payments ----
// Record a new payment (Admin)
exports.addPayment = async (req, res) => {
    try {
        const { memberId, amount, status, notes } = req.body;

        if (!memberId || !amount) {
            return res.status(400).json({ success: false, message: 'Member ID and amount are required.' });
        }

        const date = new Date().toISOString().split('T')[0];
        const [result] = await db.query(
            'INSERT INTO payments (member_id, amount, date, status, notes) VALUES (?, ?, ?, ?, ?)',
            [memberId, amount, date, status || 'paid', notes || '']
        );

        res.status(201).json({
            success: true,
            message: 'Payment recorded.',
            paymentId: result.insertId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to add payment.' });
    }
};

// ---- PUT /api/payments/:id ----
// Update payment status (mark as paid)
exports.updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, amount, notes } = req.body;

        await db.query(
            'UPDATE payments SET status = ?, amount = ?, notes = ? WHERE id = ?',
            [status, amount, notes, id]
        );

        res.json({ success: true, message: 'Payment updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update payment.' });
    }
};

// ---- GET /api/payments/pending ----
// Get all pending payments (Admin)
exports.getPendingPayments = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.*, u.name, u.email, m.plan, m.phone
            FROM payments p
            JOIN members m ON p.member_id = m.id
            JOIN users u ON m.user_id = u.id
            WHERE p.status = 'pending'
            ORDER BY p.date ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch pending payments.' });
    }
};

// ---- GET /api/payments/summary ----
// Revenue summary for admin dashboard
exports.getRevenueSummary = async (req, res) => {
    try {
        const [total] = await db.query(
            "SELECT SUM(amount) as total FROM payments WHERE status = 'paid'"
        );
        const [monthly] = await db.query(`
            SELECT SUM(amount) as monthly 
            FROM payments 
            WHERE status = 'paid' AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())
        `);
        const [pending] = await db.query(
            "SELECT SUM(amount) as pending, COUNT(*) as count FROM payments WHERE status = 'pending'"
        );

        res.json({
            success: true,
            data: {
                totalRevenue: total[0].total || 0,
                monthlyRevenue: monthly[0].monthly || 0,
                pendingAmount: pending[0].pending || 0,
                pendingCount: pending[0].count || 0
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to get revenue summary.' });
    }
};
