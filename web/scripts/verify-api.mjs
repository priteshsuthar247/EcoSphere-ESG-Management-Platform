/**
 * EcoSphere — verify all API endpoints against seeded DB (no extra inserts).
 * Usage: node scripts/verify-api.mjs
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN = { email: 'admin@ecosphere.com', password: 'Admin@123' };
const EMP = { email: 'aditi.rao@ecosphere.com', password: 'TestPass1' };

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
    if (!list.length) {
      const s = res.headers.get('set-cookie');
      if (s) {
        const [pair] = s.split(';');
        const i = pair.indexOf('=');
        if (i > 0) this.map.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }
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
const results = [];

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
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 120) };
  }
  return { status: res.status, data, text };
}

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  console.log(`\nEcoSphere API verify @ ${BASE}\n`);

  // Auth
  jar.clear();
  let r = await api('POST', '/api/auth/login', ADMIN);
  check('POST /api/auth/login (admin)', r.status === 200, `HTTP ${r.status}`);

  r = await api('POST', '/api/auth/login', { email: ADMIN.email, password: 'WrongPass1' });
  // re-login after wrong attempt wiped nothing if we used separate jar - re-login admin
  jar.clear();
  await api('POST', '/api/auth/login', ADMIN);

  const gets = [
    ['GET /api/admin/users', '/api/admin/users'],
    ['GET /api/admin/departments', '/api/admin/departments'],
    ['GET /api/admin/categories', '/api/admin/categories'],
    ['GET /api/admin/settings', '/api/admin/settings?keys=esg_config,notification_config'],
    ['GET /api/environmental/emission-factors', '/api/environmental/emission-factors'],
    ['GET /api/environmental/products', '/api/environmental/products'],
    ['GET /api/environmental/goals', '/api/environmental/goals?meta=1'],
    ['GET /api/environmental/carbon-transactions', '/api/environmental/carbon-transactions?meta=1'],
    ['GET /api/social/csr-activities', '/api/social/csr-activities?meta=1'],
    ['GET /api/social/participations', '/api/social/participations?meta=1'],
    ['GET /api/social/diversity', '/api/social/diversity'],
    ['GET /api/governance/policies', '/api/governance/policies'],
    ['GET /api/governance/acknowledgements', '/api/governance/acknowledgements'],
    ['GET /api/governance/audits', '/api/governance/audits?meta=1'],
    ['GET /api/governance/compliance', '/api/governance/compliance?meta=1'],
    ['GET /api/gamification/challenges', '/api/gamification/challenges'],
    ['GET /api/gamification/rewards', '/api/gamification/rewards'],
    ['GET /api/gamification/badges', '/api/gamification/badges'],
    ['GET /api/gamification/participation', '/api/gamification/participation'],
    ['GET /api/gamification/leaderboard', '/api/gamification/leaderboard'],
    ['GET /api/reports/summary', '/api/reports/summary'],
  ];

  for (const [name, path] of gets) {
    r = await api('GET', path);
    check(name, r.status === 200, `HTTP ${r.status}`);
  }

  // Report builder + export
  for (const module of ['all', 'environmental', 'social', 'governance']) {
    r = await api('POST', '/api/reports/builder', {
      module,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    const n = Array.isArray(r.data?.data) ? r.data.data.length : 0;
    check(`POST /api/reports/builder (${module})`, r.status === 200, `HTTP ${r.status}, rows=${n}`);
  }

  r = await api('POST', '/api/reports/builder', { module: 'all' });
  const rows = Array.isArray(r.data?.data) ? r.data.data : [];
  r = await api('POST', '/api/reports/export', { format: 'csv', rows });
  check('POST /api/reports/export', r.status === 200, `HTTP ${r.status}`);

  // Employee-scoped
  jar.clear();
  r = await api('POST', '/api/auth/login', EMP);
  check('POST /api/auth/login (employee)', r.status === 200, `HTTP ${r.status}`);
  r = await api('GET', '/api/social/csr-activities');
  check('GET CSR as employee', r.status === 200, `HTTP ${r.status}`);
  r = await api('GET', '/api/gamification/leaderboard');
  check('GET leaderboard as employee', r.status === 200, `HTTP ${r.status}`);
  r = await api('GET', '/api/governance/policies');
  check('GET policies as employee', r.status === 200, `HTTP ${r.status}`);
  r = await api('GET', '/api/governance/acknowledgements?mine=1');
  check('GET my acknowledgements', r.status === 200, `HTTP ${r.status}`);

  jar.clear();
  await api('POST', '/api/auth/login', ADMIN);
  r = await api('POST', '/api/auth/logout', {});
  check('POST /api/auth/logout', r.status === 200, `HTTP ${r.status}`);

  const pass = results.filter((x) => x.ok).length;
  const fail = results.filter((x) => !x.ok).length;
  console.log(`\n${pass} passed, ${fail} failed / ${results.length} total\n`);
  writeFileSync(
    resolve(__dirname, 'api-verify-report.json'),
    JSON.stringify({ ranAt: new Date().toISOString(), pass, fail, results }, null, 2),
  );
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
