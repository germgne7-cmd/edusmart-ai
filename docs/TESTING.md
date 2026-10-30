# Testing and evidence

## Commands

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Vitest runs domain/service rules, React interface tests, real TXT/DOCX extraction, API configuration guards and PostgreSQL migration/RLS integration. PGlite tests use real PostgreSQL execution and minimal Auth/Storage schema shims, not a live Supabase deployment. Each database test runs in an isolated transaction; failed statements roll back. Seed repeatability and a small EXPLAIN ANALYZE query smoke check are included.

Playwright uses installed system Chromium, desktop and iPhone-size Chromium profiles. Browser tests cover public navigation, localization, protected routes, demo course/lesson navigation, filters, calendar controls, missing AI configuration, responsive overflow, theme/profile behavior and PDF/DOCX/TXT extraction using actual binary fixtures. Demo data is read-only. These tests do not claim a production account was authenticated or an AI model was called.

## Browser executable

Cloud: `/usr/bin/chromium`. Elsewhere set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed compatible Chromium/Chrome executable. The standard Playwright download endpoint was blocked by this cloud's allowlist; existing system Chromium was used without disabling TLS/checksum verification. The browser runs with `--no-sandbox` in this isolated cloud container. Use an appropriate sandbox on your own host.

## Screenshot evidence

The documentation capture scenario saves ten actual demo screenshots under `docs/screenshots/`. It waits for data-loading indicators to disappear before capture. Mobile skips this desktop-only documentation task; functional scenarios run on both profiles.

## What is not verified here

- Hosted Supabase REST/Auth/Storage gateways, email confirmation and password-reset email delivery.
- Full authenticated teacher/student/admin browser mutations against a live project.
- Real model generation, provider quality, provider billing and deployed Netlify function execution.
- Production-load behavior, assistive-technology audit, all browser engines, OCR (not implemented).

Supply configuration described in DEPLOYMENT.md, then run these checks with separate authorized accounts. Do not substitute the labeled demo for an authorization test.

The final executed result counts are recorded below.

## Final local validation

| Check                                                                | Executed result                                                                                                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen installation (`npm ci --prefer-offline --no-audit --no-fund`) | Passed; 796 packages installed                                                                                                                          |
| TypeScript (`npm run typecheck`, also required by build)             | Passed                                                                                                                                                  |
| Vitest                                                               | **139 passed**, 0 failed: domain/service 32, interface 20, repository query contracts 30, PostgreSQL/RLS 48, document extraction/limits 5, API guards 4 |
| Playwright                                                           | **33 passed**, 0 failed, **1 intentionally skipped** mobile copy of desktop documentation capture                                                       |
| Production build (`npm run build`)                                   | Passed; route-based code splitting and local font assets emitted to `dist`                                                                              |
| Netlify function esbuild bundle                                      | Passed                                                                                                                                                  |
| Production dependency audit (`npm audit --omit=dev`)                 | 0 known vulnerabilities after upgrading PDF.js to 6.2.108                                                                                               |
| Screenshots                                                          | 10 actual demo screenshots generated and inspected                                                                                                      |

The browser run uses the patched PDF.js 6 API, including its loading-task cleanup. A genuine image-only PDF fixture is rejected with `emptyFile`; real text PDF, DOCX and multilingual TXT fixtures are extracted. An oversized advertised DOCX expansion is rejected before parsing.

Earlier issues found and corrected: canceled initial demo queries, Node/browser Mammoth input differences, scanned-PDF page markers counted as text, stable ordering of paired chat messages, PDF.js security update/API change, and a screenshot locator matching both page and lesson headings. Final counts above are from the corrected code.

Build warnings remain for third-party Zod comment annotations and a large shared JavaScript chunk; neither is a TypeScript/build failure. Route splitting is implemented, but realistic network/load performance and deployed acceptance remain outstanding. GitHub CI is configured in `.github/workflows/ci.yml`; this local run does not establish that a remote CI run has occurred.
