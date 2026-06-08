// ============================================================
// js/api.js - Centralised API helper
// All HTTP calls to the Express backend go through here
// ============================================================

const API_BASE = 'http://localhost:5000/api';

// ---- Helper: build headers with JWT token ----
function authHeaders() {
    const token = localStorage.getItem('gym_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

// ---- Generic fetch wrapper ----
async function apiFetch(path, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: authHeaders(),
            ...options
        });

        const data = await res.json();

        // If token expired/invalid, force logout
        if (res.status === 401 || res.status === 403) {
            if (data.message && data.message.includes('token')) {
                handleLogout();
                return null;
            }
        }
        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        console.error('API Error:', err);
        return { ok: false, data: { success: false, message: 'Network error. Is the server running?' } };
    }
}

// ============================================================
// AUTH
// ============================================================
const Auth = {
    login:    (body) => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
    register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    me:       ()     => apiFetch('/auth/me')
};

// ============================================================
// MEMBERS
// ============================================================
const Members = {
    getAll:    ()         => apiFetch('/members'),
    getById:   (id)       => apiFetch(`/members/${id}`),
    create:    (body)     => apiFetch('/members',    { method: 'POST',   body: JSON.stringify(body) }),
    update:    (id, body) => apiFetch(`/members/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete:    (id)       => apiFetch(`/members/${id}`, { method: 'DELETE' }),
    getQR:     (id)       => apiFetch(`/members/${id}/qrcode`)
};

// ============================================================
// ATTENDANCE
// ============================================================
const Attendance = {
    getAll:    ()         => apiFetch('/attendance'),
    getToday:  ()         => apiFetch('/attendance/today'),
    getMember: (id)       => apiFetch(`/attendance/member/${id}`),
    mark:      (memberId) => apiFetch('/attendance/mark', { method: 'POST', body: JSON.stringify({ memberId }) })
};

// ============================================================
// PAYMENTS
// ============================================================
const Payments = {
    getAll:    () => apiFetch('/payments'),
    getPending:() => apiFetch('/payments/pending'),
    getSummary:() => apiFetch('/payments/summary'),
    create:    (body) => apiFetch('/payments', { method: 'POST', body: JSON.stringify(body) }),
    update:    (id, body) => apiFetch(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(body) })
};

// ============================================================
// WORKOUTS
// ============================================================
const Workouts = {
    getAll:  ()         => apiFetch('/workouts'),
    create:  (body)     => apiFetch('/workouts',    { method: 'POST',   body: JSON.stringify(body) }),
    update:  (id, body) => apiFetch(`/workouts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete:  (id)       => apiFetch(`/workouts/${id}`, { method: 'DELETE' })
};

// ============================================================
// PROGRESS
// ============================================================
const Progress = {
    getAll:     ()        => apiFetch('/progress'),
    getMember:  (id)      => apiFetch(`/progress/member/${id}`),
    create:     (body)    => apiFetch('/progress', { method: 'POST', body: JSON.stringify(body) })
};

// ============================================================
// DASHBOARD
// ============================================================
const Dashboard = {
    stats: () => apiFetch('/dashboard/stats')
};
