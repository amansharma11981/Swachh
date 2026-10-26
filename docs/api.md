# REST API v1

Base path: `/api/v1`. JSON request and response bodies are used. Authentication is an HttpOnly cookie named by `COOKIE_NAME`; no bearer token is returned to the browser. Mutating requests must include an allowed `Origin`.

## Responses and errors

Success responses use `{ "success": true, "data": ... }`. Errors use `{ "success": false, "error": { "code": "...", "message": "...", "details": [] } }`. Validation errors may include field-level details. Production 500 responses do not include stack traces or raw internal messages.

## Endpoints

### `GET /health`

Public. Returns `status` (`ok` or `degraded`), `database` (`connected` or `disconnected`), and an ISO timestamp. Database-down returns HTTP 503.

### `POST /auth/register`

Public and rate limited. Body: `{ "name": "Aman Singh", "email": "aman@example.test", "password": "long-password", "confirmPassword": "long-password", "requestedRole": "citizen" }`. `requestedRole` may be `citizen` (default), `worker`, or `admin`; the server never accepts a caller-supplied `role`. Citizen registration returns HTTP 201 and an authenticated session. Worker/admin requests return HTTP 202, create an inactive pending account, and do not set a session cookie. An existing administrator must approve the request before it can sign in.

### `POST /auth/login`

Public and rate limited. Body: `{ "email": "aman@example.test", "password": "long-password" }`. Success returns a safe user and session cookie. Invalid credentials share a generic response.

### `GET /auth/me`

Authenticated. Returns the current safe user or 401.

### `POST /auth/logout`

Requires an allowed Origin. Clears the session cookie and returns `{ "loggedOut": true }`. It can be called repeatedly. Clearing the browser cookie does not revoke a copied JWT before its expiry.

### `GET /users/me`

Authenticated. Returns the caller's safe profile.

### `PATCH /users/me`

Authenticated. Allows only `name`, `phone`, and `avatarUrl`; empty updates and unknown properties are rejected. Role, status, password hash, and IDs cannot be changed here.

### `GET /users`

Admin only. Returns up to 100 safe user records.

### `PATCH /users/:id/role`

Admin only. Body: `{ "role": "citizen" | "worker" | "admin" }`. Pending access requests must be handled through the approval endpoint. The last active administrator cannot be demoted.

### Admin access requests

Admin only. `GET /users/approval-requests` lists pending worker/admin signup requests. `PATCH /users/:id/approval` with `{ "decision": "approve" }` or `{ "decision": "reject" }` decides a request. Approval activates the requested role; rejected accounts stay inactive. No built-in/default admin credential exists; bootstrap the first administrator with the one-time server seed process.

## Citizen reports

### `GET /reports/meta/zones`

Authenticated citizen, worker, or administrator session required. Returns active configured zone labels and `imageUploadEnabled`. Zone names are provisional; `boundaryVerified` is false until verified geographic data is supplied.

### `POST /reports`

Citizen session and allowed Origin required. Rate limited to 10 report attempts per hour. Send `multipart/form-data` with exactly one `image` file (JPEG, PNG, or WebP, up to `REPORT_MAX_IMAGE_SIZE_BYTES`, 5 MiB by default) and these fields:

```text
description: 10–2000 characters
category: general_garbage | plastic_waste | organic_waste | construction_debris |
          overflowing_dustbin | public_area_litter | drain_blockage | other
locationLabel: 3–200 characters
source: manual | gps
latitude, longitude: optional as a pair; required for source=gps
zoneId: optional configured zone identifier
```

Coordinates must be within latitude `[-90,90]` and longitude `[-180,180]`; storage order is GeoJSON `[longitude, latitude]`. The reporter is derived from the authenticated cookie. Success returns HTTP 201 with the saved report, assigned `SW-000001`-style number, initial `submitted` status, normal priority, stored image reference, and server-created initial history event. If Cloudinary is not configured the endpoint returns 503; no report is created.

### `POST /reports/analyze`

