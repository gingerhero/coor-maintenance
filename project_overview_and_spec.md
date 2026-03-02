**Coor Eiendomsservice Maintenance App – Full Specification**  
**Version 1.2 | March 2026**  
**Type**: Responsive Progressive Web App (PWA) – installable on phones/iPads (homescreen shortcut, offline-capable).  
**Primary language**: Norwegian (Bokmål), with easy switch to English. All UI text, reports, and notifications in Norwegian by default.

### 1. Project Overview & Objectives
The app digitises Coor’s property maintenance (eiendomsservice / vaktmestertjenester) workflow for buildings across Norway. It replaces paper instructions (like the NS 3451-based driftsinstrukser), manual timesheets, and email-based discrepancy reports with a single, mobile-first platform.

**Key business goals**  
- Accurate recording of **actual time spent** vs. budgeted hours per property (profitability tracking via bemanningsark).  
- Full traceability: who did what, when, **where (GPS captured at key moments)**, and with photo proof.  
- Immediate visibility of **avvik** (discrepancies) for managers and customers (sameier/styrer).  
- Simplified staffing administration (sick leave, swap requests, roster).  
- Transparent customer portal to increase trust and reduce support calls.  
- Support for NS 3451 hierarchy, mixed frequencies (uke/mnd/kvartal/år), seasonal tasks, and "varsle styret" logic.  
- 100 % mobile usage for janitors on-site (no laptop needed).

### 2. User Roles & Permissions
| Role                  | Key Access                                                                 | Restrictions                          |
|-----------------------|----------------------------------------------------------------------------|---------------------------------------|
| **Vaktmester (Janitor)** | Own assignments, check-in/out, task checklists, avvik reporting, time log | Cannot edit tasks or see other janitors’ data |
| **Driftssjef (Operations Manager)** | Everything + staffing roster, task editing, approvals, full analytics     | Full read/write on assigned properties |
| **Kunde (Customer / Sameie/Styre)**  | Read-only dashboard for their properties (work logs + avvik summary)      | No editing, no internal staffing data |
| **Admin** (subset of Driftssjef) | User management, global settings, NS 3451 reference data                  | —                                     |

### 3. Core Data Model
- **Eiendom (Property)**: ID, address, customer/sameie, **approximate GPS coordinates (center point for display/reference)**, estimated hours (from bemanningsark), attached instructions (versioned).
- **Instruks / Oppgave (Instruction/Task)**: 
  - Hierarchical structure mirroring **NS 3451** (Bygningsdelstabell): levels 1–4 digits (e.g. 2 Bygning → 23 Yttervegger → 239 Etterse dører).
  - Fields: code (NS3451), description, frequency (enum: Uke [1–n], Mnd [1–n], Kvartal [1–n], År [1–n], Hver besøk; or "x" for every visit), seasonal (Sommer/Vinter/None), kommentar, photo_required (bool), varsle_styret (bool – triggers customer notification on deviation).
  - Import from Markdown/Excel tables (auto-parse NS 3451 rows).
- **Oppdrag (Assignment/Visit)**: Property + date + assigned janitor(s) + scheduled start window + generated checklist (dynamic, based on due tasks).
- **Utførelse (Task Execution)**: Task ID (NS3451) + janitor + timestamp + **GPS position at completion** + photo(s) + status (done / skipped with reason) + last_completed date (for next-due calculation).
- **Avvik (Discrepancy)**: Property + NS3451 code + location (room/floor) + description (text/voice) + photos + **GPS position at reporting** + timestamp + severity (lav/middels/høy) + status (ny / under arbeid / løst) + varsle_styret flag.
- **Tidsforbruk (Time Log)**: Janitor + property + date + actual minutes (timer or manual) + **GPS position captured at check-in and check-out** + notes.
- **Bemanningsark / Roster**: Janitor ↔ properties + budgeted hours + schedule.
- **Swap Request**: Sick leave / coverage requests between janitors + manager approval.

