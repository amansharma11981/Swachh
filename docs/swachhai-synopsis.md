# SwachhAI: AI-Assisted Civic Cleanliness Reporting and Operations

## Project synopsis and submission draft

**Academic project at:** National Institute of Technology Patna *(confirm the institute’s exact naming and prescribed format)*
**Submitted by:** `[Student name]` · `[Roll number]` · `[Programme/department]`
**Project guide:** `[Guide name and designation]`
**Academic session:** `[Session/year]`
**Submission date:** `[Date]`

> Drafting note: This synopsis describes the code and repository that were inspected. Replace bracketed fields with verified academic details. Do not present the example workflow or locally passing automated checks as field deployment, user-study evidence, municipal approval, or measured civic impact. Apply the department’s template, certificate text, and citation rules before printing.

## Suggested 22-page layout

Use the page-break markers as a layout plan when transferring to the institute template. Pages 2–4 are institution-specific and require student/guide approval. Expand the technical chapters with screenshots captured from the final deployed build if the department expects a fully typeset 20–25-page synopsis.

---

### Page 1 — Title page

**SwachhAI: AI-Assisted Civic Cleanliness Reporting and Operations**

Project synopsis submitted in partial fulfillment of the requirements for `[degree/programme]` at the National Institute of Technology Patna.

Prepared by `[student name]`, `[roll number]`; supervised by `[guide name]`; `[department]`; `[session]`.

The title expresses the implementation scope: a web application for citizen cleanliness reports and an administrative/worker workflow, with optional AI assistance. It does not claim that AI performs field inspection or replaces public authorities.

---

### Page 2 — Certificate placeholder

Insert the certificate wording supplied by the department. Obtain the required signatures from the guide, department, and institute authorities. Do not reproduce a certificate from another project or imply approval before it is granted.

**Project title:** SwachhAI: AI-Assisted Civic Cleanliness Reporting and Operations
**Student:** `[verified name and roll number]`
**Guide:** `[verified name/designation]`
**Department:** `[official department]`
**Approval date:** `[date, if applicable]`

---

### Page 3 — Declaration placeholder

Use the institute’s approved declaration. Confirm originality and attribution statements with the project guide. A suitable draft for review is: “I declare that the work described in this submission was carried out by me under the guidance of `[guide]`. Third-party libraries, services, datasets, and source material are acknowledged in the final report. Claims about deployment and testing reflect only checks actually performed.” This is proposed wording, not an institute-approved form.

**Student signature:** `[signature]` · **Date:** `[date]`

---

### Page 4 — Acknowledgement placeholder

Thank the guide, department, peers, and any individuals who contributed. Include only people who actually provided assistance and whose acknowledgement is appropriate. Do not list organizations as project partners unless a partnership existed.

**Draft:** “I thank `[guide]` for guidance on the project and `[other contributors]` for their assistance. I also acknowledge the maintainers of the open-source libraries and external services identified in the references and implementation notes.” Personalize before submission.

---

### Page 5 — Abstract

SwachhAI is a web-based prototype for recording and coordinating responses to cleanliness reports. Citizens can create accounts, submit a categorized report with a photo and optional location, and review the status of their own submissions. Administrators can moderate reports, inspect aggregate operational metrics, assign eligible reports to workers, and verify submitted completion evidence. Workers can view their own assignments, record progress, and submit completion evidence. The application includes role-scoped maps, in-app notifications, and audit events for selected administrative actions.

Optional AI features use a server-side Groq integration. A citizen may request a visual suggestion for an uploaded report image, prepare a non-submitted complaint draft, or ask a civic assistant a question. An administrator may request recommendations based on aggregate report evidence. Model output is validated by the server; AI features remain optional and do not autonomously submit reports, change official report priority, or verify field work. Report ownership and role permissions are enforced by the backend.

The implementation uses React and Vite in the browser, an Express API, MongoDB/Mongoose persistence, Cloudinary image storage when configured, and cookie-based authentication. Automated tests and a production frontend build are part of local verification. Cloud deployment, institutional acceptance, and measurable environmental outcomes require separate evidence and are not inferred from source code.

**Keywords:** civic technology, cleanliness reporting, role-based access, geospatial interface, workflow management, human-reviewed AI.

---

### Page 6 — Contents and abbreviations

Prepare the final table of contents from the formatted document. Suggested chapters: introduction; problem definition and objectives; related work and context; requirements; system architecture; design and data model; implementation; security and accessibility; testing; deployment and operations; limitations; conclusion and future work; references; appendices.

