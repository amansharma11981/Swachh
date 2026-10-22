# SwachhAI

SwachhAI is an academic civic cleanliness reporting platform concept for NIT Patna. It includes a React/Vite client, MongoDB-backed Express API, secure cookie authentication, role checks, and a citizen report workflow with persistent report metadata, validated image uploads, location capture, report history, and status tracking. AI classification, worker assignment, operational maps, notifications, and IoT remain future work.

## Architecture

```text
Browser (React + Vite)
  â””â”€ /api/v1 requests with HttpOnly session cookie
       â””â”€ Vite proxy in development â†’ Express API
            â”œâ”€ Zod validation, origin check, rate limits, role authorization
            â””â”€ Mongoose â†’ MongoDB
```

The frontend stays at the repository root. The Express/Mongoose API and its tests are in `server/`. API access is centralized in `src/services/apiClient.js`; browser auth state lives in `src/features/auth/`; citizen reporting is in `src/features/reports/`. The frontend role guard improves navigation only; the API repeats authentication, ownership, and authorization checks for protected report operations.

## Prerequisites

- Node.js 20.19+ (Node 24 is supported) and npm.
- MongoDB locally or a MongoDB Atlas database. The API will not accept requests until MongoDB is available.

## Install

From the repository root:

```bash
npm install
npm install --prefix server
```

Copy `.env.example` to `.env` for frontend development if you need to change the API URL or proxy target. Copy `server/.env.example` to `server/.env` and configure the backend values. Environment files are ignored by Git; examples contain placeholders only.

Generate a backend signing key locally (do not send it in chat):

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Put the generated value in `server/.env` as `JWT_SECRET`. Set `MONGODB_URI` to your local database or Atlas connection string. Never put either value in the frontend environment.

## MongoDB options

For a local MongoDB service, use `mongodb://127.0.0.1:27017/swachhai`. Ensure the service is running before starting the API. For Atlas, create a database user and allow the development machine's IP in Atlas Network Access, then place the connection string in `server/.env`. Replace the username/password placeholders locally and URL-encode special characters; do not commit the resulting URI.

## Run the application

Start MongoDB, then use two terminals from the repository root:

```bash
npm run dev:server
npm run dev
```

The frontend runs at Vite's local URL (normally `http://localhost:5173`) and proxies `/api/v1` to `http://localhost:5000`. The development allowlist accepts both `localhost` and `127.0.0.1` on port 5173. To change the target, set `VITE_API_PROXY_TARGET` locally. For a production deployment, configure a same-site frontend/API deployment or set `COOKIE_SAME_SITE=none` with HTTPS and `COOKIE_SECURE=true`; ensure `CLIENT_URL` exactly lists the frontend origin.

Production build and automated checks:

```bash
npm run build
npm run preview
npm run test:server
npm run test:client
```

Production hosting setup for Vercel, Render, Atlas, and Cloudinary is documented in [docs/deployment.md](docs/deployment.md). The root `vercel.json`, `render.yaml`, and `.github/workflows/ci.yml` provide SPA routing, backend Blueprint configuration, and verification CI; they do not publish the app without a connected GitHub repository and provider setup.

The backend can also be run from its directory with `npm run dev`, `npm start`, and `npm test`.

## Initial administrator

Public registration always creates a citizen and rejects unexpected privilege fields. There is no public admin registration. For the first administrator only, set `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and a unique 12â€“128 character `INITIAL_ADMIN_PASSWORD` in `server/.env`, then run:

```bash
npm run seed:admin
```

The command creates exactly the configured admin, refuses to modify an existing account, hashes the password, and closes its database connection. Remove or unset the three `INITIAL_ADMIN_*` values from `server/.env` immediately after setup. To create a worker later, an authenticated administrator can use `PATCH /api/v1/users/:id/role`; public users cannot promote themselves.

## Authentication and security

- Registration creates a citizen account and signs the user in.
- Login uses a generic invalid-credentials response and rate-limited endpoint.
- JWTs last two hours by default and are stored only in an HttpOnly cookie scoped to `/api/v1`; the default SameSite policy is `lax`. Production requires Secure cookies.
- State-changing requests require an exact allowed `Origin`. SameSite cookies and this origin check are the CSRF defenses; the browser API client sends JSON and credentials.
- `GET /api/v1/auth/me` restores the current user after refresh. `POST /api/v1/auth/logout` clears the browser cookie and is safe to repeat.
- Logout does not revoke a copied JWT; such a token remains valid until its short expiry. There is no refresh-token or server-side revocation list in this phase.
- User passwords are bcrypt-hashed; password hashes are excluded from normal queries and all API responses.
- MongoDB URI and JWT secret are backend-only. API error messages are normalized, and server logs do not include request bodies, passwords, cookies, or tokens.
- Email verification, password reset, and account recovery are not implemented.

## Roles

| Role | Access |
| --- | --- |
| Citizen | Citizen workspace and own profile; no worker or admin APIs |
| Worker | Worker workspace and own profile; no admin user management |
| Admin | Operations shell and restricted user listing/role management |

Role changes and protected access are checked server-side against the current database user, not the client session object. The last active admin cannot be demoted.

## API overview

All endpoints are under `/api/v1`. See [docs/api.md](docs/api.md) for request/response examples.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/health` | Public; reports app and database readiness |
| POST | `/auth/register` | Public, rate limited; creates citizen and session |
| POST | `/auth/login` | Public, rate limited |
| GET | `/auth/me` | Authenticated |
| POST | `/auth/logout` | Same-origin request; clears cookie, repeatable |
| GET / PATCH | `/users/me` | Authenticated; profile fields only |
| GET | `/users` | Admin |
| PATCH | `/users/:id/role` | Admin |
| POST | `/reports` | Citizen; authenticated multipart image and report fields |
| GET | `/reports/dashboard`, `/reports/my` | Citizen; own report data only |
| GET / PATCH | `/reports/:id` | Citizen owner; edits only while submitted |
| GET | `/reports/meta/zones` | Citizen; configured active pilot-zone labels |
| GET | `/reports` | Admin; paginated report list |

## Phase 3 setup and limitations

Persistent image uploads require CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env. The API refuses report creation when storage is not configured; it never pretends an upload succeeded. Cloudinary credentials are backend-only. Uploaded images use Cloudinary delivery URLs, so avoid uploading sensitive faces or private information and review provider access settings before a public deployment.

`REPORT_MAX_IMAGE_SIZE_BYTES` defaults to 5 MiB. `REPORT_ZONES` configures provisional labels without verified boundaries or coordinates. Browser GPS is requested only after the user chooses it and is shown as unverified. Reports start at `submitted`; AI classification, admin review UI, worker assignment, and resolution workflows remain future work. See [docs/reports.md](docs/reports.md).

## Structure

- `src/app`, `src/pages`, `src/layouts` â€” React routes and presentation.
- `src/features/auth` â€” auth provider and client auth service.
- `src/features/reports` contains report submission, dashboard, history, detail pages, and the report API service.
- `src/features/reports` â€” report submission, dashboard, history, detail pages, and report API service.
- `src/services/apiClient.js` â€” credentialed API boundary.
- `server/src/config` â€” environment and database setup.
- `server/src/models` contains the Mongoose user, report, and zone models.
- `server/src/middleware`, `routes`, `controllers`, `services` â€” API boundary and policies.
- `server/src/scripts/seedAdmin.js` â€” explicit one-time admin bootstrap.
- `server/test` contains API security, authentication, and report tests using isolated test models.
- `docs` â€” architecture, setup, auth flow, and API reference.
