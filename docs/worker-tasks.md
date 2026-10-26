# Phase 5: Worker task assignment

## Workflow

1. Citizen reports remain in `submitted` and keep their original report number and images.
2. An administrator reviews the queue and assigns the report to an active worker. The admin may choose low, normal, high, or urgent priority and an optional due date.
3. The assigned worker sees only reports whose `assignedWorker` matches their authenticated user ID. Accepting the assignment changes the report to `in_progress`.
4. While work is active, the worker can add progress notes and up to three completion photos. The API checks file signatures, MIME type, size, assignment ownership, and current report status.
5. The worker submits work with at least one completion photo uploaded after the latest assignment or request for further work. The report enters `submitted_for_verification`.
6. An administrator approves it, moving the report to `resolved`, or returns it with a reason, moving it back to `in_progress` with assignment state `needs_work`.

The worker area is `/worker` and `/worker/tasks`. The administrator dispatch and verification queue is `/admin` and `/admin/reports`. Both are guarded by the existing frontend role gate; the API independently enforces roles and ownership.

## Status and assignment state

| Report status | Meaning | Assignment state |
| --- | --- | --- |
| `submitted`, `under_review`, `reopened` | Eligible for dispatch | `unassigned` until assigned |
| `assigned` | Worker has an assignment and has not accepted it yet | `active` |
| `in_progress` | Worker accepted or is continuing returned work | `active` or `needs_work` |
| `submitted_for_verification` | Worker submitted evidence for admin review | `submitted_for_verification` |
| `resolved` | Administrator approved completion | `completed` |
| `rejected`, `duplicate` | Closed/duplicate citizen report | Not assignable |

The report schema adds optional/defaulted fields to the existing collection: `assignedBy`, `assignedAt`, `dueAt`, `assignmentStatus`, `progressNotes`, `completionEvidence`, `assignmentHistory`, and `verificationNote`. Existing `assignedWorker`, `priority`, `statusHistory`, report identifiers, and citizen images remain in place. Existing reports are not deleted or rewritten by a migration. Priority expands from `normal` to `low`, `normal`, `high`, and `urgent`.

Every assignment, reassignment, acceptance, note, evidence upload, submission, return, and approval records an actor and timestamp. Reassigning an already assigned report requires an explanatory reason; the same active worker assignment is idempotent and does not append a second assignment event. The APIs validate transitions and return a 404 for a worker requesting another worker's report.

## Worker provisioning

Public signup lets users request citizen, worker, or administrator access. Citizen accounts activate immediately. Worker and administrator requests remain inactive until an existing administrator approves them in `/admin/access-requests`. An administrator can also change an active account's role using the protected endpoint:

```http
PATCH /api/v1/users/USER_ID/role
Content-Type: application/json

{ "role": "worker" }
```

After approval or promotion, the user signs out and back in (or reloads after session restoration) to enter the corresponding workspace. The administrator assignment page lists active workers and current active task counts. The initial administrator must be created through the one-time `INITIAL_ADMIN_*` server seed; there are no default/shared administrator credentials and an account cannot approve its own request.

## Images and configuration

No new environment variables were added. Worker completion photos reuse `REPORT_MAX_IMAGE_SIZE_BYTES` (default 5 MiB) and the existing backend-only Cloudinary credentials. A worker can add at most three photos per assignment/rework cycle and fifteen per task. Resubmission after a return requires a fresh photo from the latest work cycle. If Cloudinary is not configured, evidence upload returns `503 IMAGE_STORAGE_NOT_CONFIGURED`; task notes and other non-upload workflows continue to work.

## Notifications and limits

There is no separate notification collection, push delivery, email, or real-time transport. The assignment audit trail and role-specific dashboard queue expose the current state when refreshed. Due dates are metadata only; automatic scheduling/escalation is not implemented. The worker view does not geocode or render a map; it displays the report's supplied location label and optional coordinates remain available in report data.

## Deployment and rollback

Deploy the backend and frontend through the repository's configured hosting integrations when ready. Backend changes are under `server/`; frontend changes are in the root Vite application. No provider settings or production environment values need to change for this phase. The existing deployment config and URLs are not modified.

The data change is additive and requires no backfill: MongoDB/Mongoose supplies defaults for new fields when older reports are read. To roll back application code, redeploy the prior frontend and backend builds. Reports that have entered `submitted_for_verification` should be approved or returned before rolling back because older app code does not include that status in its UI or validation. Preserve the database collection and Cloudinary assets during rollback; no destructive data migration is part of this phase.

## Checks

Run from the repository root:

```bash
npm run test:server
npm run test:client
npm run build
```

The backend tests use mocked users, reports, and image storage; they do not connect to Atlas or Cloudinary. The new tests cover worker ownership, role gating, assignment idempotency, evidence type validation, verification, history, and pagination.