Citizen session required; limited to five analysis requests per hour. Send multipart `image` (the same signature-validated JPEG/PNG/WebP size limits as report upload), optional `description` (up to 2000 characters), and optional active `zoneId`. When `GROQ_API_KEY` is configured, the backend sends the selected image and at most 500 characters of description to Groq's vision-capable Chat Completions endpoint. The validated response contains a suggested category, priority, and citizen-ready description. For a selected zone, the server adjusts priority from counts of matching unresolved reports over the previous 30 days: +1 at three matches and +2 at seven, capped at urgent. Only counts are used; previous reports are not sent to Groq. When no description is supplied, the signed token binds the model-generated description that the client fills into the form; it also binds the selected zone. Report creation verifies the token before storing the analysis and applies its priority only if the submitted category still matches the AI suggestion. Administrators can change the initial priority. The browser never receives the Groq key. If AI is unavailable or not configured, manual report submission remains available.

### `GET /reports/dashboard`

Citizen only. Returns counts for total, awaiting review, in progress, and resolved reports plus five recent reports, all scoped to the authenticated reporter.

### `GET /reports/my?page=1&limit=10&status=submitted`

Citizen only. Returns the caller's paginated report cards. `limit` is 1–50. Supported filters include report statuses; `status=in_progress` groups assigned, in-progress, and reopened reports. Only the authenticated citizen's own data is queried.

### `GET /reports/:id`

The owning citizen or an administrator can read details. Missing and non-owned reports share a 404 response. Workers cannot access this endpoint.

### `PATCH /reports/:id`

Owner only, and only while status is `submitted`. Body accepts one or more of `description`, `category`, or `zoneId`; status, reporter, priority, images, assignment, and history are never editable here. There is no status-transition endpoint in this phase.

### `GET /reports?page=1&limit=10&status=under_review`

Administrator only, paginated all-report listing with optional category, priority, zone, date-range, and search filters. Citizen history is never used to access other users' reports.

### Map, moderation, analytics, and audit

| Method | Path | Access and purpose |
| --- | --- | --- |
| GET | `/reports/map` | Citizen sees own geolocated records; worker sees assigned geolocated records; admin sees all located reports. Supports category/status/priority/zone/from/to filters and bounded result count. |
| GET | `/reports/admin/metrics?from=&to=&zoneId=` | Admin-only real report totals, status/category/zone aggregates, open high-priority count, and average resolution time when resolved timestamps exist. |
| GET | `/reports/admin/hotspots?from=&to=&zoneId=` | Admin-only approximate 0.002-degree location grid; only cells with at least three reports are returned. A count concentration is not proof of waste prevalence. |
| PATCH | `/reports/admin/:id/moderate` | Admin-only category/priority/status correction, optional AI decision and internal note. Existing workflow transitions are enforced and changes audited. |
| GET | `/reports/admin/:id/duplicate-candidates` | Admin-only same-category reports within seven days; candidates are based on 300 m proximity or description token similarity and require human review. |
| POST | `/reports/admin/:id/duplicates` | Admin-only reciprocal link to another report; `markDuplicate` defaults false. No deletion or automatic closure occurs. |
| GET | `/reports/admin/audit` and `/reports/admin/:id/audit` | Admin-only append-only audit events. Logs omit free-text note contents, secrets, and credentials. |

Report AI suggestions are optional and user-triggered. `POST /reports/analyze` sends the uploaded image and up to 500 characters of report description to Groq. The backend stores a suggestion only when the signed, short-lived analysis token matches the same user, image, description, and zone on report submission. A verified completed suggestion sets the report's initial priority only when the submitted category matches the suggested category; administrators may review and change it. Without `GROQ_API_KEY`, reports can still be submitted manually.

## Worker tasks and administrator dispatch (Phase 5)

All task routes require the existing HttpOnly session. Worker routes are restricted to active `worker` accounts and always filter by the authenticated worker ID. Administrator routes require `admin`. Task list endpoints accept `page` (positive integer) and `limit` (1–50).

