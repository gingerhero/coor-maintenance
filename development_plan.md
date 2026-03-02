# Coor Eiendomsservice Maintenance App – Development Plan

**Version 1.0 | March 2026**
**Reference**: [project_overview_and_spec.md](project_overview_and_spec.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack & Rationale](#3-tech-stack--rationale)
4. [Project Structure](#4-project-structure)
5. [Database Schema Design](#5-database-schema-design)
6. [Development Phases & Sprint Breakdown](#6-development-phases--sprint-breakdown)
7. [Critical Path Components](#7-critical-path-components)
8. [Testing Strategy](#8-testing-strategy)
9. [CI/CD & Deployment](#9-cicd--deployment)
10. [Risk Register](#10-risk-register)
11. [Open Questions](#11-open-questions)

---

## 1. Executive Summary

### Project Goal
Digitize Coor's property maintenance (eiendomsservice) workflow — replacing paper instructions, manual timesheets, and email-based discrepancy reports with a single, mobile-first PWA.

### Key Outcomes
- Accurate time tracking (actual vs. budgeted hours per property)
- Full traceability with GPS and photo proof
- Real-time avvik (discrepancy) visibility for managers and customers
- Simplified staffing administration
- NS 3451-based task hierarchy with smart scheduling

### Scope
- **18 feature modules** across 4 user roles
- **11 core data entities** with full relational model
- **4 development phases** over ~24 weeks (12 two-week sprints)
- **MVP target**: Janitor check-in/out workflow + task checklists + avvik reporting + basic manager view

### User Roles
| Role | Description |
|------|-------------|
| Vaktmester (Janitor) | Field workers — mobile-first task execution |
| Driftssjef (Operations Manager) | Supervisors — full management, approvals, analytics |
| Admin | System administration, user management, NS 3451 library |
| Kunde (Customer/Sameie) | Read-only portal for property owners |

---

## 2. Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT (PWA)                       │
│  React + TypeScript + Vite + Tailwind + Capacitor   │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │
│  │ UI Layer │ │ i18n     │ │ Service Worker    │   │
│  │ (Pages/  │ │ (i18next)│ │ (Offline + Sync)  │   │
│  │ Comps)   │ │          │ │                    │   │
│  └────┬─────┘ └──────────┘ └─────────┬─────────┘   │
│       │                               │              │
│  ┌────┴──────────────────────────────┴───────────┐  │
│  │              State Layer                       │  │
│  │  React Query (server) + Zustand (client)      │  │
│  └────┬──────────────────────────────┬───────────┘  │
│       │                               │              │
│  ┌────┴─────────┐          ┌─────────┴───────────┐  │
│  │ Supabase     │          │ IndexedDB            │  │
│  │ Client SDK   │          │ (Offline Queue)      │  │
│  └────┬─────────┘          └─────────────────────┘  │
└───────┼──────────────────────────────────────────────┘
        │ HTTPS
┌───────┴──────────────────────────────────────────────┐
│                SUPABASE (EU Region)                   │
│                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ Auth     │ │ Postgres │ │ Storage  │ │Realtime│  │
│  │ (JWT +   │ │ (Data +  │ │ (Photos) │ │(Live   │  │
│  │  RBAC)   │ │  RLS)    │ │          │ │ subs)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Edge Functions (Deno)                             │ │
│  │ - Due-date calculation                            │ │
│  │ - NS 3451 import parser                           │ │
│  │ - Push notifications                              │ │
│  │ - PDF report generation                           │ │
│  │ - Customer email notifications                    │ │
│  └──────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
        │
┌───────┴──────────────────────────────────────────────┐
│              HOSTING (Vercel)                          │
│  - Static PWA deployment                              │
│  - Preview deployments per PR                         │
│  - Edge caching for assets                            │
└───────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Server state | React Query (TanStack Query) | Caching, background refetch, optimistic updates, offline support |
| Client state | Zustand | Minimal boilerplate, TypeScript-first, works well with React Query |
| Offline storage | Dexie.js (IndexedDB wrapper) | Type-safe, reactive queries, proven offline-first library |
| Routing | React Router v7 | File-based routing option, nested layouts, data loaders |
| Forms | React Hook Form + Zod | Performant forms, schema-based validation, TS inference |
| i18n | i18next + react-i18next | Industry standard, namespace support, lazy loading |
| Component library | Shadcn/ui + Radix primitives | Accessible, customizable, Tailwind-native, no lock-in |
| Maps | React Leaflet | Free, open-source, good mobile support |
| Testing | Vitest + Testing Library + Playwright | Fast unit tests, accessible component tests, real-browser E2E |

---

## 3. Tech Stack & Rationale

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.x | UI framework — component model, hooks, Suspense |
| TypeScript | 5.x | Type safety across entire codebase |
| Vite | 6.x | Build tool — fast HMR, optimized production builds |
| Tailwind CSS | 4.x | Utility-first styling — Coor brand theming |
| Capacitor | 6.x | Native device access (camera, GPS, push) on PWA |
| React Query | 5.x | Server state management, caching, offline |
| Zustand | 5.x | Client state (UI state, GPS consent, active visit) |
| React Router | 7.x | Routing with nested layouts |
| React Hook Form | 7.x | Performant form handling |
| Zod | 3.x | Schema validation (shared frontend + edge functions) |
| i18next | 24.x | Internationalization (nb-NO primary, en fallback) |
| Dexie.js | 4.x | IndexedDB wrapper for offline data |
| React Leaflet | 5.x | Map display for GPS coordinates |
| Shadcn/ui | latest | Accessible UI component primitives |
| date-fns | 4.x | Date manipulation (Norwegian locale) |

### Backend (Supabase)

| Component | Purpose |
|-----------|---------|
| Supabase Auth | Email/password + magic link auth, JWT, role management |
| Supabase Database | PostgreSQL with Row Level Security (RLS) |
| Supabase Storage | Photo uploads (buckets per property) with CDN |
| Supabase Realtime | Live subscriptions for avvik updates, roster changes |
| Supabase Edge Functions | Business logic (due-dates, notifications, PDF generation, import parsing) |

### DevOps & Tooling

| Tool | Purpose |
|------|---------|
| GitHub | Source control, issues, pull requests |
| GitHub Actions | CI/CD pipeline (lint, test, build, deploy) |
| Vercel | Frontend hosting with preview deploys |
| Supabase CLI | Database migrations, local development |
| ESLint + Prettier | Code quality and formatting |
| Husky + lint-staged | Pre-commit hooks |
| Playwright | End-to-end testing |
| Sentry | Error monitoring and performance tracking |

---

## 4. Project Structure

```
coor-maintenance/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   ├── icons/                 # App icons (various sizes)
│   └── locales/               # Translation JSON files
│       ├── nb/                # Norwegian Bokmål
│       │   ├── common.json
│       │   ├── janitor.json
│       │   ├── manager.json
│       │   └── customer.json
│       └── en/                # English
│           ├── common.json
│           └── ...
├── src/
│   ├── main.tsx               # App entry point
│   ├── App.tsx                # Root component (providers, router)
│   ├── vite-env.d.ts
│   │
│   ├── components/            # Shared/reusable UI components
│   │   ├── ui/                # Shadcn/ui primitives (Button, Dialog, etc.)
│   │   ├── layout/            # Shell, Navbar, Sidebar, BottomNav
│   │   ├── forms/             # Shared form components
│   │   ├── maps/              # Leaflet map components
│   │   └── ns3451/            # NS 3451 tree view, code picker, accordions
│   │
│   ├── features/              # Feature-based modules
│   │   ├── auth/              # Login, registration, role guard
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   ├── janitor/           # Janitor workflow
│   │   │   ├── components/    # CheckInButton, TaskChecklist, CheckoutSummary
│   │   │   ├── hooks/         # useVisit, useChecklist, useCheckout
│   │   │   └── pages/         # HomePage, VisitPage, HistoryPage
│   │   ├── tasks/             # Task management (shared)
│   │   │   ├── components/    # TaskCard, TaskAccordion, FrequencyBadge
│   │   │   ├── hooks/         # useTasks, useDueDateEngine
│   │   │   └── lib/           # dueDateEngine.ts, ns3451Parser.ts
│   │   ├── avvik/             # Discrepancy management
│   │   │   ├── components/    # AvvikForm, AvvikCard, AvvikInbox
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   ├── time/              # Time tracking
│   │   │   ├── components/    # Timer, ManualTimeInput, TimesheetRow
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   ├── manager/           # Operations manager features
│   │   │   ├── components/    # Dashboard, KPITiles, PropertyDetail
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   ├── roster/            # Staffing & roster management
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   ├── customer/          # Customer portal
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   ├── instructions/      # Instruction editor & versioning
│   │   │   ├── components/    # TreeEditor, MarkdownImporter, VersionDiff
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   └── reports/           # Reporting & analytics
│   │       ├── components/
│   │       ├── hooks/
│   │       └── pages/
│   │
│   ├── hooks/                 # Global hooks
│   │   ├── useGPS.ts          # GPS capture with consent
│   │   ├── useCamera.ts       # Camera integration via Capacitor
│   │   ├── useOnlineStatus.ts # Network status tracking
│   │   └── usePushNotifications.ts
│   │
│   ├── lib/                   # Core utilities
│   │   ├── supabase.ts        # Supabase client initialization
│   │   ├── api.ts             # API helper functions
│   │   ├── offline/           # Offline sync system
│   │   │   ├── db.ts          # Dexie.js database schema
│   │   │   ├── syncQueue.ts   # Queue manager
│   │   │   └── syncWorker.ts  # Background sync logic
│   │   ├── gps.ts             # GPS utility functions
│   │   ├── photo.ts           # Photo processing utilities
│   │   ├── date.ts            # Date utilities (Norwegian locale)
│   │   └── validators.ts      # Zod schemas (shared with edge functions)
│   │
│   ├── i18n/                  # Internationalization config
│   │   └── index.ts           # i18next setup
│   │
│   ├── stores/                # Zustand stores
│   │   ├── authStore.ts       # Current user, role, permissions
│   │   ├── visitStore.ts      # Active visit state
│   │   └── uiStore.ts         # Theme, sidebar, modals
│   │
│   ├── types/                 # TypeScript type definitions
│   │   ├── database.ts        # Supabase generated types
│   │   ├── models.ts          # Domain model types
│   │   ├── api.ts             # API request/response types
│   │   └── ns3451.ts          # NS 3451 hierarchy types
│   │
│   └── styles/                # Global styles
│       └── globals.css        # Tailwind directives, Coor theme
│
├── supabase/
│   ├── config.toml            # Supabase project config
│   ├── migrations/            # Database migrations (sequential)
│   │   ├── 00001_enums_and_roles.sql
│   │   ├── 00002_core_tables.sql
│   │   ├── 00003_task_and_execution.sql
│   │   ├── 00004_avvik_and_time.sql
│   │   ├── 00005_roster_and_swap.sql
│   │   ├── 00006_rls_policies.sql
│   │   └── 00007_indexes_and_functions.sql
│   ├── functions/             # Edge functions
│   │   ├── calculate-due-dates/
│   │   ├── parse-ns3451-import/
│   │   ├── send-notification/
│   │   ├── generate-pdf-report/
│   │   └── customer-email-alert/
│   └── seed.sql               # Development seed data
│
├── e2e/                       # Playwright E2E tests
│   ├── janitor-workflow.spec.ts
│   ├── manager-dashboard.spec.ts
│   └── customer-portal.spec.ts
│
├── capacitor.config.ts        # Capacitor configuration
├── index.html                 # Vite entry HTML
├── vite.config.ts             # Vite configuration
├── tailwind.config.ts         # Tailwind with Coor theme
├── tsconfig.json              # TypeScript configuration
├── .env.example               # Environment variable template
├── .gitignore
├── package.json
├── project_overview_and_spec.md
├── development_plan.md        # This document
└── coor_logo.svg
```

---

## 5. Database Schema Design

### Enums

```sql
-- User roles
CREATE TYPE user_role AS ENUM ('janitor', 'manager', 'admin', 'customer');

-- Task frequency types
CREATE TYPE frequency_type AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly', 'every_visit');

-- Season types
CREATE TYPE season_type AS ENUM ('summer', 'winter', 'none');

-- Task execution status
CREATE TYPE execution_status AS ENUM ('done', 'skipped');

-- Skip reasons
CREATE TYPE skip_reason AS ENUM ('not_accessible', 'not_necessary', 'lacked_materials', 'other');

-- Avvik severity
CREATE TYPE avvik_severity AS ENUM ('low', 'medium', 'high');

-- Avvik status
CREATE TYPE avvik_status AS ENUM ('new', 'in_progress', 'resolved');

-- Assignment status
CREATE TYPE assignment_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- Time log status
CREATE TYPE timelog_status AS ENUM ('draft', 'submitted', 'approved');

-- Swap request status
CREATE TYPE swap_status AS ENUM ('pending', 'approved', 'rejected');
```

### Core Tables

```sql
-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'janitor',
  gps_consent_at TIMESTAMPTZ,
  photo_consent_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  estimated_weekly_hours NUMERIC(5,2),
  customer_id UUID REFERENCES customers(id),
  manager_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customers (Sameie/Styre)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  contact_email TEXT,
  phone TEXT,
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customer portal users (links customer users to customers)
CREATE TABLE customer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  UNIQUE(profile_id, customer_id)
);

-- NS 3451 Reference Library (admin-maintained)
CREATE TABLE ns3451_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,           -- e.g., '2', '23', '239', '2391'
  parent_code TEXT REFERENCES ns3451_codes(code),
  title_nb TEXT NOT NULL,              -- Norwegian title
  title_en TEXT,                       -- English title
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  is_high_risk BOOLEAN DEFAULT false,  -- elevator, fire, sprinkler
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Instructions / Tasks (per property, versioned)
CREATE TABLE instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  ns3451_code TEXT NOT NULL REFERENCES ns3451_codes(code),
  description TEXT NOT NULL,
  frequency_type frequency_type NOT NULL DEFAULT 'every_visit',
  frequency_interval INTEGER DEFAULT 1,  -- e.g., 2 for "every 2 weeks"
  season season_type DEFAULT 'none',
  comment TEXT,
  photo_required BOOLEAN DEFAULT false,
  notify_board BOOLEAN DEFAULT false,    -- varsle_styret
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assignments / Visits
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  scheduled_date DATE NOT NULL,
  scheduled_start TIME,
  scheduled_end TIME,
  status assignment_status DEFAULT 'scheduled',
  checkin_at TIMESTAMPTZ,
  checkin_lat DOUBLE PRECISION,
  checkin_lng DOUBLE PRECISION,
  checkin_accuracy DOUBLE PRECISION,
  checkout_at TIMESTAMPTZ,
  checkout_lat DOUBLE PRECISION,
  checkout_lng DOUBLE PRECISION,
  checkout_accuracy DOUBLE PRECISION,
  actual_minutes INTEGER,
  checkin_note TEXT,
  checkout_note TEXT,
  instruction_version INTEGER,        -- version of instructions used
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assignment ↔ Janitor (many-to-many)
CREATE TABLE assignment_janitors (
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  janitor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, janitor_id)
);

-- Task Executions
CREATE TABLE task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  instruction_id UUID NOT NULL REFERENCES instructions(id),
  janitor_id UUID NOT NULL REFERENCES profiles(id),
  status execution_status NOT NULL,
  skip_reason skip_reason,
  skip_note TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  no_avvik_confirmed BOOLEAN DEFAULT false,  -- "Ingen avvik observert"
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,          -- Supabase Storage path
  entity_type TEXT NOT NULL,           -- 'task_execution', 'avvik'
  entity_id UUID NOT NULL,             -- FK to task_executions or avvik
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Avvik (Discrepancies)
CREATE TABLE avvik (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  assignment_id UUID REFERENCES assignments(id),
  instruction_id UUID REFERENCES instructions(id),
  ns3451_code TEXT REFERENCES ns3451_codes(code),
  location_description TEXT,           -- room/floor
  description TEXT NOT NULL,
  severity avvik_severity NOT NULL DEFAULT 'medium',
  status avvik_status NOT NULL DEFAULT 'new',
  notify_board BOOLEAN DEFAULT false,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  reported_by UUID NOT NULL REFERENCES profiles(id),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  board_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Avvik comments
CREATE TABLE avvik_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avvik_id UUID NOT NULL REFERENCES avvik(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_visible_to_customer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Time logs
CREATE TABLE time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  janitor_id UUID NOT NULL REFERENCES profiles(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  assignment_id UUID REFERENCES assignments(id),
  date DATE NOT NULL,
  actual_minutes INTEGER NOT NULL,
  checkin_lat DOUBLE PRECISION,
  checkin_lng DOUBLE PRECISION,
  checkout_lat DOUBLE PRECISION,
  checkout_lng DOUBLE PRECISION,
  notes TEXT,
  status timelog_status DEFAULT 'draft',
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Roster / Staffing (Bemanningsark)
CREATE TABLE roster_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  janitor_id UUID NOT NULL REFERENCES profiles(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  budgeted_weekly_hours NUMERIC(5,2),
  schedule JSONB DEFAULT '{}',         -- {"mon": true, "tue": false, ...}
  active_from DATE NOT NULL,
  active_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Swap Requests
CREATE TABLE swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_janitor_id UUID NOT NULL REFERENCES profiles(id),
  to_janitor_id UUID REFERENCES profiles(id),
  assignment_id UUID REFERENCES assignments(id),
  reason TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  status swap_status DEFAULT 'pending',
  decided_by UUID REFERENCES profiles(id),
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Push notification log
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,                  -- 'assignment', 'avvik', 'swap', 'instruction_update'
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Key Indexes

```sql
-- Performance-critical queries
CREATE INDEX idx_assignments_property_date ON assignments(property_id, scheduled_date);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_task_executions_assignment ON task_executions(assignment_id);
CREATE INDEX idx_task_executions_instruction ON task_executions(instruction_id);
CREATE INDEX idx_task_executions_completed ON task_executions(instruction_id, completed_at DESC);
CREATE INDEX idx_instructions_property ON instructions(property_id, is_active);
CREATE INDEX idx_instructions_ns3451 ON instructions(ns3451_code);
CREATE INDEX idx_avvik_property_status ON avvik(property_id, status);
CREATE INDEX idx_avvik_severity ON avvik(severity, status);
CREATE INDEX idx_time_logs_janitor_date ON time_logs(janitor_id, date);
CREATE INDEX idx_roster_janitor ON roster_entries(janitor_id, active_from, active_to);
CREATE INDEX idx_roster_property ON roster_entries(property_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, read_at);
CREATE INDEX idx_photos_entity ON photos(entity_type, entity_id);
```

### Row Level Security (RLS) Overview

| Table | Janitor | Manager | Admin | Customer |
|-------|---------|---------|-------|----------|
| profiles | Own record only | All in portfolio | All | Own record |
| properties | Assigned only | Assigned portfolio | All | Own properties |
| instructions | Read assigned | CRUD on portfolio | CRUD all | — |
| assignments | Own assignments | Portfolio assignments | All | — |
| task_executions | Own executions | Portfolio executions | All | — |
| avvik | Own + assigned property | Portfolio | All | Own property (read) |
| time_logs | Own logs | Portfolio logs | All | — |
| roster_entries | Own entries (read) | CRUD portfolio | CRUD all | — |
| swap_requests | Own requests | Decide on portfolio | All | — |
| customers | — | Assigned customers | All | Own record |

---

## 6. Development Phases & Sprint Breakdown

### Phase Overview

| Phase | Sprints | Duration | Focus |
|-------|---------|----------|-------|
| **Phase 1: Foundation** | 0–1 | 4 weeks | Project setup, auth, database, core infrastructure |
| **Phase 2: Core MVP** | 2–5 | 8 weeks | Janitor workflow, tasks, GPS, avvik, time tracking |
| **Phase 3: Management & Portal** | 6–9 | 8 weeks | Manager dashboard, customer portal, reporting, roster |
| **Phase 4: Polish & Launch** | 10–12 | 6 weeks | Offline hardening, PWA optimization, accessibility, pilot |

---

### Phase 1: Foundation (Sprints 0–1)

#### Sprint 0 — Project Bootstrap (Weeks 1–2)

**Goal**: Working dev environment with auth, database, and basic navigation.

| Task | Details |
|------|---------|
| Initialize Vite + React + TypeScript project | `npm create vite@latest` with React TS template |
| Configure Tailwind CSS with Coor brand theme | Blues/greens, Coor typography, dark mode variables |
| Set up Supabase project (EU region) | Create project, configure auth providers |
| Create database migrations (enums + core tables) | profiles, properties, customers, ns3451_codes |
| Configure Supabase local development | `supabase init`, local Postgres, Studio |
| Set up i18next with Norwegian default | Namespace-per-feature pattern, `t()` from day one |
| Implement auth flow | Login page, JWT handling, role detection |
| Create role-based route guard | Redirect based on user role after login |
| Set up React Router with layout shells | Janitor layout (bottom nav), Manager layout (sidebar), Customer layout |
| Configure ESLint, Prettier, Husky | Pre-commit hooks, consistent code style |
| Initialize Git repository | `.gitignore`, initial commit, branch strategy |
| Create `.env.example` | Supabase URL, anon key, other config |
| Write seed data script | Sample NS 3451 codes, test properties, test users |

**Deliverable**: App boots, users can log in, and see role-appropriate empty shells.

#### Sprint 1 — Core Infrastructure (Weeks 3–4)

**Goal**: Reusable components, GPS/camera hooks, offline foundation, NS 3451 library.

| Task | Details |
|------|---------|
| Build shared UI components | Button, Card, Dialog, Badge, Accordion (Shadcn/ui) |
| Create layout components | BottomNav (janitor), Sidebar (manager), TopBar |
| Implement `useGPS` hook | Capacitor Geolocation, consent flow, accuracy handling |
| Implement `useCamera` hook | Capacitor Camera, photo capture, GPS tagging |
| Set up Dexie.js offline database schema | Mirror critical Supabase tables locally |
| Build sync queue foundation | Queue mutations when offline, replay on reconnect |
| Create NS 3451 reference data | Seed full NS 3451 tree (levels 1–4) |
| Build NS 3451 accordion component | Collapsible groups with color coding per category |
| Build NS 3451 code picker component | Searchable tree selector for task creation |
| Configure Supabase Storage buckets | `photos` bucket with per-property folders |
| Set up React Query with Supabase | Query hooks pattern, optimistic updates |
| Create Zod validation schemas | Shared schemas for all form inputs |
| Add PWA manifest and basic service worker | Installable app, offline shell |

**Deliverable**: Reusable component library, working GPS/camera, offline queue skeleton, NS 3451 display.

---

### Phase 2: Core MVP (Sprints 2–5)

#### Sprint 2 — Janitor Home & Check-In (Weeks 5–6)

**Goal**: Janitor can see assignments and check in to a property.

| Task | Details |
|------|---------|
| Build "Mine oppdrag" home page | Today + next 7 days, estimated hours, overdue flags |
| Create assignment card component | Property name, date, time window, task count, overdue badge |
| Implement property selection flow | Tap assignment → property detail → check-in |
| Build check-in flow | "Sjekk inn" button → GPS capture → start timer → note field |
| Create assignment API queries | Fetch assignments for janitor, filter by date range |
| Build remaining database migrations | assignments, assignment_janitors tables |
| Implement RLS policies for janitor role | Janitor sees only own assignments |
| Add overdue task detection | Visual flags on assignment cards |

**Deliverable**: Janitor sees daily schedule and can check in to properties with GPS capture.

#### Sprint 3 — Task Checklist & Execution (Weeks 7–8)

**Goal**: Dynamic checklist generation with task completion workflow.

| Task | Details |
|------|---------|
| Implement Smart Due-Date Engine | `dueDateEngine.ts` — frequency calc, seasonal filter, overdue detection |
| Build dynamic checklist generator | Given property + date → filter due tasks → group by NS 3451 |
| Create task checklist page | NS 3451 accordions, task cards with frequency/season badges |
| Build "Utført" (done) flow | Mark done → optional photo (forced if photo_required) → GPS → save |
| Build "Hopp over" (skip) flow | Mandatory reason dropdown + free text + GPS → save |
| Build "Avvik oppdaget" inline flow | Quick link from task → pre-filled avvik form |
| Implement "varsle styret" logic | Force "Ingen avvik observert" checkbox or avvik form |
| Create task_executions API | Insert execution records, update last_completed tracking |
| Build frequency/season badge components | Visual badges: "Uke 1", "Mnd 3", "Sommer", "Overdue" |
| Add kommentar tooltip | Tap info icon → show task comment |

**Deliverable**: Full task checklist with completion, skip, and inline avvik detection.

#### Sprint 4 — Avvik Reporting & Check-Out (Weeks 9–10)

**Goal**: Standalone avvik reporting and complete check-out workflow.

| Task | Details |
|------|---------|
| Build standalone avvik form | Floating "+ Avvik" button, NS 3451 picker, room/floor, severity |
| Implement photo capture for avvik | Mandatory for høy severity, optional otherwise |
| Add voice-to-text for avvik notes | Capacitor Speech Recognition plugin |
| Build avvik API (CRUD) | Insert, read, update status |
| Implement check-out flow | GPS capture, stop timer or manual time entry |
| Build incomplete tasks modal | Force reason for each undone task or "Gå tilbake" |
| Create visit summary screen | Tasks done/skipped, avvik reported, time, GPS trail |
| Add budgeted vs. actual time display | Show comparison at checkout |
| Implement photo upload to Supabase Storage | Background upload with retry |
| Build avvik database migration | avvik, avvik_comments, photos tables |

**Deliverable**: Complete janitor visit cycle from check-in through check-out with avvik reporting.

#### Sprint 5 — Time Tracking & Janitor History (Weeks 11–12)

**Goal**: Time logging, timesheet submission, and visit history.

| Task | Details |
|------|---------|
| Build time log recording | Auto from timer + manual entry option |
| Create time log API | Insert, read, submit for approval |
| Build timesheet view | Weekly view of time logs per property, status indicators |
| Implement janitor history page | Past visits list with details, photos, GPS map pins |
| Add visit detail page | Read-only view of past visit (tasks, avvik, time, map) |
| Build Leaflet map component | Display GPS pins (check-in, check-out, task completions) |
| Polish janitor mobile UX | Large buttons, smooth transitions, haptic feedback |
| Integrate push notifications (basic) | Capacitor Push Notifications plugin setup |
| Create time_logs database migration | time_logs table + RLS |

**Deliverable**: Complete janitor workflow end-to-end. **This is the MVP milestone.**

---

### Phase 3: Management & Portal (Sprints 6–9)

#### Sprint 6 — Manager Dashboard & Property View (Weeks 13–14)

**Goal**: Operations manager can see overview of all properties and drill into details.

| Task | Details |
|------|---------|
| Build manager dashboard page | Map/list of properties with status indicators |
| Create KPI tiles component | % completion, hours used vs. budgeted, open avvik, staffing gaps |
| Implement property detail page | Historical visits, time spent, NS 3451 grouped tasks, photo gallery |
| Build filter system | By customer, region, NS 3451 category, date range |
| Add avvik timeline to property detail | Timeline view with severity badges and GPS markers |
| Create manager-specific API queries | Aggregated data, portfolio filtering |
| Implement Leaflet map with property pins | Clickable pins with summary popup |

**Deliverable**: Manager has visibility into property performance and history.

#### Sprint 7 — Instruction Editor & Avvik Inbox (Weeks 15–16)

**Goal**: Manager can create/edit task instructions and manage discrepancies.

| Task | Details |
|------|---------|
| Build instruction tree-view editor | Add/edit/reorder tasks with NS 3451 code picker |
| Implement Markdown import parser | Parse NS 3451 tables from markdown files |
| Add instruction versioning | Publish new version → auto-notify janitors |
| Build version diff view | Compare old vs. new instruction versions |
| Create avvik inbox page | List all avvik with filters (NS 3451, property, severity, status) |
| Build avvik detail + comment flow | Manager comments, status changes, photo before/after |
| Implement customer notification on avvik | Email + push when varsle_styret avvik resolved |
| Build instruction acknowledgment flow | Janitor must confirm "Jeg forstår" before next visit |

**Deliverable**: Manager can manage instructions and process discrepancies.

#### Sprint 8 — Roster & Staffing (Weeks 17–18)

**Goal**: Staffing management, sick leave handling, swap requests.

| Task | Details |
|------|---------|
| Build roster management page | View/edit bemanningsark per property |
| Implement property-to-janitor assignment | Assign/reassign janitors with schedule |
| Build swap request form (janitor) | Sick leave or coverage request with date range |
| Build swap request inbox (manager) | Review, approve/reject, assign replacement |
| Implement notification cascade | Sick janitor, replacement, customers all notified |
| Add roster calendar view | Weekly view of who is assigned where |
| Build budgeted hours tracking | Upload/edit bemanningsark data |
| Implement timesheet approval workflow | Manager reviews, approves, bulk actions |

**Deliverable**: Full staffing workflow including sick leave and swap requests.

#### Sprint 9 — Customer Portal & Reporting (Weeks 19–20)

**Goal**: Customer-facing portal and exportable reports.

| Task | Details |
|------|---------|
| Build customer login flow | Invite-only, property portfolio scoped |
| Create customer dashboard | List of properties with last visit summary |
| Build customer property detail | % done per NS 3451 group, avvik (open/closed) |
| Create avvik view for customers | Grouped by NS 3451, photos, status timeline (no internal data) |
| Implement monthly PDF export | Edge function to generate summary + avvik report |
| Build manager reporting page | Completion by NS 3451, profitability, avvik heatmap |
| Add CSV/Excel export | Timesheet export for payroll, completion data |
| Create photo gallery with GPS audit trail | Filterable gallery for manager review |

**Deliverable**: Customer portal live, core reports exportable.

---

### Phase 4: Polish & Launch (Sprints 10–12)

#### Sprint 10 — Offline Hardening & Sync (Weeks 21–22)

**Goal**: Robust offline experience with reliable sync.

| Task | Details |
|------|---------|
| Harden offline sync queue | Conflict resolution, retry logic, error handling |
| Implement service worker caching strategy | Cache-first for app shell, network-first for API |
| Add offline indicator in UI | Banner showing "Frakoblet – endringer lagres lokalt" |
| Test offline → online sync flows | Task completion, avvik, photos, time logs |
| Implement background photo upload | Queue photos, upload when connected, show progress |
| Add sync status indicators | Per-item sync status (pending, syncing, synced, failed) |
| Handle edge cases | Duplicate prevention, stale data detection, version conflicts |

**Deliverable**: App works fully offline and syncs reliably when connection resumes.

#### Sprint 11 — PWA, Accessibility & i18n (Weeks 23–24)

**Goal**: Production-ready PWA with full accessibility and language support.

| Task | Details |
|------|---------|
| Complete PWA manifest and icons | All sizes, splash screens, theme colors |
| Implement install prompt | Custom "Add to homescreen" prompt |
| Complete all Norwegian translations | Review all text with native speaker |
| Add English translations | Full English language support |
| Implement language switcher | In settings, persisted in profile |
| WCAG 2.1 AA audit and fixes | Focus management, ARIA labels, color contrast |
| Add dark mode | Theme toggle, system preference detection |
| Optimize for glove-friendly use | Minimum 48px touch targets, spacing |
| Performance optimization | Code splitting, lazy loading, image optimization |
| Set up Sentry error monitoring | Error tracking, performance metrics |

**Deliverable**: Polished, accessible, bilingual PWA ready for pilot.

#### Sprint 12 — Integration Testing & Pilot Prep (Weeks 25–26)

**Goal**: End-to-end testing, bug fixes, and pilot deployment.

| Task | Details |
|------|---------|
| Write E2E test suite (Playwright) | Full janitor workflow, manager dashboard, customer portal |
| Load testing | Simulate 50–100 concurrent users |
| Security audit | RLS policy review, JWT validation, OWASP check |
| GDPR compliance review | Consent flows, data retention, right to deletion |
| Fix bugs from testing | Priority triage and resolution |
| Create onboarding flow | Role-based tour + GPS consent explanation |
| Write user documentation | Quick-start guides for each role (in-app) |
| Deploy to production | Vercel (frontend) + Supabase production (EU) |
| Pilot with test property | 1–2 properties, 3–5 janitors, 1 manager |
| Monitor and gather feedback | Sentry alerts, user feedback forms |

**Deliverable**: App deployed to production, pilot running with real users.

---

## 7. Critical Path Components

These components are the highest-risk, highest-dependency items. Get them right early.

### 7.1 Smart Due-Date Engine (`src/features/tasks/lib/dueDateEngine.ts`)

The core algorithm that drives which tasks appear on a janitor's checklist.

**Logic**:
```
For each (instruction + property):
1. Get last_completed from most recent task_execution
2. Calculate next_due based on frequency_type + frequency_interval:
   - weekly: last + (interval × 7) days
   - monthly: last + interval months (calendar-aware)
   - quarterly: last + (interval × 3) months
   - yearly: last + interval years
   - every_visit: always due
3. Apply seasonal filter (summer = Jun–Aug, winter = Dec–Feb)
4. If next_due ≤ today AND (in season OR no season): INCLUDE in checklist
5. If overdue + high_risk NS 3451 code: flag as OVERDUE
```

**Testing**: This needs extensive unit tests covering edge cases (new tasks with no history, seasonal boundaries, overdue detection, leap years).

### 7.2 GPS Capture Hook (`src/hooks/useGPS.ts`)

Used by check-in, check-out, task completion, and avvik reporting.

**State machine**: `idle → requesting_permission → acquiring → success/error`

**Key concerns**:
- GDPR consent dialog (first use, stored in profile)
- Accuracy timeout (accept best reading within 10s, minimum accuracy threshold)
- Graceful fallback (if GPS unavailable, allow continuation with null coordinates)
- Battery efficiency (single point capture, not continuous tracking)

### 7.3 Offline Sync Queue (`src/lib/offline/syncQueue.ts`)

The highest technical risk. Must correctly queue, persist, and replay mutations.

**Queue entry structure**:
```typescript
{
  id: string;          // UUID
  type: 'task_execution' | 'avvik' | 'time_log' | 'photo';
  payload: unknown;    // Serialized mutation data
  created_at: number;  // Timestamp for ordering
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retries: number;
  error?: string;
}
```

**Key concerns**:
- Idempotency (same mutation replayed twice must not create duplicates)
- Ordering (replay in creation order)
- Photo handling (large binary data queued separately)
- Conflict detection (server state changed while offline)
- Retry with exponential backoff

### 7.4 NS 3451 Reference Library

The hierarchical code system underpins task creation, checklist display, avvik linking, and reporting.

**Seed data approach**: Pre-populate the `ns3451_codes` table with the standard Norwegian building classification hierarchy. Allow admin to extend/customize.

**UI components needed**:
- `NS3451Accordion` — Collapsible groups for checklist display
- `NS3451CodePicker` — Searchable tree selector for task creation/avvik
- `NS3451TreeEditor` — Drag-and-drop tree for instruction editing

### 7.5 i18n Setup (`src/i18n/index.ts`)

Must be configured from Sprint 0 so every component uses `t()` from the start.

**Pattern**: Namespace per feature (`janitor.json`, `manager.json`, `common.json`), lazy-loaded per route. Norwegian Bokmål (`nb`) as default, English (`en`) as fallback.

---

## 8. Testing Strategy

### Testing Pyramid

```
         ╱╲
        ╱ E2E ╲         Playwright — 10–15 critical user flows
       ╱────────╲
      ╱Integration╲     Supabase local — RLS policies, edge functions
     ╱──────────────╲
    ╱   Component     ╲  Testing Library — UI behavior, forms
   ╱────────────────────╲
  ╱      Unit Tests       ╲  Vitest — Business logic, utilities
 ╱──────────────────────────╲
```

### Unit Tests (Vitest)

| Target | Examples |
|--------|----------|
| Due-date engine | All frequency types, seasonal logic, overdue detection, edge cases |
| GPS utilities | Coordinate formatting, accuracy validation |
| Sync queue | Enqueue, dequeue, retry, idempotency |
| Zod validators | All form schemas with valid/invalid inputs |
| Date utilities | Norwegian date formatting, week number calculation |
| NS 3451 helpers | Hierarchy traversal, level detection, parent lookup |

### Component Tests (Testing Library)

| Target | Examples |
|--------|----------|
| TaskCard | Renders badges, handles completion/skip/avvik |
| AvvikForm | Validates required fields, severity-dependent photo requirement |
| CheckInButton | GPS consent flow, loading state, success/error |
| NS3451Accordion | Expand/collapse, shows correct tasks per group |
| Timer | Start/stop, displays elapsed time, converts to minutes |

### Integration Tests

| Target | Examples |
|--------|----------|
| RLS policies | Each role can only access permitted data |
| Edge functions | Due-date calculation returns correct results |
| Photo upload | Upload flow, storage path, metadata |
| Auth flow | Login → JWT → role detection → route redirect |

### E2E Tests (Playwright)

| Flow | Steps |
|------|-------|
| Janitor full visit | Login → select property → check in → complete tasks → report avvik → check out |
| Manager reviews avvik | Login → avvik inbox → filter → comment → resolve → customer notified |
| Customer views property | Login → select property → view avvik → download PDF |
| Instruction update | Manager imports markdown → publishes → janitor sees update notification |
| Swap request | Janitor requests sick leave → manager approves → roster updates |

### Offline Testing

- Simulate offline conditions in Playwright (network throttling)
- Test: complete tasks offline → reconnect → verify sync
- Test: photo queue while offline → sync photos on reconnect
- Test: conflict resolution (data changed on server while offline)

---

## 9. CI/CD & Deployment

### Branch Strategy

```
main ──────────────────────────── production (Vercel + Supabase production)
  └── develop ─────────────────── staging (Vercel preview + Supabase staging)
        ├── feature/janitor-checkin
        ├── feature/avvik-form
        └── fix/gps-accuracy
```

### GitHub Actions Pipeline

```yaml
# On push to any branch:
- Lint (ESLint + Prettier check)
- Type check (tsc --noEmit)
- Unit tests (Vitest)
- Component tests (Testing Library)
- Build check (Vite build)

# On PR to develop:
- All above +
- Supabase migration check (supabase db diff)
- Preview deployment (Vercel)
- E2E tests against preview (Playwright)

# On merge to main:
- All above +
- Deploy to production (Vercel)
- Run Supabase migrations (production)
- Notify team (Slack/email)
```

### Environment Configuration

| Environment | Frontend | Backend | Purpose |
|-------------|----------|---------|---------|
| Local | `localhost:5173` | Supabase local (Docker) | Development |
| Staging | `staging.coor-app.vercel.app` | Supabase staging project | Testing + review |
| Production | `app.coor.no` (custom domain) | Supabase production (EU) | Live users |

---

## 10. Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| **Offline sync data loss** | High | Medium | Idempotent mutations, persistent queue in IndexedDB, conflict detection, extensive E2E testing |
| **GPS inaccuracy indoors** | Medium | High | Accept best reading within timeout, store accuracy value, allow null GPS, display accuracy badge |
| **Large photo uploads on 3G** | Medium | High | Compress before upload, progressive upload with retry, background sync, show progress |
| **NS 3451 data completeness** | Medium | Medium | Start with core codes, allow admin to extend, validate import parser thoroughly |
| **Supabase RLS complexity** | High | Medium | Test every policy with integration tests, review with security checklist |
| **i18n coverage gaps** | Low | Medium | Namespace-per-feature pattern, missing key detection in CI, native speaker review |
| **Service worker cache staleness** | Medium | Medium | Version-based cache busting, stale-while-revalidate for API, force update prompt |
| **Capacitor plugin compatibility** | Medium | Low | Pin plugin versions, test on real iOS + Android devices, have web fallbacks |
| **Performance on low-end devices** | Medium | Medium | Code splitting, lazy loading, virtualized lists, <2s load target, real-device testing |
| **GDPR non-compliance** | High | Low | Consent-first GPS/camera, data minimization, retention policies, DPO review |

---

## 11. Open Questions

These items need stakeholder decisions before or during development:

| # | Question | Impact | Phase |
|---|----------|--------|-------|
| 1 | GPS soft warning for check-in far from property? | UX complexity | Phase 2 |
| 2 | Mandatory photo for all high-risk tasks (heis/brann/sprinkler)? | Workflow enforcement | Phase 2 |
| 3 | QR-code for property/equipment identification? | Hardware needs | Phase 4+ |
| 4 | Integration with Coor ERP/payroll? | Backend architecture | Phase 4+ |
| 5 | Pilot scope: how many properties/janitors? | Infrastructure sizing | Phase 4 |
| 6 | Seasonal date ranges: fixed (Jun–Aug/Dec–Feb) or configurable? | Due-date engine | Phase 2 |
| 7 | Timesheet auto-approve threshold (e.g., ±10% of budget)? | Manager workload | Phase 3 |
| 8 | Customer portal: customers can add their own users? | Auth flow | Phase 3 |
| 9 | Photo retention period (1 year, 5 years, indefinite)? | Storage costs, GDPR | Phase 4 |
| 10 | Concurrent janitors on same property — how to handle? | Data model | Phase 2 |
| 11 | Avvik SLA for manager response time? | Notification logic | Phase 3 |
| 12 | Bemanningsark import format (Excel, CSV, custom)? | Import parser | Phase 3 |

---

## Appendix A: Coor Brand Theme (Tailwind)

```javascript
// tailwind.config.ts (excerpt)
{
  theme: {
    extend: {
      colors: {
        coor: {
          blue: {
            50: '#EBF5FF',
            100: '#D6EBFF',
            500: '#0066B3',  // Primary
            600: '#005799',
            700: '#004880',
            900: '#002A4D',
          },
          green: {
            50: '#EDFAF0',
            500: '#00A651',  // Accent
            600: '#008C44',
          },
          orange: {
            500: '#F47920', // Logo star accent
          }
        },
        severity: {
          low: '#22C55E',     // Green
          medium: '#F59E0B',  // Amber
          high: '#EF4444',    // Red
        }
      }
    }
  }
}
```

## Appendix B: NS 3451 Main Categories

| Code | Norwegian | English |
|------|-----------|---------|
| 1 | Fellesanlegg | Common facilities |
| 2 | Bygning | Building/Structure |
| 3 | VVS | Plumbing/HVAC |
| 4 | Elkraft | Electrical power |
| 5 | Tele og automatisering | Telecom & automation |
| 6 | Andre installasjoner | Other installations |
| 7 | Utendørs | Outdoor areas |

Each main category uses a distinct color in the accordion UI for visual identification.

## Appendix C: Key Norwegian Terminology

| Norwegian | English | Context |
|-----------|---------|---------|
| Vaktmester | Janitor/Caretaker | Primary field user |
| Driftssjef | Operations Manager | Supervisor role |
| Eiendom | Property/Building | Managed location |
| Instruks | Instruction | Task definition |
| Oppgave | Task | Individual checklist item |
| Oppdrag | Assignment/Visit | Scheduled property visit |
| Utførelse | Execution | Task completion record |
| Avvik | Discrepancy/Deviation | Issue found during visit |
| Tidsforbruk | Time consumption | Time log |
| Bemanningsark | Staffing sheet/Roster | Schedule management |
| Sjekk inn/ut | Check in/out | Visit start/end |
| Varsle styret | Notify the board | Customer notification trigger |
| Hopp over | Skip | Task skipped |
| Overdue | Forfalt | Past due date |

---

*This development plan is a living document. Update as decisions are made and scope evolves.*
