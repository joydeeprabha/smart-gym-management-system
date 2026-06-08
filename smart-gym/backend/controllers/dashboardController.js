// ============================================================
// controllers/dashboardController.js
// Summary stats for the admin dashboard
// ============================================================

const db = require('../config/db');

// ---- GET /api/dashboard/stats ----
// Returns all KPIs for admin dashboard
exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Total members
        const [totalMembers] = await db.query('SELECT COUNT(*) as count FROM members');

        // Active members
        const [activeMembers] = await db.query("SELECT COUNT(*) as count FROM members WHERE status = 'active'");

        // Today's attendance
        const [todayAttendance] = await db.query(
            'SELECT COUNT(*) as count FROM attendance WHERE date = ?', [today]
        );

        // Monthly revenue
        const [monthlyRevenue] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM payments 
            WHERE status = 'paid' AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())
        `);

        // Pending fees
        const [pendingFees] = await db.query(
            "SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM payments WHERE status = 'pending'"
        );

        // Plan distribution
        const [planDist] = await db.query(`
            SELECT plan, COUNT(*) as count 
            FROM members 
            WHERE status = 'active' 
            GROUP BY plan
        `);

        // Weekly attendance (last 7 days)
        const [weeklyAtt] = await db.query(`
            SELECT DATE(date) as day, COUNT(*) as count
            FROM attendance
            WHERE date >= CURDATE() - INTERVAL 6 DAY
            GROUP BY DATE(date)
            ORDER BY day ASC
        `);

        // Recent payments
        const [recentPayments] = await db.query(`
            SELECT p.amount, p.date, p.status, u.name
            FROM payments p
            JOIN members m ON p.member_id = m.id
            JOIN users u ON m.user_id = u.id
            ORDER BY p.date DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                totalMembers: totalMembers[0].count,
                activeMembers: activeMembers[0].count,
                todayAttendance: todayAttendance[0].count,
                monthlyRevenue: parseFloat(monthlyRevenue[0].total),
                pendingFees: parseFloat(pendingFees[0].total),
                pendingCount: pendingFees[0].count,
                planDistribution: planDist,
                weeklyAttendance: weeklyAtt,
                recentPayments
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load dashboard.' });
    }
};
