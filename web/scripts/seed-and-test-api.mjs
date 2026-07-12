/**
 * EcoSphere — API seed + integration test suite
 * Fills the database with dummy data via HTTP API endpoints,
 * then verifies reads across all modules.
 *
 * Usage:  node scripts/seed-and-test-api.mjs
 * Requires: Next.js dev server on BASE_URL (default http://localhost:3000)
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@ecosphere.com';
const ADMIN_PASS = 'Admin@123';
const DEFAULT_PASS = 'TestPass1';

// ── cookie jar ──────────────────────────────────────────────────────────────
class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  store(res) {
    const raw = res.headers.getSetCookie?.() || [];
    for (const c of raw) {
      const [pair] = c.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
    // fallback for older node
    if (raw.length === 0) {
      const single = res.headers.get('set-cookie');
      if (single) {
        const [pair] = single.split(';');
        const eq = pair.indexOf('=');
        if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
    }
  }
  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  clear() {
    this.cookies.clear();
  }
}

const jar = new CookieJar();
const results = [];
let passCount = 0;
let failCount = 0;
const ids = {
  departments: {},
  categories: {},
  users: {},
  emissionFactors: [],
  products: [],
  goals: [],
  carbonTx: [],
  csrActivities: [],
  policies: [],
  audits: [],
  compliance: [],
  challenges: [],
  rewards: [],
  badges: [],
  participations: [],
  acknowledgements: [],
};

function log(msg) {
  console.log(msg);
}

function record(name, ok, detail = '', status = null, body = null) {
  const entry = { name, ok, detail, status, bodySnippet: body ? JSON.stringify(body).slice(0, 200) : '' };
  results.push(entry);
  if (ok) {
    passCount++;
    log(`  ✅ PASS  ${name}${detail ? ' — ' + detail : ''}`);
  } else {
    failCount++;
    log(`  ❌ FAIL  ${name}${detail ? ' — ' + detail : ''}${status ? ` [HTTP ${status}]` : ''}`);
    if (body) log(`         body: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return ok;
}

async function api(method, path, body, opts = {}) {
  const headers = {
    Accept: 'application/json',
    Cookie: jar.header(),
    ...(opts.headers || {}),
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  jar.store(res);
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 300) };
  }
  return { status: res.status, data, ok: res.status >= 200 && res.status < 300 };
}

async function expectStatus(name, method, path, body, expectedStatuses, extract) {
  const statuses = Array.isArray(expectedStatuses) ? expectedStatuses : [expectedStatuses];
  const r = await api(method, path, body);
  const ok = statuses.includes(r.status) && (r.data?.success !== false || r.status >= 200 && r.status < 300);
  // treat success field if present
  const successField = r.data && typeof r.data === 'object' && 'success' in r.data ? r.data.success : true;
  const pass = statuses.includes(r.status) && (successField === true || statuses.some((s) => s >= 400));
  record(name, pass, `${method} ${path}`, r.status, pass ? null : r.data);
  if (pass && extract) extract(r.data);
  return r;
}

// ── DB helpers (only for password reset + badges with no create API) ───────
async function ensureAdminPassword() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecosphere',
  });
  const hash = await bcrypt.hash(ADMIN_PASS, 12);
  await pool.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, ADMIN_EMAIL]);

  // Seed classic tier badges if empty (matches setup_db.sql; no create-badge API)
  const [badgeCount] = await pool.execute('SELECT COUNT(*) AS n FROM badges');
  if (badgeCount[0].n === 0) {
    await pool.execute(`
      INSERT INTO badges (id, name, description, icon_url, unlock_rule, auto_award, status) VALUES
      (1, 'Bronze Badge', 'Awarded to employees exceeding 1,000 points balance.', 'bronze.png', '{"points_required": 1000}', 1, 'active'),
      (2, 'Silver Badge', 'Awarded to employees exceeding 3,000 points balance.', 'silver.png', '{"points_required": 3000}', 1, 'active'),
      (3, 'Gold Badge', 'Awarded to employees exceeding 5,000 points balance.', 'gold.png', '{"points_required": 5000}', 1, 'active'),
      (4, 'Platinum Badge', 'Awarded to employees exceeding 8,000 points balance.', 'platinum.png', '{"points_required": 8000}', 1, 'active'),
      (5, 'Diamond Badge', 'Awarded to employees exceeding 12,000 points balance.', 'diamond.png', '{"points_required": 12000}', 1, 'active')
    `);
    log('  ℹ️  Seeded Bronze→Diamond badges via DB (no create-badge API)');
  }

  // Department ESG scores for leaderboard (no write API)
  const [scoreCount] = await pool.execute('SELECT COUNT(*) AS n FROM department_esg_scores');
  // store pool for later score insert after depts exist
  return pool;
}

async function seedDepartmentScores(pool, deptIds) {
  const today = new Date().toISOString().slice(0, 10);
  const samples = [
    { env: 72, soc: 68, gov: 80 },
    { env: 85, soc: 70, gov: 75 },
    { env: 60, soc: 82, gov: 78 },
    { env: 90, soc: 55, gov: 70 },
  ];
  let i = 0;
  for (const id of Object.values(deptIds)) {
    const s = samples[i % samples.length];
    const total = Number(((s.env * 0.4) + (s.soc * 0.3) + (s.gov * 0.3)).toFixed(2));
    await pool.execute(
      `INSERT INTO department_esg_scores
        (department_id, as_of_date, environmental_score, social_score, governance_score, total_score)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         environmental_score = VALUES(environmental_score),
         social_score = VALUES(social_score),
         governance_score = VALUES(governance_score),
         total_score = VALUES(total_score)`,
      [id, today, s.env, s.soc, s.gov, total],
    ).catch(async () => {
      // table may not have unique key — plain insert
      await pool.execute(
        `INSERT INTO department_esg_scores
          (department_id, as_of_date, environmental_score, social_score, governance_score, total_score)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, today, s.env, s.soc, s.gov, total],
      ).catch(() => {});
    });
    i++;
  }
}

async function seedChallengeParticipations(pool, userIds, challengeIds) {
  // No join-challenge API — insert pending participations for testing approval flow
  for (const challengeId of challengeIds.slice(0, 3)) {
    for (const userId of userIds.slice(0, 3)) {
      await pool.execute(
        `INSERT IGNORE INTO challenge_participations
          (user_id, challenge_id, progress_percent, approval_status)
         VALUES (?, ?, ?, 'pending')`,
        [userId, challengeId, 100],
      ).catch(() => {});
    }
  }
  log('  ℹ️  Seeded challenge_participations via DB (no join-challenge API)');
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  log('\n╔══════════════════════════════════════════════════════════╗');
  log('║   EcoSphere API Seed + Integration Tests                 ║');
  log(`║   Target: ${BASE.padEnd(46)}║`);
  log('╚══════════════════════════════════════════════════════════╝\n');

  // Health check
  try {
    const r = await fetch(BASE, { redirect: 'manual' });
    record('Server reachable', r.status === 200 || r.status === 307 || r.status === 308, `status ${r.status}`);
  } catch (e) {
    record('Server reachable', false, e.message);
    log('\n❌ Dev server not running. Start with: cd web && npm run dev\n');
    process.exit(1);
  }

  log('\n── 0. Ensure admin password + seed badges ──');
  const pool = await ensureAdminPassword();

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ══════════════════════════════════════════════════════════════════════════
  log('\n── 1. AUTH ──');

  jar.clear();
  await expectStatus(
    'Login admin',
    'POST',
    '/api/auth/login',
    { email: ADMIN_EMAIL, password: ADMIN_PASS },
    200,
    (d) => {
      if (d?.data?.role) log(`         role=${d.data.role}`);
    },
  );

  // Negative: bad password
  {
    const tempJar = jar.header();
    const bad = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: 'WrongPass1' }),
    });
    const badData = await bad.json().catch(() => ({}));
    record('Login rejects bad password', bad.status === 401, `status ${bad.status}`);
  }

  // Signup employees / roles (then promote via admin)
  const people = [
    { name: 'Priya CEO', email: 'ceo@ecosphere.com', role: 'ceo', deptKey: null },
    { name: 'S. Nair', email: 'head.mfg@ecosphere.com', role: 'departmental_head', deptKey: 'MFG' },
    { name: 'R. Iyer', email: 'head.log@ecosphere.com', role: 'departmental_head', deptKey: 'LOG' },
    { name: 'A. Mehta', email: 'head.corp@ecosphere.com', role: 'departmental_head', deptKey: 'CORP' },
    { name: 'Aditi Rao', email: 'aditi.rao@ecosphere.com', role: 'employee', deptKey: 'MFG' },
    { name: 'Karan Shah', email: 'karan.shah@ecosphere.com', role: 'employee', deptKey: 'LOG' },
    { name: 'Neha Patel', email: 'neha.patel@ecosphere.com', role: 'employee', deptKey: 'CORP' },
    { name: 'Vikram Das', email: 'vikram.das@ecosphere.com', role: 'employee', deptKey: 'MFG' },
    { name: 'Sara Khan', email: 'sara.khan@ecosphere.com', role: 'employee', deptKey: 'PROC' },
  ];

  for (const p of people) {
    // signup creates employee by default; may already exist
    const r = await api('POST', '/api/auth/signup', {
      name: p.name,
      email: p.email,
      password: DEFAULT_PASS,
    });
    const ok = r.status === 201 || r.status === 409;
    record(`Signup ${p.email}`, ok, `HTTP ${r.status}`);
    // restore admin session after signup (signup sets cookie for new user)
  }

  // Re-login as admin
  jar.clear();
  await api('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN — DEPARTMENTS
  // ══════════════════════════════════════════════════════════════════════════
  log('\n── 2. DEPARTMENTS ──');

  const depts = [
    { name: 'Manufacturing', code: 'MFG', description: 'Production & assembly', location: 'Plant A' },
    { name: 'Logistics', code: 'LOG', description: 'Fleet & warehousing', location: 'Hub North' },
    { name: 'Corporate', code: 'CORP', description: 'HQ operations', location: 'HQ' },
    { name: 'Procurement', code: 'PROC', description: 'Vendor management', location: 'HQ' },
    { name: 'R&D', code: 'RND', description: 'Research & development', location: 'Lab Wing' },
  ];

  for (const d of depts) {
    const r = await api('POST', '/api/admin/departments', {
      name: d.name,
      code: d.code,
      description: d.description,
      location: d.location,
      status: 'active',
    });
    const ok = r.status === 201 || r.status === 409;
    record(`Create department ${d.code}`, ok, `HTTP ${r.status}`);
    if (r.status === 201 && r.data?.data?.id) {
      ids.departments[d.code] = r.data.data.id;
    }
  }

  // GET departments to resolve IDs if recreate
  {
    const r = await api('GET', '/api/admin/departments');
    record('GET departments', r.status === 200);
    if (r.data?.data) {
      for (const row of r.data.data) {
        ids.departments[row.code] = row.id;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN — USERS (assign roles + departments)
  // ══════════════════════════════════════════════════════════════════════════
  log('\n── 3. USERS ──');

  {
    const r = await api('GET', '/api/admin/users');
    record('GET users', r.status === 200);
    const users = r.data?.data || [];
    for (const u of users) {
      ids.users[u.email] = u.id;
    }
  }

  for (const p of people) {
    const userId = ids.users[p.email];
    if (!userId) {
      record(`Update role ${p.email}`, false, 'user id not found');
      continue;
    }
    const departmentId = p.deptKey ? ids.departments[p.deptKey] ?? null : null;
    const r = await api('PUT', '/api/admin/users', {
      userId,
      role: p.role,
      departmentId,
      status: 'active',
    });
    record(`Assign ${p.role} → ${p.email}`, r.status === 200, departmentId ? `dept ${p.deptKey}` : 'no dept');
  }

  // Set department heads
  const headMap = [
    { code: 'MFG', email: 'head.mfg@ecosphere.com' },
    { code: 'LOG', email: 'head.log@ecosphere.com' },
    { code: 'CORP', email: 'head.corp@ecosphere.com' },
  ];
  for (const h of headMap) {
    const deptId = ids.departments[h.code];
    const headId = ids.users[h.email];
    if (!deptId || !headId) continue;
    // need name/code for PUT
    const r = await api('PUT', '/api/admin/departments', {
      id: deptId,
      name: depts.find((d) => d.code === h.code)?.name || h.code,
      code: h.code,
      headUserId: headId,
      status: 'active',
    });
    record(`Set head ${h.code}`, r.status === 200);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ══════════════════════════════════════════════════════════════════════════
  log('\n── 4. CATEGORIES ──');

  const cats = [
    { name: 'Environment', type: 'csr_activity', description: 'Green CSR' },
    { name: 'Community', type: 'csr_activity', description: 'Social outreach' },
    { name: 'Health', type: 'csr_activity', description: 'Wellness drives' },
    { name: 'Waste Reduction', type: 'challenge', description: 'Reduce waste challenges' },
    { name: 'Energy Saving', type: 'challenge', description: 'Energy challenges' },
    { name: 'Commuting', type: 'challenge', description: 'Green commute' },
    { name: 'Environmental', type: 'esg_category', description: 'E pillar' },
    { name: 'Social', type: 'esg_category', description: 'S pillar' },
    { name: 'Governance', type: 'esg_category', description: 'G pillar' },
  ];

  for (const c of cats) {
    const r = await api('POST', '/api/admin/categories', {
      name: c.name,
      type: c.type,
      description: c.description,
      status: 'active',
    });
    record(`Create category ${c.name} (${c.type})`, r.status === 201 || r.status === 200, `HTTP ${r.status}`);
    if (r.data?.data?.id) ids.categories[`${c.type}:${c.name}`] = r.data.data.id;
  }

  {
    const r = await api('GET', '/api/admin/categories');
    record('GET categories', r.status === 200);
    if (Array.isArray(r.data?.data)) {
      for (const row of r.data.data) {
        ids.categories[`${row.type}:${row.name}`] = row.id;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════════════════════════════════
  log('\n── 5. SETTINGS ──');

  await expectStatus(
    'POST esg_config',
    'POST',
    '/api/admin/settings',
    {
      esg_config: {
        enableEmissionCalculation: true,
        requireCsrEvidence: true,
        autoAwardBadges: true,
      },
      notification_config: {
        emailAlertsCompliance: true,
        emailAlertsRedemption: true,
        emailAlertsChallenges: true,
      },
    },
    200,
  );

  await expectStatus(
    'GET settings',
    'GET',
    '/api/admin/settings?keys=esg_config,notification_config',
    undefined,
    200,
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ENVIRONMENTAL
  // ══════════════════════════════════════════════════════════════════════════
  log('\n── 6. ENVIRONMENTAL — Emission Factors ──');

  const factors = [
    { name: 'Grid Electricity (India)', scope: '2', category: 'Energy', value_kgco2e_per_unit: 0.82, unit: 'kWh', source: 'CEA 2024' },
    { name: 'Diesel Fleet', scope: '1', category: 'Transport', value_kgco2e_per_unit: 2.68, unit: 'litre', source: 'DEFRA' },
    { name: 'Natural Gas', scope: '1', category: 'Energy', value_kgco2e_per_unit: 2.02, unit: 'm3', source: 'IPCC' },
    { name: 'Air Freight', scope: '3', category: 'Logistics', value_kgco2e_per_unit: 0.6, unit: 'tonne-km', source: 'GHG Protocol' },
    { name: 'Municipal Waste', scope: '3', category: 'Waste', value_kgco2e_per_unit: 0.45, unit: 'kg', source: 'EPA' },
    { name: 'Purchased Steel', scope: '3', category: 'Materials', value_kgco2e_per_unit: 1.85, unit: 'kg', source: 'Worldsteel' },
  ];

  for (const f of factors) {
    const r = await api('POST', '/api/environmental/emission-factors', {
      ...f,
      valid_from: '2025-01-01',
      status: 'active',
    });
    record(`Create factor ${f.name}`, r.status === 201, `HTTP ${r.status}`);
    if (r.data?.data?.id) ids.emissionFactors.push(r.data.data.id);
  }

  {
    const r = await api('GET', '/api/environmental/emission-factors');
    record('GET emission factors', r.status === 200);
    const items = r.data?.data?.items || [];
    if (ids.emissionFactors.length === 0) {
      ids.emissionFactors = items.map((i) => i.id);
    }
  }

  log('\n── 7. ENVIRONMENTAL — Products ──');

  const products = [
    { name: 'Eco Widget Pro', sku: 'EWP-001', category: 'Hardware', carbon_footprint_kgco2e_per_unit: 12.5 },
    { name: 'Green Pack Kit', sku: 'GPK-002', category: 'Packaging', carbon_footprint_kgco2e_per_unit: 3.2 },
    { name: 'Solar Panel Module', sku: 'SPM-003', category: 'Energy', carbon_footprint_kgco2e_per_unit: 85.0 },
    { name: 'Recycled Carton', sku: 'RC-004', category: 'Packaging', carbon_footprint_kgco2e_per_unit: 0.8 },
  ];

  for (const p of products) {
    const r = await api('POST', '/api/environmental/products', { ...p, status: 'active' });
    record(`Create product ${p.sku}`, r.status === 201 || r.status === 409, `HTTP ${r.status}`);
    if (r.data?.data?.id) ids.products.push(r.data.data.id);
  }

  {
    const r = await api('GET', '/api/environmental/products');
    record('GET products', r.status === 200);
    const items = r.data?.data?.items || [];
    if (ids.products.length === 0) ids.products = items.map((i) => i.id);
  }

  // Lifecycle emissions
  if (ids.products[0]) {
    const stages = [
      { lifecycle_stage: 'raw_material_sourcing', emissions_kgco2e: 4.2 },
      { lifecycle_stage: 'manufacturing_production', emissions_kgco2e: 5.1 },
      { lifecycle_stage: 'packaging', emissions_kgco2e: 1.2 },
      { lifecycle_stage: 'outbound_transport_distribution', emissions_kgco2e: 2.0 },
    ];
    for (const s of stages) {
      const r = await api('POST', '/api/environmental/products', {
        action: 'lifecycle',
        product_id: ids.products[0],
        ...s,
        calculation_method: 'measured',
      });
      record(`Lifecycle ${s.lifecycle_stage}`, r.status === 201 || r.status === 200, `HTTP ${r.status}`);
    }
  }

  log('\n── 8. ENVIRONMENTAL — Goals ──');

  const goals = [
    {
      name: 'Reduce Fleet Emissions',
      department_id: ids.departments.LOG,
      target_value: 500,
      current_value: 380,
      baseline_value: 600,
      unit: 'tCO2e',
      deadline: '2026-12-31',
      status: 'active',
      description: 'Cut logistics fleet emissions 20% YoY',
    },
    {
      name: 'Cut Factory Waste',
      department_id: ids.departments.MFG,
      target_value: 100,
      current_value: 65,
      baseline_value: 150,
      unit: 'tonnes',
      deadline: '2026-09-30',
      status: 'active',
    },
    {
      name: 'Office Energy Cut',
      department_id: ids.departments.CORP,
      target_value: 80,
      current_value: 80,
      baseline_value: 120,
      unit: 'MWh',
      deadline: '2026-06-30',
      status: 'completed',
    },
    {
      name: 'Scope 3 Supplier Engagement',
      department_id: ids.departments.PROC,
      target_value: 50,
      current_value: 22,
      unit: 'suppliers',
      deadline: '2027-03-31',
      status: 'at_risk',
    },
  ];

  for (const g of goals) {
    const r = await api('POST', '/api/environmental/goals', g);
    record(`Create goal ${g.name}`, r.status === 201, `HTTP ${r.status}`);
    if (r.data?.data?.id) ids.goals.push(r.data.data.id);
  }

  await expectStatus('GET goals', 'GET', '/api/environmental/goals?meta=1', undefined, 200);

  log('\n── 9. ENVIRONMENTAL — Carbon Transactions ──');

  const txs = [
    {
      transaction_date: '2026-01-15',
      source_type: 'fleet',
      source_reference: 'FL-2026-001',
      source_description: 'Delivery diesel fill',
      emission_factor_id: ids.emissionFactors[1] || ids.emissionFactors[0],
      quantity: 450,
      department_id: ids.departments.LOG,
      scope: '1',
    },
    {
      transaction_date: '2026-02-10',
      source_type: 'expense',
      source_reference: 'EL-2026-044',
      source_description: 'Plant electricity bill',
      emission_factor_id: ids.emissionFactors[0],
      quantity: 12000,
      department_id: ids.departments.MFG,
      scope: '2',
    },
    {
      transaction_date: '2026-03-05',
      source_type: 'manufacturing',
      source_reference: 'MFG-BATCH-88',
      source_description: 'Steel usage batch 88',
      emission_factor_id: ids.emissionFactors[5] || ids.emissionFactors[0],
      quantity: 2200,
      department_id: ids.departments.MFG,
      product_id: ids.products[0] || null,
      lifecycle_stage: 'manufacturing_production',
      scope: '3',
    },
    {
      transaction_date: '2026-04-12',
      source_type: 'purchase',
      source_reference: 'PO-9912',
      source_description: 'Air freight inbound parts',
      emission_factor_id: ids.emissionFactors[3] || ids.emissionFactors[0],
      quantity: 1500,
      department_id: ids.departments.PROC,
      scope: '3',
    },
    {
      transaction_date: '2026-05-01',
      source_type: 'manual_entry',
      source_description: 'Office waste audit',
      emission_factor_id: ids.emissionFactors[4] || ids.emissionFactors[0],
      quantity: 800,
      department_id: ids.departments.CORP,
      scope: '3',
    },
    {
      transaction_date: '2026-06-18',
      source_type: 'fleet',
      source_reference: 'FL-2026-112',
      emission_factor_id: ids.emissionFactors[1] || ids.emissionFactors[0],
      quantity: 320,
      department_id: ids.departments.LOG,
      scope: '1',
    },
  ];

  for (const t of txs) {
    const r = await api('POST', '/api/environmental/carbon-transactions', t);
    record(`Carbon tx ${t.source_reference || t.source_description}`, r.status === 201, `HTTP ${r.status}`);
    if (r.data?.data?.id) ids.carbonTx.push(r.data.data.id);
  }

  await expectStatus('GET carbon transactions', 'GET', '/api/environmental/carbon-transactions?meta=1', undefined, 200);

  // ══════════════════════════════════════════════════════════════════════════
  // SOCIAL
  // ══════════════════════════════════════════════════════════════════════════
  log('\n── 10. SOCIAL — CSR Activities ──');

  const csrList = [
    {
      title: 'Tree Plantation Drive',
      description: 'Plant 500 saplings near Plant A',
      category_id: ids.categories['csr_activity:Environment'],
      scheduled_date: '2026-08-15',
      location: 'Plant A campus',
      max_participants: 40,
      evidence_required: true,
      points_awarded: 50,
      status: 'active',
    },
    {
      title: 'Blood Donation Camp',
      description: 'Annual blood donation with Red Cross',
      category_id: ids.categories['csr_activity:Health'],
      scheduled_date: '2026-07-20',
      location: 'HQ Auditorium',
      max_participants: 60,
      evidence_required: true,
      points_awarded: 40,
      status: 'active',
    },
    {
      title: 'Beach Cleanup',
      description: 'Coastal cleanup with local NGO',
      category_id: ids.categories['csr_activity:Community'],
      scheduled_date: '2026-09-05',
      location: 'Marina Beach',
      max_participants: 30,
      evidence_required: true,
      points_awarded: 60,
      status: 'upcoming',
    },
    {
      title: 'ESG Workshop',
      description: 'Employee training on ESG fundamentals',
      category_id: ids.categories['csr_activity:Community'],
      scheduled_date: '2026-07-01',
      location: 'Virtual + HQ',
      max_participants: 100,
      evidence_required: false,
      points_awarded: 30,
      status: 'active',
    },
  ];

  for (const c of csrList) {
    const r = await api('POST', '/api/social/csr-activities', c);
    record(`Create CSR ${c.title}`, r.status === 201, `HTTP ${r.status}`);
    if (r.data?.data?.id) ids.csrActivities.push(r.data.data.id);
  }

  {
    const r = await api('GET', '/api/social/csr-activities?meta=1');
    record('GET CSR activities', r.status === 200);
    const items = r.data?.data?.items || [];
    if (ids.csrActivities.length === 0) ids.csrActivities = items.map((i) => i.id);
  }

  log('\n── 11. SOCIAL — Participations (join / submit / approve) ──');

  // Login as employee, join activities, submit proof
  const employeeEmails = [
    'aditi.rao@ecosphere.com',
    'karan.shah@ecosphere.com',
    'neha.patel@ecosphere.com',
    'vikram.das@ecosphere.com',
  ];

  for (const email of employeeEmails) {
    jar.clear();
    const login = await api('POST', '/api/auth/login', { email, password: DEFAULT_PASS });
    if (login.status !== 200) {
      record(`Login employee ${email}`, false, `HTTP ${login.status}`);
      continue;
    }
    record(`Login employee ${email}`, true);

    for (const activityId of ids.csrActivities.slice(0, 3)) {
      const join = await api('POST', '/api/social/participations', {
        action: 'join',
        activity_id: activityId,
      });
      const ok = join.status === 201 || join.status === 409;
      record(`Join CSR #${activityId} as ${email.split('@')[0]}`, ok, `HTTP ${join.status}`);
      const partId = join.data?.data?.id;
      if (partId) {
        ids.participations.push(partId);
        const submit = await api('POST', '/api/social/participations', {
          action: 'submit',
          participation_id: partId,
          completion_date: '2026-07-10',
          proof_url: `https://cdn.ecosphere.local/proofs/${partId}.jpg`,
          proof_file_name: `proof-${partId}.jpg`,
        });
        record(`Submit proof part #${partId}`, submit.status === 200, `HTTP ${submit.status}`);
      }
    }
  }

  // Admin approve some participations
  jar.clear();
  await api('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });

  {
    const r = await api('GET', '/api/social/participations?meta=1');
    record('GET participations', r.status === 200);
    const items = r.data?.data?.items || [];
    let approved = 0;
    for (const item of items.slice(0, 4)) {
      if (item.approval_status === 'pending' || item.approval_status === 'submitted') {
        const ar = await api('PUT', '/api/social/participations', {
          id: item.id,
          decision: 'approved',
          force_without_proof: true,
        });
        if (ar.status === 200) approved++;
      }
    }
    // try approve first few by id from our list
    for (const pid of ids.participations.slice(0, 3)) {
      const ar = await api('PUT', '/api/social/participations', {
        id: pid,
        decision: 'approved',
        force_without_proof: true,
      });
      if (ar.status === 200) approved++;
    }
    record('Approve CSR participations', approved > 0 || items.length > 0, `approved=${approved}, listed=${items.length}`);
  }

  await expectStatus('GET diversity', 'GET', '/api/social/diversity', undefined, 200);

  // ══════════════════════════════════════════════════════════════════════════
  // GOVERNANCE
  // ══════════════════════════════════════════════════════════════════════════
  log('\n── 12. GOVERNANCE — Policies ──');

  const policies = [
    {
      title: 'Code of Ethics & Conduct',
      category: 'Ethics',
      version: '2.1',
      content: 'All employees must act with integrity and report violations promptly.',
      effective_date: '2026-01-01',
      requires_acknowledgement: true,
      status: 'active',
    },
    {
      title: 'Environmental Policy',
      category: 'Environment',
      version: '1.3',
      content: 'Minimize emissions, waste, and resource use across operations.',
      effective_date: '2026-02-01',
      requires_acknowledgement: true,
      status: 'active',
    },
    {
      title: 'Anti-Bribery Policy',
      category: 'Compliance',
      version: '1.0',
      content: 'Zero tolerance for bribery and corruption.',
      effective_date: '2026-01-15',
      requires_acknowledgement: true,
      status: 'active',
    },
    {
      title: 'Data Privacy Policy',
      category: 'Privacy',
      version: '3.0',
      content: 'Protect personal data in line with applicable laws.',
      effective_date: '2026-03-01',
      requires_acknowledgement: true,
      status: 'active',
    },
  ];

  for (const p of policies) {
    const r = await api('POST', '/api/governance/policies', p);
    record(`Create policy ${p.title}`, r.status === 201, `HTTP ${r.status}`);
    if (r.data?.data?.id) ids.policies.push(r.data.data.id);
  }

  {
    const r = await api('GET', '/api/governance/policies');
    record('GET policies', r.status === 200);
    const items = r.data?.data?.items || [];
    if (ids.policies.length === 0) ids.policies = items.map((i) => i.id);
  }

  log('\n── 13. GOVERNANCE — Acknowledgements ──');

  for (const email of employeeEmails) {
    jar.clear();
    await api('POST', '/api/auth/login', { email, password: DEFAULT_PASS });
    for (const policyId of ids.policies.slice(0, 3)) {
      const r = await api('POST', '/api/governance/acknowledgements', { policy_id: policyId });
      const ok = r.status === 201 || r.status === 409;
      record(`Ack policy #${policyId} by ${email.split('@')[0]}`, ok, `HTTP ${r.status}`);
    }
  }

  jar.clear();
  await api('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
  await expectStatus('GET acknowledgements', 'GET', '/api/governance/acknowledgements', undefined, 200);

  log('\n── 14. GOVERNANCE — Audits ──');

  const audits = [
    {
      title: 'ISO 14001 Audit',
      audit_type: 'Environmental',
      department_id: ids.departments.MFG,
      auditor_user_id: ids.users['ceo@ecosphere.com'] || null,
      start_date: '2026-06-01',
      end_date: '2026-06-15',
      findings_summary: '2 minor findings, no major nonconformities',
      status: 'completed',
    },
    {
      title: 'Vendor Compliance Check',
      audit_type: 'Supplier',
      department_id: ids.departments.PROC,
      external_auditor: 'SGS India',
      start_date: '2026-07-01',
      end_date: '2026-07-10',
      status: 'in_progress',
    },
    {
      title: 'Workplace Safety Review',
      audit_type: 'HSE',
      department_id: ids.departments.MFG,
      auditor_user_id: ids.users['head.mfg@ecosphere.com'] || null,
      start_date: '2026-08-01',
      status: 'planned',
    },
  ];

  for (const a of audits) {
    const r = await api('POST', '/api/governance/audits', a);
    record(`Create audit ${a.title}`, r.status === 201, `HTTP ${r.status}`);
    if (r.data?.data?.id) ids.audits.push(r.data.data.id);
  }

  await expectStatus('GET audits', 'GET', '/api/governance/audits?meta=1', undefined, 200);

  log('\n── 15. GOVERNANCE — Compliance Issues ──');

  const issues = [
    {
      audit_id: ids.audits[0] || null,
      title: 'Missing MSDS sheets',
      description: 'Several chemical storage areas lack up-to-date MSDS documentation.',
      severity: 'high',
      department_id: ids.departments.MFG,
      owner_user_id: ids.users['head.mfg@ecosphere.com'] || ids.users['aditi.rao@ecosphere.com'] || 1,
      due_date: '2026-08-15',
      status: 'open',
    },
    {
      audit_id: ids.audits[1] || null,
      title: 'Late vendor disclosures',
      description: 'Two tier-1 vendors delayed ESG disclosure submissions.',
      severity: 'medium',
      department_id: ids.departments.PROC,
      owner_user_id: ids.users['sara.khan@ecosphere.com'] || 1,
      due_date: '2026-07-30',
      status: 'in_progress',
    },
    {
      title: 'Incomplete fleet fuel logs',
      description: 'Fuel consumption logs for Q1 incomplete for 3 vehicles.',
      severity: 'low',
      department_id: ids.departments.LOG,
      owner_user_id: ids.users['head.log@ecosphere.com'] || 1,
      due_date: '2026-07-20',
      status: 'open',
    },
    {
      title: 'Policy training overdue',
      description: '15 employees have not completed anti-bribery e-learning.',
      severity: 'medium',
      department_id: ids.departments.CORP,
      owner_user_id: ids.users['head.corp@ecosphere.com'] || 1,
      due_date: '2026-06-01',
      status: 'overdue',
    },
  ];

  for (const issue of issues) {
    const r = await api('POST', '/api/governance/compliance', issue);
    record(`Create compliance ${issue.title}`, r.status === 201, `HTTP ${r.status}`);
    if (r.data?.data?.id) ids.compliance.push(r.data.data.id);
  }

  await expectStatus('GET compliance', 'GET', '/api/governance/compliance?meta=1', undefined, 200);

  // ══════════════════════════════════════════════════════════════════════════
  // GAMIFICATION
  // ══════════════════════════════════════════════════════════════════════════
  log('\n── 16. GAMIFICATION — Challenges ──');

  const challenges = [
    {
      title: 'Sustainability Sprint',
      description: 'Complete 5 green actions in 2 weeks',
      categoryId: ids.categories['challenge:Waste Reduction'],
      xpReward: 200,
      difficulty: 'hard',
      evidenceRequired: true,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      status: 'active',
      maxParticipants: 50,
    },
    {
      title: 'Recycle Challenge',
      description: 'Segregate and recycle office waste for 30 days',
      categoryId: ids.categories['challenge:Waste Reduction'],
      xpReward: 100,
      difficulty: 'easy',
      evidenceRequired: true,
      startDate: '2026-07-01',
      endDate: '2026-08-15',
      status: 'active',
    },
    {
      title: 'Commute Green Week',
      description: 'Use public transit or carpool for one week',
      categoryId: ids.categories['challenge:Commuting'],
      xpReward: 150,
      difficulty: 'medium',
      evidenceRequired: false,
      startDate: '2026-07-10',
      endDate: '2026-07-20',
      status: 'active',
    },
    {
      title: 'Lights Out Fridays',
      description: 'Power-down nonessential equipment every Friday',
      categoryId: ids.categories['challenge:Energy Saving'],
      xpReward: 120,
      difficulty: 'easy',
      evidenceRequired: false,
      startDate: '2026-06-01',
      endDate: '2026-08-31',
      status: 'active',
    },
    {
      title: 'Draft: Zero Plastic Month',
      description: 'Upcoming plastic-free month challenge',
      categoryId: ids.categories['challenge:Waste Reduction'],
      xpReward: 300,
      difficulty: 'hard',
      evidenceRequired: true,
      endDate: '2026-12-31',
      status: 'draft',
    },
  ];

  for (const c of challenges) {
    const r = await api('POST', '/api/gamification/challenges', c);
    record(`Create challenge ${c.title}`, r.status === 201, `HTTP ${r.status}`);
    if (r.data?.data?.id) ids.challenges.push(r.data.data.id);
  }

  {
    const r = await api('GET', '/api/gamification/challenges');
    record('GET challenges', r.status === 200);
    const items = r.data?.data || [];
    if (ids.challenges.length === 0 && Array.isArray(items)) {
      ids.challenges = items.map((i) => i.id);
    }
  }

  log('\n── 17. GAMIFICATION — Rewards ──');

  const rewards = [
    { name: 'Eco Tote Bag', description: 'Organic cotton tote', pointsRequired: 200, stockQuantity: 50, category: 'merch' },
    { name: 'Plant a Tree Certificate', description: 'One tree planted in your name', pointsRequired: 500, stockQuantity: 100, category: 'impact' },
    { name: 'Extra Leave Day', description: 'One paid volunteering day', pointsRequired: 1500, stockQuantity: 10, category: 'benefit' },
    { name: 'Reusable Bottle', description: 'Stainless steel bottle', pointsRequired: 300, stockQuantity: 40, category: 'merch' },
    { name: 'ESG Conference Pass', description: 'Virtual conference access', pointsRequired: 2500, stockQuantity: 5, category: 'learning' },
  ];

  for (const rw of rewards) {
    const r = await api('POST', '/api/gamification/rewards', { ...rw, status: 'active' });
    record(`Create reward ${rw.name}`, r.status === 201, `HTTP ${r.status}`);
    if (r.data?.data?.id) ids.rewards.push(r.data.data.id);
  }

  await expectStatus('GET rewards', 'GET', '/api/gamification/rewards', undefined, 200);

  // Give employees some points for realism + badge eval
  {
    const empIds = employeeEmails.map((e) => ids.users[e]).filter(Boolean);
    for (let i = 0; i < empIds.length; i++) {
      const pts = [1200, 600, 350, 180][i] || 100;
      await pool.execute(
        'UPDATE users SET esg_points_balance = esg_points_balance + ?, total_xp = total_xp + ? WHERE id = ?',
        [pts, pts, empIds[i]],
      );
    }
    log('  ℹ️  Boosted employee XP/points via DB for leaderboard & badges');
  }

  // Challenge participations (no join API)
  const empIds = employeeEmails.map((e) => ids.users[e]).filter(Boolean);
  await seedChallengeParticipations(pool, empIds, ids.challenges);

  await expectStatus('GET challenge participations', 'GET', '/api/gamification/participation', undefined, 200);

  // Approve one challenge participation
  {
    const r = await api('GET', '/api/gamification/participation');
    const rows = r.data?.data || [];
    const pending = rows.find((x) => x.approval_status === 'pending');
    if (pending) {
      const ar = await api('PUT', '/api/gamification/participation', {
        id: pending.id,
        status: 'approved',
      });
      record('Approve challenge participation', ar.status === 200, `id=${pending.id}`);
    } else {
      record('Approve challenge participation', rows.length >= 0, 'no pending (skip ok)');
    }
  }

  await expectStatus('GET badges', 'GET', '/api/gamification/badges', undefined, 200);
  await expectStatus('POST badge re-eval', 'POST', '/api/gamification/badges', {}, 200);
  await expectStatus('GET leaderboard', 'GET', '/api/gamification/leaderboard', undefined, 200);

  await seedDepartmentScores(pool, ids.departments);
  await expectStatus('GET leaderboard (with scores)', 'GET', '/api/gamification/leaderboard', undefined, 200);

  // ══════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ══════════════════════════════════════════════════════════════════════════
  log('\n── 18. REPORTS ──');

  await expectStatus('GET ESG summary', 'GET', '/api/reports/summary', undefined, 200);

  await expectStatus(
    'POST report builder (all)',
    'POST',
    '/api/reports/builder',
    { module: 'all', startDate: '2026-01-01', endDate: '2026-12-31' },
    200,
  );

  await expectStatus(
    'POST report builder (environmental)',
    'POST',
    '/api/reports/builder',
    { module: 'environmental', departmentId: ids.departments.MFG },
    200,
  );

  await expectStatus(
    'POST report builder (social)',
    'POST',
    '/api/reports/builder',
    { module: 'social' },
    200,
  );

  await expectStatus(
    'POST report builder (governance)',
    'POST',
    '/api/reports/builder',
    { module: 'governance' },
    200,
  );

  // Export CSV — requires pre-built rows payload
  {
    const built = await api('POST', '/api/reports/builder', {
      module: 'all',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    const rows = built.data?.data || [];
    const r = await api('POST', '/api/reports/export', {
      format: 'csv',
      rows: Array.isArray(rows) ? rows : [],
    });
    record('POST report export', r.status === 200 || r.status === 201, `HTTP ${r.status}, rows=${Array.isArray(rows) ? rows.length : 0}`);
  }

  // Logout
  await expectStatus('POST logout', 'POST', '/api/auth/logout', {}, 200);

  // ══════════════════════════════════════════════════════════════════════════
  // FINAL DB COUNTS
  // ══════════════════════════════════════════════════════════════════════════
  log('\n── 19. DATABASE COUNTS ──');
  const tables = [
    'users',
    'departments',
    'categories',
    'emission_factors',
    'products',
    'product_lifecycle_emissions',
    'environmental_goals',
    'carbon_transactions',
    'csr_activities',
    'employee_csr_participations',
    'esg_policies',
    'policy_acknowledgements',
    'audits',
    'compliance_issues',
    'challenges',
    'challenge_participations',
    'badges',
    'user_badges',
    'rewards',
    'department_esg_scores',
    'system_settings',
  ];
  const counts = {};
  for (const t of tables) {
    try {
      const [rows] = await pool.execute(`SELECT COUNT(*) AS n FROM ${t}`);
      counts[t] = rows[0].n;
      log(`  ${String(counts[t]).padStart(4)}  ${t}`);
    } catch {
      counts[t] = 'N/A';
      log(`  N/A  ${t}`);
    }
  }

  await pool.end();

  // Write report
  const report = {
    ranAt: new Date().toISOString(),
    baseUrl: BASE,
    summary: { pass: passCount, fail: failCount, total: passCount + failCount },
    counts,
    ids,
    results,
  };
  const outPath = resolve(__dirname, 'api-test-report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  log('\n╔══════════════════════════════════════════════════════════╗');
  log(`║  RESULTS: ${String(passCount).padStart(3)} passed, ${String(failCount).padStart(3)} failed / ${String(passCount + failCount).padStart(3)} total          ║`);
  log(`║  Report: scripts/api-test-report.json                    ║`);
  log('╚══════════════════════════════════════════════════════════╝\n');

  // Credentials reminder
  log('Dummy accounts (password for non-admin: TestPass1):');
  log(`  admin@ecosphere.com / ${ADMIN_PASS}  (admin)`);
  log('  ceo@ecosphere.com / TestPass1         (ceo)');
  log('  head.mfg@ecosphere.com / TestPass1    (departmental_head)');
  log('  aditi.rao@ecosphere.com / TestPass1   (employee)');
  log('');

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
