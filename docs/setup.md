# Local setup

1. Install Node.js 20.19+ and npm, plus a running MongoDB service or Atlas database.
2. From the repository root run `npm install` and `npm install --prefix server`.
3. Copy `.env.example` to `.env` if changing the frontend API settings. Copy `server/.env.example` to `server/.env`.
4. Set `MONGODB_URI` and generate a random backend-only `JWT_SECRET` (at least 32 characters). Do not commit either.
5. In one terminal run `npm run dev:server`; in another run `npm run dev`.
6. Open `http://localhost:5173` (or `http://127.0.0.1:5173`). The development origin allowlist accepts both; the Vite dev server proxies `/api/v1` to port 5000.
7. Optionally set initial admin values in `server/.env` and run `npm run seed:admin`. Remove those values after seeding.
8. For report image uploads, create a Cloudinary account and set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `server/.env`. These values stay on the server; restart the API after editing them. Report submission is rejected by the API until all three are configured.

For Atlas, create a database user and IP access entry in Atlas, then set its URI locally. For a local service, the example URI is `mongodb://127.0.0.1:27017/swachhai`.

`GET http://localhost:5000/api/v1/health` reports readiness. A database-down response is HTTP 503. The server does not start listening until connection and index initialization succeed.

`REPORT_MAX_IMAGE_SIZE_BYTES` defaults to `5242880` (5 MiB). `REPORT_ZONES` is a semicolon-separated list of `zone-id=Display name` values. The default NIT Patna labels are provisional. After an admin signs in, use **Pilot zones** in the admin workspace to set approximate centers and radii on the map. Citizens' GPS, map pins, or typed coordinates can then automatically select the nearest configured zone; outside those circles, manual selection remains available. These radii are approximate matching aids, not verified boundaries.

## Production notes

Set `NODE_ENV=production`, a unique random `JWT_SECRET`, `COOKIE_SECURE=true`, the database URI, and the exact frontend origin in `CLIENT_URL`. Serve behind HTTPS. If frontend and API are on distinct sites, use `COOKIE_SAME_SITE=none` (Secure is required) and retain exact Origin allowlisting. Never expose server variables to Vite.
