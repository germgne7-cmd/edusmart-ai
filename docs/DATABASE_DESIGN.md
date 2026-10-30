# Database design

Apply `supabase/migrations/001_platform.sql` once on a new Supabase project. It creates all tables, constraints, indexes, triggers, RLS policies, RPCs and private buckets. UUIDs identify records; foreign keys cascade dependent private content. Mutable content tables have updated timestamps. Quiz attempts and AI request records are append-only through RPCs.

| Tables                                   | Relations and authorization                                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| profiles                                 | Auth user primary key; signup trigger ignores role metadata; self profile edits; administrator-only role changes |
| courses                                  | Instructor profile; published catalog; instructor/admin mutation                                                 |
| enrollments                              | Unique user/course; self enrollment into published course; teacher visibility                                    |
| lessons / lesson_completions             | Course lessons; completion unique user/lesson; authorized learning access                                        |
| assignments / submissions                | Course deadline; unique assignment/user; enrollment/deadline/ownership/grade triggers                            |
| documents / document_analyses            | Owner and private path; unique owner/hash; analyses cascade on deletion                                          |
| quizzes / quiz_questions / quiz_attempts | Owned source; hidden answer keys; database-computed scores                                                       |
| calendar_events                          | Owner-only CRUD; end must not precede start                                                                      |
| notifications                            | Owner read/update; only trusted infrastructure provisions notifications                                          |
| ai_conversations / ai_messages           | Owner read/history; paired message insertion through RPC                                                         |
| activity                                 | Owner/admin read; reserved for trusted audit integrations                                                        |
| ai_requests                              | RPC-only request budget, ten authenticated requests per minute                                                   |

## Transactions

1. `save_quiz`: source authorization + quiz + all questions, atomically rolled back if any constraint fails.
2. `submit_quiz`: answer validation + score computation + saved attempt, atomically.
3. `save_chat`: user/assistant message pair inserted together.

The reference TypeScript score algorithm is unit-tested; production grading uses SQL. The browser never receives `correct_answer` or explanations from `get_quiz`. Successful submission returns review answers. These are personal practice quizzes; repeated attempts are permitted.

## Storage

`documents` and `materials` buckets are private, maximum 10 MB, restricted MIME types. A document/assignment attachment path begins with the owner's UUID. A course material path begins with a course UUID. Teachers can read only attachments referenced by their own assignments' submissions. Signed downloads expire after 60 seconds. Public sharing is not implemented.

Deletion spans Storage and PostgreSQL APIs and is not a cross-system transaction. Document upload cleans the stored object if metadata insertion fails. Network interruptions may leave orphan objects; production housekeeping should reconcile them. Student attachment uploads may require equivalent orphan cleanup on failed submission.

## Development data

Create development users through Supabase Auth, promote one to teacher using trusted SQL, then run `supabase/seed.sql`. The seed is transactional, idempotent, clearly labeled `[DEMO]`, and creates more than 100 related course/lesson/assignment/enrollment/calendar/quiz records. It must never run against production. It requires at least one teacher and student. It does not create passwords or bypass Auth.

## Validation evidence

The migration is executed by `tests/database.test.ts` against PGlite PostgreSQL with minimal Auth/Storage schema shims. Only `CREATE EXTENSION pgcrypto` is omitted there because UUID generation is built into PostgreSQL. RLS queries execute as a non-superuser `authenticated` role with a simulated auth UID. This verifies SQL semantics, not the hosted Auth/Storage gateway, email service or network behavior.
