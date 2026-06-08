// ============================================================
// middleware/auth.js - JWT Authentication & Role Guard
// Protects routes by verifying JWT tokens
// ============================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

// ---- verifyToken ----
// Checks for a valid Bearer token in Authorization header
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  // attach user info to request
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
};

// ---- isAdmin ----
// Must be used AFTER verifyToken
// Restricts route to admin role only
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }
};

// ---- isMember ----
// Allows both admin and member (member-facing routes)
const isMember = (req, res, next) => {
    if (req.user && (req.user.role === 'member' || req.user.role === 'admin')) {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }
};

module.exports = { verifyToken, isAdmin, isMember };
