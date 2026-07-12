/**
 * EcoSphere — rich demo data seed (API + light DB helpers)
 * Adds more users, products, carbon txs, CSR, challenges, policies,
 * audits, compliance, varied statuses, and points/badges for reports.
 *
 * Usage:  node scripts/seed-rich-demo.mjs
 * Requires: Next.js on BASE_URL (default http://localhost:3000)
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@ecosphere.com';
const ADMIN_PASS = 'Admin@123';
const PASS = 'TestPass1';

class Jar {
  constructor() {
    this.map = new Map();
  }
  store(res) {
    const list = res.headers.getSetCookie?.() || [];
    for (const c of list) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      if (i > 0) this.map.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }
  header() {
    return [...this.map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  clear() {
    this.map.clear();
  }
}

const jar = new Jar();
const ids = { depts: {}, users: {}, factors: [], products: [], csr: [], challenges: [], policies: [], audits: [] };

function log(m) {
  console.log(m);
}

async function api(method, path, body) {
  const headers = { Accept: 'application/json', Cookie: jar.header() };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  jar.store(res);
  let data = null;
  try {
    data = JSON.parse(await res.text());
  } catch {
    data = null;
  }
  return { status: res.status, data, ok: res.status >= 200 && res.status < 300 };
}

async function login(email, password) {
  jar.clear();
  return api('POST', '/api/auth/login', { email, password });
}

async function ensureAdmin(pool) {
  const hash = await bcrypt.hash(ADMIN_PASS, 12);
  await pool.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, ADMIN_EMAIL]);
}

async function main() {
  log('\n=== EcoSphere rich demo seed ===\n');

  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecosphere',
  });

  await ensureAdmin(pool);

  // Health
  try {
    await fetch(BASE, { redirect: 'manual' });
  } catch (e) {
    console.error('Server not reachable at', BASE, e.message);
    process.exit(1);
  }

  let r = await login(ADMIN_EMAIL, ADMIN_PASS);
  if (r.status !== 200) {
    console.error('Admin login failed', r.status, r.data);
    process.exit(1);
  }
  log('✓ Admin logged in');

  // ── Departments (ensure core set) ──────────────────────────────────────
  const depts = [
    { name: 'Manufacturing', code: 'MFG', description: 'Production', location: 'Plant A' },
    { name: 'Logistics', code: 'LOG', description: 'Fleet & warehouse', location: 'Hub North' },
    { name: 'Corporate', code: 'CORP', description: 'HQ', location: 'HQ' },
    { name: 'Procurement', code: 'PROC', description: 'Vendors', location: 'HQ' },
    { name: 'R&D', code: 'RND', description: 'Research', location: 'Lab' },
    { name: 'Sales', code: 'SLS', description: 'Commercial', location: 'HQ East' },
    { name: 'HR & People', code: 'HR', description: 'People ops', location: 'HQ' },
    { name: 'IT & Digital', code: 'IT', description: 'Technology', location: 'HQ' },
  ];
  for (const d of depts) {
    await api('POST', '/api/admin/departments', { ...d, status: 'active' });
  }
  r = await api('GET', '/api/admin/departments');
  for (const row of r.data?.data || []) ids.depts[row.code] = row.id;
  log(`✓ Departments: ${Object.keys(ids.depts).length}`);

  // ── Categories ─────────────────────────────────────────────────────────
  const cats = [
    { name: 'Environment', type: 'csr_activity' },
    { name: 'Community', type: 'csr_activity' },
    { name: 'Health', type: 'csr_activity' },
    { name: 'Education', type: 'csr_activity' },
    { name: 'Waste Reduction', type: 'challenge' },
    { name: 'Energy Saving', type: 'challenge' },
    { name: 'Commuting', type: 'challenge' },
    { name: 'Water Stewardship', type: 'challenge' },
    { name: 'Environmental', type: 'esg_category' },
    { name: 'Social', type: 'esg_category' },
    { name: 'Governance', type: 'esg_category' },
  ];
  for (const c of cats) {
    await api('POST', '/api/admin/categories', {
      name: c.name,
      type: c.type,
      description: `${c.name} category`,
      status: 'active',
    });
  }
  r = await api('GET', '/api/admin/categories');
  const catByKey = {};
  for (const row of r.data?.data || []) catByKey[`${row.type}:${row.name}`] = row.id;
  log(`✓ Categories: ${Object.keys(catByKey).length}`);

  // ── Users (many more) ──────────────────────────────────────────────────
  const people = [
    { name: 'Priya CEO', email: 'ceo@ecosphere.com', role: 'ceo', dept: null, points: 4200, xp: 4100 },
    { name: 'S. Nair', email: 'head.mfg@ecosphere.com', role: 'departmental_head', dept: 'MFG', points: 2800, xp: 2700 },
    { name: 'R. Iyer', email: 'head.log@ecosphere.com', role: 'departmental_head', dept: 'LOG', points: 2100, xp: 2000 },
    { name: 'A. Mehta', email: 'head.corp@ecosphere.com', role: 'departmental_head', dept: 'CORP', points: 1900, xp: 1850 },
    { name: 'P. Desai', email: 'head.sales@ecosphere.com', role: 'departmental_head', dept: 'SLS', points: 1600, xp: 1500 },
    { name: 'L. Fernandes', email: 'head.hr@ecosphere.com', role: 'departmental_head', dept: 'HR', points: 2400, xp: 2300 },
    { name: 'T. Gupta', email: 'head.it@ecosphere.com', role: 'departmental_head', dept: 'IT', points: 1750, xp: 1700 },
    { name: 'Aditi Rao', email: 'aditi.rao@ecosphere.com', role: 'employee', dept: 'MFG', points: 1350, xp: 1200 },
    { name: 'Karan Shah', email: 'karan.shah@ecosphere.com', role: 'employee', dept: 'LOG', points: 3200, xp: 3100 },
    { name: 'Neha Patel', email: 'neha.patel@ecosphere.com', role: 'employee', dept: 'CORP', points: 980, xp: 900 },
    { name: 'Vikram Das', email: 'vikram.das@ecosphere.com', role: 'employee', dept: 'MFG', points: 5100, xp: 5000 },
    { name: 'Sara Khan', email: 'sara.khan@ecosphere.com', role: 'employee', dept: 'PROC', points: 750, xp: 700 },
    { name: 'Rohit Verma', email: 'rohit.verma@ecosphere.com', role: 'employee', dept: 'SLS', points: 2100, xp: 2000 },
    { name: 'Ananya Iyer', email: 'ananya.iyer@ecosphere.com', role: 'employee', dept: 'HR', points: 4500, xp: 4400 },
    { name: 'Mohit Jain', email: 'mohit.jain@ecosphere.com', role: 'employee', dept: 'IT', points: 890, xp: 850 },
    { name: 'Divya Nair', email: 'divya.nair@ecosphere.com', role: 'employee', dept: 'RND', points: 6200, xp: 6100 },
    { name: 'Arjun Reddy', email: 'arjun.reddy@ecosphere.com', role: 'employee', dept: 'MFG', points: 400, xp: 380 },
    { name: 'Meera Joshi', email: 'meera.joshi@ecosphere.com', role: 'employee', dept: 'LOG', points: 1800, xp: 1750 },
    { name: 'Kabir Singh', email: 'kabir.singh@ecosphere.com', role: 'employee', dept: 'PROC', points: 2900, xp: 2800 },
    { name: 'Ishita Bose', email: 'ishita.bose@ecosphere.com', role: 'employee', dept: 'SLS', points: 1100, xp: 1050 },
    { name: 'Farhan Ali', email: 'farhan.ali@ecosphere.com', role: 'employee', dept: 'CORP', points: 8500, xp: 8400 },
    { name: 'Sneha Kulkarni', email: 'sneha.kulkarni@ecosphere.com', role: 'employee', dept: 'RND', points: 3400, xp: 3300 },
    { name: 'Yash Malhotra', email: 'yash.malhotra@ecosphere.com', role: 'employee', dept: 'IT', points: 550, xp: 500 },
    { name: 'Pooja Sharma', email: 'pooja.sharma@ecosphere.com', role: 'employee', dept: 'HR', points: 7200, xp: 7100 },
    { name: 'Dev Kapoor', email: 'dev.kapoor@ecosphere.com', role: 'employee', dept: 'MFG', points: 150, xp: 100 },
  ];

  for (const p of people) {
    await api('POST', '/api/auth/signup', {
      name: p.name,
      email: p.email,
      password: PASS,
    });
  }
  // restore admin session
  await login(ADMIN_EMAIL, ADMIN_PASS);

  r = await api('GET', '/api/admin/users');
  for (const u of r.data?.data || []) ids.users[u.email] = u.id;

  for (const p of people) {
    const userId = ids.users[p.email];
    if (!userId) continue;
    await api('PUT', '/api/admin/users', {
      userId,
      role: p.role,
      departmentId: p.dept ? ids.depts[p.dept] ?? null : null,
      status: 'active',
    });
  }

  // A few inactive / draft accounts for status variety
  const extraStatuses = [
    { name: 'Inactive User', email: 'inactive.user@ecosphere.com', status: 'inactive' },
    { name: 'Archived Contractor', email: 'archived.user@ecosphere.com', status: 'archived' },
  ];
  for (const e of extraStatuses) {
    await api('POST', '/api/auth/signup', { name: e.name, email: e.email, password: PASS });
  }
  await login(ADMIN_EMAIL, ADMIN_PASS);
  r = await api('GET', '/api/admin/users');
  for (const u of r.data?.data || []) ids.users[u.email] = u.id;
  for (const e of extraStatuses) {
    const userId = ids.users[e.email];
    if (userId) {
      await api('PUT', '/api/admin/users', { userId, status: e.status, role: 'employee' });
    }
  }

  // Points / XP via DB
  for (const p of people) {
    const userId = ids.users[p.email];
    if (!userId) continue;
    await pool.execute(
      'UPDATE users SET esg_points_balance = ?, total_xp = ?, status = ? WHERE id = ?',
      [p.points, p.xp, 'active', userId],
    );
  }
  log(`✓ Users seeded / updated (${Object.keys(ids.users).length} total accounts)`);

  // Dept heads
  const headMap = [
    ['MFG', 'head.mfg@ecosphere.com'],
    ['LOG', 'head.log@ecosphere.com'],
    ['CORP', 'head.corp@ecosphere.com'],
    ['SLS', 'head.sales@ecosphere.com'],
    ['HR', 'head.hr@ecosphere.com'],
    ['IT', 'head.it@ecosphere.com'],
  ];
  for (const [code, email] of headMap) {
    const deptId = ids.depts[code];
    const headId = ids.users[email];
    if (!deptId || !headId) continue;
    const name = depts.find((d) => d.code === code)?.name || code;
    await api('PUT', '/api/admin/departments', {
      id: deptId,
      name,
      code,
      headUserId: headId,
      status: 'active',
    });
  }

  // ── Emission factors ───────────────────────────────────────────────────
  const factors = [
    { name: 'Grid Electricity (India)', scope: '2', category: 'Energy', value_kgco2e_per_unit: 0.82, unit: 'kWh' },
    { name: 'Diesel Fleet', scope: '1', category: 'Transport', value_kgco2e_per_unit: 2.68, unit: 'litre' },
    { name: 'Natural Gas', scope: '1', category: 'Energy', value_kgco2e_per_unit: 2.02, unit: 'm3' },
    { name: 'Air Freight', scope: '3', category: 'Logistics', value_kgco2e_per_unit: 0.6, unit: 'tonne-km' },
    { name: 'Municipal Waste', scope: '3', category: 'Waste', value_kgco2e_per_unit: 0.45, unit: 'kg' },
    { name: 'Purchased Steel', scope: '3', category: 'Materials', value_kgco2e_per_unit: 1.85, unit: 'kg' },
    { name: 'Petrol Cars', scope: '1', category: 'Transport', value_kgco2e_per_unit: 2.31, unit: 'litre' },
    { name: 'Refrigerant Leak R410A', scope: '1', category: 'Fugitive', value_kgco2e_per_unit: 2088, unit: 'kg' },
    { name: 'Business Air Travel', scope: '3', category: 'Travel', value_kgco2e_per_unit: 0.255, unit: 'passenger-km' },
    { name: 'Cloud Compute (avg)', scope: '3', category: 'IT', value_kgco2e_per_unit: 0.0004, unit: 'kWh-eq' },
  ];
  for (const f of factors) {
    const res = await api('POST', '/api/environmental/emission-factors', {
      ...f,
      source: 'Demo seed',
      valid_from: '2025-01-01',
      status: 'active',
    });
    if (res.data?.data?.id) ids.factors.push(res.data.data.id);
  }
  // one inactive factor
  await api('POST', '/api/environmental/emission-factors', {
    name: 'Legacy Coal Factor (retired)',
    scope: '2',
    category: 'Energy',
    value_kgco2e_per_unit: 1.1,
    unit: 'kWh',
    status: 'inactive',
  });
  r = await api('GET', '/api/environmental/emission-factors');
  ids.factors = (r.data?.data?.items || []).map((i) => i.id);
  log(`✓ Emission factors: ${ids.factors.length}`);

  // ── Products ───────────────────────────────────────────────────────────
  const products = [
    { name: 'Eco Widget Pro', sku: 'EWP-001', category: 'Hardware', carbon_footprint_kgco2e_per_unit: 12.5, status: 'active' },
    { name: 'Green Pack Kit', sku: 'GPK-002', category: 'Packaging', carbon_footprint_kgco2e_per_unit: 3.2, status: 'active' },
    { name: 'Solar Panel Module', sku: 'SPM-003', category: 'Energy', carbon_footprint_kgco2e_per_unit: 85.0, status: 'active' },
    { name: 'Recycled Carton', sku: 'RC-004', category: 'Packaging', carbon_footprint_kgco2e_per_unit: 0.8, status: 'active' },
    { name: 'Bio Composite Panel', sku: 'BCP-005', category: 'Materials', carbon_footprint_kgco2e_per_unit: 22.4, status: 'active' },
    { name: 'Smart Sensor Hub', sku: 'SSH-006', category: 'IoT', carbon_footprint_kgco2e_per_unit: 6.7, status: 'active' },
    { name: 'EV Charger Unit', sku: 'EVC-007', category: 'Energy', carbon_footprint_kgco2e_per_unit: 140.0, status: 'active' },
    { name: 'Office Ergonomic Chair', sku: 'OEC-008', category: 'Furniture', carbon_footprint_kgco2e_per_unit: 48.0, status: 'active' },
    { name: 'Legacy Pump Model', sku: 'LPM-009', category: 'Hardware', carbon_footprint_kgco2e_per_unit: 95.0, status: 'inactive' },
    { name: 'Prototype Battery Pack', sku: 'PBP-010', category: 'Energy', carbon_footprint_kgco2e_per_unit: 210.0, status: 'draft' },
    { name: 'Water Filtration Cartridge', sku: 'WFC-011', category: 'Water', carbon_footprint_kgco2e_per_unit: 4.5, status: 'active' },
    { name: 'Organic Cotton Uniform', sku: 'OCU-012', category: 'Apparel', carbon_footprint_kgco2e_per_unit: 9.1, status: 'active' },
  ];
  for (const p of products) {
    const res = await api('POST', '/api/environmental/products', p);
    if (res.data?.data?.id) ids.products.push(res.data.data.id);
  }
  r = await api('GET', '/api/environmental/products');
  ids.products = (r.data?.data?.items || []).map((i) => i.id);
  // lifecycle for first few products
  const stages = [
    'raw_material_sourcing',
    'manufacturing_production',
    'packaging',
    'outbound_transport_distribution',
    'use_phase',
    'end_of_life',
  ];
  for (const pid of ids.products.slice(0, 5)) {
    for (let i = 0; i < stages.length; i++) {
      await api('POST', '/api/environmental/products', {
        action: 'lifecycle',
        product_id: pid,
        lifecycle_stage: stages[i],
        emissions_kgco2e: Number((1.5 + i * 0.8 + (pid % 3)).toFixed(2)),
        calculation_method: i % 2 === 0 ? 'measured' : 'estimated',
      });
    }
  }
  log(`✓ Products: ${ids.products.length}`);

  // ── Environmental goals (mixed status) ─────────────────────────────────
  const goals = [
    { name: 'Reduce Fleet Emissions', department_id: ids.depts.LOG, target_value: 500, current_value: 380, unit: 'tCO2e', deadline: '2026-12-31', status: 'active' },
    { name: 'Cut Factory Waste', department_id: ids.depts.MFG, target_value: 100, current_value: 65, unit: 'tonnes', deadline: '2026-09-30', status: 'active' },
    { name: 'Office Energy Cut', department_id: ids.depts.CORP, target_value: 80, current_value: 80, unit: 'MWh', deadline: '2026-06-30', status: 'completed' },
    { name: 'Scope 3 Supplier Engagement', department_id: ids.depts.PROC, target_value: 50, current_value: 22, unit: 'suppliers', deadline: '2027-03-31', status: 'at_risk' },
    { name: 'R&D Low-Carbon Materials', department_id: ids.depts.RND, target_value: 10, current_value: 3, unit: 'projects', deadline: '2027-01-15', status: 'active' },
    { name: 'Sales Travel Reduction', department_id: ids.depts.SLS, target_value: 30, current_value: 12, unit: '%', deadline: '2026-11-30', status: 'active' },
    { name: 'Data Center PUE Improve', department_id: ids.depts.IT, target_value: 1.3, current_value: 1.45, unit: 'PUE', deadline: '2026-10-01', status: 'at_risk' },
    { name: 'Cancelled Water Pilot', department_id: ids.depts.MFG, target_value: 20, current_value: 2, unit: '%', deadline: '2026-05-01', status: 'cancelled' },
  ];
  for (const g of goals) {
    await api('POST', '/api/environmental/goals', {
      ...g,
      baseline_value: g.target_value * 1.2,
      description: `Demo goal: ${g.name}`,
    });
  }
  log(`✓ Environmental goals: ${goals.length}`);

  // ── Carbon transactions (report volume) ────────────────────────────────
  const sources = ['purchase', 'manufacturing', 'expense', 'fleet', 'manual_entry', 'other'];
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
  const deptCodes = Object.keys(ids.depts);
  let txCount = 0;
  for (let i = 0; i < 40; i++) {
    const month = months[i % months.length];
    const day = String((i % 27) + 1).padStart(2, '0');
    const factorId = ids.factors[i % ids.factors.length];
    const deptCode = deptCodes[i % deptCodes.length];
    const source = sources[i % sources.length];
    const qty = 50 + i * 17 + (i % 5) * 30;
    const res = await api('POST', '/api/environmental/carbon-transactions', {
      transaction_date: `${month}-${day}`,
      source_type: source,
      source_reference: `DEMO-${month.replace('-', '')}-${1000 + i}`,
      source_description: `Demo carbon entry #${i + 1} (${source})`,
      emission_factor_id: factorId,
      quantity: qty,
      department_id: ids.depts[deptCode],
      product_id: ids.products[i % Math.max(ids.products.length, 1)] || null,
      scope: String((i % 3) + 1),
      lifecycle_stage: i % 4 === 0 ? 'manufacturing_production' : null,
      notes: 'Seeded for reports & dashboards',
    });
    if (res.ok) txCount++;
  }
  log(`✓ Carbon transactions added (~${txCount})`);

  // ── CSR activities (mixed status) ──────────────────────────────────────
  const csrList = [
    { title: 'Tree Plantation Drive', status: 'active', points_awarded: 50, evidence_required: true, scheduled_date: '2026-08-15' },
    { title: 'Blood Donation Camp', status: 'active', points_awarded: 40, evidence_required: true, scheduled_date: '2026-07-20' },
    { title: 'Beach Cleanup', status: 'upcoming', points_awarded: 60, evidence_required: true, scheduled_date: '2026-09-05' },
    { title: 'ESG Workshop', status: 'active', points_awarded: 30, evidence_required: false, scheduled_date: '2026-07-01' },
    { title: 'School STEM Mentorship', status: 'active', points_awarded: 45, evidence_required: true, scheduled_date: '2026-08-01' },
    { title: 'Food Bank Packing Day', status: 'upcoming', points_awarded: 35, evidence_required: false, scheduled_date: '2026-09-12' },
    { title: 'River Cleanup Phase 1', status: 'completed', points_awarded: 70, evidence_required: true, scheduled_date: '2026-05-10' },
    { title: 'Cancelled Marathon Support', status: 'cancelled', points_awarded: 20, evidence_required: false, scheduled_date: '2026-06-01' },
    { title: 'Green Office Week', status: 'active', points_awarded: 25, evidence_required: false, scheduled_date: '2026-08-20' },
    { title: 'Senior Care Visit', status: 'upcoming', points_awarded: 40, evidence_required: true, scheduled_date: '2026-10-02' },
  ];
  for (const c of csrList) {
    const res = await api('POST', '/api/social/csr-activities', {
      title: c.title,
      description: `Demo CSR: ${c.title}`,
      category_id: catByKey['csr_activity:Community'] || catByKey['csr_activity:Environment'] || null,
      scheduled_date: c.scheduled_date,
      location: 'Demo site',
      max_participants: 40 + (c.title.length % 30),
      evidence_required: c.evidence_required,
      points_awarded: c.points_awarded,
      status: c.status,
    });
    if (res.data?.data?.id) ids.csr.push(res.data.data.id);
  }
  r = await api('GET', '/api/social/csr-activities');
  ids.csr = (r.data?.data?.items || []).map((i) => i.id);
  log(`✓ CSR activities: ${ids.csr.length}`);

  // Participations: join + submit + approve/reject mix
  const empEmails = people.filter((p) => p.role === 'employee').map((p) => p.email);
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  for (let ei = 0; ei < empEmails.length; ei++) {
    const email = empEmails[ei];
    await login(email, PASS);
    const activityIds = ids.csr.filter((_, idx) => idx % 3 !== 2).slice(0, 4);
    for (let ai = 0; ai < activityIds.length; ai++) {
      const activityId = activityIds[ai];
      const join = await api('POST', '/api/social/participations', {
        action: 'join',
        activity_id: activityId,
      });
      const partId = join.data?.data?.id;
      if (!partId) continue;
      // most submit proof
      if (ai !== 0 || ei % 4 !== 0) {
        await api('POST', '/api/social/participations', {
          action: 'submit',
          participation_id: partId,
          completion_date: '2026-07-15',
          proof_url: `https://cdn.ecosphere.demo/proofs/${partId}.jpg`,
          proof_file_name: `proof-${partId}.jpg`,
        });
      }
    }
  }
  await login(ADMIN_EMAIL, ADMIN_PASS);
  r = await api('GET', '/api/social/participations?meta=1');
  const parts = r.data?.data?.items || [];
  for (let i = 0; i < parts.length; i++) {
    const item = parts[i];
    if (item.approval_status === 'approved') {
      approved++;
      continue;
    }
    if (item.approval_status === 'rejected') {
      rejected++;
      continue;
    }
    // leave some pending
    if (i % 5 === 0) {
      pending++;
      continue;
    }
    if (i % 7 === 0) {
      const rr = await api('PUT', '/api/social/participations', {
        id: item.id,
        decision: 'rejected',
        rejection_reason: 'Demo rejection — incomplete evidence',
      });
      if (rr.ok) rejected++;
    } else {
      const ar = await api('PUT', '/api/social/participations', {
        id: item.id,
        decision: 'approved',
        force_without_proof: true,
      });
      if (ar.ok) approved++;
      else pending++;
    }
  }
  log(`✓ CSR participations reviewed (pending left ~${pending}, approved ~${approved}, rejected ~${rejected})`);

  // ── Policies ───────────────────────────────────────────────────────────
  const policies = [
    { title: 'Code of Ethics & Conduct', category: 'Ethics', version: '2.1', status: 'active' },
    { title: 'Environmental Policy', category: 'Environment', version: '1.3', status: 'active' },
    { title: 'Anti-Bribery Policy', category: 'Compliance', version: '1.0', status: 'active' },
    { title: 'Data Privacy Policy', category: 'Privacy', version: '3.0', status: 'active' },
    { title: 'Supplier Code of Conduct', category: 'Supply Chain', version: '1.2', status: 'active' },
    { title: 'HSE Workplace Policy', category: 'Safety', version: '2.0', status: 'active' },
    { title: 'Draft AI Use Policy', category: 'IT', version: '0.9', status: 'draft' },
    { title: 'Archived Travel Policy 2023', category: 'Travel', version: '1.0', status: 'archived' },
  ];
  for (const p of policies) {
    const res = await api('POST', '/api/governance/policies', {
      title: p.title,
      category: p.category,
      version: p.version,
      content: `Demo policy content for ${p.title}.`,
      effective_date: '2026-01-01',
      requires_acknowledgement: p.status === 'active',
      status: p.status,
    });
    if (res.data?.data?.id) ids.policies.push(res.data.data.id);
  }
  r = await api('GET', '/api/governance/policies');
  ids.policies = (r.data?.data?.items || []).filter((p) => p.status === 'active').map((p) => p.id);
  // acknowledgements from many employees
  for (const email of empEmails.slice(0, 12)) {
    await login(email, PASS);
    for (const policyId of ids.policies.slice(0, 4)) {
      await api('POST', '/api/governance/acknowledgements', { policy_id: policyId });
    }
  }
  await login(ADMIN_EMAIL, ADMIN_PASS);
  log(`✓ Policies + acknowledgements`);

  // ── Audits & compliance ────────────────────────────────────────────────
  const audits = [
    { title: 'ISO 14001 Audit', audit_type: 'Environmental', department_id: ids.depts.MFG, status: 'completed', start_date: '2026-06-01', end_date: '2026-06-15' },
    { title: 'Vendor Compliance Check', audit_type: 'Supplier', department_id: ids.depts.PROC, status: 'in_progress', start_date: '2026-07-01', end_date: '2026-07-20' },
    { title: 'Workplace Safety Review', audit_type: 'HSE', department_id: ids.depts.MFG, status: 'planned', start_date: '2026-08-01' },
    { title: 'IT Security & Privacy Review', audit_type: 'IT', department_id: ids.depts.IT, status: 'under_review', start_date: '2026-05-10', end_date: '2026-05-25' },
    { title: 'Fleet Emissions Assurance', audit_type: 'Environmental', department_id: ids.depts.LOG, status: 'completed', start_date: '2026-04-01', end_date: '2026-04-12' },
  ];
  for (const a of audits) {
    const res = await api('POST', '/api/governance/audits', {
      ...a,
      auditor_user_id: ids.users['ceo@ecosphere.com'] || null,
      findings_summary: a.status === 'completed' ? 'Demo findings recorded' : null,
    });
    if (res.data?.data?.id) ids.audits.push(res.data.data.id);
  }
  r = await api('GET', '/api/governance/audits');
  ids.audits = (r.data?.data?.items || []).map((a) => a.id);

  const issues = [
    { title: 'Missing MSDS sheets', severity: 'high', department_id: ids.depts.MFG, owner: 'head.mfg@ecosphere.com', due_date: '2026-08-15', status: 'open' },
    { title: 'Late vendor disclosures', severity: 'medium', department_id: ids.depts.PROC, owner: 'sara.khan@ecosphere.com', due_date: '2026-07-30', status: 'in_progress' },
    { title: 'Incomplete fleet fuel logs', severity: 'low', department_id: ids.depts.LOG, owner: 'head.log@ecosphere.com', due_date: '2026-07-20', status: 'open' },
    { title: 'Policy training overdue', severity: 'medium', department_id: ids.depts.CORP, owner: 'head.corp@ecosphere.com', due_date: '2026-06-01', status: 'overdue' },
    { title: 'Critical chemical storage gap', severity: 'critical', department_id: ids.depts.MFG, owner: 'aditi.rao@ecosphere.com', due_date: '2026-07-05', status: 'open' },
    { title: 'Resolved access control review', severity: 'medium', department_id: ids.depts.IT, owner: 'head.it@ecosphere.com', due_date: '2026-05-01', status: 'resolved' },
    { title: 'Sales expense policy breach', severity: 'high', department_id: ids.depts.SLS, owner: 'rohit.verma@ecosphere.com', due_date: '2026-08-01', status: 'in_progress' },
    { title: 'HR records retention lag', severity: 'low', department_id: ids.depts.HR, owner: 'head.hr@ecosphere.com', due_date: '2026-09-01', status: 'open' },
  ];
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    await api('POST', '/api/governance/compliance', {
      audit_id: ids.audits[i % Math.max(ids.audits.length, 1)] || null,
      title: issue.title,
      description: `Demo compliance issue: ${issue.title}. Severity tagged for governance reports.`,
      severity: issue.severity,
      department_id: issue.department_id,
      owner_user_id: ids.users[issue.owner] || ids.users['admin@ecosphere.com'] || 1,
      due_date: issue.due_date,
      status: issue.status,
    });
  }
  log(`✓ Audits + compliance issues`);

  // ── Challenges (lifecycle variety) ─────────────────────────────────────
  const challenges = [
    { title: 'Sustainability Sprint', status: 'active', difficulty: 'hard', xpReward: 200, endDate: '2026-07-31' },
    { title: 'Recycle Challenge', status: 'active', difficulty: 'easy', xpReward: 100, endDate: '2026-08-15' },
    { title: 'Commute Green Week', status: 'active', difficulty: 'medium', xpReward: 150, endDate: '2026-07-20' },
    { title: 'Lights Out Fridays', status: 'active', difficulty: 'easy', xpReward: 120, endDate: '2026-08-31' },
    { title: 'Zero Plastic Month', status: 'draft', difficulty: 'hard', xpReward: 300, endDate: '2026-12-31' },
    { title: 'Water Week Challenge', status: 'under_review', difficulty: 'medium', xpReward: 180, endDate: '2026-06-30' },
    { title: 'Q1 Bike to Work', status: 'completed', difficulty: 'medium', xpReward: 160, endDate: '2026-03-31' },
    { title: 'Old Paperless Pilot', status: 'archived', difficulty: 'easy', xpReward: 80, endDate: '2025-12-31' },
    { title: 'Energy Detective', status: 'active', difficulty: 'hard', xpReward: 250, endDate: '2026-09-30' },
    { title: 'Plant Care Buddy', status: 'active', difficulty: 'easy', xpReward: 90, endDate: '2026-10-15' },
  ];
  for (const c of challenges) {
    const res = await api('POST', '/api/gamification/challenges', {
      title: c.title,
      description: `Demo challenge: ${c.title}`,
      categoryId: catByKey['challenge:Waste Reduction'] || catByKey['challenge:Energy Saving'] || null,
      xpReward: c.xpReward,
      difficulty: c.difficulty,
      evidenceRequired: c.difficulty !== 'easy',
      startDate: '2026-01-01',
      endDate: c.endDate,
      status: c.status,
      maxParticipants: 100,
    });
    if (res.data?.data?.id) ids.challenges.push(res.data.data.id);
  }
  r = await api('GET', '/api/gamification/challenges');
  ids.challenges = (r.data?.data || []).map((c) => c.id);

  // Challenge participations (DB — no join API)
  const activeChallengeIds = ids.challenges.slice(0, 6);
  const empIds = empEmails.map((e) => ids.users[e]).filter(Boolean);
  for (const challengeId of activeChallengeIds) {
    for (let i = 0; i < empIds.length; i++) {
      if (i % 3 === 2) continue; // not everyone joined every challenge
      const status = i % 5 === 0 ? 'pending' : i % 8 === 0 ? 'rejected' : 'approved';
      const xp = status === 'approved' ? 100 + (i % 5) * 20 : 0;
      await pool
        .execute(
          `INSERT IGNORE INTO challenge_participations
            (user_id, challenge_id, progress_percent, approval_status, xp_awarded, completed_at)
           VALUES (?, ?, ?, ?, ?, ${status === 'approved' ? 'NOW()' : 'NULL'})`,
          [empIds[i], challengeId, status === 'pending' ? 80 : 100, status, xp],
        )
        .catch(() => {});
    }
  }
  log(`✓ Challenges + participations`);

  // ── Rewards ────────────────────────────────────────────────────────────
  const rewards = [
    { name: 'Eco Tote Bag', pointsRequired: 200, stockQuantity: 50, category: 'merch' },
    { name: 'Plant a Tree Certificate', pointsRequired: 500, stockQuantity: 100, category: 'impact' },
    { name: 'Extra Leave Day', pointsRequired: 1500, stockQuantity: 10, category: 'benefit' },
    { name: 'Reusable Bottle', pointsRequired: 300, stockQuantity: 40, category: 'merch' },
    { name: 'ESG Conference Pass', pointsRequired: 2500, stockQuantity: 5, category: 'learning' },
    { name: 'Team Lunch Voucher', pointsRequired: 800, stockQuantity: 25, category: 'benefit' },
    { name: 'Solar Power Bank', pointsRequired: 1200, stockQuantity: 15, category: 'merch' },
    { name: 'Inactive Gift Card', pointsRequired: 1000, stockQuantity: 0, category: 'gift', status: 'inactive' },
  ];
  for (const rw of rewards) {
    await api('POST', '/api/gamification/rewards', {
      name: rw.name,
      description: `Demo reward: ${rw.name}`,
      pointsRequired: rw.pointsRequired,
      stockQuantity: rw.stockQuantity,
      category: rw.category,
      status: rw.status || 'active',
    });
  }
  log(`✓ Rewards catalog expanded`);

  // ── Badges re-eval after points ────────────────────────────────────────
  await api('POST', '/api/gamification/badges', {});
  // also direct award script logic
  const [badgeRows] = await pool.query(`SELECT id, name, unlock_rule FROM badges WHERE status='active'`);
  const [userRows] = await pool.query(
    `SELECT id, name, esg_points_balance FROM users WHERE status='active'`,
  );
  let badgeAwards = 0;
  for (const u of userRows) {
    const bal = Number(u.esg_points_balance);
    for (const b of badgeRows) {
      const rule = typeof b.unlock_rule === 'string' ? JSON.parse(b.unlock_rule) : b.unlock_rule;
      const need = Number(rule?.points_required);
      if (bal >= need) {
        const [r2] = await pool.execute(
          `INSERT IGNORE INTO user_badges (user_id, badge_id, awarded_reason) VALUES (?,?,?)`,
          [u.id, b.id, `Demo seed: balance ${bal} >= ${need}`],
        );
        if (r2.affectedRows) badgeAwards++;
      }
    }
  }
  log(`✓ Badge awards (new inserts): ${badgeAwards}`);

  // ── Department ESG scores (leaderboard + reports flavor) ───────────────
  const today = new Date().toISOString().slice(0, 10);
  const scoreSets = [
    { env: 78, soc: 72, gov: 81 },
    { env: 65, soc: 80, gov: 70 },
    { env: 88, soc: 75, gov: 82 },
    { env: 70, soc: 68, gov: 90 },
    { env: 82, soc: 85, gov: 74 },
    { env: 60, soc: 62, gov: 65 },
    { env: 91, soc: 70, gov: 77 },
    { env: 74, soc: 78, gov: 80 },
  ];
  let si = 0;
  for (const code of Object.keys(ids.depts)) {
    const s = scoreSets[si % scoreSets.length];
    const total = Number((s.env * 0.4 + s.soc * 0.3 + s.gov * 0.3).toFixed(2));
    await pool
      .execute(
        `INSERT INTO department_esg_scores
          (department_id, as_of_date, environmental_score, social_score, governance_score, total_score)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           environmental_score=VALUES(environmental_score),
           social_score=VALUES(social_score),
           governance_score=VALUES(governance_score),
           total_score=VALUES(total_score)`,
        [ids.depts[code], today, s.env, s.soc, s.gov, total],
      )
      .catch(async () => {
        await pool
          .execute(
            `INSERT INTO department_esg_scores
              (department_id, as_of_date, environmental_score, social_score, governance_score, total_score)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [ids.depts[code], today, s.env, s.soc, s.gov, total],
          )
          .catch(() => {});
      });
    si++;
  }
  log(`✓ Department ESG scores refreshed`);

  // ── Settings toggles on ────────────────────────────────────────────────
  await api('POST', '/api/admin/settings', {
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
  });

  // ── Final counts ───────────────────────────────────────────────────────
  log('\n=== FINAL COUNTS ===');
  const tables = [
    'users',
    'departments',
    'products',
    'emission_factors',
    'carbon_transactions',
    'environmental_goals',
    'csr_activities',
    'employee_csr_participations',
    'esg_policies',
    'policy_acknowledgements',
    'audits',
    'compliance_issues',
    'challenges',
    'challenge_participations',
    'rewards',
    'user_badges',
    'department_esg_scores',
  ];
  for (const t of tables) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS n FROM ${t}`);
    log(`  ${String(rows[0].n).padStart(4)}  ${t}`);
  }

  // Sample report builder size
  await login(ADMIN_EMAIL, ADMIN_PASS);
  const report = await api('POST', '/api/reports/builder', {
    module: 'all',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  });
  const reportRows = Array.isArray(report.data?.data) ? report.data.data.length : 0;
  log(`\n✓ Custom report builder rows (all modules): ${reportRows}`);

  await pool.end();
  log('\nDone. Demo passwords: admin Admin@123 · others TestPass1\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