**Smart Due-Date Engine** (core backend logic):  
For each task+property:  
- Calculate next due date from frequency + last_completed.  
- Filter checklist per visit: only show due tasks (e.g. "Uke 1" on Mondays, "Vinter" in winter months).  
- Overdue alerts for high-risk tasks (heis, brann, sprinkler).

**GPS Handling Policy**:  
- No geofencing or virtual boundary enforcement for check-in.  
- Janitors can check in from anywhere (trust-based).  
- Automatically capture and store GPS coordinates at:  
  - Check-in  
  - Check-out  
  - Each task completion (especially photo_required or high-risk tasks)  
  - Each avvik report  
- GPS data used for traceability, audit, reporting, and optional analytics.  
- User consent dialog on first use; GDPR-compliant.

### 4. Functional Requirements

#### 4.1 Common / Shared
- Responsive PWA (works offline for task completion, avvik reporting, time logs; syncs when back online via service worker).  
- Push notifications (new assignment, urgent avvik, swap request, "ny instruksversjon").  
- Camera & photo library integration + automatic GPS tagging (with user consent).  
- Norwegian date/time formats, number formats; voice-to-text (Norwegian).  
- NS 3451 reference library (admin-maintained) for task creation/editing.

#### 4.2 Janitor (Vaktmester) – Core Workflow
1. **Home screen** – “Mine oppdrag” (today + next 7 days), with estimated total hours, overdue flags.  
2. **Select property** → **Sjekk inn** button  
   - Auto-captures current GPS position + timestamp.  
   - Starts visit timer (optional).  
   - Optional note field.  
3. **Task checklist** (dynamic TODO-list from instruction)  
   - Grouped by NS 3451 main categories (accordions: 2 Bygning, 3 VVS, 4 Elkraft, etc.).  
   - Per task: code, description, frequency/season badge, kommentar tooltip.  
   - Completion options:  
     - **Utført** → optional photo (pre-filled camera for photo_required tasks) + auto GPS + timestamp.  
     - **Hopp over** → mandatory reason (dropdown) + free text + photo encouraged.  
     - **Avvik oppdaget** → quick button to avvik form (pre-filled with NS3451 code + location + auto GPS).  
   - For "varsle styret" tasks: force "Ingen avvik observert" checkbox or avvik report on skip/deviation.  
   - Voice-to-text for notes.  
4. **Avvik reporting** (floating “+ Avvik” button; also inline per task)  
   - Photo(s) mandatory for high-severity; NS3451 picker, room selector, severity + auto GPS.  
   - Auto-flags "varsle styret" if task-linked.  
5. **Sjekk ut**  
   - Mandatory actual time input (or stop timer) – shown vs. budgeted hours.  
   - Auto-captures GPS at check-out.  
   - If incomplete tasks → modal forces reason for each (or “Gå tilbake”).  
   - Seasonal/high-risk warnings.  
   - Summary screen (tasks done, avvik, time, GPS points) → Submit.  
6. **History** – own past visits (read-only, with photos and GPS map pins).

#### 4.3 Operations Manager (Driftssjef)
- **Oversiktsdashboard**  
  - Map/list of buildings (with approximate center pins).  
  - KPI tiles: % completion (today/week), hours used vs. budgeted, open avvik (by NS3451 category/severity), staffing gaps.  
  - Filter by customer/region/NS3451.  
- **Eiendom detalj**  
  - Historical visits, time spent, completed tasks (NS3451 grouped), photos, avvik timeline + GPS markers on map/timeline.  
- **Instruks- og oppgaveeditor**  
  - Import Markdown/Excel NS 3451 tables (auto-map columns).  
  - Tree-view editor: add/edit/reorder tasks with NS3451 code picker.  
  - Set frequency, seasonal flags, photo_required, varsle_styret.  
  - Versioning: publish new version → notify janitors ("Ny driftsinstruks – gjennomgå før neste besøk").  
