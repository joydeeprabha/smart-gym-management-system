// ============================================================
// js/app.js - Main Frontend Application Logic
// Handles routing, data rendering, modals, QR scanning
// ============================================================

// ---- App State ----
let currentUser = null;
let allMembers  = [];
let allPayments = [];
let qrStream    = null;  // camera stream for QR scanner
let attChart = null, planChart = null, progressChart = null;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gym_token');
    if (token) {
        // Try to restore session
        const res = await Auth.me();
        if (res && res.ok) {
            currentUser = res.data.data;
            bootApp();
            return;
        }
        localStorage.removeItem('gym_token');
    }
    showPage('loginPage');
});

// ---- Show a top-level page (auth pages) ----
function showPage(pageId) {
    ['loginPage', 'registerPage', 'appShell'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
}

// ---- Boot the main app shell after login ----
function bootApp() {
    showPage('appShell');

    // Fill sidebar user info
    document.getElementById('sidebarName').textContent   = currentUser.name;
    document.getElementById('sidebarRole').textContent   = currentUser.role;
    document.getElementById('sidebarAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('topbarUser').textContent    = `Hi, ${currentUser.name.split(' ')[0]}`;

    // Show correct nav section based on role
    if (currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.member-only').forEach(el => el.classList.add('hidden'));
        navigate('dashboard');
    } else {
        document.querySelectorAll('.member-only').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        navigate('memberDashboard');
    }
}

// ============================================================
// AUTH HANDLERS
// ============================================================
async function handleLogin() {
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl    = document.getElementById('loginError');

    errEl.classList.add('hidden');

    if (!email || !password) {
        return showAlert(errEl, 'Please enter email and password.');
    }

    const res = await Auth.login({ email, password });

    if (res && res.ok && res.data.success) {
        localStorage.setItem('gym_token', res.data.token);
        currentUser = res.data.user;
        bootApp();
    } else {
        showAlert(errEl, res?.data?.message || 'Login failed.');
    }
}

async function handleRegister() {
    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const age      = document.getElementById('regAge').value;
    const phone    = document.getElementById('regPhone').value.trim();
    const plan     = document.getElementById('regPlan').value;
    const errEl    = document.getElementById('registerError');
    const sucEl    = document.getElementById('registerSuccess');

    errEl.classList.add('hidden');
    sucEl.classList.add('hidden');

    if (!name || !email || !password) {
        return showAlert(errEl, 'Name, email and password are required.');
    }
    if (password.length < 6) {
        return showAlert(errEl, 'Password must be at least 6 characters.');
    }

    const res = await Auth.register({ name, email, password, age, phone, plan });

    if (res && res.ok && res.data.success) {
        showAlert(sucEl, '✅ Registration successful! Redirecting to login…');
        setTimeout(() => showPage('loginPage'), 1500);
    } else {
        showAlert(errEl, res?.data?.message || 'Registration failed.');
    }
}

function handleLogout() {
    localStorage.removeItem('gym_token');
    currentUser = null;
    stopQRScan();
    showPage('loginPage');
}

// ============================================================
// NAVIGATION (SPA Router)
// ============================================================
function navigate(view) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));

    // Show requested view
    const el = document.getElementById(`view-${view}`);
    if (el) el.classList.remove('hidden');

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('onclick')?.includes(`'${view}'`)) {
            item.classList.add('active');
        }
    });

    // Update topbar title
    const titles = {
        dashboard: 'Dashboard', members: 'Members', attendance: 'Attendance',
        payments: 'Payments', workouts: 'Workouts', progress: 'Progress',
        memberDashboard: 'My Dashboard', myAttendance: 'My Attendance',
        myPayments: 'My Payments', myWorkout: 'My Workout Plan',
        myProgress: 'BMI & Progress', myQR: 'My QR Code'
    };
    document.getElementById('pageTitle').textContent = titles[view] || view;

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');

    // Load data for the view
    loadView(view);
}

