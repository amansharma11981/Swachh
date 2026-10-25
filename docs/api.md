# REST API v1

Base path: `/api/v1`. JSON request and response bodies are used. Authentication is an HttpOnly cookie named by `COOKIE_NAME`; no bearer token is returned to the browser. Mutating requests must include an allowed `Origin`.

## Responses and errors

Success responses use `{ "success": true, "data": ... }`. Errors use `{ "success": false, "error": { "code": "...", "message": "...", "details": [] } }`. Validation errors may include field-level details. Production 500 responses do not include stack traces or raw internal messages.

## Endpoints

### `GET /health`

Public. Returns `status` (`ok` or `degraded`), `database` (`connected` or `disconnected`), and an ISO timestamp. Database-down returns HTTP 503.

### `POST /auth/register`

Public and rate limited. Body: `{ "name": "Aman Singh", "email": "aman@example.test", "password": "long-password", "confirmPassword": "long-password" }`. Password is 12–128 characters. The endpoint always creates a citizen, rejects unknown fields (including `role`), returns a safe user object, and sets the session cookie.

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

Admin only. Body: `{ "role": "citizen" | "worker" | "admin" }`. The last active administrator cannot be demoted. There is no public role-management endpoint.

## Citizen reports

### `GET /reports/meta/zones`

Citizen session required. Returns active configured zone labels and `imageUploadEnabled`. Zone names are provisional; `boundaryVerified` is false until verified geographic data is supplied.

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

### `GET /reports/dashboard`

Citizen only. Returns counts for total, awaiting review, in progress, and resolved reports plus five recent reports, all scoped to the authenticated reporter.

### `GET /reports/my?page=1&limit=10&status=submitted`

Citizen only. Returns the caller's paginated report cards. `limit` is 1–50. Supported filters include report statuses; `status=in_progress` groups assigned, in-progress, and reopened reports. Only the authenticated citizen's own data is queried.

### `GET /reports/:id`

The owning citizen or an administrator can read details. Missing and non-owned reports share a 404 response. Workers cannot access this endpoint.

### `PATCH /reports/:id`

Owner only, and only while status is `submitted`. Body accepts one or more of `description`, `category`, or `zoneId`; status, reporter, priority, images, assignment, and history are never editable here. There is no status-transition endpoint in this phase.

### `GET /reports?page=1&limit=10&status=under_review`

Administrator only, paginated all-report listing. Citizen history is never used to access other users' reports.

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
