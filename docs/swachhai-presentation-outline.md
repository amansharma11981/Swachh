# SwachhAI presentation outline

Suggested 12–15-minute presentation. Replace bracketed presenter details, show screenshots from the current live build only, and report test/deployment status exactly as verified.

## Slide 1 — Title

**SwachhAI: AI-Assisted Civic Cleanliness Reporting and Operations**
Presenter, roll number, department, guide, session. State that this is an academic prototype.

## Slide 2 — Motivation and problem

Explain the workflow gap the prototype explores: capturing a citizen observation, giving it a reference, and coordinating a response. Clarify that submissions are not a complete cleanliness survey.

## Slide 3 — Project goals and boundaries

Show the project goals: citizen reporting, report ownership, admin moderation, worker tasks, completion review, notifications, and optional AI assistance. State excluded scope: IoT, verified municipal integration, surveyed zones, and proven civic impact.

## Slide 4 — User roles and workflow

Show citizen → report review → admin assignment → worker update/evidence → admin verification. Note that API-side role and ownership checks protect each operation.

## Slide 5 — Architecture

Use the component diagram from `system-diagrams.md`: React/Vite, Express API, MongoDB, Cloudinary, optional Groq, and hosting. Highlight that secrets remain server-side.

## Slide 6 — Citizen experience

Demonstrate signup/login, new report form, image/location choices, report reference number, and own-report history. Use synthetic records and a non-sensitive demo image.

## Slide 7 — Admin and worker workspaces

Demonstrate one report’s moderation/assignment and the worker’s own assignment. Show submitted completion evidence and the administrator’s review decision. Avoid calling a worker photo independent proof of site conditions.

## Slide 8 — Maps and operational metrics

Show role-scoped map views and aggregate counts. Explain that hotspots are approximate and reports reflect submitted records, not total waste prevalence.

## Slide 9 — Optional AI assistance

Show the image suggestion and complaint draft as optional. Emphasize that the citizen reviews and submits through the ordinary report form. Explain that report-status lookups are scoped to the signed-in user and remain out of the model request.

## Slide 10 — Evidence-based recommendations

Show aggregate evidence → Groq suggestion → admin review/status → optional post-action count comparison. Explain sparse-data suppression and that comparison does not establish causation.

## Slide 11 — Security and privacy

Cover HttpOnly sessions, role/ownership checks, input/file validation, rate limits, server-only secrets, AI boundaries, and known gaps (public image URLs, no MFA/password recovery/token revocation).

## Slide 12 — Accessibility and responsive design

Show mobile navigation, keyboard skip link, textual map list, and status/error feedback. Avoid claiming complete WCAG conformance without a manual audit.

## Slide 13 — Verification and deployment

Record actual build and automated test results from the release audit. Demonstrate the live health endpoint and workflows only if they were verified on the current revision. Mention configured Vercel/Railway/Atlas/Cloudinary/Groq services only when confirmed.

## Slide 14 — Limitations and next steps

Discuss reliance on network/provider configuration, user-submitted data bias, provisional zone labels, AI uncertainty, and operational data governance. Suggest verified datasets, formal accessibility review, recovery controls, backup/restore drills, and an approved user evaluation.

## Slide 15 — Conclusion and questions

Summarize the end-to-end role workflow and the use of AI as optional assistance under human control. Invite questions. Do not claim measured environmental impact unless a valid study has been conducted.

### Demonstration checklist

- Prepare synthetic citizen, admin, and worker accounts; never display passwords.
- Confirm the live build revision and API health before the session.
- Use a non-sensitive image and avoid showing exact private locations.
- Prepare a short fallback recording or screenshots if provider AI is rate-limited or unavailable.
- Keep a manual report-submission path ready if AI is unavailable.
- Close the demo session and revoke temporary accounts/credentials afterward if applicable.
