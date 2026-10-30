# API contract

## Authentication

Supabase Auth SDK handles signup/login/recovery. Send the session JWT as `Authorization: Bearer <access_token>` to the AI endpoint. The endpoint independently validates it using `auth.getUser`; a browser claim or local demo state is insufficient.

## POST /api/ai

Netlify rewrites to `/.netlify/functions/ai`. JSON request, maximum 15,000 characters. Common required fields: `action` (`chat`, `analyze`, `quiz`), `language` (`kk`, `ru`, `en`). Ten reserved requests per authenticated user per minute; concurrent reservations serialize in PostgreSQL.

| Action  | Inputs                                                     | Result                                                                        |
| ------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| chat    | message (1–6000 chars), optional conversationId/documentId | conversationId, content; persisted paired messages                            |
| analyze | documentId                                                 | result: summary, notes, ideas, terms, concepts, questions, outline; persisted |
| quiz    | documentId or courseId, difficulty, count (5/10/15/20)     | id of persisted validated quiz                                                |

Sources are loaded under the user's JWT. Source text is capped at 60,000 characters; model instructions explicitly identify truncation and prohibit invented citations. Document content is untrusted prompt data. No tool execution or HTML injection is enabled. React Markdown does not render raw HTML.

Errors: 400 invalid input/source, 401 invalid/missing session, 403 source ownership, 405 method, 413 payload size, 429 request budget, 502 provider/operation failure, 503 missing configuration. Responses use `Cache-Control: no-store`. UI maps these to translated safe messages.

## PostgreSQL RPCs

- `get_quiz(qid)` → sanitized ordered question objects, no answer key.
- `save_quiz(doc,cid,quiz_title,level,questions)` → quiz UUID after source checks and atomic insertion.
- `submit_quiz(qid,choices,elapsed)` → score, correct/total, seconds and review questions. Client score fields are not accepted.
- `save_analysis(doc,lang,analysis)` → persisted analysis UUID for owned source.
- `save_chat(cid,prompt,answer)` → atomic message pair for owned conversation.
- `reserve_ai_request()` → whether current user's budget permits another request.

RPCs use `SECURITY DEFINER`, fixed search paths and explicit owner checks; access is revoked for anonymous/public roles. Personal quiz creation RPC intentionally permits authenticated users to supply their own practice content, but not scores. Practice content/analysis RPCs do not certify that an AI generated the supplied data.

## Repository methods

`list(table, options)`, `get(table,id)`, `save(table,data)`, `remove(table,id)` operate only on an allowlist. RLS filters results. Named repository methods generate parameterized PostgREST filters and ordering; page-level composition additionally applies to authorized rows: course title/category/date, personal enrollment, assignment status, document name/type/date, grade course/date, calendar month/week, conversation selection, administrator user name. Large installations should add cursor pagination before scaling. Query contracts for filtering/sorting are tested with an SDK double; SQL/RLS is executed independently in PostgreSQL.

Aggregate RPCs: `course_progress()`, `grade_distribution()` and `weekly_learning_activity()` execute under caller RLS, with explicit current-user scope. They are tested in the local PostgreSQL suite.
