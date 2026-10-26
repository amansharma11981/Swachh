# SwachhAI system diagrams

These diagrams describe the inspected source architecture. Update them if the deployed project differs.

## Component and trust-boundary diagram

```mermaid
flowchart LR
  C[Citizen browser]
  W[Worker browser]
  A[Admin browser]
  UI[React + Vite SPA]
  API[Express API /api/v1\nAuth, origin, roles, validation, rate limits]
  DB[(MongoDB / Mongoose)]
  IMG[Cloudinary storage]
  AI[Groq API\nOptional user-triggered assistance]
  V[Vercel frontend]
  R[Railway API]

  C --> UI
  W --> UI
  A --> UI
  UI -->|HTTPS + HttpOnly cookie| API
  API --> DB
  API -->|server credentials| IMG
  API -->|bounded text/image or aggregates| AI
  V -. hosts .-> UI
  R -. hosts .-> API
```

## Citizen report sequence

```mermaid
sequenceDiagram
  actor Citizen
  participant UI as React SPA
  participant API as Express API
  participant Store as Cloudinary
  participant DB as MongoDB
  Citizen->>UI: Complete report form and choose submit
  UI->>API: Multipart POST /api/v1/reports + session cookie
  API->>API: Authenticate citizen, validate fields and image signature
  API->>Store: Upload image with server-side credentials
  Store-->>API: Image reference
  API->>DB: Save report and initial history event
  DB-->>API: Persisted report
  API-->>UI: Report number and initial status
  UI-->>Citizen: Confirmation and report details
```

## Recommendation review sequence

```mermaid
sequenceDiagram
  actor Admin
  participant UI as Admin dashboard
  participant API as Express API
  participant DB as MongoDB
  participant AI as Groq
  Admin->>UI: Request recommendations
  UI->>API: POST /api/v1/recommendations/admin/generate
  API->>API: Verify admin and filters
  API->>DB: Aggregate report counts and evidence
  DB-->>API: Aggregate snapshot
  alt At least three reports
    API->>AI: Period labels and aggregate evidence only
    AI-->>API: Structured suggested text and evidence keys
    API->>API: Validate schema and bind keys to real evidence
  else Sparse data
    API->>API: Save insufficient-evidence snapshot; skip AI
  end
  API->>DB: Save run for human review
  API-->>UI: Evidence and recommendation history
  Admin->>UI: Review/accept/reject/record action
  UI->>API: PATCH review
  API->>DB: Save review and audit event
```

## Report status lifecycle

```mermaid
stateDiagram-v2
  [*] --> submitted
  submitted --> under_review
  under_review --> assigned
  under_review --> rejected
  assigned --> in_progress
  in_progress --> submitted_for_verification
  submitted_for_verification --> resolved
  submitted_for_verification --> in_progress: returned for rework
  resolved --> reopened
  reopened --> assigned
  submitted --> duplicate: administrator decision
  under_review --> duplicate: administrator decision
```

The exact allowed transitions are enforced by backend service logic. Check `server/src` before changing the diagram. `duplicate` is an administrative classification; it does not delete a report.