async function loadView(view) {
    switch (view) {
        case 'dashboard':       loadDashboard();        break;
        case 'members':         loadMembers();          break;
        case 'attendance':      loadAttendance();       break;
        case 'payments':        loadPayments();         break;
        case 'workouts':        loadWorkouts();         break;
        case 'progress':        loadProgress();         break;
        case 'memberDashboard': loadMemberDashboard();  break;
        case 'myAttendance':    loadMyAttendance();     break;
        case 'myPayments':      loadMyPayments();       break;
        case 'myWorkout':       loadMyWorkout();        break;
        case 'myProgress':      loadMyProgress();       break;
        case 'myQR':            loadMyQR();             break;
    }
}

// ============================================================
// SIDEBAR TOGGLE
// ============================================================
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ============================================================
// ADMIN - DASHBOARD
// ============================================================
async function loadDashboard() {
    const res = await Dashboard.stats();
    if (!res || !res.ok) return;
    const d = res.data.data;

    document.getElementById('statTotalMembers').textContent  = d.totalMembers;
    document.getElementById('statActiveMembers').textContent = d.activeMembers;
    document.getElementById('statTodayAtt').textContent      = d.todayAttendance;
    document.getElementById('statRevenue').textContent       = `₹${Number(d.monthlyRevenue).toLocaleString()}`;

    // Recent payments table
    const tbody = document.getElementById('recentPaymentsTable');
    tbody.innerHTML = d.recentPayments.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>₹${Number(p.amount).toLocaleString()}</td>
            <td>${formatDate(p.date)}</td>
            <td><span class="pill ${p.status === 'paid' ? 'pill-green' : 'pill-gold'}">${p.status}</span></td>
        </tr>
    `).join('');

    // Attendance chart
    const attCtx = document.getElementById('attendanceChart').getContext('2d');
    if (attChart) attChart.destroy();
    const labels = d.weeklyAttendance.map(r => formatDate(r.day));
    const counts = d.weeklyAttendance.map(r => r.count);
    attChart = new Chart(attCtx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Check-ins',
                data: counts,
                backgroundColor: 'rgba(255,107,26,0.7)',
                borderColor: '#ff6b1a',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#2e2e2e' }, ticks: { color: '#888' } },
                y: { grid: { color: '#2e2e2e' }, ticks: { color: '#888', stepSize: 1 } }
            }
        }
    });

    // Plan distribution pie
    const planCtx = document.getElementById('planChart').getContext('2d');
    if (planChart) planChart.destroy();
    planChart = new Chart(planCtx, {
        type: 'doughnut',
        data: {
            labels: d.planDistribution.map(p => capitalize(p.plan)),
            datasets: [{
                data: d.planDistribution.map(p => p.count),
                backgroundColor: ['#3b82f6', '#f59e0b', '#ff6b1a'],
                borderColor: '#161616',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#888', padding: 16, font: { size: 12 } }
                }
            }
        }
    });
}

// ============================================================
// ADMIN - MEMBERS
// ============================================================
async function loadMembers() {
    const res = await Members.getAll();
    if (!res || !res.ok) return;
    allMembers = res.data.data;
    renderMembersTable(allMembers);
}

function renderMembersTable(members) {
    const tbody = document.getElementById('membersTableBody');
    if (!members.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px">No members found</td></tr>';
        return;
    }
    tbody.innerHTML = members.map((m, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${m.name}</strong></td>
            <td style="color:var(--text-secondary)">${m.email}</td>
            <td>${m.phone || '—'}</td>
            <td><span class="pill pill-${planColor(m.plan)}">${capitalize(m.plan)}</span></td>
            <td>${formatDate(m.join_date)}</td>
            <td><span class="pill ${m.status === 'active' ? 'pill-green' : 'pill-red'}">${m.status}</span></td>
            <td>
                <div style="display:flex;gap:6px">
                    <button class="btn btn-secondary btn-sm" onclick="openEditMember(${m.id})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteMember(${m.id}, '${m.name}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterMembers() {
    const q = document.getElementById('memberSearch').value.toLowerCase();
    const filtered = allMembers.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.plan.toLowerCase().includes(q)
    );
    renderMembersTable(filtered);
}

// Add Member Modal
function openAddMemberModal() {
    ['mName','mAge','mEmail','mPhone','mPass'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('mPlanSel').value = 'basic';
    openModal('addMemberModal');
}

async function submitAddMember() {
    const body = {
        name:     document.getElementById('mName').value.trim(),
        age:      document.getElementById('mAge').value,
        email:    document.getElementById('mEmail').value.trim(),
        phone:    document.getElementById('mPhone').value.trim(),
        password: document.getElementById('mPass').value,
        plan:     document.getElementById('mPlanSel').value
    };
    if (!body.name || !body.email || !body.password) return showToast('Name, email, password required', 'error');
    const res = await Members.create(body);
    if (res && res.ok) {
        showToast('Member added!', 'success');
        closeModal('addMemberModal');
        loadMembers();
    } else {
        showToast(res?.data?.message || 'Failed to add member', 'error');
    }
}

// Edit Member Modal
async function openEditMember(id) {
    const res = await Members.getById(id);
    if (!res || !res.ok) return;
    const m = res.data.data;
    document.getElementById('editMemberId').value = m.id;
    document.getElementById('editName').value     = m.name;
    document.getElementById('editAge').value      = m.age || '';
    document.getElementById('editPhone').value    = m.phone || '';
    document.getElementById('editPlan').value     = m.plan;
    document.getElementById('editStatus').value   = m.status;
    openModal('editMemberModal');
}

async function submitEditMember() {
    const id   = document.getElementById('editMemberId').value;
    const body = {
        name:   document.getElementById('editName').value.trim(),
        age:    document.getElementById('editAge').value,
        phone:  document.getElementById('editPhone').value.trim(),
        plan:   document.getElementById('editPlan').value,
        status: document.getElementById('editStatus').value
    };
    const res = await Members.update(id, body);
    if (res && res.ok) {
        showToast('Member updated!', 'success');
        closeModal('editMemberModal');
        loadMembers();
    } else {
        showToast(res?.data?.message || 'Update failed', 'error');
    }
}

async function deleteMember(id, name) {
    if (!confirm(`Delete member "${name}"? This cannot be undone.`)) return;
    const res = await Members.delete(id);
    if (res && res.ok) {
        showToast('Member deleted.', 'info');
        loadMembers();
    } else {
        showToast('Failed to delete member.', 'error');
    }
}

// ============================================================
// ADMIN - ATTENDANCE
// ============================================================
async function loadAttendance() {
    const res = await Attendance.getAll();
    if (!res || !res.ok) return;

    const today = new Date().toISOString().split('T')[0];
    const todayRecs = res.data.data.filter(r => r.date && r.date.startsWith(today));

    document.getElementById('todayCount').textContent = todayRecs.length;

    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = res.data.data.slice(0, 30).map(r => `
        <tr>
            <td>${r.name || 'Member #' + r.member_id}</td>
            <td>${r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '—'}</td>
            <td><span class="pill pill-green">Present</span></td>
        </tr>
    `).join('');
}

// QR Scanner
async function startQRScan() {
    const video  = document.getElementById('qrVideo');
    const canvas = document.getElementById('qrCanvas');
    const result = document.getElementById('qrResult');

    try {
        qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = qrStream;

        const tick = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width  = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) {
                    try {
                        const qrObj = JSON.parse(code.data);
                        if (qrObj.memberId) {
                            result.textContent = `✅ Scanned: ${qrObj.name}`;
                            markAttendanceById(qrObj.memberId);
                            stopQRScan();
                            return;
                        }
                    } catch (e) {
                        result.textContent = 'Invalid QR code';
                    }
                }
            }
            requestAnimationFrame(tick);
        };
        video.addEventListener('loadedmetadata', () => requestAnimationFrame(tick));
    } catch (err) {
        showToast('Camera access denied or not available.', 'error');
    }
}

function stopQRScan() {
    if (qrStream) {
        qrStream.getTracks().forEach(t => t.stop());
        qrStream = null;
    }
}

async function markManualAttendance() {
    const id = parseInt(document.getElementById('manualMemberId').value);
    if (!id) return showToast('Enter a valid member ID', 'error');
    markAttendanceById(id);
}

async function markAttendanceById(memberId) {
    const res = await Attendance.mark(memberId);
    if (res && res.ok) {
        showToast(res.data.message, 'success');
        loadAttendance();
    } else {
        showToast(res?.data?.message || 'Failed to mark attendance', 'error');
    }
}

// ============================================================
// ADMIN - PAYMENTS
// ============================================================
let showPending = false;

async function loadPayments() {
    // Load summary
    const sumRes = await Payments.getSummary();
    if (sumRes && sumRes.ok) {
        const s = sumRes.data.data;
        document.getElementById('payTotalRev').textContent = `₹${Number(s.totalRevenue).toLocaleString()}`;
        document.getElementById('payMonthRev').textContent = `₹${Number(s.monthlyRevenue).toLocaleString()}`;
        document.getElementById('payPending').textContent  = `₹${Number(s.pendingAmount).toLocaleString()} (${s.pendingCount})`;
    }

    const res = await Payments.getAll();
    if (!res || !res.ok) return;
    allPayments = res.data.data;
    renderPayments(allPayments);
}

function renderPayments(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!payments.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px">No records</td></tr>';
        return;
    }
    tbody.innerHTML = payments.map(p => `
        <tr>
            <td>${p.name || '—'}</td>
            <td><span class="pill pill-${planColor(p.plan)}">${capitalize(p.plan || '—')}</span></td>
            <td>₹${Number(p.amount).toLocaleString()}</td>
            <td>${formatDate(p.date)}</td>
            <td><span class="pill ${p.status === 'paid' ? 'pill-green' : 'pill-gold'}">${p.status}</span></td>
            <td>
                ${p.status === 'pending'
                    ? `<button class="btn btn-secondary btn-sm" onclick="markAsPaid(${p.id}, ${p.amount})">Mark Paid</button>`
                    : '<span style="color:var(--text-muted)">—</span>'}
            </td>
        </tr>
    `).join('');
}

function switchPayTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (tab === 'pending') {
        renderPayments(allPayments.filter(p => p.status === 'pending'));
    } else {
        renderPayments(allPayments);
    }
}

async function markAsPaid(id, amount) {
    const res = await Payments.update(id, { status: 'paid', amount });
    if (res && res.ok) {
        showToast('Marked as paid!', 'success');
        loadPayments();
    }
}

async function openAddPaymentModal() {
    // Populate member dropdown
    const memRes = await Members.getAll();
    const sel = document.getElementById('payMemberSel');
    sel.innerHTML = memRes?.data?.data?.map(m =>
        `<option value="${m.id}">${m.name} (#${m.id})</option>`
    ).join('') || '';
    openModal('addPaymentModal');
}

