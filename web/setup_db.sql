-- =====================================================
-- EcoSphere ESG Management Platform
-- MySQL Schema (adapted from PostgreSQL)
-- Run: mysql -u root < setup_db.sql
-- =====================================================

CREATE DATABASE IF NOT EXISTS ecosphere CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecosphere;

-- ===================== CORE TABLES =====================

CREATE TABLE IF NOT EXISTS attachments (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_type         VARCHAR(50) NOT NULL,
    entity_id           BIGINT NOT NULL,
    file_name           VARCHAR(255) NOT NULL,
    storage_url         TEXT NOT NULL,
    mime_type           VARCHAR(100),
    file_size_bytes     BIGINT,
    uploaded_by         BIGINT,
    uploaded_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    description         TEXT
);

CREATE TABLE IF NOT EXISTS system_settings (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    `key`       VARCHAR(100) UNIQUE NOT NULL,
    value       JSON,
    description TEXT,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by  BIGINT
);

-- ===================== USER & DEPARTMENT =====================

-- Users table (departments FK added after departments table created)
CREATE TABLE IF NOT EXISTS users (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    password_hash       TEXT NOT NULL,
    role                ENUM('admin', 'ceo', 'departmental_head', 'employee') NOT NULL DEFAULT 'employee',
    department_id       BIGINT,
    phone               VARCHAR(30),
    avatar_url          TEXT,
    gender              VARCHAR(20),
    date_of_birth       DATE,
    esg_points_balance  INT DEFAULT 0,
    total_xp            INT DEFAULT 0,
    status              ENUM('active', 'inactive', 'draft', 'archived') DEFAULT 'active',
    joined_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at       DATETIME,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    name                 VARCHAR(100) NOT NULL,
    code                 VARCHAR(20) UNIQUE NOT NULL,
    head_user_id         BIGINT,
    parent_department_id BIGINT,
    employee_count       INT DEFAULT 0,
    description          TEXT,
    location             VARCHAR(150),
    status               ENUM('active', 'inactive', 'draft', 'archived') DEFAULT 'active',
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_dept_head FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_dept_parent FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL
);

ALTER TABLE users
    ADD CONSTRAINT fk_users_department
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- ===================== MASTER DATA =====================

