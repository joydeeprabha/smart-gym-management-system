// ============================================================
// controllers/authController.js
// Handles user registration and login with JWT
// ============================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const SALT_ROUNDS = 10; // bcrypt cost factor

// ---- POST /api/auth/register ----
// Registers a new member account
exports.register = async (req, res) => {
    try {
        const { name, email, password, age, phone, plan } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
        }

        // Check if email already exists
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }

        // Hash password with bcrypt
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert into users table
        const [userResult] = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, 'member']
        );
        const userId = userResult.insertId;

        // Insert into members table with profile details
        const joinDate = new Date().toISOString().split('T')[0];
        const [memberResult] = await db.query(
            'INSERT INTO members (user_id, age, phone, plan, join_date, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, age || null, phone || null, plan || 'basic', joinDate, 'active']
        );

        // Generate QR code for the new member
        const QRCode = require('qrcode');
        const qrData = JSON.stringify({ memberId: memberResult.insertId, name, email });
        const qrCode = await QRCode.toDataURL(qrData);
        await db.query('UPDATE members SET qr_code = ? WHERE id = ?', [qrCode, memberResult.insertId]);

        res.status(201).json({
            success: true,
            message: 'Registration successful! Please login.',
            userId
        });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
};

// ---- POST /api/auth/login ----
// Authenticates user and returns JWT
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        // Find user by email
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = users[0];

        // Compare password with bcrypt hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Get member profile if role is member
        let memberData = null;
        if (user.role === 'member') {
            const [members] = await db.query('SELECT * FROM members WHERE user_id = ?', [user.id]);
            if (members.length > 0) memberData = members[0];
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                memberId: memberData ? memberData.id : null
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
};

// ---- GET /api/auth/me ----
// Returns current logged-in user's profile
exports.getProfile = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT u.id, u.name, u.email, u.role, u.created_at, m.id as member_id, m.age, m.phone, m.plan, m.join_date, m.status FROM users u LEFT JOIN members m ON u.id = m.user_id WHERE u.id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.json({ success: true, data: users[0] });
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};
