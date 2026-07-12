# EcoSphere — Live Demo Script (≈4 minutes)

**Team:** CSS · **Event:** Odoo Hackathon 2026  
**Speakers:** Ashutosh (intro) → Pritesh (demo part 1) → Abhijeet (demo part 2 + close)  
**Format:** Screen recording / live walkthrough · one shared browser · prepared demo data  

| Speaker   | Role on mic                         | Target time | Stretch max |
|-----------|-------------------------------------|------------:|------------:|
| Ashutosh  | Project introduction (no demo)      | ~30 sec     | ~40 sec     |
| Pritesh   | Admin / ops walkthrough             | ~2 min      | ~2.5–3 min  |
| Abhijeet  | Employee loop + outcomes + ending   | ~2 min      | ~2.5–3 min  |
| **Total** |                                     | **~4–4.5 min** | **~6 min** |

---

## Before you start (all three)

### Prep checklist
- [ ] App running (`npm run dev` in `web/`) and DB seeded (demo users + rich data if available)
- [ ] Browser zoom **110–125%** so tables and chips are readable on projector/recording
- [ ] **Incognito / clean session** ready; bookmark login page
- [ ] Two tabs ready (optional): one for **admin**, one for **employee** — or log out / log in between speakers
- [ ] Sidebar fully expanded; dark terminal chrome is fine — keep cursor large / highlight with mouse
- [ ] Disable notifications, hide personal bookmarks bar if recording
- [ ] Agree who clicks the mouse when speaking (only one driver at a time)

### Suggested demo accounts

| When              | Login                         | Password     | Why |
|-------------------|-------------------------------|--------------|-----|
| Pritesh (ops)     | `admin@ecosphere.com`         | `Admin@123`  | Full nav, create/approve, settings |
| Abhijeet (employee flow) | `aditi.rao@ecosphere.com` (or any seeded employee) | `TestPass1` | Join CSR/challenge, redeem, self-service |
| Optional CEO flash | `ceo@ecosphere.com`           | `TestPass1`  | ESG pillar scores / executive overview |

### What we will *not* cover live (to stay in time)
- Code / architecture deep dive  
- Forgot-password email setup  
- Full report export edge cases  
- Creating every form field from scratch (use **pre-filled seed data**; only create one lightweight item if needed)

### Story arc (one sentence)
> **Measure ESG → run CSR & compliance → engage people with challenges & rewards → prove it with scores and leaderboards.**

---

# PART 0 — Ashutosh · Introduction (~30 seconds)

**On screen:** Team slide *or* EcoSphere login page (static — no clicking).  
**Speaker note:** Calm pace, ~90–100 words. Do **not** demo. End by naming Pritesh.

### Spoken script

> Good [morning / afternoon], everyone.
>
> We are **team CSS**, and our project is **EcoSphere** — an **ESG Management Platform** built for the **Odoo Hackathon 2026**.
>
> **ESG** means **Environmental, Social, and Governance** — the three pillars companies use to measure sustainability, employee and community impact, and compliance.
>
> EcoSphere brings those pillars into **one system**: carbon and goals on the environmental side, CSR and participation on the social side, policies and audits on the governance side, plus gamification — challenges, badges, and rewards — so people actually engage.
>
> Our tech stack is **Next.js** and **TypeScript** for the full-stack web app, **MySQL** for the database, and **JWT** for secure, role-based authentication — with dedicated dashboards for admin, CEO, department heads, and employees.
>
> Now I hand it over to **Pritesh** for the practical demonstration of the ERP.

### Timing guide (≈30 s)

| Part                         | Seconds |
|------------------------------|--------:|
| Team + project name          | ~5      |
| What ESG is + why EcoSphere  | ~10     |
| Modules in one line          | ~7      |
| Tech stack                   | ~5      |
| Handover to Pritesh          | ~3      |

**Handover cue:** Ashutosh steps aside; Pritesh shares screen / takes mouse; login page in view.

---

# PART 1 — Pritesh · Ops & platform walkthrough (~2 minutes, up to ~3)

**Role:** “How an organization *runs* ESG day to day” — admin view.  
**Login as:** `admin@ecosphere.com` / `Admin@123`  
**Goal:** Show the product is a real multi-module ERP, not a single feature.

---

### 1A — Login & role-based home (≈20–25 s)

**Show on screen**
1. Login page (password show/hide if you want a 1-second touch)
2. Sign in as **admin**
3. Land on **Admin dashboard** — stat cards (users, departments, compliance, challenges)
4. Briefly open the **sidebar** so modules are visible: Environmental · Social · Governance · Gamification · Reports · Settings

