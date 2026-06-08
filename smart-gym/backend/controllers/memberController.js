// ============================================================
// controllers/memberController.js
// CRUD operations for gym members (Admin only for most)
// ============================================================

const db = require('../config/db');
const QRCode = require('qrcode');

// ---- GET /api/members ----
// Get all members with user info (Admin)
exports.getAllMembers = async (req, res) => {
    try {
        const [members] = await db.query(`
            SELECT m.id, m.age, m.phone, m.plan, m.join_date, m.status, m.qr_code,
                   u.id as user_id, u.name, u.email, u.created_at
            FROM members m
            JOIN users u ON m.user_id = u.id
            ORDER BY m.id DESC
        `);
        res.json({ success: true, data: members });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch members.' });
    }
};

// ---- GET /api/members/:id ----
// Get single member details
exports.getMemberById = async (req, res) => {
    try {
        const { id } = req.params;
        const [members] = await db.query(`
            SELECT m.*, u.name, u.email, u.role
            FROM members m
            JOIN users u ON m.user_id = u.id
            WHERE m.id = ?
        `, [id]);

        if (members.length === 0) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }
        res.json({ success: true, data: members[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch member.' });
    }
};

// ---- POST /api/members ----
// Add new member (Admin creates manually)
exports.createMember = async (req, res) => {
    try {
        const { name, email, password, age, phone, plan } = req.body;
        const bcrypt = require('bcrypt');

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
        }

        // Check duplicate email
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already exists.' });
        }

        const hashedPwd = await bcrypt.hash(password, 10);
        const [userRes] = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPwd, 'member']
        );

        const joinDate = new Date().toISOString().split('T')[0];
        const [memberRes] = await db.query(
            'INSERT INTO members (user_id, age, phone, plan, join_date, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userRes.insertId, age || null, phone || null, plan || 'basic', joinDate, 'active']
        );

        // Auto-generate QR code
        const qrData = JSON.stringify({ memberId: memberRes.insertId, name, email });
        const qrCode = await QRCode.toDataURL(qrData);
        await db.query('UPDATE members SET qr_code = ? WHERE id = ?', [qrCode, memberRes.insertId]);

        res.status(201).json({
            success: true,
            message: 'Member added successfully.',
            memberId: memberRes.insertId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create member.' });
    }
};

// ---- PUT /api/members/:id ----
// Update member profile
exports.updateMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, age, phone, plan, status } = req.body;

        // Update members table
        await db.query(
            'UPDATE members SET age = ?, phone = ?, plan = ?, status = ? WHERE id = ?',
            [age, phone, plan, status, id]
        );

        // Update user name if provided
        if (name) {
            const [member] = await db.query('SELECT user_id FROM members WHERE id = ?', [id]);
            if (member.length > 0) {
                await db.query('UPDATE users SET name = ? WHERE id = ?', [name, member[0].user_id]);
            }
        }

        res.json({ success: true, message: 'Member updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update member.' });
    }
};

// ---- DELETE /api/members/:id ----
// Delete member (cascades to all related tables)
exports.deleteMember = async (req, res) => {
    try {
        const { id } = req.params;

        // Get user_id first for cascading user delete
        const [member] = await db.query('SELECT user_id FROM members WHERE id = ?', [id]);
        if (member.length === 0) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        // Delete user (CASCADE removes member + related records)
        await db.query('DELETE FROM users WHERE id = ?', [member[0].user_id]);

        res.json({ success: true, message: 'Member deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to delete member.' });
    }
};

// ---- GET /api/members/:id/qrcode ----
// Get QR code for a member
exports.getMemberQR = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT qr_code FROM members WHERE id = ?', [id]);

        if (rows.length === 0 || !rows[0].qr_code) {
            return res.status(404).json({ success: false, message: 'QR code not found.' });
        }
        res.json({ success: true, qrCode: rows[0].qr_code });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to get QR code.' });
    }
};
