# SwachhAI Synopsis Preparation Plan

This plan splits synopsis preparation between Claude Code, which can inspect the repository, and Claude Chat, which can help organize and polish the academic document. The repository is the source for implementation facts; the student and project guide remain the source for academic details, institutional requirements, and approval.

## 1. Start with the institute's requirements

Before drafting, collect:

- The official synopsis/report template and required page or word count.
- Required title-page, certificate, declaration, acknowledgement, and approval wording.
- Citation style, font, margins, line spacing, binding, and submission format.
- Student name, roll number, programme, department, guide, academic session, and submission date.
- Whether the submission should describe the current local repository, the last verified hosted build, or both separately.

Do not let Claude invent missing institutional text, signatures, acknowledgements, supervisor details, citations, test results, or deployment evidence. Keep placeholders until verified.

## 2. Recommended work sequence

### Step 1 — Ask Claude Code for a repository evidence pack

Open the SwachhAI repository in Claude Code. Run the repository-audit prompt below. Ask for read-only inspection and cite each implementation claim with a file path and line number. Have Claude Code distinguish implemented features, partial features, unsupported features, and items requiring a manual/live check.

The evidence pack should cover the current commit, application architecture, citizen/admin/worker workflows, report status lifecycle, optional AI behavior, data models, API routes, access controls, external services, test/build commands, limitations, and any claims that cannot be verified from source. It must not include secret values or real user data.

### Step 2 — Verify key claims yourself

Use the evidence pack and application to verify the most important claims:

- Create or use synthetic citizen, worker, and administrator accounts.
- Follow report submission, review, assignment, worker update, and verification where the configured environment permits.
- Confirm which optional integrations are configured (Cloudinary and Groq) without exposing their values.
- Record test results from the exact revision and date actually tested.
- Record hosting state separately from local build state. For the revision currently pushed as `2c4ffa5`, the public Vercel bundle and Railway zone endpoint were still serving the previous revision when checked; do not say this revision is deployed until those checks pass.
- Capture screenshots only from a build you can identify. Use synthetic records and avoid passwords, personal information, report images containing people, and precise private locations.

### Step 3 — Prepare the outline and evidence table in Claude Chat

Paste the verified evidence pack into Claude Chat along with the synopsis-writing prompt below and the institution's actual formatting requirements. Ask it to build a chapter outline and a claim-to-evidence table before drafting full prose. Correct errors in that table before asking for the complete draft.

### Step 4 — Draft in sections

Draft the abstract, introduction, problem statement, objectives, scope, requirements, design, implementation, testing, deployment, limitations, and conclusion from the corrected evidence table. Treat related work and references as a separate research task: use sources you have opened and verified, prioritize papers/standards/official documentation, and never accept generated citations without checking them.

### Step 5 — Review and format

Ask Claude Chat to check consistency, plain academic language, repetition, figure/table references, and whether every technical claim is supported. Then apply the college template in Word/Google Docs, confirm page breaks and table of contents, and obtain the guide's approval for institution-specific pages.

## 3. Suggested synopsis structure

Adapt page count and section names to the official institute template. A practical 20–22-page plan is:

1. Title page and required institutional pages.
2. Abstract and keywords.
3. Table of contents, figures/tables, and abbreviations.
4. Introduction and project context.
5. Problem statement, objectives, scope, and success criteria.
6. Related work: civic reporting, workflow coordination, geospatial interfaces, and human-reviewed AI.
7. Stakeholders, use cases, and functional/non-functional requirements.
8. Architecture and technology stack.
9. Data model and report/work-task status lifecycle.
10. Citizen reporting and location/zone matching.
11. Administrator operations, moderation, assignment, metrics, and audit trail.
12. Worker task handling, evidence, and verification workflow.
13. Optional AI image suggestions, complaint drafting, assistant, and recommendations.
14. Security, privacy, accessibility, responsive design, and theme support.
15. Testing methodology and actual results.
16. Deployment architecture and actual deployment status.
17. Limitations, risks, and ethical considerations.
18. Conclusion and future work.
19. References and appendices.