async function submitAddPayment() {
    const body = {
        memberId: document.getElementById('payMemberSel').value,
        amount:   document.getElementById('payAmount').value,
        status:   document.getElementById('payStatus').value,
        notes:    document.getElementById('payNotes').value
    };
    if (!body.memberId || !body.amount) return showToast('Member and amount required', 'error');
    const res = await Payments.create(body);
    if (res && res.ok) {
        showToast('Payment recorded!', 'success');
        closeModal('addPaymentModal');
        loadPayments();
    } else {
        showToast(res?.data?.message || 'Failed', 'error');
    }
}

// ============================================================
// ADMIN - WORKOUTS
// ============================================================
async function loadWorkouts() {
    const res = await Workouts.getAll();
    if (!res || !res.ok) return;
    const grid = document.getElementById('workoutsGrid');

    if (!res.data.data.length) {
        grid.innerHTML = '<p style="color:var(--text-muted)">No workout plans assigned yet.</p>';
        return;
    }

    grid.innerHTML = res.data.data.map(w => {
        const days = typeof w.plan_details === 'object' && w.plan_details.days
            ? w.plan_details.days
            : null;

        let bodyHTML = '';
        if (days) {
            bodyHTML = Object.entries(days).map(([day, detail]) =>
                `<div class="workout-day"><strong>${day}</strong><p>${detail}</p></div>`
            ).join('');
        } else {
            const rawText = typeof w.plan_details === 'string'
                ? w.plan_details
                : JSON.stringify(w.plan_details);
            bodyHTML = rawText.split('\n').map(line =>
                `<div class="workout-day"><p>${line}</p></div>`
            ).join('');
        }

        return `
        <div class="workout-card">
            <div class="workout-card-header">
                <div>
                    <h4>${w.plan_name}</h4>
                    <div style="font-size:12px;color:var(--text-secondary)">${w.member_name || 'Member'}</div>
                </div>
                <div style="display:flex;gap:6px">
                    <button class="btn btn-danger btn-sm" onclick="deleteWorkout(${w.id})">✕</button>
                </div>
            </div>
            <div class="workout-card-body">${bodyHTML}</div>
        </div>`;
    }).join('');
}

