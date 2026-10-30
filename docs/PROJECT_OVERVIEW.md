# EduSmart AI — project overview

**RU:** «Разработка интеллектуальной образовательной платформы для студентов университета с интеграцией искусственного интеллекта».

**KK:** «Жасанды интеллект интеграцияланған университет студенттеріне арналған интеллектуалды білім беру платформасын әзірлеу».

The platform connects courses, private materials, assessment, study planning and AI-assisted understanding for university students and instructors. Administrators provision elevated roles; public registration cannot choose them.

## Implemented screens

`/`, `/about`, `/login`, `/register`, `/recovery`, `/reset`; authenticated `/app/dashboard`, `/app/courses`, `/app/catalog`, `/app/course/:id`, `/app/lesson/:id`, `/app/assignments`, `/app/assignment/:id`, `/app/analyzer`, `/app/quizzes`, `/app/quiz/:id`, `/app/assistant`, `/app/grades`, `/app/analytics`, `/app/calendar`, `/app/documents`, `/app/notifications`, `/app/profile`, `/app/settings`; teacher/admin `/app/teacher`, `/app/manageCourses`, `/app/lessons`, `/app/manageAssignments`, `/app/submissions`, `/app/students`; admin `/app/admin`, `/app/users`, `/app/statistics`.

Related administrative routes reuse the administration screen. Course create/edit and lesson/assignment management use accessible modal forms. This avoids empty route placeholders.

The public demo is read-only and clearly labeled. All mutations require a real account. Academic demo seed data is separate from the browser demo. User-authored course material is content, not interface text, and is not automatically translated.

## Boundaries

No OCR, streaming AI, automatic citation retrieval, email notification scheduler, or public sharing. Notification records are readable/markable; no fabricated notifications are inserted by the UI. Weekly activity is based on lesson-completion dates. AI source context is capped to 60,000 characters, documents to 500,000 extracted characters. AI response quality is provider-dependent.

## Known follow-up work

- Validate hosted Supabase/Auth/Storage and provider-backed requests with real configuration.
- Add authenticated full-system browser tests against a disposable Supabase project.
- Add OCR only with an explicitly configured provider and document privacy review.
- Establish realistic-load performance baselines and hosted system acceptance documented in LAB_REQUIREMENTS.md.
