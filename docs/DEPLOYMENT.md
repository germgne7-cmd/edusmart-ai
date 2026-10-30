# Deploy to Netlify

Deployment has **not** been performed. The repository supplies configuration; the following steps require your Supabase/Netlify accounts.

1. **Create Supabase.** Use a new project. Record the project URL and public anonymous/publishable key. Keep all private keys out of the browser and Git.
2. **Apply SQL.** Run `supabase/migrations/001_platform.sql` in the SQL editor as the project owner, or link the project with the Supabase CLI and run `supabase db push`. Review the migration before running. It assumes a new schema; it is not a destructive reset script.
3. **Verify storage.** The migration creates private `documents` and `materials` buckets with allowed PDF/DOCX/TXT MIME types and a 10 MB limit. Do not change them to public. Inspect storage RLS policies including instructor attachment access.
4. **Configure Auth.** Enable email/password, enable email confirmation for production, set the canonical site URL and allow exact callback URLs `/app/dashboard` and `/reset` for your deployment and permitted local development origins. Configure production SMTP and delivery limits. Recovery requires a valid recovery session.
5. **Provision elevated roles.** Sign up normally, then use trusted SQL `update public.profiles set role='admin' where id='<your-auth-user-uuid>';` for the initial administrator. Administrators can promote teachers in the UI. Never use signup metadata for role selection. Verify the target UUID before changing it.
6. **Development seed (optional).** On a disposable project only, create one teacher and student through Auth and then run `supabase/seed.sql`. Every record is labeled `[DEMO]`; the script is transactional and idempotent. Do not seed production.
7. **Connect GitHub to Netlify.** Select `germgne7-cmd/edusmart-ai`; build command `npm run build`, publish directory `dist`, functions directory `netlify/functions`. Use Node 22.13+ or 24. Commit/push the reviewed source through your normal workflow; no push or deployment is performed automatically by these instructions.
8. **Public build variables:** set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These are intentionally public and require correct RLS. Rebuild after changing them. Do not prefix any private key with `VITE_`.
9. **Server Functions variables:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AI_API_BASE_URL` (default `https://api.openai.com/v1`), `AI_API_KEY`, `AI_MODEL` (for example a supported model from your provider). Configure them in Netlify's secure environment settings with Functions scope. The provider must support the OpenAI chat-completions protocol and JSON-object response format over HTTPS. No service-role key is needed. Configure function duration for the provider response budget if your Netlify plan requires it; the upstream request timeout is 55 seconds.
10. **Build and deploy after review.** Netlify reads `netlify.toml`: API rewrite precedes the SPA fallback; security headers apply to all routes. Do not deploy with `.env.local` committed. All provider requests originate on the server.
11. **Validate the actual deployment:** sign up/confirm/sign in; recover/reset password; student enroll/read/complete; teacher create/edit lesson and assignment; student submit; instructor grade; private document upload/download; contextual analysis/chat; quiz generate/submit/review; calendar CRUD; language persistence; role and cross-user denial. Check direct nested URLs and mobile layout. Use a second account to verify isolation.

## Local full stack

`npm run dev` serves Vite and the read-only demo. With `.env.local` configured, use Netlify CLI (`npx netlify-cli dev`) for `/api/ai`; plain Vite does not execute Functions. Supabase remains a configured remote or local project. Functions read server-side environment values. Keep TLS verification enabled.

## Cloud task networking

Package-manager destinations are already allowed. Live testing requires adding your exact `<project-ref>.supabase.co` hostname and your configured AI hostname (for example `api.openai.com`) in cloud environment settings. This task did not change network settings or publish the environment. Netlify deployment egress is governed by Netlify, independently of the Codex cloud allowlist.

## Operations

Use separate development and production projects. Apply future schema changes as new migrations. Back up PostgreSQL and Storage; monitor provider spend, Auth errors and request budgets. Database request reservations limit the application endpoint, but production edge/IP rate limits and global AI-spend limits should also be configured. Never expose PostgreSQL privileged credentials in client bundles. Do not log JWTs, document text or AI keys.