IoT/smart-bin connectivity, municipal integration, verified civic boundaries, formal accessibility conformance, and measured cleanliness impact are not implemented or evidenced in the current project. Present them only as exclusions or future work.

## 4. Prompt for Claude Code — repository evidence pack

```text
You are auditing the SwachhAI repository to prepare evidence for an academic project synopsis. Inspect the current working tree and Git revision. Do not edit files, push commits, or expose secrets or real user data.

Return a concise, factual evidence pack with these sections:
1. Revision and repository state (branch, commit, uncommitted changes).
2. Architecture, languages, frameworks, and service boundaries.
3. Citizen, administrator, and worker capabilities with relevant source paths and line numbers.
4. Report and task lifecycle, data models, and important API routes.
5. Authentication, authorization, validation, file handling, audit, and privacy controls.
6. Optional AI features and exactly what they do; distinguish model suggestions from human decisions.
7. Location and zone behavior, including whether zone areas are verified or approximate.
8. UI/accessibility/responsive/theme features supported by source evidence.
9. Available tests/build commands and results. Run them only if permitted in this environment; otherwise say not run. Record the revision and date for every result.
10. Deployment configuration and current verified status. Do not infer that a provider deployed the current commit from a successful Git push or a healthy old URL.
11. Limitations, unsupported items, incomplete items, and claims that need student/guide confirmation.

For every implementation statement, provide a file path and line number. Label each item Implemented, Partial, Not implemented, or Needs live/manual verification. Never invent usage statistics, performance results, user-study findings, institutional approval, citations, or environmental impact. Do not print environment variable values, tokens, connection strings, or private account data.
```

## 5. Prompt for Claude Chat — synopsis outline and drafting

```text
Help me prepare an academic synopsis for SwachhAI using the institute requirements and repository evidence I provide below. Do not invent missing facts. Treat the evidence pack as the source for implementation details, but flag contradictions or weak evidence instead of silently resolving them.

First produce:
1. A synopsis outline that follows the attached institute template and required length.
2. A claim-to-evidence table with columns: proposed claim, evidence/source, confidence, and what I must verify.
3. A list of missing student, guide, institutional, testing, deployment, and citation details.
Do not draft the full synopsis until I review those items.

After I approve the outline and evidence table, draft the synopsis in clear academic language. Distinguish implemented features from future work; local tests from live integration checks; approximate zone matching from verified boundaries; model suggestions from human decisions; and database report counts from real-world cleanliness measurements. Do not claim the latest commit is deployed unless I provide current deployment evidence. Do not fabricate citations. For related work, suggest search topics and source types; only cite sources I provide or sources whose details I can verify.

Institute format and requirements:
[Paste official requirements here]

Verified Claude Code evidence pack:
[Paste the reviewed evidence pack here]

My verified academic details and actual test/deployment records:
[Fill in verified details only]
```

## 6. Claim and evidence rules

| Topic | Safe wording | Evidence needed for a stronger claim |
| --- | --- | --- |
| Application capability | “The prototype implements…” | Source code and a reproducible workflow check |
| Automated tests | “The test suite passed on revision X on date Y.” | Exact command output, revision, date, and environment |
| Deployment | “The frontend/API was reachable at the time checked.” | Current URL checks plus proof the served revision matches the commit |
| AI | “The model suggests text/category/priority for human review.” | Current service implementation and configuration; no accuracy claim without evaluation |
| Location | “An administrator-configured approximate center/radius can suggest a zone.” | Admin configuration and a location-match check; not proof of a boundary |
| Impact | “The project explores a reporting workflow.” | A properly designed and approved study is needed for measured outcome claims |

## 7. Final checklist before submission

- Replace all bracketed placeholders and remove instructions to the writer.
- Use the exact institute format and approved certificate/declaration wording.
- Verify each implementation claim against the current revision.
- Include only test counts and deployment checks actually performed for that revision.
- Verify every citation and bibliography entry from its original source.
- Use sanitized screenshots and synthetic examples.
- State known limitations, including no smart-bin/IoT integration and no official zone-boundary data.
- Ask the project guide to review scope, claims, formatting, and institution-specific pages.
- Keep the source synopsis and a final exported PDF/Word document together with a record of the revision used.