**Abbreviations:** API — Application Programming Interface; AI — Artificial Intelligence; CI/CD — Continuous Integration/Continuous Delivery; CORS — Cross-Origin Resource Sharing; GPS — Global Positioning System; HTTP — Hypertext Transfer Protocol; JWT — JSON Web Token; MERN — MongoDB, Express, React, Node.js; SPA — Single-Page Application; UI — User Interface; UX — User Experience.

---

### Page 7 — Introduction and context

Cleanliness concerns are often reported through fragmented channels. A digital workflow can make a report easier to submit, provide a persistent reference number, and help an operations team see the state of recorded work. A reporting platform is useful only when it remains clear about what its records mean: reports describe submissions received by the system, not a complete census of waste or a verified measure of cleanliness.

SwachhAI organizes a report from submission through review, assignment, worker updates, and administrative verification. Citizens interact with a responsive web interface. Administrators use operational dashboards to inspect submitted records and coordinate assignments. Workers use a separate task view that exposes tasks assigned to their own account. This separation supports accountability and limits access to the information required by each role.

The prototype also explores assisted text and image processing. AI output is presented as a suggestion with a manual fallback. A model cannot observe a site beyond a submitted image, establish local policy, or confirm that a cleanup occurred. The system therefore preserves explicit human actions and treats model suggestions as advisory.

---

### Page 8 — Problem statement, objectives, and scope

**Problem statement.** A prototype is needed to demonstrate how cleanliness observations can be submitted, categorized, tracked, and routed to operational roles while protecting account and report access.

**Objectives.** Provide citizen registration and login; accept bounded photo reports with a description, category, and optional location; let citizens view only their own report history; provide administrator moderation and aggregate summaries; assign tasks to active workers; record worker progress and completion evidence; notify relevant accounts; and expose optional AI assistance without giving it authority over users or reports.

**Scope.** This is an academic web application. It does not connect to municipal dispatch systems, IoT sensors, verified GIS boundaries, payment services, or institutional identity systems. It has no evidence of a live field trial or a formal service-level agreement. Its operational counts represent records in the database, and provisional zone labels must not be described as surveyed boundaries.

**Success criteria.** A reviewer should be able to follow the authorized workflows, understand each status, identify which role can perform each action, and see clear error/fallback behavior when optional services are unavailable.

---

### Page 9 — Existing context and related-work plan

The project belongs to the broader area of civic issue-reporting portals, field-service workflow tools, geospatial dashboards, and human-reviewed machine-learning assistance. The final report should compare relevant systems using verifiable sources selected by the student and guide. Useful comparison dimensions include account model, report lifecycle, image handling, privacy, location precision, assignment workflow, offline operation, accessibility, and public data governance.

No external literature bibliography was supplied with this repository review. Consequently this page does not claim that a particular system is the first, best, or most effective. Add primary literature, official standards, and official provider documentation after checking each reference and its publication date. Distinguish research evidence from product documentation and from this project’s own implementation.

**Suggested comparison table:** System/source; user roles; intake fields; workflow states; geographic handling; AI use; accessibility evidence; relevant limitation. Include only systems that the author has personally researched and cite their original sources.

---

### Page 10 — Requirements and use cases

**Functional requirements:** citizens create accounts and reports; citizen records are ownership-scoped; administrators review reports and access requests; administrators assign/reassign reports to active workers; workers accept assignments, add notes, upload bounded evidence, and request verification; administrators approve or return work; notifications inform relevant users; analytics derive from stored reports; optional AI produces validated suggestions and draft text.

**Non-functional requirements:** enforce backend authentication and role checks; validate untrusted input; constrain uploads; keep provider secrets on the server; degrade gracefully when AI or storage is unavailable; keep navigation responsive; expose form labels and keyboard paths; retain audit events for selected actions; and avoid unsupported claims in dashboards.

**Use-case actors:** citizen, worker, administrator, and external services (database, image storage, and optional AI provider). External services do not become application roles. Use-case diagrams should show API authorization and the distinction between AI draft generation and final report submission.

---

### Page 11 — Architecture and technology choices

The browser client is implemented with React and Vite. It calls a shared API client and uses the existing `/api/v1` convention. The Express service validates requests, authenticates cookie sessions, checks roles and ownership, and delegates persistence to Mongoose models. MongoDB stores account, report, zone, notification, task, audit, and recommendation-run data. Cloudinary is used through a server-side adapter for report images when configured. Groq is an optional server-side provider for explicitly requested image analysis, assistant responses, complaint drafts, and aggregate recommendations.

Deployment configuration targets a Vercel SPA and a separately hosted API, with MongoDB Atlas as the database. Actual cloud environment values, network allowlists, health checks, and host integration must be verified in the relevant provider consoles. The frontend must never receive `JWT_SECRET`, database credentials, Cloudinary secrets, or the Groq API key.

