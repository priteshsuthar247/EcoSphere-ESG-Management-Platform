# EcoSphere — ESG Management Platform

**Odoo Hackathon 2026** · Environmental · Social · Governance · Gamification

EcoSphere is a full-stack ESG (Environmental, Social, and Governance) management platform that helps organizations measure sustainability metrics, run CSR programs, track compliance, and engage employees through challenges, badges, XP, and rewards — all from a unified TerminalUI-styled dashboard.

| | |
|--|--|
| **App** | Next.js 14 (App Router) + TypeScript + Tailwind |
| **Database** | MySQL 8 (`ecosphere`) |
| **Auth** | JWT (httpOnly cookie), bcrypt passwords |
| **Email** | Nodemailer (Gmail App Password) |
| **Repo** | [priteshsuthar247/EcoSphere-ESG-Management-Platform](https://github.com/priteshsuthar247/EcoSphere-ESG-Management-Platform) |

---

## Table of contents

1. [Features](#features)
2. [Roles & access](#roles--access)
3. [Tech stack](#tech-stack)
4. [Repository structure](#repository-structure)
5. [Prerequisites](#prerequisites)
6. [Setup](#setup)
7. [Running the app](#running-the-app)
8. [Demo users](#demo-users)
9. [Badge ladder](#badge-ladder)
10. [API overview](#api-overview)
11. [Scripts & testing](#scripts--testing)
12. [Cloudflare tunnel (demo share)](#cloudflare-tunnel-demo-share)
13. [Design system](#design-system)
14. [Business rules (hackathon scope)](#business-rules-hackathon-scope)
15. [Troubleshooting](#troubleshooting)

---

## Features

### Environmental
- Emission factors (Scope 1 / 2 / 3)
- Product ESG profiles + lifecycle emissions
- Carbon transactions (purchase, manufacturing, expense, fleet, manual)
- Sustainability goals with progress tracking
- Department-scoped carbon views for departmental heads

### Social
- CSR activities (create, join, evidence)
- Employee participation queue (submit proof → approve / reject)
- Diversity metrics dashboard (admin / CEO)
- Points awarded on approved CSR participation

### Governance
- ESG policies (versioned, acknowledgement required)
- Policy acknowledgements (employees + coverage for managers)
- Audits (admin / CEO)
- Compliance issues (owner + due date required; overdue tracking)

### Gamification
- Challenges with lifecycle: Draft → Active → Under Review → Completed / Archived
- Challenge participation approvals → XP + points
- **Badge auto-award** when ESG points balance hits tier thresholds
- Rewards catalog + redemption queue (admin / CEO fulfill)
- Leaderboards (employees by XP, departments by ESG score)

### Reports
- ESG summary (scopes, CSR, compliance KPIs)
- Custom report builder (module / department / date filters)
- Export CSV / Excel-style TSV

### Settings & administration
- User management (roles, departments, status)
- Departments hierarchy
- Shared categories (CSR / challenge / ESG)
- ESG configuration toggles (auto emission calc, CSR evidence, badge auto-award)
- Notification settings + test email

### Auth
- Signup / login / logout
- Forgot password + reset (email link)
- Password **show / hide** toggle on login
- Session JWT (~30 minutes)

---

## Roles & access

| Role | Access summary |
|------|----------------|
| **admin** | Full platform — all modules + settings (same as CEO) |
| **ceo** | Full platform — all modules + settings (same as admin) |
| **departmental_head** | Emissions, carbon, goals, CSR, participation, policies, acknowledgements, compliance, gamification (no settings / products / diversity / audits / reports) |
| **employee** | Self-service: dashboard, CSR, my participation, policies, challenges, badges, rewards, leaderboard |

Admin and CEO share **identical** privileges. Navigation and middleware enforce path allow-lists so users cannot open restricted pages by URL.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js **14.2** (App Router) |
| Language | TypeScript |
| UI | React 18, Tailwind CSS, custom TerminalUI (`globals.css`) |
| Database | MySQL via `mysql2` connection pool |
| Auth | `jsonwebtoken` + `jose` (Edge middleware), `bcryptjs` |
| Mail | `nodemailer` |
| API style | Route handlers under `web/src/app/api/**` |
| Services | `web/src/services/*` data layer |

---

## Repository structure

```text
ecosphere/                          # monorepo root
├── README.md                       # this file
├── DESIGN.md                       # design notes
├── Odoo Hackathon 2026.md          # challenge brief
├── EcoSphere ESG Management Platform.pdf
├── web/                            # Next.js application
│   ├── setup_db.sql                # schema + seed admin + badge tiers
│   ├── package.json
│   ├── scripts/                    # API seed & verify helpers
│   │   ├── seed-and-test-api.mjs
│   │   ├── verify-api.mjs
│   │   └── award-eligible-badges.mjs
│   └── src/
│       ├── app/
│       │   ├── api/                # REST endpoints
│       │   ├── dashboard/          # role dashboards + modules
│       │   ├── login|signup|forgot-password|reset-password/
│       │   └── globals.css
│       ├── components/
│       ├── config/db.ts
│       ├── lib/                    # auth, accessControl, email, logger
│       ├── middleware.ts           # JWT + RBAC route guard
│       ├── services/               # DB business logic
│       └── utils/apiResponse.ts
```

---

## Prerequisites

- **Node.js** 18+ (recommended 20+)
- **npm** 9+
- **MySQL** 8.x running locally (or reachable host)
- Optional: **cloudflared** for public demo tunnels
- Optional: Gmail **App Password** for forgot-password / notification emails

---

## Setup

### 1. Clone

```bash
git clone https://github.com/priteshsuthar247/EcoSphere-ESG-Management-Platform.git
cd EcoSphere-ESG-Management-Platform
```

### 2. Install dependencies

```bash
cd web
npm install
```

### 3. Create environment file

Create `web/.env.local` (never commit this file):

```env
# --- Database (MySQL) ---
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ecosphere

# --- JWT ---
JWT_SECRET=change_this_to_a_long_random_secret_before_deployment_ecosphere_esg_2026
JWT_EXPIRES_IN=30m

# --- App ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# --- Email (optional; forgot-password / alerts) ---
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_16_char_app_password
SMTP_FROM_NAME="EcoSphere ESG Platform"
```

| Variable | Purpose |
|----------|---------|
| `DB_*` | MySQL connection |
| `JWT_SECRET` | Signs auth cookies — use a strong secret in any shared/demo environment |
| `NEXT_PUBLIC_APP_URL` | Base URL for password-reset links and absolute redirects |
| `SMTP_*` | Outbound mail (Gmail App Password recommended) |

### 4. Create database schema

With MySQL running:

```bash
# from machine with mysql CLI
mysql -u root < web/setup_db.sql
```

Or import `web/setup_db.sql` in MySQL Workbench / phpMyAdmin.

This creates database **`ecosphere`**, all tables, and seeds:

- Admin user: `admin@ecosphere.com` (see [Demo users](#demo-users))
- Badge tiers: Bronze → Diamond
- Optional starter reward row

### 5. (Optional) Seed rich dummy data via API

With the app running (`npm run dev`):

```bash
cd web
npm run test:api
```

This signs up demo employees, creates departments, ESG data, CSR, policies, challenges, etc., through HTTP APIs.

---

## Running the app

```bash
cd web
npm run dev
```

Open **http://localhost:3000**

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run test:api` | Seed + integration tests against live server |
| `npm run test:api:verify` | Verify endpoints only (see script flags) |

---

## Demo users

Created by seed / signup flows (local demo). Passwords are hashed in DB; seed passwords:

| Name | Email | Role | Password |
|------|-------|------|----------|
| System Administrator | `admin@ecosphere.com` | admin | `Admin@123` |
| Priya CEO | `ceo@ecosphere.com` | ceo | `TestPass1` |
| S. Nair | `head.mfg@ecosphere.com` | departmental_head | `TestPass1` |
| R. Iyer | `head.log@ecosphere.com` | departmental_head | `TestPass1` |
| A. Mehta | `head.corp@ecosphere.com` | departmental_head | `TestPass1` |
| Aditi Rao | `aditi.rao@ecosphere.com` | employee | `TestPass1` |
| Karan Shah | `karan.shah@ecosphere.com` | employee | `TestPass1` |
| Neha Patel | `neha.patel@ecosphere.com` | employee | `TestPass1` |
| Vikram Das | `vikram.das@ecosphere.com` | employee | `TestPass1` |
| Sara Khan | `sara.khan@ecosphere.com` | employee | `TestPass1` |

**Rule of thumb:** only admin uses `Admin@123`; all other seeded accounts use `TestPass1`.

Signup password policy: min 8 characters, at least one uppercase, one lowercase, one digit.

---

## Badge ladder

Lowest → highest (auto-awarded from **ESG points balance**):

| Tier | Badge | Points required |
|:----:|-------|----------------:|
| 1 | **Bronze** | 1,000 |
| 2 | **Silver** | 3,000 |
| 3 | **Gold** | 5,000 |
| 4 | **Platinum** | 8,000 |
| 5 | **Diamond** | 12,000 |

Auto-award runs when:

- CSR participation is **approved**
- Challenge participation is **approved**
- Admin/CEO clicks **RE-EVALUATE BADGES**

Helper script (DB direct):

```bash
cd web
node scripts/award-eligible-badges.mjs
```

---

## API overview

Base path: `/api/*` · Auth: `auth-token` httpOnly cookie after login.

### Auth
| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/signup` | Create employee account |
| POST | `/api/auth/login` | Set JWT cookie |
| POST | `/api/auth/logout` | Clear cookie |
| GET | `/api/auth/me` | Current user (role for UI) |
| POST | `/api/auth/forgot-password` | Email reset link |
| GET/POST | `/api/auth/reset-password` | Validate token / set password |

### Admin
| Method | Path |
|--------|------|
| GET/PUT | `/api/admin/users` |
| GET/POST/PUT | `/api/admin/departments` |
| GET/POST/PUT | `/api/admin/categories` |
| GET/POST | `/api/admin/settings` |
| POST | `/api/admin/settings/test-email` |

### Environmental
| Method | Path |
|--------|------|
| GET/POST/PUT | `/api/environmental/emission-factors` |
| GET/POST/PUT | `/api/environmental/products` |
| GET/POST | `/api/environmental/carbon-transactions` |
| GET/POST/PUT | `/api/environmental/goals` |

### Social
| Method | Path |
|--------|------|
| GET/POST/PUT | `/api/social/csr-activities` |
| GET/POST/PUT | `/api/social/participations` |
| GET | `/api/social/diversity` |

### Governance
| Method | Path |
|--------|------|
| GET/POST/PUT | `/api/governance/policies` |
| GET/POST | `/api/governance/acknowledgements` |
| GET/POST/PUT | `/api/governance/audits` |
| GET/POST/PUT | `/api/governance/compliance` |

### Gamification
| Method | Path |
|--------|------|
| GET/POST/PUT | `/api/gamification/challenges` |
| GET/PUT | `/api/gamification/participation` |
| GET/POST | `/api/gamification/badges` |
| GET/POST/PUT | `/api/gamification/rewards` |
| GET | `/api/gamification/leaderboard` |

### Reports
| Method | Path |
|--------|------|
| GET | `/api/reports/summary` |
| POST | `/api/reports/builder` |
| POST | `/api/reports/export` |

Responses use a consistent envelope:

```json
{ "success": true, "data": { }, "message": "..." }
```

Errors:

```json
{ "success": false, "error": "...", "code": "VALIDATION_ERROR" }
```

---

## Scripts & testing

| Command | Description |
|---------|-------------|
| `cd web && npm run test:api` | Full seed + API integration suite (server must be up) |
| `cd web && node scripts/verify-api.mjs` | Read-path smoke tests for all modules |
| `cd web && node scripts/award-eligible-badges.mjs` | Award badges for users already over thresholds |
| `cd web && node scripts/free-mysql-connections.mjs` | Kill idle MySQL sleeps if pool exhausted |

Ensure:

```bash
cd web && npm run dev
```

is running on the same base URL the scripts target (`BASE_URL` env, default `http://localhost:3000`).

---

## Cloudflare tunnel (demo share)

Share a temporary public URL without deploying:

**Terminal 1 — app**
```bash
cd web
npm run dev
```

**Terminal 2 — tunnel**
```bash
cloudflared tunnel --url http://localhost:3000
```

Copy the printed `https://….trycloudflare.com` URL and set:

```env
NEXT_PUBLIC_APP_URL=https://your-tunnel-subdomain.trycloudflare.com
```

in `web/.env.local`, then **restart** `npm run dev` so password-reset links use the public host.

> Quick tunnels expire when you stop `cloudflared` or often change URL on restart.

---

## Design system

UI follows a dark **TerminalUI** aesthetic:

- Background `#0d0d0d`, primary green `#00ff41`, cyan secondary, amber tertiary
- Monospace prompts, chip badges, CLI-style buttons
- See `DESIGN.md` and `web/colour.md` for tokens and layout notes
- Wireframe / brief: `Odoo Hackathon 2026.md`, `ecospher - 8 hours.png`

---

## Business rules (hackathon scope)

Aligned with the Odoo Hackathon 2026 brief:

1. **Reward redemption** — deducts points; stock-aware catalog  
2. **Notifications** — in-app (+ optional email) for compliance, CSR/challenge decisions, badges  
3. **Auto emission calculation** — settings toggle for factor-based carbon math  
4. **Evidence requirement** — CSR approval can require proof  
5. **Badge auto-award** — on XP/points thresholds  
6. **Compliance ownership** — every issue needs owner + due date; overdue flagging  

ESG department score weighting (default): **Environmental 40% / Social 30% / Governance 30%** (configurable via settings where implemented).

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| MySQL “Too many connections” | Run `node web/scripts/free-mysql-connections.mjs` or restart MySQL |
| Login always 500 | Confirm MySQL is up and `DB_*` matches `.env.local` |
| Reset email wrong host | Update `NEXT_PUBLIC_APP_URL` and restart Next |
| Employee sees wrong nav | Hard refresh; ensure JWT role is `employee` (re-login after role change) |
| Eligible points but no badge | Run RE-EVALUATE BADGES as admin/CEO or `award-eligible-badges.mjs` |
| Port 3000 in use | Use the port Next prints (e.g. 3001) and match tunnel/`BASE_URL` |
| Env changes not applied | Restart `npm run dev` — `NEXT_PUBLIC_*` is build-time/start-time |

---

## Team notes

- Primary development branch pattern: feature branches → merge to `main`
- Do **not** commit `.env`, `.env.local`, or SMTP/JWT secrets
- Schema source of truth: `web/setup_db.sql`
- Access control source of truth: `web/src/lib/accessControl.ts` + `web/src/middleware.ts`

---

## License / context

Built for **Odoo Hackathon 2026** as an ESG Management Platform prototype. Not intended as production compliance software without further hardening (secrets management, HTTPS-only cookies, rate limiting, audit logging, etc.).

---

**EcoSphere** — measure · manage · improve ESG performance.