async function openAssignWorkoutModal() {
    const memRes = await Members.getAll();
    const sel = document.getElementById('wMemberSel');
    sel.innerHTML = memRes?.data?.data?.map(m =>
        `<option value="${m.id}">${m.name} (#${m.id})</option>`
    ).join('') || '';
    document.getElementById('wPlanName').value    = '';
    document.getElementById('wPlanDetails').value = '';
    openModal('assignWorkoutModal');
}

async function submitAssignWorkout() {
    const body = {
        memberId:    document.getElementById('wMemberSel').value,
        planName:    document.getElementById('wPlanName').value.trim(),
        planDetails: document.getElementById('wPlanDetails').value.trim()
    };
    if (!body.memberId || !body.planName || !body.planDetails) {
        return showToast('All fields are required', 'error');
    }
    const res = await Workouts.create(body);
    if (res && res.ok) {
        showToast('Workout plan assigned!', 'success');
        closeModal('assignWorkoutModal');
        loadWorkouts();
    } else {
        showToast(res?.data?.message || 'Failed', 'error');
    }
}

async function deleteWorkout(id) {
    if (!confirm('Delete this workout plan?')) return;
    const res = await Workouts.delete(id);
    if (res && res.ok) { showToast('Deleted.', 'info'); loadWorkouts(); }
}

