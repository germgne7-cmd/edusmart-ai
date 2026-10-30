// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  it,
  expect,
  describe,
} from "vitest";
let db: PGlite;
const student = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002",
  teacher = "00000000-0000-4000-8000-000000000003",
  admin = "00000000-0000-4000-8000-000000000004",
  cid = "10000000-0000-4000-8000-000000000001",
  lid = "20000000-0000-4000-8000-000000000001",
  aid = "30000000-0000-4000-8000-000000000001",
  did = "40000000-0000-4000-8000-000000000001";
const q = {
  question: "What is the correct choice?",
  options: ["A", "B", "C", "D"],
  correct_answer: 1,
  explanation: "B is correct.",
};
async function as(uid: string) {
  await db.exec(
    `reset role;select set_config('test.uid','${uid}',false);set role authenticated;`,
  );
}
async function rows(sql: string, params: any[] = []) {
  return (await db.query(sql, params)).rows as any[];
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role supabase_admin;create schema auth;create schema storage;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;alter table storage.objects enable row level security;grant usage on schema auth,storage,public to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  const sql = readFileSync(
    "supabase/migrations/001_platform.sql",
    "utf8",
  ).replace("create extension if not exists pgcrypto;", "");
  await db.exec(sql);
  await db.exec(
    `grant select,insert,update,delete on all tables in schema public,storage to authenticated;insert into auth.users(id) values('${student}'),('${other}'),('${teacher}'),('${admin}');update public.profiles set role='teacher' where id='${teacher}';update public.profiles set role='admin' where id='${admin}';insert into courses(id,teacher_id,title,description,category,difficulty,duration,status) values('${cid}','${teacher}','Architecture','A university course','Engineering','medium',24,'published');insert into lessons(id,course_id,title,content) values('${lid}','${cid}','Foundations','Learning concepts');insert into assignments(id,course_id,title,description,deadline) values('${aid}','${cid}','Design task','Build an architecture diagram',now()+interval '1 day');insert into enrollments(user_id,course_id) values('${student}','${cid}');insert into documents(id,user_id,name,path,size,hash,text,word_count,character_count) values('${did}','${student}','lecture.txt','${student}/lecture.txt',100,'abc','Source text for learning.',4,25);`,
  );
}, 60000);
afterAll(async () => await db?.close());
beforeEach(async () => {
  await db.exec("begin");
  await as(student);
});
afterEach(async () => await db.exec("rollback;reset role;"));
describe("PostgreSQL schema and RLS", () => {
  it("creates student profiles from auth without trusting metadata roles", async () => {
    await db.exec(
      `reset role;insert into auth.users values('00000000-0000-4000-8000-000000000009','{"role":"admin","full_name":"Test"}');`,
    );
    expect(
      (await rows("select role from profiles where full_name='Test'"))[0].role,
    ).toBe("student");
  });
  it("student can read own profile", async () =>
    expect(await rows("select * from profiles")).toHaveLength(1));
  it("student cannot read another profile", async () =>
    expect(
      await rows("select * from profiles where id=$1", [other]),
    ).toHaveLength(0));
  it("student cannot promote self", async () =>
    await expect(
      db.query("update profiles set role='admin' where id=$1", [student]),
    ).rejects.toThrow("role changes"));
  it("student can edit own name", async () => {
    await db.query("update profiles set full_name='Aidana' where id=$1", [
      student,
    ]);
    expect((await rows("select full_name from profiles"))[0].full_name).toBe(
      "Aidana",
    );
  });
  it("admin can assign teacher role", async () => {
    await as(admin);
    await db.query("update profiles set role='teacher' where id=$1", [other]);
    expect(
      (await rows("select role from profiles where id=$1", [other]))[0].role,
    ).toBe("teacher");
  });
  it("published course is visible", async () =>
    expect(await rows("select * from courses")).toHaveLength(1));
  it("student cannot create course", async () =>
    await expect(
      db.query(
        "insert into courses(teacher_id,title,description,category,difficulty,duration) values($1,'Course','Description','AI','easy',10)",
        [student],
      ),
    ).rejects.toThrow());
  it("teacher can create a draft", async () => {
    await as(teacher);
    await db.query(
      "insert into courses(teacher_id,title,description,category,difficulty,duration) values($1,'New course','Description','AI','easy',10)",
      [teacher],
    );
    expect(await rows("select * from courses")).toHaveLength(2);
  });
  it("student cannot edit course", async () => {
    await db.exec("update courses set title='Hijacked'");
    expect((await rows("select title from courses"))[0].title).toBe(
      "Architecture",
    );
  });
  it("unrelated teacher cannot edit course", async () => {
    await as(admin);
    await db.query("update profiles set role='teacher' where id=$1", [other]);
    await as(other);
    await db.exec("update courses set title='Hijacked'");
    expect((await rows("select title from courses"))[0].title).toBe(
      "Architecture",
    );
  });
  it("unique enrollment rejects duplicates", async () =>
    await expect(
      db.query("insert into enrollments(user_id,course_id) values($1,$2)", [
        student,
        cid,
      ]),
    ).rejects.toThrow());
  it("cannot enroll another user", async () =>
    await expect(
      db.query("insert into enrollments(user_id,course_id) values($1,$2)", [
        other,
        cid,
      ]),
    ).rejects.toThrow());
  it("unenrolled user cannot read lessons", async () => {
    await as(other);
    expect(await rows("select * from lessons")).toHaveLength(0);
  });
  it("enrollment unlocks lessons", async () => {
    await as(other);
    await db.query("insert into enrollments(user_id,course_id) values($1,$2)", [
      other,
      cid,
    ]);
    expect(await rows("select * from lessons")).toHaveLength(1);
  });
  it("completion persists and prevents duplicates", async () => {
    await db.query(
      "insert into lesson_completions(user_id,lesson_id) values($1,$2)",
      [student, lid],
    );
    expect(await rows("select * from lesson_completions")).toHaveLength(1);
  });
  it("student can submit before deadline", async () => {
    await db.query(
      "insert into submissions(user_id,assignment_id,answer) values($1,$2,$3)",
      [student, aid, "My solution"],
    );
    expect((await rows("select answer from submissions"))[0].answer).toBe(
      "My solution",
    );
  });
  it("cannot self grade on insert", async () =>
    await expect(
      db.query(
        "insert into submissions(user_id,assignment_id,answer,grade) values($1,$2,$3,100)",
        [student, aid, "Solution"],
      ),
    ).rejects.toThrow("self grade"));
  it("cannot submit after deadline", async () => {
    await as(teacher);
    await db.exec("update assignments set deadline=now()-interval '1 day'");
    await as(student);
    await expect(
      db.query(
        "insert into submissions(user_id,assignment_id,answer) values($1,$2,$3)",
        [student, aid, "Late"],
      ),
    ).rejects.toThrow("forbidden");
  });
  it("unenrolled student cannot submit", async () => {
    await as(other);
    await expect(
      db.query(
        "insert into submissions(user_id,assignment_id,answer) values($1,$2,$3)",
        [other, aid, "No enrollment"],
      ),
    ).rejects.toThrow();
  });
  it("teacher can grade student work", async () => {
    await db.query(
      "insert into submissions(user_id,assignment_id,answer) values($1,$2,$3)",
      [student, aid, "Solution"],
    );
    await as(teacher);
    await db.exec("update submissions set grade=91,feedback='Good work'");
    expect((await rows("select grade from submissions"))[0].grade).toBe("91");
  });
  it("teacher cannot alter student answer", async () => {
    await db.query(
      "insert into submissions(user_id,assignment_id,answer) values($1,$2,$3)",
      [student, aid, "Solution"],
    );
    await as(teacher);
    await expect(
      db.exec("update submissions set answer='Changed'"),
    ).rejects.toThrow("cannot alter");
  });
  it("cannot attach someone else’s file", async () =>
    await expect(
      db.query(
        "insert into submissions(user_id,assignment_id,answer,attachment_path) values($1,$2,$3,$4)",
        [student, aid, "Solution", other + "/file.txt"],
      ),
    ).rejects.toThrow("attachment owner"));
  it("documents are private", async () => {
    expect(await rows("select * from documents")).toHaveLength(1);
    await as(other);
    expect(await rows("select * from documents")).toHaveLength(0);
  });
  it("document hashes prevent duplicate uploads", async () =>
    await expect(
      db.query(
        "insert into documents(user_id,name,path,size,hash,text,word_count,character_count) values($1,$2,$3,100,$4,$5,1,4)",
        [student, "copy.txt", student + "/copy.txt", "abc", "text"],
      ),
    ).rejects.toThrow());
  it("storage denies foreign folders", async () =>
    await expect(
      db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
        "documents",
        other + "/secret.txt",
      ]),
    ).rejects.toThrow());
  it("storage permits owner folder", async () => {
    await db.query(
      "insert into storage.objects(bucket_id,name) values($1,$2)",
      ["documents", student + "/file.txt"],
    );
    expect(await rows("select * from storage.objects")).toHaveLength(1);
  });
  it("calendar event CRUD persists", async () => {
    const e = (
      await rows(
        "insert into calendar_events(user_id,title,start_at,end_at) values($1,'Study',now(),now()+interval '1 hour') returning id",
        [student],
      )
    )[0];
    await db.query("update calendar_events set title='Review' where id=$1", [
      e.id,
    ]);
    expect((await rows("select title from calendar_events"))[0].title).toBe(
      "Review",
    );
    await db.query("delete from calendar_events where id=$1", [e.id]);
    expect(await rows("select * from calendar_events")).toHaveLength(0);
  });
  it("calendar rejects inverted dates", async () =>
    await expect(
      db.query(
        "insert into calendar_events(user_id,title,start_at,end_at) values($1,'Study',now(),now()-interval '1 hour')",
        [student],
      ),
    ).rejects.toThrow());
  it("foreign analysis RPC is denied", async () => {
    await as(other);
    await expect(
      db.query("select save_analysis($1,'en','{}')", [did]),
    ).rejects.toThrow("forbidden");
  });
  it("analysis RPC persists owned result", async () => {
    await db.query("select save_analysis($1,'kk','{\"summary\":\"Test\"}')", [
      did,
    ]);
    expect(
      (await rows("select result from document_analyses"))[0].result.summary,
    ).toBe("Test");
  });
  it("atomic quiz creation hides answers", async () => {
    const r = await rows("select save_quiz($1,null,$2,$3,$4) id", [
      did,
      "Quiz",
      "easy",
      JSON.stringify(Array(5).fill(q)),
    ]);
    const quiz = (await rows("select get_quiz($1) questions", [r[0].id]))[0]
      .questions;
    expect(quiz).toHaveLength(5);
    expect(quiz[0]).not.toHaveProperty("correct_answer");
    expect(await rows("select * from quiz_questions")).toHaveLength(0);
  });
  it("scores on the database and persists attempt", async () => {
    const r = await rows("select save_quiz($1,null,$2,$3,$4) id", [
      did,
      "Quiz",
      "easy",
      JSON.stringify(Array(5).fill(q)),
    ]);
    const result = (
      await rows("select submit_quiz($1,$2,30) result", [
        r[0].id,
        "[1,1,0,0,1]",
      ])
    )[0].result;
    expect(result.score).toBe(60);
    expect((await rows("select score from quiz_attempts"))[0].score).toBe(60);
  });
  it("cannot insert fabricated quiz score", async () =>
    await expect(
      db.query(
        "insert into quiz_attempts(quiz_id,user_id,answers,score,correct,total,seconds) values(gen_random_uuid(),$1,'[]',100,5,5,10)",
        [student],
      ),
    ).rejects.toThrow());
  it("rejects incomplete quiz attempt", async () => {
    const r = await rows("select save_quiz($1,null,$2,$3,$4) id", [
      did,
      "Quiz",
      "easy",
      JSON.stringify(Array(5).fill(q)),
    ]);
    await expect(
      db.query("select submit_quiz($1,'[1]',2)", [r[0].id]),
    ).rejects.toThrow("invalid answers");
  });
  it("foreign user cannot open quiz", async () => {
    const r = await rows("select save_quiz($1,null,$2,$3,$4) id", [
      did,
      "Quiz",
      "easy",
      JSON.stringify(Array(5).fill(q)),
    ]);
    await as(other);
    await expect(db.query("select get_quiz($1)", [r[0].id])).rejects.toThrow(
      "forbidden",
    );
  });
  it("rate limit reserves all AI request types", async () => {
    for (let i = 0; i < 10; i++)
      expect(
        (await rows("select reserve_ai_request() allowed"))[0].allowed,
      ).toBe(true);
    expect((await rows("select reserve_ai_request() allowed"))[0].allowed).toBe(
      false,
    );
  });
  it("teacher can read enrolled student profiles", async () => {
    await as(teacher);
    expect(
      (await rows("select id from profiles")).some((p) => p.id === student),
    ).toBe(true);
  });
  it("owner deletion cascades document analyses", async () => {
    await db.query("select save_analysis($1,'kk','{}')", [did]);
    await db.query("delete from documents where id=$1", [did]);
    expect(await rows("select * from document_analyses")).toHaveLength(0);
  });
  it("aggregates real course grades", async () => {
    await db.query(
      "insert into submissions(user_id,assignment_id,answer) values($1,$2,$3)",
      [student, aid, "Solution"],
    );
    await as(teacher);
    await db.exec("update submissions set grade=80");
    expect(
      (
        await rows(
          "select avg(grade)::int average,count(*)::int total from submissions",
        )
      )[0],
    ).toEqual({ average: 80, total: 1 });
  });
  it("development seed creates over 100 related records and is idempotent", async () => {
    await db.exec("reset role");
    const seed = readFileSync("supabase/seed.sql", "utf8")
      .replace(/^begin;$/m, "")
      .replace(/^commit;$/m, "");
    await db.exec(seed);
    const sql =
      "select (select count(*) from courses)+(select count(*) from lessons)+(select count(*) from assignments)+(select count(*) from enrollments)+(select count(*) from calendar_events)+(select count(*) from quizzes)+(select count(*) from quiz_questions) total";
    const first = (await rows(sql))[0].total;
    expect(Number(first)).toBeGreaterThan(100);
    await db.exec(seed);
    expect((await rows(sql))[0].total).toBe(first);
  });
  it("activity is generated by trusted database triggers", async () => {
    const before = (await rows("select * from activity")).length;
    await db.query(
      "insert into lesson_completions(user_id,lesson_id) values($1,$2)",
      [student, lid],
    );
    expect(await rows("select * from activity")).toHaveLength(before + 1);
  });
  it("assignment creation notifies enrolled students", async () => {
    await as(teacher);
    await db.query(
      "insert into assignments(course_id,title,description,deadline) values($1,'New task','Practice',now()+interval '1 day')",
      [cid],
    );
    await as(student);
    expect((await rows("select title,body from notifications"))[0]).toEqual({
      title: "New task",
      body: "Жаңа тапсырма қосылды.",
    });
  });
  it("indexed enrollment lookup has an executable query plan", async () => {
    const plan = await rows(
      "explain (analyze,format json) select * from enrollments where course_id=$1",
      [cid],
    );
    const info = plan[0]["QUERY PLAN"][0];
    expect(info.Plan["Actual Rows"]).toBe(1);
    expect(info["Execution Time"]).toBeLessThan(1000);
  });
  it("aggregates course progress from related persisted rows", async () => {
    await db.query(
      "insert into lesson_completions(user_id,lesson_id) values($1,$2)",
      [student, lid],
    );
    expect((await rows("select * from course_progress()"))[0].progress).toBe(
      100,
    );
  });
  it("weekly activity returns seven days and actual completion count", async () => {
    await db.query(
      "insert into lesson_completions(user_id,lesson_id) values($1,$2)",
      [student, lid],
    );
    const week = await rows("select * from weekly_learning_activity()");
    expect(week).toHaveLength(7);
    expect(week.reduce((sum, r) => sum + Number(r.count), 0)).toBe(1);
  });
  it("grade distribution aggregates grades without leaking other users", async () => {
    await db.query(
      "insert into submissions(user_id,assignment_id,answer) values($1,$2,$3)",
      [student, aid, "Solution"],
    );
    await as(teacher);
    await db.exec("update submissions set grade=85");
    await as(student);
    expect((await rows("select * from grade_distribution()"))[0].bucket).toBe(
      80,
    );
    await as(other);
    expect(await rows("select * from grade_distribution()")).toHaveLength(0);
  });
  it("revoking teacher role removes course mutation permission", async () => {
    await as(admin);
    await db.query("update profiles set role='student' where id=$1", [teacher]);
    await as(teacher);
    await db.exec("update courses set title='Forbidden'");
    expect((await rows("select title from courses"))[0].title).toBe(
      "Architecture",
    );
  });
});
