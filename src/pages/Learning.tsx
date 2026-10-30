import { useAction, DataGuard } from "../hooks/data";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  BookOpen,
  CheckCircle2,
  ArrowUpRight,
  ArrowRight,
  Clock,
  Sparkles,
  Files,
  MessageSquare,
  Target,
  TrendingUp,
  MoreHorizontal,
  Plus,
  GraduationCap,
  CalendarDays,
} from "lucide-react";
import { useApp, useRecords } from "../app/context";
import {
  Button,
  Card,
  Badge,
  Empty,
  PageTitle,
  SectionTitle,
  Loading,
  Modal,
} from "../components/ui";
import { LearningService } from "../services/learning";
import { DocumentService } from "../services/documents";
import type { RecordData } from "../domain/models";
import { courseSchema, validateFile } from "../domain/rules";
import { supabase } from "../lib/supabase";
export function CourseCard({
  course,
  progress,
}: {
  course: RecordData;
  progress?: number;
}) {
  const { t } = useTranslation();
  const colors = ["blue", "violet", "mint", "amber"];
  const color = colors[course.title.length % 4];
  return (
    <Card className="course-card">
      <Link className={"course-cover " + color} to={"/app/course/" + course.id}>
        {course.cover_url && (
          <img
            className="course-image"
            src={course.cover_url}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <span className="cover-no">EDU / {course.category}</span>
        <div className="cover-glyph">
          <GraduationCap size={54} strokeWidth={1} />
        </div>
        <span className="cover-caption">{t("course")}</span>
        <ArrowUpRight size={22} />
      </Link>
      <div className="course-body">
        <div className="course-meta">
          <Badge>{course.category}</Badge>
          <span>
            <Clock size={12} />
            {course.duration} {t("hoursShort")}
          </span>
        </div>
        <Link to={"/app/course/" + course.id}>
          <h3>{course.title}</h3>
        </Link>
        <p className="muted">{t(course.difficulty)}</p>
        {progress !== undefined ? (
          <>
            <div className="progress-info">
              <span>{t("progress")}</span>
              <strong>{progress}%</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: progress + "%" }} />
            </div>
          </>
        ) : (
          <Link className="course-link" to={"/app/course/" + course.id}>
            {t("continue")}
            <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </Card>
  );
}
export function Dashboard({ teacher = false }: { teacher?: boolean }) {
  const { t, i18n } = useTranslation();
  const { profile } = useApp();
  const courses = useRecords("courses"),
    enrollments = useRecords("enrollments"),
    lessons = useRecords("lessons"),
    completions = useRecords("lesson_completions"),
    assignments = useRecords("assignments"),
    submissions = useRecords("submissions"),
    attempts = useRecords("quiz_attempts");
  const mine = (courses.data || []).filter((c) =>
    teacher
      ? c.teacher_id === profile?.id
      : (enrollments.data || []).some((e) => e.course_id === c.id),
  );
  const grades = [
    ...(submissions.data || [])
      .filter((s) => s.grade !== null)
      .map((s) => Number(s.grade)),
    ...(attempts.data || []).map((a) => a.score),
  ];
  const completed = (completions.data || []).length;
  const totalLessons = (lessons.data || []).length;
  const getProgress = (id: string) => {
    const l = (lessons.data || []).filter((l) => l.course_id === id);
    return l.length
      ? Math.round(
          (l.filter((l) =>
            (completions.data || []).some((c) => c.lesson_id === l.id),
          ).length /
            l.length) *
            100,
        )
      : 0;
  };
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + i);
    return {
      name: date.toLocaleDateString(i18n.language, { weekday: "short" }),
      [t("activity")]: (completions.data || []).filter(
        (c) => c.created_at.slice(0, 10) === date.toISOString().slice(0, 10),
      ).length,
    };
  });
  const upcoming = (assignments.data || [])
    .filter((a) => Date.parse(a.deadline) > Date.now())
    .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline))
    .slice(0, 3);
  return (
    <>
      <PageTitle
        title={`${t("greeting")}, ${profile?.full_name.split(" ")[0] || ""} 👋`}
        subtitle={t("subtitle")}
      >
        <div className="date-pill">
          <CalendarDays size={17} />
          {new Date().toLocaleDateString(i18n.language, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </PageTitle>
      <DataGuard
        queries={[
          courses,
          enrollments,
          lessons,
          completions,
          submissions,
          assignments,
          attempts,
        ]}
      >
        <div className="stats-grid">
          {(
            [
              [
                BookOpen,
                "activeCourses",
                teacher ? courses.data?.length || 0 : mine.length,
              ],
              [CheckCircle2, "lessonProgress", completed],
              [
                Target,
                "averageGrade",
                grades.length
                  ? Math.round(
                      grades.reduce((a, b) => a + b, 0) / grades.length,
                    ) + "%"
                  : "—",
              ],
              [
                TrendingUp,
                "progress",
                totalLessons
                  ? Math.round((completed / totalLessons) * 100) + "%"
                  : "0%",
              ],
            ] as const
          ).map(([Icon, label, value], i) => (
            <Card className="stat-card" key={label as string}>
              <div className={"stat-icon stat-" + i}>
                <Icon size={21} />
              </div>
              <span className="stat-value">{value as string}</span>
              <p>{t(label as string)}</p>
            </Card>
          ))}
        </div>
        <div className="dashboard-grid">
          <div>
            <SectionTitle title={t("courses")}>
              <Link to="/app/courses">{t("viewAll")}</Link>
            </SectionTitle>
            {mine.length ? (
              <div className="course-grid two">
                {mine.slice(0, 2).map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    progress={getProgress(c.id)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <Empty>
                  <Link
                    className="button primary"
                    to={teacher ? "/app/manageCourses" : "/app/catalog"}
                  >
                    {t(teacher ? "create" : "catalog")}
                    <ArrowRight size={16} />
                  </Link>
                </Empty>
              </Card>
            )}
            <Card className="activity-card">
              <SectionTitle title={t("weeklyActivity")}>
                <span>{t("week")}</span>
              </SectionTitle>
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={days}>
                    <defs>
                      <linearGradient
                        id="activityFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#5369ec"
                          stopOpacity={0.24}
                        />
                        <stop
                          offset="100%"
                          stopColor="#5369ec"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--border)"
                      strokeDasharray="3 5"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#8b91a8" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      width={25}
                      tick={{ fontSize: 11, fill: "#8b91a8" }}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey={t("activity")}
                      stroke="#5369ec"
                      strokeWidth={3}
                      fill="url(#activityFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <div className="dashboard-right">
            <Card className="ai-promo">
              <div className="promo-head">
                <span className="icon-tile">
                  <Sparkles size={23} />
                </span>
                <Badge>AI</Badge>
              </div>
              <h2>{t("quickTools")}</h2>
              <p>{t("quickBody")}</p>
              {[
                ["analyzer", Files],
                ["quizzes", CheckCircle2],
                ["assistant", MessageSquare],
              ].map(([key, Icon]) => (
                <Link to={"/app/" + key} key={key as string}>
                  <Icon size={17} />
                  <span>{t(key as string)}</span>
                  <ArrowUpRight size={17} />
                </Link>
              ))}
            </Card>
            <Card className="deadline-card">
              <SectionTitle title={t("upcoming")}>
                <Link to="/app/calendar">{t("viewAll")}</Link>
              </SectionTitle>
              {upcoming.length ? (
                upcoming.map((a, i) => (
                  <Link
                    key={a.id}
                    className="deadline-item"
                    to={"/app/assignment/" + a.id}
                  >
                    <span className={"deadline-marker marker-" + i}>
                      <ClipboardIcon />
                    </span>
                    <div>
                      <strong>{a.title}</strong>
                      <small>
                        {new Date(a.deadline).toLocaleDateString(
                          i18n.language,
                          { day: "numeric", month: "short" },
                        )}
                      </small>
                    </div>
                    <ArrowUpRight size={16} />
                  </Link>
                ))
              ) : (
                <Empty />
              )}
            </Card>
            <div className="learning-note">
              <div className="note-orb">✧</div>
              <p>{t("heroAccent")}</p>
              <span>EduSmart AI</span>
            </div>
          </div>
        </div>
      </DataGuard>
    </>
  );
}
function ClipboardIcon() {
  return <CalendarDays size={18} />;
}
export function Courses({ catalog = false }: { catalog?: boolean }) {
  const { t } = useTranslation();
  const { profile } = useApp();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || ""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("newest");
  const courses = useRecords("courses", {
      search,
      category,
      sort: sort as "title" | "newest",
    }),
    enrollments = useRecords("enrollments"),
    progress = useRecords("course_progress");
  const list = (courses.data || [])
    .filter(
      (c) =>
        (catalog ||
          (enrollments.data || []).some(
            (e) => e.user_id === profile?.id && e.course_id === c.id,
          )) &&
        (!category || c.category === category) &&
        c.title.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : Date.parse(b.created_at) - Date.parse(a.created_at),
    );
  return (
    <>
      <PageTitle
        title={t(catalog ? "catalog" : "courses")}
        subtitle={t("featureCourses")}
      />
      <div className="toolbar">
        <input
          aria-label={t("search")}
          placeholder={t("search") + "…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label={t("category")}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">{t("all")}</option>
          {Array.from(new Set((courses.data || []).map((c) => c.category))).map(
            (c) => (
              <option key={c}>{c}</option>
            ),
          )}
        </select>
        <select
          aria-label={t("sort")}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">{t("newest")}</option>
          <option value="title">{t("title")}</option>
        </select>
      </div>
      <DataGuard queries={[courses, enrollments, progress]}>
        {list.length ? (
          <div className="course-grid">
            {list.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                progress={
                  catalog
                    ? undefined
                    : progress.data?.find((p) => p.course_id === c.id)?.progress
                }
              />
            ))}
          </div>
        ) : (
          <Card>
            <Empty>
              <Link to="/app/catalog">{t("catalog")} →</Link>
            </Empty>
          </Card>
        )}
      </DataGuard>
    </>
  );
}
export function CourseDetails() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { repo, profile } = useApp();
  const courses = useRecords("courses"),
    lessons = useRecords("lessons"),
    enrollments = useRecords("enrollments");
  const { run, busy } = useAction();
  const c = courses.data?.find((c) => c.id === id);
  const enrolled = enrollments.data?.some(
    (e) => e.course_id === id && e.user_id === profile?.id,
  );
  return (
    <DataGuard queries={[courses, lessons, enrollments]}>
      {c ? (
        <>
          <PageTitle title={c.title} subtitle={c.description}>
            <Badge>{c.category}</Badge>
          </PageTitle>
          <div className="detail-grid">
            <Card>
              <div className="course-description">
                <h2>{t("about")}</h2>
                <p>{c.description}</p>
                <div className="detail-badges">
                  <Badge>{t(c.difficulty)}</Badge>
                  <Badge>
                    {c.duration} {t("hoursShort")}
                  </Badge>
                </div>
              </div>
              <h2>{t("lessons")}</h2>
              {(lessons.data || [])
                .filter((l) => l.course_id === id)
                .sort((a, b) => a.position - b.position)
                .map((l, i) => (
                  <Link
                    className="list-item"
                    key={l.id}
                    to={"/app/lesson/" + l.id}
                  >
                    <span className="number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <strong>{l.title}</strong>
                    <ArrowRight size={18} />
                  </Link>
                ))}
              {!(lessons.data || []).some((l) => l.course_id === id) && (
                <Empty />
              )}
            </Card>
            <Card className="enroll-card">
              <span className="icon-tile">
                <BookOpen />
              </span>
              <h2>{c.title}</h2>
              <p>{t("featureCourses")}</p>
              <Button
                disabled={busy || enrolled}
                onClick={() =>
                  run(() => new LearningService(repo).enroll(profile!.id, id!))
                }
              >
                {t(enrolled ? "enrolled" : "enroll")}
                <ArrowRight size={17} />
              </Button>
            </Card>
          </div>
        </>
      ) : (
        <Empty />
      )}
    </DataGuard>
  );
}
export function Lesson() {
  const { id } = useParams();
  const { t } = useTranslation();
  const lessons = useRecords("lessons"),
    completions = useRecords("lesson_completions");
  const { repo, profile } = useApp();
  const { run, busy } = useAction();
  const lesson = lessons.data?.find((l) => l.id === id);
  return (
    <DataGuard queries={[lessons, completions]}>
      {lesson ? (
        <>
          <PageTitle title={lesson.title}>
            <Link to={"/app/course/" + lesson.course_id}>{t("back")}</Link>
          </PageTitle>
          <Card>
            <article className="markdown">
              <ReactMarkdown>{lesson.content}</ReactMarkdown>
            </article>
            {lesson.material_path && (
              <Button
                variant="secondary"
                onClick={() =>
                  run(async () => {
                    const { data, error } = await supabase!.storage
                      .from("materials")
                      .createSignedUrl(lesson.material_path, 60);
                    if (error) throw error;
                    window.open(
                      data.signedUrl,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  })
                }
              >
                {t("download")}
              </Button>
            )}
            <Button
              disabled={
                busy ||
                completions.data?.some(
                  (c) => c.lesson_id === id && c.user_id === profile?.id,
                )
              }
              onClick={() =>
                run(() => new LearningService(repo).complete(id!, profile!.id))
              }
            >
              {t(
                completions.data?.some(
                  (c) => c.lesson_id === id && c.user_id === profile?.id,
                )
                  ? "completed"
                  : "markComplete",
              )}
              <CheckCircle2 size={17} />
            </Button>
          </Card>
        </>
      ) : (
        <Empty />
      )}
    </DataGuard>
  );
}
export function Assignments() {
  const { t, i18n } = useTranslation();
  const assignments = useRecords("assignments"),
    submissions = useRecords("submissions");
  const [status, setStatus] = useState("all");
  const list = (assignments.data || []).filter(
    (a) =>
      status === "all" ||
      (status === "submitted") ===
        (submissions.data || []).some((s) => s.assignment_id === a.id),
  );
  return (
    <>
      <PageTitle title={t("assignments")} />
      <div className="tabs">
        {["all", "pending", "submitted"].map((k) => (
          <button
            className={status === k ? "active" : ""}
            key={k}
            onClick={() => setStatus(k)}
          >
            {t(k)}
          </button>
        ))}
      </div>
      <DataGuard queries={[assignments, submissions]}>
        <Card>
          {list.length ? (
            list.map((a) => (
              <Link
                className="list-item"
                to={"/app/assignment/" + a.id}
                key={a.id}
              >
                <span className="icon-tile">
                  <BookOpen size={20} />
                </span>
                <div>
                  <h3>{a.title}</h3>
                  <p>
                    {t("deadline")}:{" "}
                    {new Date(a.deadline).toLocaleString(i18n.language)}
                  </p>
                </div>
                <Badge>
                  {t(
                    submissions.data?.some((s) => s.assignment_id === a.id)
                      ? "submitted"
                      : "pending",
                  )}
                </Badge>
                <ArrowUpRight size={18} />
              </Link>
            ))
          ) : (
            <Empty />
          )}
        </Card>
      </DataGuard>
    </>
  );
}
export function AssignmentDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const assignments = useRecords("assignments"),
    submissions = useRecords("submissions");
  const { repo, profile } = useApp();
  const { run, busy } = useAction();
  const [answer, setAnswer] = useState(""),
    [file, setFile] = useState<File | null>(null);
  const a = assignments.data?.find((x) => x.id === id),
    s = submissions.data?.find(
      (x) => x.assignment_id === id && x.user_id === profile?.id,
    );
  return (
    <DataGuard queries={[assignments, submissions]}>
      {a ? (
        <>
          <PageTitle
            title={a.title}
            subtitle={`${t("deadline")}: ${new Date(a.deadline).toLocaleString(i18n.language)}`}
          />
          <div className="detail-grid">
            <Card>
              <article className="markdown">
                <ReactMarkdown>{a.description}</ReactMarkdown>
              </article>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    let path: string | undefined;
                    if (file) {
                      validateFile(file);
                      path = `${profile!.id}/${crypto.randomUUID()}.${file.name.split(".").pop()}`;
                      const { error } = await supabase!.storage
                        .from("documents")
                        .upload(path, file);
                      if (error) throw error;
                    }
                    await new LearningService(repo).submit(
                      id!,
                      profile!.id,
                      answer,
                      path,
                    );
                  });
                }}
              >
                <label>
                  {t("answer")}
                  <textarea
                    required={!file}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={7}
                  />
                </label>
                <label>
                  {t("file")}
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
                <Button
                  disabled={busy || !!s || Date.parse(a.deadline) < Date.now()}
                >
                  {t("submit")}
                </Button>
              </form>
            </Card>
            <Card>
              <h2>{t("status")}</h2>
              <Badge>{t(s ? "submitted" : "pending")}</Badge>
              {s && (
                <>
                  <p>{s.answer}</p>
                  {s.attachment_path && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        run(() =>
                          new DocumentService(repo).download(s.attachment_path),
                        )
                      }
                    >
                      {t("download")}
                    </Button>
                  )}
                  <h3>{t("grade")}</h3>
                  <strong className="big-number">{s.grade ?? "—"}</strong>
                  <h3>{t("feedback")}</h3>
                  <p>{s.feedback || "—"}</p>
                </>
              )}
            </Card>
          </div>
        </>
      ) : (
        <Empty />
      )}
    </DataGuard>
  );
}
export function Analytics({
  gradesOnly = false,
  teacher = false,
}: {
  gradesOnly?: boolean;
  teacher?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { repo, profile } = useApp();
  const { run, busy } = useAction();
  const [removing, setRemoving] = useState<RecordData | null>(null);
  const enrollments = useRecords("enrollments");
  const subs = useRecords("submissions"),
    attempts = useRecords("quiz_attempts"),
    courses = useRecords("courses"),
    assignments = useRecords("assignments"),
    quizzes = useRecords("quizzes"),
    profiles = useRecords("profiles");
  const [studentUser, setStudentUser] = useState("");
  const [course, setCourse] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const rows: RecordData[] = [
    ...(subs.data || [])
      .filter((s) => s.grade !== null)
      .map((s) => ({
        ...s,
        score: s.grade,
        course_id: assignments.data?.find((a) => a.id === s.assignment_id)
          ?.course_id,
        title:
          assignments.data?.find((a) => a.id === s.assignment_id)?.title ||
          t("assignments"),
      })),
    ...(attempts.data || []).map((a) => ({
      ...a,
      course_id: quizzes.data?.find((q) => q.id === a.quiz_id)?.course_id,
      title:
        quizzes.data?.find((q) => q.id === a.quiz_id)?.title || t("quizzes"),
    })),
  ].filter(
    (r: RecordData) =>
      (!course || r.course_id === course) &&
      (!studentUser || r.user_id === studentUser) &&
      (!from || r.created_at >= from) &&
      (!to || r.created_at.slice(0, 10) <= to),
  );
  const average = rows.length
    ? Math.round(rows.reduce((n, r) => n + Number(r.score), 0) / rows.length)
    : 0;
  return (
    <>
      <PageTitle
        title={t(teacher ? "students" : gradesOnly ? "grades" : "analytics")}
      />
      <div className="toolbar">
        {teacher && (
          <select
            aria-label={t("student")}
            value={studentUser}
            onChange={(e) => setStudentUser(e.target.value)}
          >
            <option value="">{t("all")}</option>
            {profiles.data
              ?.filter((p) => p.role === "student")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
          </select>
        )}
        <select
          aria-label={t("course")}
          value={course}
          onChange={(e) => setCourse(e.target.value)}
        >
          <option value="">{t("all")}</option>
          {courses.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <label>
          {t("filterFrom")}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          {t("filterTo")}
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <DataGuard queries={[subs, attempts, courses, assignments, quizzes]}>
        <div className="stats-grid">
          <Card>
            <p>{t("averageGrade")}</p>
            <strong className="big-number">
              {rows.length ? average + "%" : "—"}
            </strong>
          </Card>
          <Card>
            <p>{t("completed")}</p>
            <strong className="big-number">{rows.length}</strong>
          </Card>
        </div>
        {!gradesOnly && (
          <Card>
            <h2>{t("score")}</h2>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows.map((r, i) => ({
                    name: String(i + 1),
                    [t("score")]: r.score,
                  }))}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 5" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar
                    dataKey={t("score")}
                    fill="#6271e5"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {!gradesOnly && (
          <div className="detail-grid">
            <Card>
              <h2>{t("distribution")}</h2>
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Array.from({ length: 5 }, (_, i) => ({
                      name: `${i * 20}–${i === 4 ? 100 : i * 20 + 19}`,
                      [t("students")]: rows.filter(
                        (r) =>
                          Number(r.score) >= i * 20 &&
                          Number(r.score) < (i === 4 ? 101 : (i + 1) * 20),
                      ).length,
                    }))}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 5" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey={t("students")}
                      fill="#88b9a4"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <h2>{t("trends")}</h2>
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[...rows]
                      .sort(
                        (a, b) =>
                          Date.parse(a.created_at) - Date.parse(b.created_at),
                      )
                      .map((r) => ({
                        name: new Date(r.created_at).toLocaleDateString(
                          i18n.language,
                        ),
                        [t("score")]: r.score,
                      }))}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 5" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Area
                      dataKey={t("score")}
                      stroke="#7e8bda"
                      fill="#e5e9fb"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}
        <Card>
          {rows.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("title")}</th>
                    <th>{t("score")}</th>
                    <th>{t("calendar")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.title}</td>
                      <td>
                        <Badge>{r.score}%</Badge>
                      </td>
                      <td>
                        {new Date(r.created_at).toLocaleDateString(
                          i18n.language,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
        </Card>
        {teacher && (
          <Card>
            <h2>{t("students")}</h2>
            {enrollments.data
              ?.filter(
                (e) =>
                  (!course || e.course_id === course) &&
                  courses.data?.some(
                    (c) =>
                      c.id === e.course_id &&
                      (c.teacher_id === profile?.id ||
                        profile?.role === "admin"),
                  ),
              )
              .map((e) => (
                <div className="list-item" key={e.id}>
                  <div>
                    <h3>
                      {profiles.data?.find((p) => p.id === e.user_id)
                        ?.full_name || e.user_id}
                    </h3>
                    <p>
                      {courses.data?.find((c) => c.id === e.course_id)?.title}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    aria-label={t("delete")}
                    onClick={() => setRemoving(e)}
                  >
                    {t("delete")}
                  </Button>
                </div>
              ))}
          </Card>
        )}
        <Modal
          title={t("delete")}
          open={!!removing}
          onClose={() => setRemoving(null)}
        >
          <p>{t("confirmDelete")}</p>
          <Button
            disabled={busy}
            variant="danger"
            onClick={() =>
              run(() => repo.remove("enrollments", removing!.id)).then(
                (ok) => ok && setRemoving(null),
              )
            }
          >
            {t("delete")}
          </Button>
        </Modal>
      </DataGuard>
    </>
  );
}