### Worker endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/tasks/worker/dashboard` | Own task counts and recent assignments |
| GET | `/tasks/worker/tasks?page=1&limit=8&status=active&q=SW-000` | Own paginated tasks; filters include `active`, `assigned`, `in_progress`, `submitted_for_verification`, and `completed`; `q` is a report-number prefix |
| GET | `/tasks/worker/tasks/:id` | Task details only when assigned to the caller; inaccessible IDs return 404 |
| POST | `/tasks/worker/tasks/:id/accept` | Accept an assigned task and start work; safe to repeat after acceptance |
| POST | `/tasks/worker/tasks/:id/notes` | Add `{ "body": "..." }`, up to 500 characters, while task is active |
| POST | `/tasks/worker/tasks/:id/evidence` | Multipart field `image`; JPEG, PNG, or WebP, same configured size cap, maximum three per assignment/rework cycle and fifteen per task |
| POST | `/tasks/worker/tasks/:id/submit` | Submit in-progress work for administrator verification; at least one completion photo is required |

### Administrator endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/tasks/admin/queue?page=1&limit=10&q=SW-000` | Paginated dispatch and verification queue; optional report-number prefix search |
| GET | `/tasks/admin/workers?page=1&limit=50` | Active workers with counts of assigned, in-progress, or awaiting-verification tasks |
| POST | `/tasks/admin/:id/assign` | Assign or reassign: `{ "workerId": "...", "priority": "normal", "dueAt": null, "reason": "..." }`; reassignment reason is required |
| GET | `/tasks/admin/:id/history` | Assignment, note, evidence, status, and verification audit events |
| POST | `/tasks/admin/:id/approve` | Approve submitted work; optional `{ "reason": "..." }` review note |
| POST | `/tasks/admin/:id/return` | Return submitted work to the assigned worker with a reason of at least eight characters |

Workers are provisioned by an administrator promoting an existing account using the existing `PATCH /users/:id/role` endpoint. Public registration cannot create worker or admin roles.

## Notifications (Phase 9)

All notification endpoints require the current HttpOnly session. Records are persisted per recipient, use an idempotent event key, and can only be listed or marked read by that recipient. The UI refreshes the feed every 30 seconds and on browser focus; push/WebSocket delivery is not configured.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/notifications?limit=20&page=1` | Latest recipient-owned notifications and unread count; limit is capped at 50. |
| PATCH | `/notifications/:id/read` | Mark one owned notification read. Non-owned or missing IDs return 404. |
| PATCH | `/notifications/read-all` | Mark all of the caller's notifications read. |

Elevated worker/admin signup requests and report creation notify active administrators; report moderation and task verification notify the reporting citizen; assignment/reassignment notifies the affected worker; worker submission for verification notifies administrators. Notification persistence is best effort and cannot undo the primary account/report/task action.

## Analytics and civic assistant (Phases 10–11)

`GET /reports/admin/metrics` is admin-only and returns observed database totals plus status/category/zone aggregates, average resolution duration when available, and daily submission counts. When no dates are selected, the daily chart is limited to the last 30 days while headline totals retain their selected/all-time scope. Hotspot grouping is approximate and is not a verified prevalence measure.

`GET /reports/admin/insights` is admin-only and asks Groq for optional advisory recommendations. Only filtered aggregate counts by status, category, and zone, plus the date labels, are sent; report text, images, and user identities are excluded. The source counts are returned alongside the generated text. AI insights are unavailable without `GROQ_API_KEY`; conventional metrics still work.

`POST /assistant/chat` requires an authenticated session and is rate limited to 30 requests per 15 minutes. Body: `{ "messages": [{ "role": "user", "content": "..." }] }`; at most eight messages of up to 1000 characters each are accepted. Ordinary assistant messages are sent to Groq to answer sanitation questions, draft complaint text, and explain app navigation. It never submits a complaint. When a citizen asks for report status, the API uses a direct query filtered by the authenticated reporter ID; report details are not sent to Groq. Do not include secrets or sensitive personal information in chat. The assistant requires `GROQ_API_KEY` and fails with a clear temporary-unavailable response if Groq is not configured or unreachable.