**Say**

> I’ll start as an **administrator**. EcoSphere uses **JWT session auth** and **role-based access** — admin and CEO see the full workspace; department heads and employees get a scoped navigation.
>
> This is the **admin overview**: live counts for people, departments, open compliance, and active challenges. Everything is one workspace — no switching tools for ESG.

**Do not:** open Settings and reconfigure the whole org.

---

### 1B — Environmental pillar (≈35–45 s)

**Show on screen**
1. **Environmental → Carbon** (or Emissions if carbon is empty — pick whichever has rows)
2. Point at the **filter bar** (search / status)
3. Click **one column header** to show **sortable tables**
4. Optionally open a **modal** form briefly (“New…” or Edit) — show overlay, then **Close** without saving if time is tight  
   *If you want one real action:* log a tiny carbon transaction or open an existing row and show auto-calculated emissions

**Say**

> On the **Environmental** side we track emission factors, **carbon transactions**, products, and sustainability goals.
>
> Here’s the carbon ledger — quantity in, emissions calculated, scoped by department. Tables support **search, filters, and column sorting** so managers can audit data quickly. Forms open as **modals** so you never leave the list context.

**If time allows (optional +10 s):** open **Goals** and show progress / status chips (active, at risk, completed).

---

### 1C — Social / CSR (ops view) (≈30–40 s)

**Show on screen**
1. **Social → CSR activities** — cards/list with status chips (upcoming / active / completed)
2. Hover or select an **active** activity — point at **Join**  
3. Point at a **completed** activity — **no Join** (or say: completed activities cannot accept new participants)
4. Open **Social → Participation** — show the approval queue (pending / approved)

**Say**

> **Social** covers CSR programs and diversity metrics. Admins and managers publish activities; employees join while the activity is open.
>
> Important rule: if an activity is **completed**, **cancelled**, or **archived**, **no one can join** — the API and UI both enforce that.
>
> Participation is a real workflow: join → optional **proof** → manager **approve or reject** → points only after approval.

**Do not:** spend time on diversity charts unless you have 10 spare seconds.

---

### 1D — Governance snapshot (≈20–25 s)

**Show on screen**
1. **Governance → Policies** — list versions / statuses  
2. Quick jump to **Compliance** or **Audits** (one screen only)

**Say**

> **Governance** is policies with acknowledgements, audits, and compliance issues with owners and due dates — including overdue tracking.
>
> Employees must acknowledge policies; managers see coverage. That closes the loop between “we published a policy” and “people actually read it.”

---

### 1E — Hand off to Abhijeet (≈10 s)

**Show on screen**
- Either leave **Challenges** list open, or return to dashboard  
- **Log out** (or switch to second tab already logged in as employee)

**Say**

> So far you’ve seen the **ops backbone** — measure, publish, approve, govern.  
> Next, **Abhijeet** will show the **employee experience** and how gamification and scoring make ESG stick.

**Handover:** Pass mouse / un-mute Abhijeet; employee login ready.

---

### Pritesh — timing cheat sheet

| Block              | ~Seconds | Must show |
|--------------------|---------:|-----------|
| Login + admin home | 20–25    | Sidebar + stats |
| Environmental      | 35–45    | Carbon/emissions table + sort/filter |
| Social CSR + rules | 30–40    | Completed = no join; participation queue |
| Governance         | 20–25    | Policies or compliance |
| Handover           | ~10      | Logout / role switch |
| **Total**          | **~2:00–2:30** | |

**If over time:** skip goals and audits; keep carbon + CSR join rule + one participation row.

---

# PART 2 — Abhijeet · Employee loop, impact & close (~2 minutes, up to ~3)

**Role:** “How a person *participates* and how leadership *sees results*.”  
**Login as:** employee first (`aditi.rao@ecosphere.com` / `TestPass1`), then optional quick CEO for scores.  
**Goal:** Emotional payoff — XP, badges, rewards, leaderboard, ESG scores — then a strong ending.

---

### 2A — Employee home & join flow (≈40–50 s)

**Show on screen**
1. Login as **employee** → **Your workspace** (points, XP, CSR count, challenges, badges)
2. **Social → CSR** → **Join** an *active* activity (or show already Joined chip)
3. **Gamification → Challenges** → open an **active** challenge → **Join**  
   - Point out: only **active** challenges show Join; completed ones do not  
