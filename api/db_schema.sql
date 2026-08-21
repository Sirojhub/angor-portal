-- ============================================================
-- ANGOR AGRO STAR PORTAL — Database Schema (MySQL / PostgreSQL)
-- ============================================================

-- 1. Foydalanuvchilar (Users)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employee',
    position VARCHAR(100) DEFAULT NULL,
    department VARCHAR(100) DEFAULT NULL,
    phone VARCHAR(30) DEFAULT NULL,
    avatar VARCHAR(10) DEFAULT 'AK',
    avatar_color VARCHAR(20) DEFAULT '#C8922A',
    hire_date DATE DEFAULT NULL,
    efficiency INT DEFAULT 75,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Topshiriqlar (Tasks)
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    assigned_to INT NOT NULL,
    assigned_name VARCHAR(100) NOT NULL,
    deadline DATE NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(50) DEFAULT 'Ishlab chiqarish',
    status VARCHAR(20) DEFAULT 'new',
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Hujjatlar (Documents)
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    version VARCHAR(20) DEFAULT 'v1',
    file_type VARCHAR(20) DEFAULT 'PDF',
    file_size VARCHAR(50) DEFAULT '—',
    file_path VARCHAR(255) DEFAULT NULL,
    uploaded_by INT NOT NULL,
    uploaded_name VARCHAR(100) NOT NULL,
    upload_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    description TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Mijozlar (Clients)
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    inn VARCHAR(50) DEFAULT NULL,
    country VARCHAR(100) DEFAULT 'O\'zbekiston',
    city VARCHAR(100) DEFAULT NULL,
    contact_person VARCHAR(100) DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    contract_number VARCHAR(50) DEFAULT NULL,
    ai_risk VARCHAR(20) DEFAULT 'low',
    risk_text TEXT DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Omborxona Mahsulotlari (Warehouse Items)
CREATE TABLE IF NOT EXISTS warehouse_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(20) DEFAULT 'tonna',
    current_stock DOUBLE NOT NULL DEFAULT 0,
    min_stock DOUBLE NOT NULL DEFAULT 0,
    max_stock DOUBLE NOT NULL DEFAULT 1000,
    location VARCHAR(100) DEFAULT NULL,
    temperature INT DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'normal',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Omborxona Tranzaksiyalari (Warehouse Transactions)
CREATE TABLE IF NOT EXISTS warehouse_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'kirim' yoki 'chiqim'
    quantity DOUBLE NOT NULL,
    note TEXT DEFAULT NULL,
    date DATE NOT NULL,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES warehouse_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Laboratoriya Namunasi (Lab Samples)
CREATE TABLE IF NOT EXISTS lab_samples (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'tuproq', 'suv', 'hosil'
    location VARCHAR(150) NOT NULL,
    collection_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    collected_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Laboratoriya Natijalari (Lab Results)
CREATE TABLE IF NOT EXISTS lab_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sample_id INT NOT NULL,
    parameter VARCHAR(100) NOT NULL,
    value VARCHAR(50) NOT NULL,
    norm VARCHAR(50) NOT NULL,
    unit VARCHAR(20) DEFAULT '',
    is_ok TINYINT(1) DEFAULT 1,
    FOREIGN KEY (sample_id) REFERENCES lab_samples(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Bildirishnomalar (Notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info',
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Faoliyat Logi (Activity Logs)
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    model_id INT DEFAULT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- INITIAL SEED DATA
-- ============================================================

-- Primary Admin User (Password: REDACTED_OLD_PASSWORD)
INSERT INTO users (id, name, email, password, role, position, department, phone, avatar, avatar_color, hire_date, efficiency) VALUES
(1, 'Aziz Karimov', 'aziz@angor.uz', '$2y$10$8K1p/a0dL1LXMIgH.Y.1d.tD3lA3xXz0n5Yp7aK4U4r4r4r4r4r4r', 'director', 'Direktor', 'Boshqaruv', '+998 90 111-22-33', 'AK', '#C8922A', '2021-03-01', 98),
(2, 'Dilnoza Rahimova', 'dilnoza@angor.uz', '$2y$10$8K1p/a0dL1LXMIgH.Y.1d.tD3lA3xXz0n5Yp7aK4U4r4r4r4r4r4r', 'manager', 'Moliya menejeri', 'Moliya', '+998 90 222-33-44', 'DR', '#7c3aed', '2022-05-15', 87),
(3, 'Bobur Toshev', 'bobur@angor.uz', '$2y$10$8K1p/a0dL1LXMIgH.Y.1d.tD3lA3xXz0n5Yp7aK4U4r4r4r4r4r4r', 'employee', 'Agronom', 'Ishlab chiqarish', '+998 90 333-44-55', 'BT', '#2563eb', '2022-08-10', 92),
(4, 'Malika Yusupova', 'malika@angor.uz', '$2y$10$8K1p/a0dL1LXMIgH.Y.1d.tD3lA3xXz0n5Yp7aK4U4r4r4r4r4r4r', 'employee', 'Eksport menejeri', 'Eksport', '+998 90 444-55-66', 'MY', '#ea580c', '2022-11-20', 81),
(5, 'Jasur Ergashev', 'jasur@angor.uz', '$2y$10$8K1p/a0dL1LXMIgH.Y.1d.tD3lA3xXz0n5Yp7aK4U4r4r4r4r4r4r', 'employee', 'Omborchi', 'Omborxona', '+998 90 555-66-77', 'JE', '#16a34a', '2023-01-05', 74)
ON DUPLICATE KEY UPDATE id=id;