// ============================================================
// ADMIN - PROGRESS
// ============================================================
async function loadProgress() {
    const res = await Progress.getAll();
    if (!res || !res.ok) return;
    const tbody = document.getElementById('progressTableBody');
    tbody.innerHTML = res.data.data.map(p => `
        <tr>
            <td>${p.name || 'Member #' + p.member_id}</td>
            <td>${p.height} cm</td>
            <td>${p.weight} kg</td>
            <td><strong style="color:${bmiColor(p.bmi)}">${p.bmi}</strong></td>
            <td><span class="pill" style="background:${bmiColor(p.bmi)}22;color:${bmiColor(p.bmi)}">${p.category}</span></td>
            <td>${formatDate(p.date)}</td>
        </tr>
    `).join('');
}

// ============================================================
// MEMBER - DASHBOARD
// ============================================================
async function loadMemberDashboard() {
    const profileRes = await Auth.me();
    if (!profileRes || !profileRes.ok) return;
    const d = profileRes.data.data;

    document.getElementById('mPlan').textContent   = capitalize(d.plan || '—');
    document.getElementById('mJoined').textContent = formatDate(d.join_date);

    // Attendance count
    if (d.member_id) {
        const attRes = await Attendance.getMember(d.member_id);
        document.getElementById('mAttCount').textContent = attRes?.data?.data?.length || 0;

        // Latest BMI
        const progRes = await Progress.getMember(d.member_id);
        const progs = progRes?.data?.data || [];
        if (progs.length) {
            const latest = progs[progs.length - 1];
            document.getElementById('mBMI').textContent = latest.bmi;
        } else {
            document.getElementById('mBMI').textContent = 'N/A';
        }
    }
}

