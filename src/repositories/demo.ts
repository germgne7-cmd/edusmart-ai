import type { Repository, QueryOptions } from "./data";
import { AppError, type RecordData } from "../domain/models";
const now = new Date().toISOString();
const names = [
  [
    "Software architecture",
    "Бағдарламалық жасақтама архитектурасы",
    "Архитектура программного обеспечения",
  ],
  ["Artificial intelligence", "Жасанды интеллект", "Искусственный интеллект"],
  [
    "Data science foundations",
    "Деректер ғылымының негіздері",
    "Основы науки о данных",
  ],
  ["Interface design", "Интерфейс дизайны", "Дизайн интерфейсов"],
  ["Database systems", "Дерекқор жүйелері", "Системы баз данных"],
  ["Academic English", "Академиялық ағылшын тілі", "Академический английский"],
];
export function demoData(lang: string): Record<string, RecordData[]> {
  const k = lang === "kk" ? 1 : lang === "ru" ? 2 : 0;
  const courses = names.map((n, i) => ({
    id: "course-" + i,
    title: n[k],
    description: n[k],
    category: (lang === "kk"
      ? ["Инженерия", "ЖИ", "Деректер", "Дизайн"]
      : lang === "ru"
        ? ["Инженерия", "ИИ", "Данные", "Дизайн"]
        : ["Engineering", "AI", "Data", "Design"])[i % 4],
    difficulty: ["medium", "hard", "easy"][i % 3],
    duration: 24 + i * 6,
    status: "published",
    teacher_id: "demo-teacher",
    created_at: now,
  }));
  return {
    courses,
    enrollments: courses.slice(0, 4).map((c, i) => ({
      id: "enrollment-" + i,
      course_id: c.id,
      user_id: "demo",
      created_at: now,
    })),
    lessons: courses.flatMap((c, i) =>
      Array.from({ length: 5 }, (_, j) => ({
        id: `lesson-${i}-${j}`,
        course_id: c.id,
        title: `${c.title} · ${j + 1}`,
        content: `# ${c.title}\n\n${["Explore the foundational concepts. Compare approaches and discuss their applications.", "Негізгі ұғымдарды зерттеңіз. Тәсілдерді салыстырып, қолданылуын талқылаңыз.", "Изучите основные понятия. Сравните подходы и обсудите их применение."][k]}`,
        position: j,
        created_at: now,
      })),
    ),
    lesson_completions: Array.from({ length: 11 }, (_, i) => ({
      id: "completion-" + i,
      lesson_id: `lesson-${Math.floor(i / 4)}-${i % 4}`,
      user_id: "demo",
      created_at: new Date(Date.now() - (i % 7) * 86400000).toISOString(),
    })),
    assignments: courses.slice(0, 4).map((c, i) => ({
      id: "assignment-" + i,
      course_id: c.id,
      title: c.title,
      description: c.description,
      deadline: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
      created_at: now,
    })),
    submissions: [
      {
        id: "submission-1",
        assignment_id: "assignment-0",
        user_id: "demo",
        answer: "Demo",
        grade: 88,
        feedback: "",
        created_at: now,
      },
    ],
    documents: [],
    quizzes: [],
    quiz_attempts: [],
    calendar_events: [],
    notifications: [],
    ai_conversations: [],
    ai_messages: [],
    profiles: [
      {
        id: "demo",
        full_name:
          lang === "kk" ? "Айдана" : lang === "ru" ? "Айдана" : "Aidana",
        role: "student",
        language: lang,
        bio: "",
        created_at: now,
      },
    ],
    activity: [],
  };
}
export class DemoRepository implements Repository {
  constructor(private lang: string) {}
  async list(t: string, o: QueryOptions = {}) {
    const data = demoData(this.lang);
    if (t === "course_progress")
      return data.enrollments.map((e) => {
        const ls = data.lessons.filter((l) => l.course_id === e.course_id);
        const count = ls.filter((l) =>
          data.lesson_completions.some((c) => c.lesson_id === l.id),
        ).length;
        return {
          id: e.course_id,
          course_id: e.course_id,
          total_lessons: ls.length,
          completed_lessons: count,
          progress: ls.length ? Math.round((count / ls.length) * 100) : 0,
        };
      });
    return (data[t] || []).filter(
      (r) =>
        (!o.search ||
          String(r.title || r.name || r.full_name || "")
            .toLowerCase()
            .includes(o.search.toLowerCase())) &&
        (!o.category || r.category === o.category) &&
        (!o.courseId || r.course_id === o.courseId) &&
        (!o.documentId || r.document_id === o.documentId) &&
        (!o.conversationId || r.conversation_id === o.conversationId) &&
        (!o.fileType || r.name?.toLowerCase().endsWith("." + o.fileType)),
    );
  }
  async get(t: string, id: string) {
    const r = (await this.list(t)).find((x) => x.id === id);
    if (!r) throw new AppError("notFound");
    return r;
  }
  async save(): Promise<RecordData> {
    throw new AppError("noDemoWrite");
  }
  async remove(): Promise<void> {
    throw new AppError("noDemoWrite");
  }
}
