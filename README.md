# WebLens — Website Intelligence & Quality Analysis Platform

> A production-grade website audit platform that analyzes public URLs, translates raw technical signals into prioritized findings, offers concrete developer remediations, tracks health over time, and provides an AI assistant grounded in factual scan evidence.

---

## 🎯 Problem
Modern web developers, agencies, and small business owners need fast, unified insights into how their websites perform, adhere to SEO and accessibility best practices, and configure security headers. Existing tools are often fragmented, overwhelming, or provide raw cryptic metrics without actionable developer-centric remediation or historical tracking.

## 💡 Solution
WebLens provides a controlled, automated analysis pipeline:
1. **Deterministic Analyzers:** Scans performance metrics, SEO signals, WCAG accessibility rules, and HTTP security headers without fake or hallucinated scores.
2. **Normalized Findings:** Every problem is categorized with clear severity (`critical`, `high`, `medium`, `low`, `info`), deterministic fingerprints, visual selector evidence, and practical code-level fixes.
3. **Historical Health & Comparison:** Stores scan history per website to calculate improvement trends across repeated audits.
4. **Grounded AI Assistant:** An AI copilot strictly bounded to the factual scan report to help developers prioritize fixes without hallucinating issues.

---

## 🚀 Key Features
- **One-Click URL Scan:** Safe, asynchronous scanning engine protected against Server-Side Request Forgery (SSRF).
- **5 Comprehensive Analyzer Categories:**
  - **Performance:** Resource timings, asset payload weights, render-blocking scripts, large images.
  - **SEO:** Title/description length, H1-H6 hierarchy, canonical links, OpenGraph metadata, crawlability.
  - **Accessibility:** Image alt attributes, form label associations, button accessible names, landmark regions.
  - **Security Configuration:** HTTPS enforcement, HSTS, CSP, X-Content-Type-Options, Referrer-Policy, and cookie security flags.
  - **Technology Stack Detection:** Heuristic framework, CDN, and library detection with confidence scores and evidence.
- **Reproducible Scoring Engine:** Explicit, weighted category scoring (Performance 25%, SEO 20%, Accessibility 25%, Security 15%, Hygiene 15%).
- **Developer-First Reports:** Detailed findings drawer with code snippets, affected DOM selectors, and remediation steps.
- **Scan Comparison:** Direct side-by-side comparison of two audits to measure improvements after refactoring.
- **Strictly Grounded AI Chat:** Contextual assistant answering questions using only verifiable scan evidence.

---

## 🏗️ Architecture

```
                  ┌───────────────────────────────┐
                  │       Frontend (React)        │
                  │   Vite + TS + Tailwind CSS    │
                  └───────────────┬───────────────┘
                                  │ HTTP / REST
                                  ▼
                  ┌───────────────────────────────┐
                  │      Backend API (Express)    │
                  │   TypeScript + Auth & Guard   │
                  └──────┬─────────────────┬──────┘
                         │                 │
                         ▼                 ▼
                 ┌──────────────┐   ┌──────────────┐
                 │   MongoDB    │   │  Job Queue   │
                 │  Persistence │   │  (Async)     │
                 └──────────────┘   └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ Scan Worker  │
                                    │ (Browser/ctx)│
                                    └──────┬───────┘
                                           │
                                           ▼
                                 ┌──────────────────┐
                                 │ Analyzers Engine │
                                 │ SEO/Perf/A11y/Sec│
                                 └──────────────────┘
```

---

## 🛠️ Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express, TypeScript, Zod, Mongoose
- **Database:** MongoDB
- **Execution & Jobs:** Background Scan Job Queue abstraction
- **Security & Hardening:** SSRF destination validation, private IP address blocking, rate limiting, HttpOnly cookies

---

## 📂 Project Structure
```
WebLens/
├── client/                 # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── app/            # App shell, routing, providers
│   │   ├── components/     # UI kit, charts, finding drawers
│   │   ├── features/       # Auth, dashboard, scans, reports, compare, ai
│   │   ├── lib/            # API client, validation, formatters
│   │   └── types/          # Shared frontend data contracts
├── server/                 # Express + TypeScript backend API
│   ├── src/
│   │   ├── analyzers/      # SEO, A11y, Performance, Security, Tech detectors
│   │   ├── browser/        # Safe headless browser runner & PageContext collector
│   │   ├── modules/        # Auth, users, websites, scans, reports, AI
│   │   ├── middleware/     # Auth guard, SSRF validation, rate limiting, error handling
│   │   ├── jobs/           # Scan job queue and worker runner
│   │   ├── scoring/        # Rule registry and reproducible weighted score calculator
│   │   └── server.ts       # Server entrypoint
└── package.json            # Root workspace scripts
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v25)
- **MongoDB**: Local MongoDB instance or MongoDB Atlas URI

### 2. Install Dependencies
```bash
# In the root workspace:
npm run install:all
```

### 3. Environment Variables
Copy `.env.example` in both `client` and `server`:
```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

### 4. Run Development Servers
```bash
# Terminal 1: Frontend (http://localhost:5173)
npm run dev:client

# Terminal 2: Backend API (http://localhost:5000)
npm run dev:server
```

---

## 📜 Development Philosophy & Rules
- **No Hallucinations:** Analyzers return only verifiable observations with DOM or HTTP evidence.
- **Vertical Slices:** Features are delivered complete with typed models, server endpoints, and accessible responsive UI.
- **SSRF Immunity:** Scanning engines never touch internal networks (`localhost`, `127.0.0.1`, RFC1918 subnets, or metadata services).