CREATE TABLE IF NOT EXISTS categories (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    type        ENUM('csr_activity', 'challenge', 'esg_category') NOT NULL,
    description TEXT,
    status      ENUM('active', 'inactive', 'draft', 'archived') DEFAULT 'active',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emission_factors (
    id                        BIGINT AUTO_INCREMENT PRIMARY KEY,
    name                      VARCHAR(150) NOT NULL,
    scope                     ENUM('1', '2', '3'),
    category                  VARCHAR(100),
    value_kgco2e_per_unit     DECIMAL(12, 4) NOT NULL,
    unit                      VARCHAR(50) NOT NULL,
    source                    VARCHAR(100),
    valid_from                DATE,
    valid_to                  DATE,
    status                    ENUM('active', 'inactive', 'draft', 'archived') DEFAULT 'active',
    created_at                DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id                                BIGINT AUTO_INCREMENT PRIMARY KEY,
    name                              VARCHAR(200) NOT NULL,
    sku                               VARCHAR(50) UNIQUE,
    category                          VARCHAR(100),
    carbon_footprint_kgco2e_per_unit  DECIMAL(12, 4),
    esg_metrics                       JSON,
    certifications                    JSON,
    status                            ENUM('active', 'inactive', 'draft', 'archived') DEFAULT 'active',
    created_at                        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at                        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS environmental_goals (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    name              VARCHAR(200) NOT NULL,
    department_id     BIGINT,
    target_value      DECIMAL(15, 2) NOT NULL,
    current_value     DECIMAL(15, 2) DEFAULT 0,
    baseline_value    DECIMAL(15, 2),
    unit              VARCHAR(50) NOT NULL,
    deadline          DATE NOT NULL,
    progress_percent  DECIMAL(5, 2) DEFAULT 0,
    status            VARCHAR(30) DEFAULT 'active',
    description       TEXT,
    created_by        BIGINT,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_goal_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_goal_user FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS esg_policies (
    id                        BIGINT AUTO_INCREMENT PRIMARY KEY,
    title                     VARCHAR(200) NOT NULL,
    category                  VARCHAR(50),
    version                   VARCHAR(20) DEFAULT '1.0',
    content                   TEXT,
    effective_date            DATE NOT NULL,
    expiry_date               DATE,
    requires_acknowledgement  TINYINT(1) DEFAULT 1,
    status                    ENUM('active', 'inactive', 'draft', 'archived') DEFAULT 'active',
    created_by                BIGINT,
    approved_by               BIGINT,
    created_at                DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at                DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_policy_creator FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_policy_approver FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS badges (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    description   TEXT,
    icon_url      TEXT,
    unlock_rule   JSON NOT NULL,
    auto_award    TINYINT(1) DEFAULT 1,
    status        ENUM('active', 'inactive', 'draft', 'archived') DEFAULT 'active',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rewards (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    name              VARCHAR(150) NOT NULL,
    description       TEXT,
    points_required   INT NOT NULL,
    stock_quantity    INT DEFAULT 0,
    category          VARCHAR(50),
    image_url         TEXT,
    status            ENUM('active', 'inactive', 'draft', 'archived') DEFAULT 'active',
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===================== TRANSACTIONAL DATA =====================

CREATE TABLE IF NOT EXISTS carbon_transactions (
    id                          BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_date            DATE NOT NULL,
    source_type                 ENUM('purchase', 'manufacturing', 'expense', 'fleet', 'manual_entry', 'other') NOT NULL,
    source_reference            VARCHAR(100),
    source_description          TEXT,
    emission_factor_id          BIGINT,
    quantity                    DECIMAL(15, 4) NOT NULL,
    calculated_emissions_kgco2e DECIMAL(15, 4) NOT NULL,
    department_id               BIGINT,
    scope                       VARCHAR(10),
    product_id                  BIGINT,
    lifecycle_stage             ENUM('raw_material_sourcing', 'inbound_transport', 'manufacturing_production', 'outbound_transport_distribution', 'packaging', 'use_phase', 'end_of_life', 'other'),
    notes                       TEXT,
    created_by                  BIGINT,
    created_at                  DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ct_emission_factor FOREIGN KEY (emission_factor_id) REFERENCES emission_factors(id),
    CONSTRAINT fk_ct_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_ct_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT fk_ct_user FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS product_lifecycle_emissions (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id            BIGINT NOT NULL,
    lifecycle_stage       ENUM('raw_material_sourcing', 'inbound_transport', 'manufacturing_production', 'outbound_transport_distribution', 'packaging', 'use_phase', 'end_of_life', 'other') NOT NULL,
    emissions_kgco2e      DECIMAL(15, 4) NOT NULL,
    source_type           ENUM('purchase', 'manufacturing', 'expense', 'fleet', 'manual_entry', 'other'),
    carbon_transaction_id BIGINT,
    calculation_method    VARCHAR(50) DEFAULT 'measured',
    valid_from            DATE,
    valid_to              DATE,
    notes                 TEXT,
    created_by            BIGINT,
    created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_product_stage_from (product_id, lifecycle_stage, valid_from),
    CONSTRAINT fk_ple_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_ple_ct FOREIGN KEY (carbon_transaction_id) REFERENCES carbon_transactions(id) ON DELETE SET NULL,
    CONSTRAINT fk_ple_user FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS csr_activities (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    category_id         BIGINT,
    scheduled_date      DATE,
    location            TEXT,
    max_participants    INT,
    evidence_required   TINYINT(1) DEFAULT 1,
    points_awarded      INT DEFAULT 50,
    status              VARCHAR(30) DEFAULT 'upcoming',
    created_by          BIGINT,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_csr_cat FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT fk_csr_user FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS employee_csr_participations (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    csr_activity_id     BIGINT NOT NULL,
    joined_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    completion_date     DATE,
    proof_attachment_id BIGINT,
    approval_status     ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    points_earned       INT DEFAULT 0,
    approved_by         BIGINT,
    approved_at         DATETIME,
    rejection_reason    TEXT,
    UNIQUE KEY uq_emp_csr (user_id, csr_activity_id),
    CONSTRAINT fk_ecsr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ecsr_activity FOREIGN KEY (csr_activity_id) REFERENCES csr_activities(id) ON DELETE CASCADE,
    CONSTRAINT fk_ecsr_proof FOREIGN KEY (proof_attachment_id) REFERENCES attachments(id),
    CONSTRAINT fk_ecsr_approver FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS challenges (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    category_id         BIGINT,
    xp_reward           INT NOT NULL DEFAULT 100,
    difficulty          ENUM('easy', 'medium', 'hard'),
    evidence_required   TINYINT(1) DEFAULT 1,
    start_date          DATE,
    end_date            DATE NOT NULL,
    status              ENUM('draft', 'active', 'under_review', 'completed', 'archived') DEFAULT 'draft',
    max_participants    INT,
    created_by          BIGINT,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ch_cat FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT fk_ch_user FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS challenge_participations (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    challenge_id        BIGINT NOT NULL,
    joined_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    progress_percent    DECIMAL(5, 2) DEFAULT 0,
    proof_attachment_id BIGINT,
    approval_status     ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    xp_awarded          INT DEFAULT 0,
    approved_by         BIGINT,
    completed_at        DATETIME,
    UNIQUE KEY uq_cp (user_id, challenge_id),
    CONSTRAINT fk_cp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cp_challenge FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    CONSTRAINT fk_cp_proof FOREIGN KEY (proof_attachment_id) REFERENCES attachments(id),
    CONSTRAINT fk_cp_approver FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS policy_acknowledgements (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    policy_id           BIGINT NOT NULL,
    acknowledged_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    policy_version      VARCHAR(20),
    ip_address          VARCHAR(45),
    user_agent          TEXT,
    UNIQUE KEY uq_pa (user_id, policy_id, policy_version),
    CONSTRAINT fk_pa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pa_policy FOREIGN KEY (policy_id) REFERENCES esg_policies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audits (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    title                VARCHAR(200) NOT NULL,
    audit_type           VARCHAR(50),
    department_id        BIGINT,
    auditor_user_id      BIGINT,
    external_auditor     VARCHAR(150),
    start_date           DATE,
    end_date             DATE,
    findings_summary     TEXT,
    num_issues           INT DEFAULT 0,
    status               ENUM('planned', 'in_progress', 'completed', 'under_review') DEFAULT 'planned',
    report_attachment_id BIGINT,
    created_by           BIGINT,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_user FOREIGN KEY (auditor_user_id) REFERENCES users(id),
    CONSTRAINT fk_audit_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS compliance_issues (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    audit_id            BIGINT,
    title               VARCHAR(200) NOT NULL,
    description         TEXT NOT NULL,
    severity            ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    department_id       BIGINT,
    owner_user_id       BIGINT NOT NULL,
    due_date            DATE NOT NULL,
    status              ENUM('open', 'in_progress', 'resolved', 'overdue') DEFAULT 'open',
    resolution_notes    TEXT,
    resolved_at         DATETIME,
    flagged_overdue     TINYINT(1) DEFAULT 0,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ci_audit FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE SET NULL,
    CONSTRAINT fk_ci_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_ci_owner FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS department_esg_scores (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    department_id       BIGINT NOT NULL,
    as_of_date          DATE NOT NULL DEFAULT (CURRENT_DATE),
    environmental_score DECIMAL(5, 2),
    social_score        DECIMAL(5, 2),
    governance_score    DECIMAL(5, 2),
    total_score         DECIMAL(5, 2),
    `rank`              INT,
    calculated_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_dept_score (department_id, as_of_date),
    CONSTRAINT fk_des_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- ===================== GAMIFICATION =====================

CREATE TABLE IF NOT EXISTS user_badges (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT NOT NULL,
    badge_id         BIGINT NOT NULL,
    awarded_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    awarded_reason   TEXT,
    UNIQUE KEY uq_ub (user_id, badge_id),
    CONSTRAINT fk_ub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ub_badge FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id           BIGINT NOT NULL,
    reward_id         BIGINT NOT NULL,
    redeemed_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    points_deducted   INT NOT NULL,
    status            ENUM('pending', 'fulfilled', 'cancelled') DEFAULT 'pending',
    fulfilled_by      BIGINT,
    fulfilled_at      DATETIME,
    notes             TEXT,
    CONSTRAINT fk_rr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_reward FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_fulfiller FOREIGN KEY (fulfilled_by) REFERENCES users(id)
);

-- ===================== NOTIFICATIONS =====================

CREATE TABLE IF NOT EXISTS notifications (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    type                ENUM('new_compliance_issue','csr_approval_decision','challenge_approval_decision','policy_acknowledgement_reminder','badge_unlocked','goal_deadline_approaching','reward_redemption','new_carbon_transaction') NOT NULL,
    title               VARCHAR(200) NOT NULL,
    message             TEXT NOT NULL,
    action_url          TEXT,
    related_entity_type VARCHAR(50),
    related_entity_id   BIGINT,
    is_read             TINYINT(1) DEFAULT 0,
    read_at             DATETIME,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===================== TRAINING =====================

CREATE TABLE IF NOT EXISTS employee_trainings (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    training_name       VARCHAR(200) NOT NULL,
    category            VARCHAR(50),
    completion_date     DATE NOT NULL,
    hours               DECIMAL(5, 2),
    certificate_url     TEXT,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_et_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===================== INDEXES =====================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_carbon_trans_product ON carbon_transactions(product_id, lifecycle_stage);
CREATE INDEX idx_lifecycle_product ON product_lifecycle_emissions(product_id, lifecycle_stage);
CREATE INDEX idx_compliance_due ON compliance_issues(due_date, status);

-- ===================== SEED DATA =====================
-- Seed admin user: email=admin@ecosphere.com password=Admin@123
-- Password hash for 'Admin@123' with bcrypt cost 12
INSERT IGNORE INTO users (name, email, password_hash, role, status)
VALUES (
    'System Administrator',
    'admin@ecosphere.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TsntZ2Gy9vMD6YXRL8eY7cKQWQRa',
    'admin',
    'active'
);