Insert the Mermaid component diagram from `architecture.md` or redraw it in the institute’s required diagram style. Clearly identify external services and the authentication boundary.

---

### Page 12 — Data model and report lifecycle

The report record includes its reporter reference, generated report number, description, category, optional image reference, location/zone fields, priority, status, assignment data, timestamps, and status history. Users are represented by safe public fields in API responses; passwords are hashed and excluded from normal response shapes. Task and notification records reference their recipient or assigned worker. Recommendation runs retain a period, filters, aggregate evidence, generated suggestion text, and administrator review metadata.

**Lifecycle summary:** submitted → moderation/review → assigned → in progress → submitted for verification → resolved, with allowed return/reopen branches enforced by API transitions. The precise transition list must match `server/src` when drawing the state diagram. A report’s AI priority is only an initial suggestion; administrator moderation can change the official priority. A completion photo is evidence submitted by a worker, not independent proof that a public area is clean.

Use entity-relationship notation with cardinalities verified against Mongoose schemas. Avoid placing real user names, email addresses, or production identifiers in diagrams.

---

### Page 13 — Citizen, administrator, and worker modules

The citizen module supports account registration/login, report creation, optional image assistance, report history/detail, own-record map views, and notifications. An assistant can prepare text and suggest a category; the citizen reviews the handoff in the ordinary report form and must choose Submit.

The administrator module supports report review, access requests, metrics, map exploration, duplicate review, worker dispatch, work verification, audit history, and recommendation review. Administrator actions are checked again on the API and selected changes create audit events.

The worker module shows assignments for the signed-in worker, permits allowed status updates and notes, accepts completion evidence, and submits work for verification. Queries must be filtered by the authenticated worker ID. A frontend-hidden button is not an access control; the API is the enforcement boundary.

---

### Page 14 — AI, maps, and notifications

Image analysis is explicitly requested by the citizen. The image and a bounded description may be sent to Groq. The backend validates the structured model output and signs a short-lived token binding the result to the same user, image, description, and selected zone. The user may continue manually when the provider is unavailable. The model cannot identify the actual location from the image unless that is independently supplied, and should not invent site conditions.

The assistant receives submitted conversation text for general guidance. Deterministic report-status requests are answered from role-scoped database queries rather than sending report data to the model. Citizen complaint drafts are validated but not persisted. Administrator recommendations use aggregate evidence only and remain subject to human review.

Maps show records permitted for the current role. Approximate hotspot grids are not surveyed boundaries or estimates of total waste. In-app notifications are persisted per recipient and refreshed by polling; the project does not claim WebSocket or push delivery.

---

### Page 15 — Security, privacy, and threat model

The principal assets are session credentials, account data, citizen descriptions/photos, location details, operational records, and provider secrets. Relevant threats include account takeover, role escalation, unauthorized record access, malicious uploads, cross-site request abuse, injection through untrusted text, exposed secrets, and unsupported AI output.

Controls in the inspected source include hashed passwords, HttpOnly session cookies, server role/ownership checks, exact origin validation for mutations, request schemas, rate limits, Helmet/CORS configuration, bounded upload sizes, image signature checks, safe response fields, and normalized production errors. AI output is parsed and constrained before being used. Complaint drafts do not create reports and recommendations do not perform actions.

Residual issues include public delivery URLs for stored images, lack of email verification/password recovery/MFA, and no immediate server-side JWT revocation after logout. Production setup must protect secrets and use HTTPS. Avoid including real credentials, sensitive images, or unredacted identities in the synopsis.

---

### Page 16 — Accessibility and responsive design

The interface uses responsive React layouts and role-specific navigation. Recent work adds a skip link, mobile quick navigation, a textual alternative for currently shown map records, status/error semantics for selected asynchronous interactions, and an assistant reset control. Existing focus-visible treatment should be retained.

Automated tests do not establish complete WCAG conformance. Before making an accessibility claim, manually verify keyboard-only navigation, visible focus, label/name/role/value, error association, contrast, zoom/reflow, reduced-motion behavior, touch target sizing, and screen-reader reading order at desktop and mobile widths. Map functionality needs a usable text alternative because map canvas and marker interaction can exclude some users.

Insert screenshots only from the final build, with meaningful alt text in the report. Do not show real citizen location or account data in screenshots.

---

### Page 17 — Implementation details

The frontend groups code by pages, layouts, and features. Shared API access centralizes request credentials and response handling. React Router exposes public and role-restricted workspace paths. The backend is divided into route, controller, service, middleware, model, and validator layers. This separation makes permission checks, request validation, external calls, and persistence easier to review.