// ============================================================
// MEMBER - MY ATTENDANCE
// ============================================================
async function loadMyAttendance() {
    const res = await Attendance.getAll();
    if (!res || !res.ok) return;
    const tbody = document.getElementById('myAttTableBody');
    const records = res.data.data;
    tbody.innerHTML = records.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${formatDate(r.date)}</td>
            <td><span class="pill pill-green">Present</span></td>
            <td>${r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '—'}</td>
        </tr>
    `).join('');
}

// ============================================================
// MEMBER - MY PAYMENTS
// ============================================================
async function loadMyPayments() {
    const res = await Payments.getAll();
    if (!res || !res.ok) return;
    const tbody = document.getElementById('myPayTableBody');
    tbody.innerHTML = res.data.data.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>₹${Number(p.amount).toLocaleString()}</td>
            <td>${formatDate(p.date)}</td>
            <td><span class="pill ${p.status === 'paid' ? 'pill-green' : 'pill-gold'}">${p.status}</span></td>
            <td style="color:var(--text-secondary)">${p.notes || '—'}</td>
        </tr>
    `).join('');
}

// ============================================================
// MEMBER - MY WORKOUT
// ============================================================
async function loadMyWorkout() {
    const res = await Workouts.getAll();
    if (!res || !res.ok) return;
    const container = document.getElementById('myWorkoutContent');
    const plans = res.data.data;

    if (!plans.length) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;color:var(--text-muted)">
                <div style="font-size:48px;margin-bottom:16px">🏋️</div>
                <h3>No workout plan assigned yet</h3>
                <p>Ask your trainer to assign a plan for you.</p>
            </div>`;
        return;
    }

    container.innerHTML = plans.map(w => {
        const days = typeof w.plan_details === 'object' && w.plan_details.days
            ? w.plan_details.days
            : null;

        let bodyHTML = '';
        if (days) {
            bodyHTML = Object.entries(days).map(([day, detail]) =>
                `<div class="workout-day"><strong>${day}</strong><p>${detail}</p></div>`
            ).join('');
        } else {
            const raw = typeof w.plan_details === 'string' ? w.plan_details : JSON.stringify(w.plan_details, null, 2);
            bodyHTML = `<pre style="color:var(--text-secondary);white-space:pre-wrap;font-size:13px">${raw}</pre>`;
        }

        return `
        <div class="workout-card" style="max-width:600px;margin-bottom:20px">
            <div class="workout-card-header">
                <div>
                    <h4>${w.plan_name}</h4>
                    <div style="font-size:12px;color:var(--text-secondary)">Assigned: ${formatDate(w.assigned_date)}</div>
                </div>
            </div>
            <div class="workout-card-body">${bodyHTML}</div>
        </div>`;
    }).join('');
}

// ============================================================
// MEMBER - MY PROGRESS
// ============================================================
async function loadMyProgress() {
    const res = await Progress.getAll();
    if (!res || !res.ok) return;
    const records = res.data.data;

    // Chart
    const ctx = document.getElementById('myProgressChart').getContext('2d');
    if (progressChart) progressChart.destroy();
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: records.map(r => formatDate(r.date)),
            datasets: [
                {
                    label: 'Weight (kg)',
                    data: records.map(r => r.weight),
                    borderColor: '#ff6b1a',
                    backgroundColor: 'rgba(255,107,26,0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'BMI',
                    data: records.map(r => r.bmi),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { labels: { color: '#888' } } },
            scales: {
                x:  { grid: { color: '#2e2e2e' }, ticks: { color: '#888' } },
                y:  { grid: { color: '#2e2e2e' }, ticks: { color: '#ff6b1a' }, position: 'left' },
                y1: { grid: { drawOnChartArea: false }, ticks: { color: '#3b82f6' }, position: 'right' }
            }
        }
    });

    // Table
    const tbody = document.getElementById('myProgressTableBody');
    tbody.innerHTML = records.map(p => `
        <tr>
            <td>${formatDate(p.date)}</td>
            <td>${p.height} cm</td>
            <td>${p.weight} kg</td>
            <td><strong style="color:${bmiColor(p.bmi)}">${p.bmi}</strong></td>
            <td><span class="pill" style="background:${bmiColor(p.bmi)}22;color:${bmiColor(p.bmi)}">${p.category}</span></td>
        </tr>
    `).join('');
}

// ============================================================
// MEMBER - MY QR CODE
// ============================================================
async function loadMyQR() {
    const profile = await Auth.me();
    if (!profile || !profile.ok) return;
    const d = profile.data.data;

    if (!d.member_id) {
        document.getElementById('myQRImage').src = '';
        return;
    }

    const res = await Members.getQR(d.member_id);
    if (res && res.ok) {
        document.getElementById('myQRImage').src     = res.data.qrCode;
        document.getElementById('qrMemberName').textContent = d.name.toUpperCase();
    }
}

function downloadQR() {
    const img = document.getElementById('myQRImage');
    const a   = document.createElement('a');
    a.href     = img.src;
    a.download = 'my-gym-qr.png';
    a.click();
}

// ============================================================
// ADD PROGRESS MODAL (shared admin + member)
// ============================================================
async function openAddProgressModal() {
    const rowEl = document.getElementById('progMemberRow');

    if (currentUser.role === 'admin') {
        rowEl.classList.remove('hidden');
        const memRes = await Members.getAll();
        const sel = document.getElementById('progMemberSel');
        sel.innerHTML = memRes?.data?.data?.map(m =>
            `<option value="${m.id}">${m.name} (#${m.id})</option>`
        ).join('') || '';
    } else {
        rowEl.classList.add('hidden');
    }

    document.getElementById('progHeight').value = '';
    document.getElementById('progWeight').value = '';
    document.getElementById('progNotes').value  = '';
    document.getElementById('bmiPreview').textContent = 'Enter height & weight to calculate';

    // Live BMI calculator
    ['progHeight', 'progWeight'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateBMIPreview);
    });

    openModal('addProgressModal');
}

