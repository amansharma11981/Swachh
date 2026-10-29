# SwachhAI — Civic Cleanliness & Waste Management Platform

SwachhAI is an enterprise-grade civic reporting, AI-assisted triage, and municipal workforce dispatch platform designed for the NIT Patna pilot ecosystem. The platform bridges citizens, field sanitary workers, and municipal operations teams into a unified, evidence-driven workflow.

This document serves as the **master codebase guide**, mapping every system functionality to its exact implementation files across the directory structure.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Functionality & Feature Map](#functionality--feature-map)
   - [Citizen Reporting & Tracking](#1-citizen-reporting--tracking)
   - [AI Waste Classification & Vision Analysis](#2-ai-waste-classification--vision-analysis)
   - [Field Worker Workspace & Task Execution](#3-field-worker-workspace--task-execution)
   - [Admin Operations & Analytics Dashboard](#4-admin-operations--analytics-dashboard)
   - [Report Triage, Moderation & Worker Dispatch](#5-report-triage-moderation--worker-dispatch)
   - [Evidence-Based AI Cleanliness Recommendations](#6-evidence-based-ai-cleanliness-recommendations)
   - [Geographic Maps & Pilot Zone Management](#7-geographic-maps--pilot-zone-management)
   - [Civic Assistant & Natural Language Complaint Drafting](#8-civic-assistant--natural-language-complaint-drafting)
   - [Authentication, RBAC & Elevated Access Requests](#9-authentication-rbac--elevated-access-requests)
   - [In-App Notifications & Event Polling](#10-in-app-notifications--event-polling)
   - [Theming & Responsive Design System](#11-theming--responsive-design-system)
3. [Frontend Codebase Structure (`src/`)](#frontend-codebase-structure-src)
4. [Backend Codebase Structure (`server/src/`)](#backend-codebase-structure-serversrc)
5. [Database Models & Schemas (`server/src/models/`)](#database-models--schemas-serversrcmodels)
6. [API Route to Controller Mapping](#api-route-to-controller-mapping)
7. [Testing Suite Structure](#testing-suite-structure)
8. [Configuration & Deployment Architecture](#configuration--deployment-architecture)
9. [Documentation Index (`docs/`)](#documentation-index-docs)
10. [Quick Start & Setup Instructions](#quick-start--setup-instructions)

---

## High-Level Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER (Vite + React 19)                │
│   • Responsive Single Page App (SPA)   • Role-Scoped Layouts (RBAC)   │
│   • Leaflet Interactive Cleanliness Map • Optimistic State & Forms      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           /api/v1 (HttpOnly JWT Cookie + Strict Origin Guard)
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER (Node.js + Express)                │
│   • Rate Limiting & Origin Guard        • Zod Request Validation       │
│   • Bcrypt Password Hashing            • Append-Only Audit Logging    │
│   • Role-Based Access Control (RBAC)   • Multer Multipart Ingestion   │
└────────────┬───────────────────────┬──────────────────────────┬────────┘
             │                       │                          │
             ▼                       ▼                          ▼
┌────────────────────────┐  ┌─────────────────┐  ┌───────────────────────┐
│     MONGODB ATLAS      │  │ CLOUDINARY CDN  │  │   GROQ AI API         │
│ • Users & Roles        │  │ • Citizen Photo │  │ • Vision Classification│
│ • Reports & History    │  │   Evidence      │  │ • Advisory Insights   │
│ • Geofenced Zones      │  │ • Worker Proof  │  │ • Recommendations     │
│ • Audit Trails         │  │   of Work       │  │ • Civic Assistant LLM │
└────────────────────────┘  └─────────────────┘  └───────────────────────┘
```

---

## Functionality & Feature Map

### 1. Citizen Reporting & Tracking
Allows citizens to photograph waste, geotag locations, match campus pilot zones, submit complaints, and follow status updates in real time.

| Sub-Feature | Frontend Implementation | Backend Implementation |
|---|---|---|
| **Multi-step Report Form** | [`src/pages/ReportFormPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/ReportFormPage.jsx) | [`server/src/routes/reportRoutes.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/routes/reportRoutes.js) (`POST /reports`) |
| **Zone Matching / Geofencing** | [`src/features/reports/zoneMatching.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/reports/zoneMatching.js) | [`server/src/models/Zone.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/models/Zone.js) |
| **Citizen Dashboard** | [`src/pages/CitizenDashboardPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/CitizenDashboardPage.jsx) | [`server/src/controllers/reportController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/reportController.js) (`dashboard`) |
| **Report History & Filtering** | [`src/pages/MyReportsPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/MyReportsPage.jsx) | [`server/src/controllers/reportController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/reportController.js) (`myReports`) |
| **Report Detail & Timeline** | [`src/pages/ReportDetailPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/ReportDetailPage.jsx) | [`server/src/controllers/reportController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/reportController.js) (`getReportById`) |
| **Image Upload & Storage** | Multipart form handling via `FormData` | [`server/src/middleware/reportUpload.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/middleware/reportUpload.js), [`server/src/services/imageStorage.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/services/imageStorage.js) |

---

### 2. AI Waste Classification & Vision Analysis
Integrates Groq (Qwen/Llama vision models) to analyze uploaded photos, predict waste category, assign provisional priority, and provide confidence metrics.

| Sub-Feature | Frontend Implementation | Backend Implementation |
|---|---|---|
| **Vision Preview & Analysis Trigger** | [`src/pages/ReportFormPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/ReportFormPage.jsx) | [`server/src/routes/reportRoutes.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/routes/reportRoutes.js) (`POST /reports/analyze-image`) |
| **AI Model Caller & Fallbacks** | Triggered via [`src/features/reports/reportService.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/reports/reportService.js) | [`server/src/services/aiAnalysis.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/services/aiAnalysis.js) |
| **Short-Lived Signed Analysis Tokens** | Sent with submission payload to seal AI recommendations | Generated in `aiAnalysis.js`, verified in `reportValidators.js` |
| **Admin AI Review & Verification** | Displayed on [`src/pages/AdminTaskPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminTaskPage.jsx) | [`server/src/controllers/reportController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/reportController.js) (`moderate`) |

---

### 3. Field Worker Workspace & Task Execution
Dedicated portal for sanitary personnel to accept assigned cleanups, post work notes, upload completion photo proof, and submit tasks for inspection.

| Sub-Feature | Frontend Implementation | Backend Implementation |
|---|---|---|
| **Worker Task Dashboard** | [`src/pages/WorkerDashboardPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/WorkerDashboardPage.jsx) | [`server/src/routes/taskRoutes.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/routes/taskRoutes.js) (`GET /tasks/worker/tasks`) |
| **Task Execution Screen** | [`src/pages/WorkerTaskPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/WorkerTaskPage.jsx) | [`server/src/controllers/taskController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/taskController.js) |
| **Task Accept & In-Progress Flow** | Handled in [`src/features/tasks/taskService.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/tasks/taskService.js) | [`server/src/controllers/taskController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/taskController.js) (`accept`) |
| **Progress Notes & Evidence Photos** | File input and notes in [`WorkerTaskPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/WorkerTaskPage.jsx) | [`server/src/controllers/taskController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/taskController.js) (`evidence`, `notes`) |
| **Submit for Admin Verification** | Submit action on [`WorkerTaskPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/WorkerTaskPage.jsx) | Changes status to `submitted_for_verification` in `taskService.js` |

---

### 4. Admin Operations & Analytics Dashboard
Comprehensive operations control center with real-time operational metrics, daily volume trends, zone distribution, audit trail, and AI operations summaries.

| Sub-Feature | Frontend Implementation | Backend Implementation |
|---|---|---|
| **Operations Overview Page** | [`src/pages/AdminDashboardPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminDashboardPage.jsx) | [`server/src/routes/reportRoutes.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/routes/reportRoutes.js) (`GET /reports/admin/metrics`) |
| **Responsive Stat Cards (`admin-metric-grid`)** | [`src/features/reports/analytics.css`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/reports/analytics.css) | Calculated in [`reportController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/reportController.js) (`adminMetrics`) |
| **Daily Report Volume Chart** | Rendered in [`AdminDashboardPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminDashboardPage.jsx) | Aggregated via MongoDB `$dateToString` aggregation pipeline |
| **Category & Zone Breakdown Panels** | Responsive grid in [`AdminDashboardPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminDashboardPage.jsx) | Grouped via MongoDB `$group` on `category` and `zone.name` |
| **Recent Administrative Audit Events** | Event stream in [`AdminDashboardPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminDashboardPage.jsx) | [`server/src/models/AuditLog.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/models/AuditLog.js), [`reportController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/reportController.js) (`recentAudit`) |
| **AI Operations Notes** | Groq-generated summary in [`AdminDashboardPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminDashboardPage.jsx) | [`server/src/controllers/reportController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/reportController.js) (`adminInsights`) |

---

### 5. Report Triage, Moderation & Worker Dispatch
Allows administrators to triage incoming citizen reports, modify categories and priorities, detect duplicates, assign workers, set deadlines, and verify field completions.

| Sub-Feature | Frontend Implementation | Backend Implementation |
|---|---|---|
| **Admin Dispatch & Moderation Queue** | [`src/pages/AdminTaskPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminTaskPage.jsx) | [`server/src/routes/reportRoutes.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/routes/reportRoutes.js) (`GET /reports`), [`server/src/routes/taskRoutes.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/routes/taskRoutes.js) |
| **Report Moderation Form** | Category/priority controls in [`AdminTaskPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminTaskPage.jsx) | [`server/src/controllers/reportController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/reportController.js) (`moderate`) |
| **Worker Assignment & Reassignment** | Assignment dropdown and date selector in [`AdminTaskPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminTaskPage.jsx) | [`server/src/controllers/taskController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/taskController.js) (`assign`) |
| **Completion Verification / Return** | Approval / return form in [`AdminTaskPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminTaskPage.jsx) | [`server/src/controllers/taskController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/taskController.js) (`verify`) |
| **Duplicate Candidate Linking** | Proximity detection trigger in [`AdminTaskPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminTaskPage.jsx) | [`server/src/controllers/reportController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/reportController.js) (`duplicateCandidates`, `linkDuplicate`) |
| **Worker Roster & Workload** | [`src/pages/AdminWorkersPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminWorkersPage.jsx) | [`server/src/controllers/taskController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/taskController.js) (`adminWorkers`) |

---

### 6. Evidence-Based AI Cleanliness Recommendations
Advisory decision-support system. Aggregates period evidence, queries Groq LLM without sending private user data, saves immutable snapshots, and tracks real-world resolution outcomes.

| Sub-Feature | Frontend Implementation | Backend Implementation |
|---|---|---|
| **Recommendation Generation & History** | Section in [`AdminDashboardPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminDashboardPage.jsx) | [`server/src/routes/recommendationRoutes.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/routes/recommendationRoutes.js) (`POST /recommendations/admin/generate`) |
| **Snapshot Review & Action Tracking** | Review form in [`AdminDashboardPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminDashboardPage.jsx) | [`server/src/controllers/recommendationController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/recommendationController.js) (`review`) |
| **Before/After Outcome Comparison** | Action comparison in [`AdminDashboardPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminDashboardPage.jsx) | [`server/src/controllers/recommendationController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/recommendationController.js) (`outcome`) |
| **Recommendation Service** | [`src/features/recommendations/recommendationService.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/recommendations/recommendationService.js) | [`server/src/services/recommendationService.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/services/recommendationService.js) |

---

### 7. Geographic Maps & Pilot Zone Management
Interactive Leaflet/OpenStreetMap interface displaying clustered report pins, category filters, role-scoped coordinates, and zone polygon geofencing.

| Sub-Feature | Frontend Implementation | Backend Implementation |
|---|---|---|
| **Interactive Map Component** | [`src/features/map/ReportMap.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/map/ReportMap.jsx) | Powered by Leaflet & MarkerCluster via OpenStreetMap |
| **Role-Scoped Map Page** | [`src/pages/ReportMapPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/ReportMapPage.jsx) | [`server/src/routes/reportRoutes.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/routes/reportRoutes.js) (`GET /reports/map`) |
| **Zone Management & Geofencing** | [`src/pages/AdminZonesPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminZonesPage.jsx), [`ZonesPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/ZonesPage.jsx) | [`server/src/controllers/reportController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/reportController.js) (`adminZones`, `updateZoneGeofence`) |
| **Map Hotspots & Heat Clustering** | Filter controls in [`ReportMapPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/ReportMapPage.jsx) | [`server/src/controllers/reportController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/reportController.js) (`hotspots`) |

---

### 8. Civic Assistant & Natural Language Complaint Drafting
Conversational AI interface allowing citizens to query report statuses, learn civic rules, and draft structured complaints before official submission.

| Sub-Feature | Frontend Implementation | Backend Implementation |
|---|---|---|
| **Chat Interface & Draft Workspace** | [`src/pages/AssistantPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AssistantPage.jsx) | [`server/src/routes/assistantRoutes.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/routes/assistantRoutes.js) |
| **Assistant API Client** | [`src/features/assistant/assistantService.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/assistant/assistantService.js) | [`server/src/controllers/assistantController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/assistantController.js) |
| **Privacy Guard & Intent Filter** | Bypasses external LLMs for direct DB lookups (e.g., status checks) | [`server/src/controllers/assistantController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/assistantController.js) |

---

### 9. Authentication, RBAC & Elevated Access Requests
Secure authentication with HttpOnly cookies, CSRF origin checking, role protection, and an administrator approval queue for elevated accounts.

| Sub-Feature | Frontend Implementation | Backend Implementation |
|---|---|---|
| **Sign In / Registration Screen** | [`src/pages/AuthPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AuthPage.jsx) | [`server/src/routes/authRoutes.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/routes/authRoutes.js) (`POST /auth/register`, `POST /auth/login`) |
| **Auth Provider & React Context** | [`src/features/auth/AuthProvider.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/auth/AuthProvider.jsx) | [`server/src/routes/authRoutes.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/routes/authRoutes.js) (`GET /auth/me`, `POST /auth/logout`) |
| **Route Protection (Client Guard)** | [`src/components/auth/ProtectedRoute.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/components/auth/ProtectedRoute.jsx) | [`server/src/middleware/authenticate.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/middleware/authenticate.js) (`authorizeRole`) |
| **Pending Access Request Queue** | [`src/pages/AdminAccessRequestsPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminAccessRequestsPage.jsx) | [`server/src/routes/userRoutes.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/routes/userRoutes.js) (`GET /users/approval-requests`) |
| **Role Assignment & Approvals** | Actions in [`AdminAccessRequestsPage.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/pages/AdminAccessRequestsPage.jsx) | [`server/src/controllers/userController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/userController.js) (`updateRole`, `reviewApprovalRequest`) |
| **Initial Admin Seeder** | N/A (CLI command: `npm run seed:admin`) | [`server/src/scripts/seedAdmin.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/scripts/seedAdmin.js) |

---

### 10. In-App Notifications & Event Polling
Delivers status alerts (e.g., report assigned, approved, returned) to users via an in-app notification center that polls every 30 seconds.

| Sub-Feature | Frontend Implementation | Backend Implementation |
|---|---|---|
| **Notification Bell & Popover** | [`src/components/layout/NotificationBell.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/components/layout/NotificationBell.jsx) | [`server/src/routes/notificationRoutes.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/routes/notificationRoutes.js) |
| **Notification API Service** | [`src/features/notifications/notificationService.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/notifications/notificationService.js) | [`server/src/controllers/notificationController.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/controllers/notificationController.js) |
| **Idempotent Notification Dispatcher** | Triggered during status transitions | [`server/src/services/notifications.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/services/notifications.js) |

---

### 11. Theming & Responsive Design System
Unified light/dark theme system with accessible color tokens, responsive CSS grids, and mobile-optimized layouts.

| Sub-Feature | Implementation File | Details |
|---|---|---|
| **Theme System & Storage** | [`src/features/theme/ThemeProvider.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/theme/ThemeProvider.jsx) | Manages `light` / `dark` mode, persists to `localStorage`, applies `data-theme` attribute |
| **Theme Toggle Button** | [`src/components/ui/ThemeToggle.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/components/ui/ThemeToggle.jsx) | Accessible toggle button with sun/moon icons |
| **Theme CSS Variables** | [`src/theme.css`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/theme.css) | Core palette (`--bg`, `--panel`, `--text`, `--accent`, semantic status tokens) |
| **Global Typography & Base Styles** | [`src/styles.css`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/styles.css) | Base elements, utility classes, and global media queries |
| **Analytics Responsive Styles** | [`src/features/reports/analytics.css`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/reports/analytics.css) | Admin dashboard cards, chart scroller, responsive filters, category/zone blocks |

---

## Frontend Codebase Structure (`src/`)

```text
src/
├── app/
│   └── App.jsx                    # Root router with public and role-protected route branches
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.jsx     # Route wrapper verifying active session & user role
│   ├── layout/
│   │   ├── Footer.jsx             # Global public footer
│   │   ├── Navbar.jsx             # Public topbar with navigation links & auth buttons
│   │   └── NotificationBell.jsx   # Polled notification center dropdown
│   ├── sections/
│   │   ├── CommandPreview.jsx     # Landing page operational overview preview
│   │   └── MiniMap.jsx            # Landing page interactive preview map
│   └── ui/
│       ├── Button.jsx             # Standard button component with variant support
│       ├── Icons.jsx              # Lucide icon wrapper
│       ├── SectionHeading.jsx     # Standard section title with eyebrow badge
│       └── ThemeToggle.jsx        # Light/dark mode toggle button
├── data/
│   └── content.js                 # Static content for landing page and marketing sections
├── features/
│   ├── assistant/                 # Civic Assistant chat and complaint draft interface
│   ├── auth/                      # Session provider, login state, and authentication client
│   ├── map/                       # OpenStreetMap Leaflet map with clustering and popups
│   ├── notifications/            # In-app notification polling and read tracking
│   ├── recommendations/           # Evidence-based AI recommendation client and review styles
│   ├── reports/                   # Reporting forms, analytics CSS, and report API service
│   ├── tasks/                     # Worker task queue, moderation cards, and dispatch styles
│   └── theme/                     # Theme context and toggle logic
├── layouts/
│   ├── AppLayout.jsx              # Authenticated workspace layout (Sidebar, Topbar, Mobile Nav)
│   └── PublicLayout.jsx           # Public-facing layout for landing and informational pages
├── pages/
│   ├── AdminAccessRequestsPage.jsx# Worker/admin signup approval queue
│   ├── AdminDashboardPage.jsx     # Operations overview, metrics grid, daily chart, and analytics
│   ├── AdminTaskPage.jsx          # Admin dispatch, report moderation, and assignment queue
│   ├── AdminWorkersPage.jsx       # Field worker active task roster
│   ├── AdminZonesPage.jsx         # Administrative pilot zone coordinates and boundaries
│   ├── AssistantPage.jsx          # AI Civic Assistant chat and draft preview
│   ├── AuthPage.jsx               # Sign in and register page
│   ├── CitizenDashboardPage.jsx   # Citizen home with personal statistics and recent complaints
│   ├── LandingPage.jsx            # Public homepage with platform mission and features
│   ├── MyReportsPage.jsx          # Citizen complaint history with search and status filters
│   ├── PlaceholderPage.jsx        # 404 Not Found and 403 Forbidden screens
│   ├── ProfilePage.jsx            # User profile viewing and display name editing
│   ├── ReportDetailPage.jsx       # Detailed report view with timeline and evidence photos
│   ├── ReportFormPage.jsx         # Step-by-step reporting form with image upload and AI assist
│   ├── ReportMapPage.jsx          # Fullscreen interactive map with category and zone filtering
│   ├── SettingsPage.jsx           # Account settings, security notes, and preferences
│   ├── SimplePage.jsx             # Static content renderer (Privacy, Impact, Methodology)
│   ├── WorkerDashboardPage.jsx    # Worker task list with status chips and urgency indicators
│   ├── WorkerTaskPage.jsx         # Worker field execution screen (Accept, Notes, Photo proof)
│   └── ZonesPage.jsx              # Citizen pilot zone information directory
├── services/
│   └── apiClient.js               # Centralized Fetch wrapper sending HttpOnly cookies
├── styles.css                     # Global design system styles and responsive breakpoints
├── theme.css                      # Design tokens for light/dark themes
└── main.jsx                       # Application entrypoint mounting React 19 root
```

---

## Backend Codebase Structure (`server/src/`)

```text
server/src/
├── config/
│   ├── db.js                      # MongoDB connection setup with Mongoose
│   └── env.js                     # Environment variable validation and defaults
├── controllers/
│   ├── assistantController.js     # AI assistant chat & draft generation endpoints
│   ├── authController.js          # Registration, login, session check, and logout
│   ├── notificationController.js  # Unread counts, notification list, and mark-as-read
│   ├── recommendationController.js# AI recommendation generation, review, and outcomes
│   ├── reportController.js        # Report creation, citizen listing, moderation, and metrics
│   ├── taskController.js          # Worker dispatch, task acceptance, evidence, and verification
│   └── userController.js          # Profile updates, user list, and approval request reviews
├── middleware/
│   ├── authenticate.js            # JWT verification and role authorization guards
│   ├── errorHandler.js            # Normalized JSON error response formatter
│   ├── notFound.js                # 404 Route handler
│   ├── originGuard.js             # Strict CSRF defense verifying request Origin
│   ├── reportUpload.js            # Multer memory storage and file type validation
│   └── validateRequest.js         # Generic Zod request schema validation middleware
├── models/
│   ├── AuditLog.js                # Append-only record of administrative actions
│   ├── Notification.js            # User notification schema with read state
│   ├── Recommendation.js          # Grounded AI recommendation snapshots and reviews
│   ├── Report.js                  # Core report schema, coordinates, timeline, and AI fields
│   ├── User.js                    # User schema with bcrypt hashing and role flags
│   └── Zone.js                    # Pilot zone definitions and polygon geofences
├── routes/
│   ├── assistantRoutes.js         # Routes under /api/v1/assistant
│   ├── authRoutes.js              # Routes under /api/v1/auth
│   ├── healthRoutes.js            # Route under /api/v1/health
│   ├── notificationRoutes.js      # Routes under /api/v1/notifications
│   ├── recommendationRoutes.js    # Routes under /api/v1/recommendations
│   ├── reportRoutes.js            # Routes under /api/v1/reports
│   ├── taskRoutes.js              # Routes under /api/v1/tasks
│   └── userRoutes.js              # Routes under /api/v1/users
├── scripts/
│   └── seedAdmin.js               # CLI script bootstrapping the initial administrator
├── services/
│   ├── aiAnalysis.js              # Groq vision model integration and token signing
│   ├── authService.js             # JWT signing and bcrypt password verification
│   ├── imageStorage.js            # Cloudinary upload and cleanup service
│   ├── notifications.js           # Idempotent notification generator
│   ├── recommendationService.js   # Groq recommendation engine with aggregate evidence
│   ├── reportService.js           # Business logic for report status lifecycles
│   └── taskService.js             # Workflow transitions for worker tasks
├── utils/
│   ├── cookies.js                 # HttpOnly cookie options for production and development
│   ├── errors.js                  # Custom AppError classes with HTTP status codes
│   └── logger.js                  # Structured JSON logger excluding sensitive payload data
├── validators/
│   ├── authValidators.js          # Zod schemas for registration and login
│   ├── moderationValidators.js    # Zod schemas for admin moderation and status changes
│   ├── reportValidators.js        # Zod schemas for report creation and updates
│   └── taskValidators.js          # Zod schemas for task assignment and verification
├── app.js                         # Express application setup with middleware chain
└── server.js                      # HTTP server entrypoint listening on configured port
```

---

## Database Models & Schemas (`server/src/models/`)

| Model | File | Description & Key Fields |
|---|---|---|
| **User** | [`User.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/models/User.js) | Accounts, bcrypt password hashes, roles (`citizen`, `worker`, `admin`), active approval status (`active`, `pending_approval`, `rejected`). |
| **Report** | [`Report.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/models/Report.js) | Unique `reportNumber` (`SW-XXXXXX`), category, description, GeoJSON coordinates, Cloudinary images, status history timeline, assigned worker ID, due date, AI analysis results, and duplicate candidate links. |
| **Zone** | [`Zone.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/models/Zone.js) | Named campus zones (e.g. `nit-more`), approximate centers, radius, and optional polygon boundary geofences. |
| **AuditLog** | [`AuditLog.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/models/AuditLog.js) | Immutable audit trail capturing administrative actor ID, action type (`MODERATE_REPORT`, `ASSIGN_WORKER`, `VERIFY_TASK`), target resource, and JSON diffs. |
| **Notification** | [`Notification.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/models/Notification.js) | In-app alerts linked to users with title, message, link path, read state, and idempotency key. |
| **Recommendation** | [`Recommendation.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/src/models/Recommendation.js) | Period-based AI recommendation runs with evidence metrics, suggested actions, administrator review decisions, and recorded before/after outcomes. |

---

## API Route to Controller Mapping

All endpoints are mounted under the `/api/v1` prefix:

```text
/api/v1
├── /health
│   └── GET /                        → healthRoutes.js (health check)
├── /auth
│   ├── POST /register               → authController.js:register
│   ├── POST /login                  → authController.js:login
│   ├── GET  /me                     → authController.js:me
│   └── POST /logout                 → authController.js:logout
├── /users
│   ├── GET  /me                     → userController.js:getProfile
│   ├── PATCH /me                    → userController.js:updateProfile
│   ├── GET  /                       → userController.js:listUsers (Admin)
│   ├── PATCH /:id/role              → userController.js:updateRole (Admin)
│   ├── GET  /approval-requests      → userController.js:listApprovalRequests (Admin)
│   └── PATCH /:id/approval          → userController.js:reviewApprovalRequest (Admin)
├── /reports
│   ├── POST /                       → reportController.js:createReport (Citizen)
│   ├── GET  /                       → reportController.js:listReports (Admin/Role-filtered)
│   ├── GET  /dashboard              → reportController.js:dashboard (Citizen stats)
│   ├── GET  /my                     → reportController.js:myReports (Citizen reports)
│   ├── GET  /map                    → reportController.js:mapReports (Map view)
│   ├── POST /analyze-image          → reportController.js:analyzeImage (Groq AI)
│   ├── GET  /meta/zones             → reportController.js:listZones (Public zones)
│   ├── GET  /admin/metrics          → reportController.js:adminMetrics (Overview dashboard)
│   ├── GET  /admin/insights         → reportController.js:adminInsights (AI operations notes)
│   ├── GET  /admin/audit            → reportController.js:recentAudit (Audit stream)
│   ├── GET  /admin/hotspots         → reportController.js:hotspots (Heatmap points)
│   ├── GET  /admin/zones            → reportController.js:adminZones (Admin zone list)
│   ├── PATCH /admin/zones/:id/geofence → reportController.js:updateZoneGeofence (Admin)
│   ├── GET  /:id                    → reportController.js:getReportById
│   ├── PATCH /:id                   → reportController.js:updateReport (Citizen before review)
│   ├── PATCH /admin/:id/moderate    → reportController.js:moderate (Admin triage)
│   ├── POST /admin/:id/duplicates   → reportController.js:linkDuplicate (Admin)
│   └── GET  /admin/:id/audit        → reportController.js:getAuditHistory (Admin)
├── /tasks
│   ├── GET  /worker/tasks           → taskController.js:workerTasks (Worker queue)
│   ├── POST /worker/tasks/:id/accept   → taskController.js:accept (Worker accepts task)
│   ├── POST /worker/tasks/:id/notes    → taskController.js:notes (Add progress update)
│   ├── POST /worker/tasks/:id/evidence → taskController.js:evidence (Upload proof of work)
│   ├── POST /worker/tasks/:id/submit   → taskController.js:submit (Submit for review)
│   ├── GET  /admin/workers          → taskController.js:adminWorkers (Worker workload)
│   ├── POST /admin/:id/assign       → taskController.js:assign (Dispatch worker)
│   ├── POST /admin/:id/approve      → taskController.js:approve (Verify completion)
│   ├── POST /admin/:id/return       → taskController.js:returnTask (Send back for work)
│   └── GET  /admin/:id/history      → taskController.js:history (Task timeline)
├── /assistant
│   ├── POST /chat                   → assistantController.js:chat (Natural language assistant)
│   └── POST /draft                  → assistantController.js:draft (Generate complaint draft)
├── /recommendations
│   ├── GET  /admin                  → recommendationController.js:list (Admin history)
│   ├── POST /admin/generate         → recommendationController.js:generate (Generate run)
│   ├── PATCH /admin/:id/review      → recommendationController.js:review (Save review)
│   └── GET  /admin/:id/outcome      → recommendationController.js:outcome (Compare counts)
└── /notifications
    ├── GET  /                       → notificationController.js:list
    ├── GET  /unread-count           → notificationController.js:unreadCount
    └── PATCH /:id/read              → notificationController.js:markRead
```

---

## Testing Suite Structure

The project has automated testing across both client and server:

### Client Unit Tests (Vitest + Testing Library)
Run via: `npm run test:client`

| Test File | Covered Functionality |
|---|---|
| [`src/features/reports/adminDashboard.test.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/reports/adminDashboard.test.jsx) | Admin dashboard report blocks, responsive metric cards, daily volume chart, and filter clearing |
| [`src/features/reports/reports.test.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/reports/reports.test.jsx) | Citizen report creation form, image previewing, validation errors, and upload progress |
| [`src/features/reports/zoneMatching.test.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/reports/zoneMatching.test.js) | Haversine distance and polygon geofence zone calculations |
| [`src/features/auth/auth.test.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/auth/auth.test.jsx) | Registration, login, protected routes, and session restoration |
| [`src/features/theme/theme.test.jsx`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/features/theme/theme.test.jsx) | Theme switching between light and dark modes and local persistence |
| [`src/services/apiClient.test.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/src/services/apiClient.test.js) | Credentialed fetch wrapper, JSON serialization, and error propagation |

### Server Integration Tests (Node.js Test Runner)
Run via: `npm run test:server`

| Test File | Covered Functionality |
|---|---|
| [`server/test/auth.test.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/test/auth.test.js) | User registration, password hashing, JWT cookies, role checks, and access requests |
| [`server/test/reports.test.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/test/reports.test.js) | Multipart image upload, coordinate validation, moderation, and role-scoped endpoints |
| [`server/test/tasks.test.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/test/tasks.test.js) | Worker dispatching, task acceptance, progress notes, proof of work, and verification |
| [`server/test/aiAnalysis.test.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/test/aiAnalysis.test.js) | Vision API payload construction, token generation, and graceful failure handling |
| [`server/test/phase9-11.test.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/test/phase9-11.test.js) | Evidence-backed recommendations, civic assistant tracking, and geofence updates |
| [`server/test/phase12-14.test.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/test/phase12-14.test.js) | Audit trail integrity, origin guard validation, and rate limiting |

---

## Configuration & Deployment Architecture

| Configuration File | Environment / Service | Purpose |
|---|---|---|
| [`vite.config.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/vite.config.js) | Frontend Build & Dev | Configures React plugin, `@tailwindcss/vite`, and `/api/v1` reverse proxy to port `5000` |
| [`vitest.config.js`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/vitest.config.js) | Frontend Testing | JSDOM test environment and testing library setup |
| [`vercel.json`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/vercel.json) | Vercel (Frontend Hosting) | Single-page application route rewrites routing all traffic to `/index.html` |
| [`render.yaml`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/render.yaml) | Render (Backend Hosting) | Blueprint deploying `server/` as a Node.js web service with health check on `/api/v1/health` |
| [`.github/workflows/ci.yml`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/.github/workflows/ci.yml) | GitHub Actions CI | Automated pipeline running `npm ci`, server tests, client tests, and production build on push to `main` |
| [`.env.example`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/.env.example) | Frontend Environment | Sample environment variables for client API URL |
| [`server/.env.example`](file:///c:/Users/amans/OneDrive/Documents/ChatGPT/SwacchAI/server/.env.example) | Backend Environment | Sample environment variables for MongoDB, JWT, Cloudinary, Groq, and CORS allowlist |

---

## Documentation Index (`docs/`)

Detailed design documents, specifications, and academic project artifacts:

- **[System Architecture](docs/architecture.md)** — Architectural patterns, request lifecycles, and component communication.
- **[API Reference](docs/api.md)** — Complete endpoint schema documentation with request and response examples.
- **[Authentication Specification](docs/authentication.md)** — Security architecture, JWT cookie strategy, and CSRF protection.
- **[Reporting Workflow Specification](docs/reports.md)** — Report status state machine (`submitted` → `assigned` → `in_progress` → `resolved`).
- **[Worker Tasks Specification](docs/worker-tasks.md)** — Field team procedures, proof-of-work guidelines, and completion verification.
- **[Deployment Manual](docs/deployment.md)** — Production hosting instructions for Render, Vercel, Railway, Atlas, and Cloudinary.
- **[Release Audit](docs/phase-12-14-release-audit.md)** — Security, accessibility (WCAG), and code quality verification report.
- **[System Diagrams](docs/system-diagrams.md)** — Mermaid data flow and entity-relationship diagrams.
- **[Academic Synopsis Document](docs/swachhai-synopsis.md)** — Academic project synopsis formatted for college submission.

---

## Quick Start & Setup Instructions

### Prerequisites
- Node.js 20.19+ (Node 22 / 24 fully supported)
- Local MongoDB running on `mongodb://127.0.0.1:27017/swachhai` or a MongoDB Atlas connection string.

### 1. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
npm install --prefix server
```

### 2. Configure Environment Files
```bash
# Backend environment setup
cp server/.env.example server/.env

# Generate a secure signing secret
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```
Edit `server/.env` to include:
- `JWT_SECRET`: The generated random key.
- `MONGODB_URI`: Local URI or Atlas string.
- `GROQ_API_KEY`: (Optional) For AI vision & recommendations.
- `CLOUDINARY_*`: (Optional for local, required for persistent cloud images).

### 3. Bootstrap Initial Administrator
To create your first admin user, set `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and `INITIAL_ADMIN_PASSWORD` in `server/.env`, then execute:
```bash
npm run seed:admin
```
*(Remove the `INITIAL_ADMIN_*` entries from `server/.env` after successful seeding)*.

### 4. Run Development Servers
Open two terminals from the project root:

```bash
# Terminal 1: Backend Express API (port 5000)
npm run dev:server

# Terminal 2: Frontend Vite Client (port 5173)
npm run dev
```

Visit `http://localhost:5173` in your browser.

### 5. Run Verification Checks & Tests
```bash
# Run backend tests
npm run test:server

# Run frontend tests
npm run test:client

# Test production build
npm run build
```