4. Optional: open **Participation** / my submissions — submit **proof** if a field is ready (paste a dummy URL)

**Say**

> I’m logging in as an **employee**. My dashboard is personal — ESG points, XP, activities, and alerts — not the full admin tree.
>
> I can **join open CSR activities** and **active challenges**. If something is already completed, I simply can’t join — same rule Pritesh showed, from the worker’s side.
>
> When evidence is required, I submit proof; managers approve it; only then do **points and XP** move.

---

### 2B — Gamification loop (≈40–50 s)

**Show on screen**
1. **Badges** — show earned / ladder (mention auto-award on point thresholds)
2. **Rewards** — catalog cards + redeem one *if stock and points allow* (or show disabled “Not enough points”)
3. **Leaderboard** — Individual standings; click a **sortable** column (XP / points); flip to **Departmental ESG** tab if time

**Say**

> This is the engagement layer. Completing challenges and CSR unlocks **XP and ESG points**, which can auto-award **badges** when you hit tier thresholds.
>
> Points can be **redeemed** for rewards from the catalog — with a redemption queue for admins to fulfill.
>
> **Leaderboards** keep it social: individuals by XP, departments by live ESG scores. Every column sorts so rankings are easy to explore.

---

### 2C — Leadership proof: scores & reports (≈25–35 s)

**Show on screen** (pick fastest path you have ready)

**Option A (preferred):** Log out → login as **CEO** → **CEO dashboard**  
- Stat cards: Environmental / Social / Governance / Overall  
- **ESG pillar scores** chart (horizontal bars /100)  
- Department ranking list  

**Option B (if no time to re-login):** **Reports** as admin (if still admin) or **Reports → Builder** filters + result table with sorting  

**Say**

> Leadership doesn’t only need activity logs — they need **scores**.  
> EcoSphere computes **department and overall ESG scores** with configurable pillar weights — Environmental, Social, Governance — out of 100.
>
> The CEO view is built for decisions: pillar health, ranking, and a clear path into **reports** for filtered exports.

---

### 2D — Closing (≈20–30 s) — **do not skip**

**Show on screen:** Return to a clean, impressive frame:
- CEO ESG pillar scores **or** Admin home with sidebar fully visible  
- Optional: freeze on logo / login page after last sentence

**Say (full closing script)**

> To wrap up: **EcoSphere** is a complete **ESG management ERP** for the Odoo Hackathon 2026.
>
> We cover all three pillars — **Environmental** carbon and goals, **Social** CSR and participation, **Governance** policies, audits, and compliance — plus **gamification** so employees actually take part.
>
> Access is **role-based**, data is **filterable and sortable**, joins respect **lifecycle rules**, and leadership sees **live ESG scores**.
>
> Built by **team CSS** with **Next.js, TypeScript, MySQL, and JWT**.
>
> Thank you — we’re happy to take questions.

**Optional one-liner if judges ask “what’s next?”**

> Next we’d deepen supplier Scope-3 connectors and automated reporting packs for common frameworks — but the core loop you saw is production-shaped today.

---

### Abhijeet — timing cheat sheet

| Block                 | ~Seconds | Must show |
|-----------------------|---------:|-----------|
| Employee home + join  | 40–50    | CSR/challenge join |
| Badges / rewards / LB | 40–50    | At least leaderboard + one of badges/rewards |
| CEO scores / reports  | 25–35    | Pillar scores or report table |
| Closing speech        | 20–30    | Strong freeze frame |
| **Total**             | **~2:00–2:40** | |

**If over time:** skip redeem; keep join + leaderboard + CEO bars + closing.  
**If under time:** approve one pending participation as admin in a second tab (points flash).

---

# Master “what to show” checklist (recording plan)

Use this as a shot list for the screen recording. Check boxes while editing the final cut.

### Ashutosh (voice only / static)
- [ ] Team intro line  
- [ ] ESG definition  
- [ ] Modules one-liner  
- [ ] Stack + roles  
- [ ] Name Pritesh  

### Pritesh
- [ ] Admin login  
- [ ] Admin dashboard stats + full sidebar  
- [ ] Carbon **or** emissions table  
- [ ] Filter and **sort a column**  
- [ ] Modal form open/close (optional)  
- [ ] CSR: active vs **completed (no join)**  
- [ ] Participation approval list  
- [ ] Policies or compliance flash  
- [ ] Logout / handoff  

