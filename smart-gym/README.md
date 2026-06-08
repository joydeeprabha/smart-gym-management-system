# 🏋️ Smart Gym Management System (Advanced Version)

A full-stack web application for managing a gym — members, attendance, payments, workout plans, and BMI progress tracking.

---

## 📁 FOLDER STRUCTURE

```
smart-gym/
│
├── backend/                        ← Node.js + Express API
│   ├── config/
│   │   └── db.js                   ← MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js       ← Register / Login / JWT
│   │   ├── memberController.js     ← CRUD for members
│   │   ├── attendanceController.js ← QR attendance marking
│   │   ├── paymentController.js    ← Fee records & summary
│   │   ├── workoutController.js    ← Plan assignment
│   │   ├── progressController.js   ← BMI & body tracking
│   │   └── dashboardController.js  ← Admin KPI stats
│   ├── middleware/
│   │   └── auth.js                 ← JWT verify + role guard
│   ├── routes/
│   │   ├── auth.js
│   │   ├── members.js
│   │   ├── attendance.js
│   │   ├── payments.js
│   │   ├── workouts.js
│   │   ├── progress.js
│   │   └── dashboard.js
│   ├── .env.example                ← Copy to .env
│   ├── package.json
│   └── server.js                   ← Entry point
│
├── frontend/                       ← HTML + CSS + JS
│   ├── css/
│   │   └── style.css               ← Full gym-themed dark UI
│   ├── js/
│   │   ├── api.js                  ← All fetch() calls to backend
│   │   └── app.js                  ← SPA logic, routing, rendering
│   └── index.html                  ← Single-page application shell
│
└── database/
    └── schema.sql                  ← All tables + sample data
```

---

## ⚡ TECH STACK

| Layer    | Technology             |
|----------|------------------------|
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Backend  | Node.js + Express.js   |
| Database | MySQL (via mysql2)     |
| Auth     | JWT + bcrypt           |
| Charts   | Chart.js (CDN)         |
| QR Code  | `qrcode` npm package + `jsQR` (CDN) |
| IDE      | VS Code                |
| DB Tool  | MySQL Workbench        |

---

## 🚀 STEP-BY-STEP SETUP GUIDE

### STEP 1 — Prerequisites
Make sure these are installed on your computer:
- **Node.js** v18+ → https://nodejs.org
- **MySQL** → https://dev.mysql.com/downloads/installer/
- **VS Code** → https://code.visualstudio.com

Verify installation:
```bash
node -v       # should show v18.x or higher
npm -v        # should show 9.x or higher
mysql --version
```

---

### STEP 2 — Set Up MySQL Database

1. Open **MySQL Workbench** (or use terminal)
2. Connect to your MySQL server (localhost, root user)
3. Open the file: `database/schema.sql`
4. Run the entire SQL file (Ctrl+Shift+Enter in Workbench)

This will:
- Create the `smart_gym` database
- Create all 6 tables: users, members, attendance, payments, workouts, progress
- Insert sample data including admin & 5 member accounts

**Verify it worked:**
```sql
USE smart_gym;
SHOW TABLES;
SELECT * FROM users;
```

---

### STEP 3 — Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Open `.env` in VS Code and update:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD   ← change this!
DB_NAME=smart_gym
JWT_SECRET=any_long_random_string
PORT=5000
```

---

### STEP 4 — Install Backend Dependencies

```bash
cd backend
npm install
```

This installs: express, mysql2, bcrypt, jsonwebtoken, qrcode, cors, dotenv, nodemon

---

### STEP 5 — Start the Backend Server

```bash
# Development mode (auto-restarts on file changes)
npm run dev

# OR production mode
npm start
```

You should see:
```
✅ MySQL connected successfully
╔═══════════════════════════════════════╗
║   🏋️  Smart Gym Management System     ║
║   Server running on port 5000         ║
║   http://localhost:5000               ║
╚═══════════════════════════════════════╝
```

---

### STEP 6 — Open the Frontend

Simply open `frontend/index.html` in your browser.

**Option A — Direct file open:**
```
Double-click frontend/index.html
```

**Option B — Via VS Code Live Server:**
1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → Open with Live Server

> ⚠️ The frontend fetches from `http://localhost:5000/api`. Make sure the backend is running before loading the page.

---

### STEP 7 — Login & Test

| Role   | Email                  | Password    |
|--------|------------------------|-------------|
| Admin  | admin@smartgym.com     | admin123    |
| Member | rajesh@example.com     | password123 |
| Member | priya@example.com      | password123 |

---

## 🔗 API ENDPOINTS REFERENCE

