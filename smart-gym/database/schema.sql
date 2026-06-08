-- ============================================================
-- Smart Gym Management System - Database Schema
-- Run this file in MySQL Workbench or mysql CLI
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_gym;
USE smart_gym;

-- ============================================================
-- TABLE: users
-- Stores login credentials and role info
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,          -- bcrypt hashed
    role ENUM('admin', 'member') DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: members
-- Extended profile for gym members
-- ============================================================
CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    age INT,
    phone VARCHAR(20),
    plan ENUM('basic', 'standard', 'premium') DEFAULT 'basic',
    join_date DATE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    qr_code TEXT,                            -- base64 QR string
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE: attendance
-- Records daily QR-based check-ins
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('present', 'absent') DEFAULT 'present',
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE: payments
-- Tracks fee payments and dues
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    status ENUM('paid', 'pending') DEFAULT 'pending',
    notes VARCHAR(255),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE: workouts
-- Workout plans assigned by admin to members
-- ============================================================
CREATE TABLE IF NOT EXISTS workouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    plan_name VARCHAR(100),
    plan_details TEXT,                       -- JSON or text description
    assigned_date DATE,
    assigned_by INT,                         -- admin user_id
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLE: progress
-- BMI and body progress history
-- ============================================================
CREATE TABLE IF NOT EXISTS progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    height DECIMAL(5, 2) NOT NULL,           -- in cm
    weight DECIMAL(5, 2) NOT NULL,           -- in kg
    bmi DECIMAL(4, 2),                       -- calculated
    date DATE NOT NULL,
    notes VARCHAR(255),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- ============================================================
-- SAMPLE DATA: Admin User
-- Password: admin123 (bcrypt hash below)
-- ============================================================
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@smartgym.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- ============================================================
-- SAMPLE DATA: Member Users
-- Password for all: password123
-- ============================================================
INSERT INTO users (name, email, password, role) VALUES
('Rajesh Kumar',   'rajesh@example.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member'),
('Priya Sharma',   'priya@example.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member'),
('Amit Singh',     'amit@example.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member'),
('Neha Patel',     'neha@example.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member'),
('Suresh Reddy',   'suresh@example.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member');

-- ============================================================
-- SAMPLE DATA: Member profiles
-- ============================================================
INSERT INTO members (user_id, age, phone, plan, join_date, status) VALUES
(2, 28, '9876543210', 'premium',  '2025-01-15', 'active'),
(3, 24, '9123456780', 'standard', '2025-02-01', 'active'),
(4, 32, '9988776655', 'basic',    '2025-01-20', 'active'),
(5, 26, '9001122334', 'premium',  '2025-03-10', 'active'),
(6, 30, '9445566778', 'standard', '2025-02-15', 'inactive');

-- ============================================================
-- SAMPLE DATA: Attendance (last 7 days)
-- ============================================================
INSERT INTO attendance (member_id, date, status) VALUES
(1, CURDATE() - INTERVAL 6 DAY, 'present'),
(1, CURDATE() - INTERVAL 5 DAY, 'present'),
(1, CURDATE() - INTERVAL 3 DAY, 'present'),
(2, CURDATE() - INTERVAL 6 DAY, 'present'),
(2, CURDATE() - INTERVAL 4 DAY, 'present'),
(3, CURDATE() - INTERVAL 2 DAY, 'present'),
(4, CURDATE() - INTERVAL 1 DAY, 'present'),
(1, CURDATE(), 'present');

-- ============================================================
-- SAMPLE DATA: Payments
-- ============================================================
INSERT INTO payments (member_id, amount, date, status, notes) VALUES
(1, 2500.00, '2025-01-15', 'paid',    'January membership - Premium'),
(1, 2500.00, '2025-02-15', 'paid',    'February membership - Premium'),
(1, 2500.00, '2025-03-15', 'pending', 'March membership - Premium'),
(2, 1800.00, '2025-02-01', 'paid',    'February membership - Standard'),
(2, 1800.00, '2025-03-01', 'pending', 'March membership - Standard'),
(3, 1200.00, '2025-01-20', 'paid',    'January membership - Basic'),
(4, 2500.00, '2025-03-10', 'paid',    'March membership - Premium'),
(5, 1800.00, '2025-02-15', 'pending', 'February membership - Standard');

-- ============================================================
-- SAMPLE DATA: Workout Plans
-- ============================================================
INSERT INTO workouts (member_id, plan_name, plan_details, assigned_date, assigned_by) VALUES
(1, 'Muscle Building', '{"days":{"Monday":"Chest & Triceps: Bench Press 4x10, Incline DB Press 3x12, Tricep Dips 3x15","Wednesday":"Back & Biceps: Deadlift 4x8, Pull-ups 3x10, Barbell Curl 3x12","Friday":"Legs & Shoulders: Squats 4x10, Leg Press 3x12, Shoulder Press 3x10"}}', '2025-01-20', 1),
(2, 'Weight Loss',     '{"days":{"Monday":"Cardio + Core: 30min Treadmill, Plank 3x60sec, Crunches 3x20","Tuesday":"Full Body Circuit: Jumping Jacks, Burpees, Mountain Climbers","Thursday":"HIIT: 20min High Intensity Interval Training + Stretching","Saturday":"Light Yoga + Breathing Exercises"}}', '2025-02-05', 1),
(3, 'Beginner Fitness','{"days":{"Monday":"Upper Body: Push-ups 3x10, DB Rows 3x10, Shoulder Raises 2x15","Wednesday":"Lower Body: Bodyweight Squats 3x15, Lunges 3x10, Calf Raises 3x20","Friday":"Cardio: 20min Walk/Jog, Stretching"}}', '2025-01-25', 1);

-- ============================================================
-- SAMPLE DATA: Progress / BMI
-- ============================================================
INSERT INTO progress (member_id, height, weight, bmi, date) VALUES
(1, 175.00, 80.00, 26.12, '2025-01-15'),
(1, 175.00, 78.50, 25.63, '2025-02-15'),
(1, 175.00, 76.00, 24.82, '2025-03-15'),
(2, 162.00, 65.00, 24.77, '2025-02-01'),
(2, 162.00, 63.00, 24.01, '2025-03-01'),
(3, 170.00, 90.00, 31.14, '2025-01-20'),
(3, 170.00, 87.50, 30.27, '2025-02-20'),
(4, 168.00, 58.00, 20.55, '2025-03-10');