- **Bemannings- og roster**  
  - Upload/view bemanningsark.  
  - Assign properties to janitors.  
  - Sick-leave / swap-request workflow (alerts, approvals, notifications).  
  - Timesheet approval & export (Excel/PDF for lønn) – include GPS summary if audited.  
- **Avvik-innboks** – filter by NS3451/property/severity, comment, resolve, auto-notify customer (email/push with photos + GPS).  
- **Rapporter** – exportable (CSV/PDF):  
  - Completion by NS3451 category.  
  - Profitability (time vs. bemanning).  
  - Avvik heatmap.  
  - Photo galleries + GPS audit trails.

#### 4.4 Kundeportal (Sameie/Styre)
- Login (invite-only per property portfolio).  
- Dashboard: list of properties.  
- Per eiendom:  
  - Last visit + summary (% done per NS3451 main group).  
  - Open/closed avvik (grouped by NS3451 with photos, status, "varsle styret" history + GPS if relevant).  
  - Monthly PDF export (summary + avvik).  
- No Coor-internal data (e.g. no janitor names, timesheets, GPS unless tied to avvik).

### 5. Key User Workflows
**Vaktmester daglig flyt**  
Login → Mine oppdrag → Velg eiendom → Sjekk inn (auto-GPS) → NS3451-gruppert sjekkliste + avvik underveis (med GPS) → Sjekk ut (auto-GPS + tid + grunner) → Ferdig.

**Driftssjef håndterer sykefravær**  
Vaktmester melder syk → oppretter bytteforespørsel → Driftssjef godkjenner → tildeler ny → alle varsles → roster oppdatert.

**Kunde ser avvik**  
Vaktmester rapporterer avvik (med NS3451 + bilde + GPS) → auto-varsel til styret + vises i kundeportal.

**Oppdater instruks**  
Driftssjef importerer ny Markdown → publiserer → janitor ser oppdatering ved neste besøk.

### 6. Non-Functional Requirements
- **Mobile-first / PWA**: Installable, offline (local storage + sync queue for checklists/avvik/tid/GPS captures).  
- **Performance**: < 2 s load on 3G; background photo + GPS upload.  
- **Security**: GDPR (samtykke for GPS/bilder, data minimering). Role-based (JWT). EU/Norge-hosting.  
- **Accessibility**: WCAG 2.1 AA (store knapper, voice-over).  
- **Scalability**: 50–500 janitors initialt; cloud backend.  
- **Integrations** (fremtid): Lønnseksport, Coor ERP hvis eksisterende.

### 7. UI/UX Guidelines
- Coor-farger (blå/grønn), ikon-tung (hanskevennlig).  
- NS3451-akkordioner med fargekoder per hovedkategori.  
- Badges for frekvens/sesong (f.eks. rød for "Overdue").  
- Dark mode.  
- Konsistent terminologi: “Sjekk inn”, “Avvik”, “Tidsforbruk”, “NS 3451”, “Varsle styret”.  
- Onboarding: rollebasert tour + GPS samtykke forklaring.

### 8. Technical Recommendations
- **Frontend**: React + Vite + Tailwind + Capacitor (PWA + native kamera/GPS).  
- **Backend**: Supabase/Firebase (real-time, storage for bilder, functions for due-dates/NS parsing) eller Node + Postgres.  
- **Hosting**: Vercel + Supabase EU.  
- **Offline**: IndexedDB + sync.  
- **Maps/GPS**: Leaflet for display of captured points.  
- **Import**: Parser for Markdown-tabeller (NS3451-kolonner).

### 9. Open Questions / Next Steps
- Confirm if managers want optional "suggested check-in location" warning (soft, non-blocking).  
- Photo-krav per task-type (f.eks. alltid for heis/brann)?  
- QR-kode som alternativ identifikasjon?  
- Integrasjon med eksisterende Coor-systemer (lønn/ERP)?  
- Antall eiendommer/janitorer i pilot (start med Poppelhagen-lignende)?  
- Branding: full Coor-logo.