### Authentication
| Method | Route              | Description          | Auth |
|--------|--------------------|----------------------|------|
| POST   | /api/auth/register | Register new member  | No   |
| POST   | /api/auth/login    | Login + get JWT      | No   |
| GET    | /api/auth/me       | Get own profile      | Yes  |

### Members (Admin Only)
| Method | Route               | Description      |
|--------|---------------------|------------------|
| GET    | /api/members        | All members      |
| GET    | /api/members/:id    | Single member    |
| POST   | /api/members        | Add member       |
| PUT    | /api/members/:id    | Update member    |
| DELETE | /api/members/:id    | Delete member    |
| GET    | /api/members/:id/qrcode | Get QR code |

### Attendance
| Method | Route                        | Description          |
|--------|------------------------------|----------------------|
| GET    | /api/attendance              | All records          |
| POST   | /api/attendance/mark         | Mark present (QR)    |
| GET    | /api/attendance/today        | Today's check-ins    |
| GET    | /api/attendance/member/:id   | Member's history     |

### Payments
| Method | Route                 | Description       |
|--------|-----------------------|-------------------|
| GET    | /api/payments         | All payments      |
| POST   | /api/payments         | Record payment    |
| PUT    | /api/payments/:id     | Update payment    |
| GET    | /api/payments/pending | Pending only      |
| GET    | /api/payments/summary | Revenue stats     |

### Workouts
| Method | Route              | Description        |
|--------|--------------------|--------------------|
| GET    | /api/workouts      | All plans          |
| POST   | /api/workouts      | Assign plan        |
| PUT    | /api/workouts/:id  | Update plan        |
| DELETE | /api/workouts/:id  | Remove plan        |

### Progress/BMI
| Method | Route                     | Description    |
|--------|---------------------------|----------------|
| GET    | /api/progress             | All records    |
| POST   | /api/progress             | Add entry      |
| GET    | /api/progress/member/:id  | Member history |

### Dashboard
| Method | Route                 | Description       |
|--------|-----------------------|-------------------|
| GET    | /api/dashboard/stats  | All KPIs (Admin)  |

---

## 🔒 SECURITY FEATURES

- Passwords are hashed using **bcrypt** (10 salt rounds) — never stored in plain text
- All protected routes require a **JWT Bearer token**
- Role-based access: **Admin** can manage everything; **Members** see only their own data
- QR codes encode member ID + name + email as JSON

---

## 📊 DATABASE TABLES

```sql
users       (id, name, email, password, role, created_at)
members     (id, user_id, age, phone, plan, join_date, status, qr_code)
attendance  (id, member_id, date, status, check_in_time)
payments    (id, member_id, amount, date, status, notes)
workouts    (id, member_id, plan_name, plan_details, assigned_date, assigned_by)
progress    (id, member_id, height, weight, bmi, date, notes)
```

---

## 🎯 VIVA QUICK NOTES

**Q: Why bcrypt for passwords?**
A: bcrypt is a one-way hashing algorithm with a configurable work factor (salt rounds). It prevents rainbow table attacks and brute force by being computationally slow.

**Q: What is JWT?**
A: JSON Web Token — a signed token containing user info (id, role) that the server issues on login. The client sends it in the Authorization header. The server verifies the signature without hitting the database on every request.

**Q: How does QR attendance work?**
A: When a member registers, a QR code is generated using the `qrcode` npm package, encoding their member ID. The frontend uses `jsQR` to decode the webcam feed. On decode, it calls POST /api/attendance/mark with the member ID.

**Q: What is MVC architecture?**
A: Model–View–Controller. In this project: Models = MySQL tables, Views = HTML/CSS/JS frontend, Controllers = Express controller functions that handle business logic.

**Q: How is BMI calculated?**
A: BMI = weight(kg) / (height(m))². Categories: <18.5 Underweight, 18.5–24.9 Normal, 25–29.9 Overweight, ≥30 Obese.

**Q: What is a connection pool?**
A: Instead of opening a new DB connection per request, mysql2 maintains a pool of reusable connections (default 10), reducing latency and DB overhead.

---

## 🛠️ TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| `ER_ACCESS_DENIED_ERROR` | Check DB_PASSWORD in .env |
| `ECONNREFUSED` on port 5000 | Backend server is not running. Run `npm run dev` |
| CORS error in browser | Ensure backend is running and FRONTEND_URL is correct in .env |
| `Cannot find module 'bcrypt'` | Run `npm install` in backend/ folder |
| QR scanner not working | HTTPS required for camera on some browsers. Use Live Server. |
| Tables not found | Run schema.sql in MySQL Workbench first |
