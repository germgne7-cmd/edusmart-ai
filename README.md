# EduSmart AI

A trilingual university learning workspace built with React 19, TypeScript, Vite, Tailwind, Supabase PostgreSQL/Auth/Storage, and Netlify Functions. Default interface: Қазақша. Russian and English are included. Light/dark themes and responsive student, teacher and administrator workspaces share a component system built with shadcn-style Tailwind/CVA primitives and Radix Dialog.

## Run locally

Requires Node 22.13+ (validated on Node 24) and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Without credentials, public pages and the **explicitly labeled, read-only demo** work. No registration, persistence, storage or AI success is simulated. The demo is session-scoped and never bypasses Supabase authentication. It contains translated example course titles, lessons, enrollment/progress and assignments; personal production workspaces query the database and have real empty states.

To enable accounts and database operations, create Supabase, apply `supabase/migrations/001_platform.sql`, and configure the two public `VITE_SUPABASE_*` variables. Set up the server variables from `.env.example` in Netlify. Use `npx netlify-cli dev` to run both Vite and Functions locally; Vite alone does not execute the `/api/ai` backend.

## Validate

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Playwright uses `/usr/bin/chromium` in this cloud environment. On other systems set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to your installed Chromium/Chrome executable. See [testing](docs/TESTING.md) for exact evidence and external limitations.

## Core workflows

- Auth: register, email verification, sign in/out, password recovery and reset. New accounts always become students. Role changes require an administrator or trusted SQL provisioning.
- Courses: search/filter/sort, enroll, read Markdown lessons, complete lessons; teachers create/edit/delete courses, lessons and assignments, attach private learning materials, review submissions and grade.
- Assignments: deadline checks on client **and database**, text/file submission, private attachment access for authorized instructors, feedback and grade display.
- Documents: private PDF/DOCX/TXT upload (10 MB), SHA-256 deduplication, text extraction, metadata, download and deletion, persisted analysis and contextual questions. Text-only PDFs; no OCR.
- AI: server-side OpenAI-compatible HTTPS provider, validated JSON analysis/quizzes, multilingual chat history, source ownership, request limits. Missing configuration yields an error, never a generated-looking fallback.
- Quizzes: document/course source, difficulty and question count, four-choice questions, database scoring, saved attempts, explanations after submission. Answer keys are hidden by RLS before grading.
- Personal: monthly/weekly calendar and deadlines, profile/language preferences, notifications, real grade/progress charts. Admins manage roles and moderate courses.

## Architecture and documentation

Presentation → service/domain layer → repository → Supabase (RLS). Server AI orchestration never exposes a private key to the browser. Atomic SQL RPCs create quizzes and score attempts.

- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Architecture and data flow](docs/ARCHITECTURE.md)
- [Database design](docs/DATABASE_DESIGN.md) and [ER diagram](docs/ER_DIAGRAM.md)
- [API](docs/API_DOCUMENTATION.md)
- [Laboratory requirements and gaps](docs/LAB_REQUIREMENTS.md)
- [Tests](docs/TESTING.md)
- [Deployment steps](docs/DEPLOYMENT.md)

## Delivery status

Local evidence: 139 Vitest tests passed; 33 Playwright scenarios passed, one duplicate mobile screenshot task intentionally skipped. Production dependency audit: zero known vulnerabilities.

Source, migration, fixtures, test suites and deployment configuration are implemented. Production build and local checks are recorded in the testing report. No live Supabase project or AI credentials were provided; live authentication email delivery, hosted RLS/storage behavior and real model responses require deployment validation. Nothing has been deployed or published. See laboratory mapping for remaining quantitative requirements rather than treating the whole academic checklist as verified.