### Abhijeet
- [ ] Employee login + personal stats  
- [ ] Join CSR **or** challenge  
- [ ] Badges and/or rewards  
- [ ] Leaderboard (sort + dept tab if possible)  
- [ ] CEO ESG pillar scores **or** reports  
- [ ] Full closing + thank you  

---

# Full continuous script (read-through order)

Copy-paste for teleprompter if needed. Bracketed text = stage directions, not spoken.

---

### ASHUTOSH

Good [morning / afternoon], everyone.

We are **team CSS**, and our project is **EcoSphere** — an **ESG Management Platform** built for the **Odoo Hackathon 2026**.

**ESG** means **Environmental, Social, and Governance** — the three pillars companies use to measure sustainability, employee and community impact, and compliance.

EcoSphere brings those pillars into **one system**: carbon and goals on the environmental side, CSR and participation on the social side, policies and audits on the governance side, plus gamification — challenges, badges, and rewards — so people actually engage.

Our tech stack is **Next.js** and **TypeScript** for the full-stack web app, **MySQL** for the database, and **JWT** for secure, role-based authentication — with dedicated dashboards for admin, CEO, department heads, and employees.

Now I hand it over to **Pritesh** for the practical demonstration of the ERP.

---

### PRITESH

*[Login as admin@ecosphere.com]*

I’ll start as an **administrator**. EcoSphere uses **JWT** authentication and **role-based access** — admins and CEOs get the full workspace; department heads and employees get a scoped one.

This is the **admin overview** — live counts for users, departments, compliance, and challenges. One product, all ESG modules in the sidebar.

*[Open Environmental → Carbon or Emissions]*

On the **Environmental** pillar we track factors, carbon transactions, products, and goals. Here’s the ledger — searchable, filterable, and **every column sorts**. Forms open as **modals** so the list stays in context.

*[Open Social → CSR]*

**Social** is CSR and participation. Managers publish activities; employees join while they’re open. If an activity is **completed**, joining is blocked in both the **API and the UI** — no late sign-ups.

*[Open Participation briefly]*

Participation is join → proof → **approve or reject** → then points.

*[Open Policies or Compliance briefly]*

**Governance** covers versioned policies, acknowledgements, audits, and compliance with owners and due dates — so policy isn’t just a PDF on a drive.

You’ve seen the ops backbone. **Abhijeet** will show the employee journey and how scores and gamification close the loop.

*[Logout or switch tab]*

---

### ABHIJEET

*[Login as employee]*

I’m in as an **employee**. My home is personal — points, XP, activities — not the admin tree.

*[CSR / Challenges — Join]*

I can join **open CSR activities** and **active challenges**. Completed ones don’t offer Join — same business rule, employee side. When evidence is required, I submit proof; approval unlocks **points and XP**.

*[Badges / Rewards / Leaderboard]*

That’s the engagement engine: challenges and CSR feed **badges**, a **rewards** catalog with redemption, and **leaderboards** for people and departments — sortable, so rankings are transparent.

*[CEO dashboard or Reports]*

For leadership, EcoSphere surfaces **Environmental, Social, and Governance scores out of 100**, with department rankings and reports for filtered export — so activity turns into decisions.

*[Freeze on best dashboard frame]*

To wrap up: **EcoSphere** is a complete **ESG management ERP** for the **Odoo Hackathon 2026** — measure carbon, run CSR, govern with policies and compliance, and engage people with challenges, badges, and rewards.

**Role-based access**, real workflows, and **live ESG scoring**. Built by **team CSS** with **Next.js, TypeScript, MySQL, and JWT**.

Thank you — we’re happy to take questions.

---

# Recording & delivery tips

1. **One story, three voices** — Ashutosh = vision; Pritesh = system of record; Abhijeet = people + proof + close.  
2. **Don’t narrate every field** — name the *workflow*, then click.  
3. **Cursor moves first, then speak** — viewers follow the mouse.  
4. **If something fails live** — have a backup tab already on the success state (“Here’s the approved participation…”).  
5. **Closing is mandatory** — even if you cut demo features, keep the last 20 seconds of speech.  
6. **Practice once with a timer**; cut optional blocks from the cheat sheets if you’re over 4:30.

---

# Quick reference — demo credentials

| User    | Email                     | Password    |
|---------|---------------------------|-------------|
| Admin   | `admin@ecosphere.com`     | `Admin@123` |
| CEO     | `ceo@ecosphere.com`       | `TestPass1` |
| Employee| `aditi.rao@ecosphere.com` | `TestPass1` |

*(Other seeded employees also use `TestPass1`.)*

---

**End of script.** Good luck, team CSS.