function updateBMIPreview() {
    const h = parseFloat(document.getElementById('progHeight').value);
    const w = parseFloat(document.getElementById('progWeight').value);
    const el = document.getElementById('bmiPreview');
    if (h > 0 && w > 0) {
        const bmi = (w / ((h / 100) ** 2)).toFixed(2);
        const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
        el.textContent = `${bmi} — ${cat}`;
        el.style.color = bmiColor(bmi);
    } else {
        el.textContent = 'Enter height & weight to calculate';
        el.style.color = '';
    }
}

async function submitProgress() {
    const body = {
        height:   document.getElementById('progHeight').value,
        weight:   document.getElementById('progWeight').value,
        notes:    document.getElementById('progNotes').value
    };
    if (currentUser.role === 'admin') {
        body.memberId = document.getElementById('progMemberSel').value;
    }
    if (!body.height || !body.weight) return showToast('Height and weight required', 'error');

    const res = await Progress.create(body);
    if (res && res.ok) {
        showToast(`Progress saved! BMI: ${res.data.data.bmi} (${res.data.data.category})`, 'success');
        closeModal('addProgressModal');
        if (currentUser.role === 'admin') loadProgress();
        else loadMyProgress();
    } else {
        showToast(res?.data?.message || 'Failed to save', 'error');
    }
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Close modal on backdrop click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.add('hidden');
    });
});

// ============================================================
// TOAST NOTIFICATION
// ============================================================
let toastTimer;
function showToast(msg, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className   = `toast ${type}`;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

// ============================================================
// ALERT (inline error/success inside forms)
// ============================================================
function showAlert(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
}

// ============================================================
// UTILITY HELPERS
// ============================================================
function formatDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function capitalize(str) {
    if (!str) return '—';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function planColor(plan) {
    return { basic: 'blue', standard: 'gold', premium: 'orange' }[plan] || 'blue';
}

function bmiColor(bmi) {
    const b = parseFloat(bmi);
    if (b < 18.5) return '#3b82f6';
    if (b < 25)   return '#22c55e';
    if (b < 30)   return '#f59e0b';
    return '#ef4444';
}

// Allow pressing Enter on login form
document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const loginPage = document.getElementById('loginPage');
        if (!loginPage.classList.contains('hidden')) handleLogin();
    }
});