The API’s route mount point is `/api/v1`. The server connects to MongoDB and initializes required indexes before it reports ready. Report image storage is handled through an adapter. Optional model calls are made by backend services with provider timeouts and no browser-visible key. CI runs repository build and automated test commands as configured in the workflow; inspect the current workflow and record its actual status for the revision being submitted.

Insert short source excerpts only if requested. Prefer sequence diagrams that show the client, API, database, image provider, and AI provider without including secrets or raw personal information.

---

### Page 18 — Testing and results

Testing should include unit/controller tests for validation, auth, ownership, status transitions, upload failures, and optional AI responses; frontend component tests for interactions and fallback states; a production Vite build; and a manual integration walkthrough against the deployed services. A local automated result is evidence about the checked code and test fixtures only. It does not prove that live Atlas credentials, Railway variables, Vercel routing, Cloudinary, Groq quotas, DNS, or production cookies are correct.

Record actual test counts from the final test run in a table: command, date, passed, failed, skipped, environment. Record live tests separately with browser/device, role, expected behavior, observed result, and sanitized screenshot where appropriate. Do not fabricate sample sizes, performance measurements, user-study results, or impact.

The test log for this revision is completed in `phase-12-14-release-audit.md` after execution. Copy its actual result here before submission.

---

### Page 19 — Deployment and operation

The planned deployment separates the static Vite frontend from the Node API and MongoDB database. The frontend must be configured with a public API base URL. The backend needs `MONGODB_URI`, `JWT_SECRET`, exact `CLIENT_URL` values, cookie settings appropriate to HTTPS and host relationship, Cloudinary credentials for persistent media, and optional Groq credentials for AI. Keep each secret in the host’s server-side variable settings; do not put secrets into Vite variables or commit them to Git.

The API health endpoint reports service/database readiness. A production validation should test health, registration/login, report upload, role-scoped report access, worker assignment, and administrator verification. Document a backup and restore plan for MongoDB and storage assets, access to deployment logs, a dependency update policy, and rollback procedure. These provider actions are operational tasks and must be verified by the project owner.

---

### Page 20 — Limitations and ethical considerations

The prototype depends on internet access and configured external providers. It has no evidence of offline support, a municipal service integration, a verified zone map, field worker identity validation, or service-level response commitments. Database reports are self-selected observations and may be incomplete, duplicated, inaccurate, or biased toward users with access to the application.

AI may misread images, produce unclear wording, or suggest an unsuitable category. The system uses validation and human review but cannot guarantee model correctness. Recommendations based on submission counts may reflect reporting behavior rather than actual cleanliness. A post-action count comparison is descriptive and does not establish causation. Geolocation can expose sensitive patterns; collect only what the project requires and make location use clear to users.

Before any operational use, define data retention, consent, image access, incident response, authority ownership, accessible alternatives, and a route for correction/deletion according to applicable institutional and legal requirements. This synopsis does not determine legal compliance.

---

### Page 21 — Conclusion and future work

SwachhAI implements an end-to-end prototype for citizen report submission, administrator triage, worker assignment, completion review, notifications, and role-scoped access. Optional AI features assist with image suggestions, complaint wording, civic questions, and aggregate operational recommendations while leaving final submissions and operational decisions with people. The codebase includes a production frontend build path and automated tests; live service readiness should be reported separately based on actual provider checks.

Future work may include verified civic zone datasets, a formal accessibility audit, stronger account recovery and session revocation, configurable retention, privacy-preserving media access, audit exports, offline-capable worker workflows, monitored deployment, and evaluation with approved users under an ethics and data-governance plan. Any future evaluation should define baseline, measures, consent, sampling, and limitations before collecting data.

---

### Page 22 — References, glossary, and appendices

Add verified, current primary sources for React, Vite, Express, MongoDB/Mongoose, OWASP guidance, WCAG, Cloudinary, Railway, Vercel, and Groq. Cite access dates for living web documentation. Include package versions from lockfiles if required. Do not cite this repository as evidence of a published outcome.

**Appendix A:** sanitized screenshots of public demo pages.
**Appendix B:** route/role matrix and report lifecycle.
**Appendix C:** actual automated test output and live demonstration checklist.
**Appendix D:** deployment configuration names only (never values).
**Appendix E:** sample report data only if synthetic and clearly labeled.

**Glossary:** “report” means a citizen-submitted record; “recommendation” means advisory model text tied to aggregate database evidence; “verification” means an administrator’s workflow decision on submitted worker evidence, not independent scientific confirmation of cleanliness.
