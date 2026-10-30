import { supabase } from "../lib/supabase";
import { AppError, type RecordData } from "../domain/models";
export interface QueryOptions {
  search?: string;
  category?: string;
  difficulty?: string;
  sort?: "title" | "newest";
  courseId?: string;
  documentId?: string;
  assignmentId?: string;
  conversationId?: string;
  from?: string;
  to?: string;
  fileType?: string;
  unread?: boolean;
  graded?: boolean;
}
export interface Repository {
  list(table: string, options?: QueryOptions): Promise<RecordData[]>;
  get(table: string, id: string): Promise<RecordData>;
  save(table: string, data: Record<string, unknown>): Promise<RecordData>;
  remove(table: string, id: string): Promise<void>;
}
const tables = new Set([
  "profiles",
  "courses",
  "enrollments",
  "lessons",
  "lesson_completions",
  "assignments",
  "submissions",
  "documents",
  "document_analyses",
  "quizzes",
  "quiz_attempts",
  "calendar_events",
  "notifications",
  "ai_conversations",
  "ai_messages",
  "activity",
]);
function client(table: string) {
  if (!tables.has(table)) throw new AppError("accessDenied");
  if (!supabase) throw new AppError("configError");
  return supabase;
}
// Escape SQL LIKE metacharacters; values remain bound by PostgREST, never interpolated SQL.
const literal = (value: string) => value.replace(/[\\%_]/g, "\\$&");
export class SupabaseRepository implements Repository {
  private query(table: string) {
    return client(table).from(table).select("*");
  }
  private async result(query: PromiseLike<{ data: unknown; error: unknown }>) {
    const { data, error } = await query;
    if (error) throw error;
    return data as RecordData[];
  }
  findCourses(o: QueryOptions = {}) {
    let q = this.query("courses");
    if (o.search) q = q.ilike("title", `%${literal(o.search)}%`);
    if (o.category) q = q.eq("category", o.category);
    if (o.difficulty) q = q.eq("difficulty", o.difficulty);
    return this.result(
      q.order(o.sort === "title" ? "title" : "created_at", {
        ascending: o.sort === "title",
      }),
    );
  }
  findEnrollments(o: QueryOptions = {}) {
    let q = this.query("enrollments");
    if (o.courseId) q = q.eq("course_id", o.courseId);
    return this.result(q.order("created_at", { ascending: false }));
  }
  findLessons(o: QueryOptions = {}) {
    let q = this.query("lessons");
    if (o.courseId) q = q.eq("course_id", o.courseId);
    if (o.search) q = q.ilike("title", `%${literal(o.search)}%`);
    return this.result(q.order("position", { ascending: true }));
  }
  findCompletions(o: QueryOptions = {}) {
    let q = this.query("lesson_completions");
    if (o.from) q = q.gte("created_at", o.from);
    return this.result(q.order("created_at", { ascending: false }));
  }
  findAssignments(o: QueryOptions = {}) {
    let q = this.query("assignments");
    if (o.courseId) q = q.eq("course_id", o.courseId);
    if (o.search) q = q.ilike("title", `%${literal(o.search)}%`);
    if (o.from) q = q.gte("deadline", o.from);
    return this.result(q.order("deadline", { ascending: true }));
  }
  findSubmissions(o: QueryOptions = {}) {
    let q = this.query("submissions");
    if (o.assignmentId) q = q.eq("assignment_id", o.assignmentId);
    if (o.graded === true) q = q.not("grade", "is", null);
    if (o.graded === false) q = q.is("grade", null);
    return this.result(q.order("created_at", { ascending: false }));
  }
  findDocuments(o: QueryOptions = {}) {
    let q = this.query("documents");
    if (o.search) q = q.ilike("name", `%${literal(o.search)}%`);
    if (o.fileType) q = q.ilike("name", `%.${literal(o.fileType)}`);
    return this.result(
      q.order(o.sort === "title" ? "name" : "created_at", {
        ascending: o.sort === "title",
      }),
    );
  }
  findAnalyses(o: QueryOptions = {}) {
    let q = this.query("document_analyses");
    if (o.documentId) q = q.eq("document_id", o.documentId);
    return this.result(q.order("created_at", { ascending: false }));
  }
  findQuizzes(o: QueryOptions = {}) {
    let q = this.query("quizzes");
    if (o.documentId) q = q.eq("document_id", o.documentId);
    if (o.courseId) q = q.eq("course_id", o.courseId);
    if (o.difficulty) q = q.eq("difficulty", o.difficulty);
    return this.result(q.order("created_at", { ascending: false }));
  }
  findAttempts(o: QueryOptions = {}) {
    let q = this.query("quiz_attempts");
    if (o.from) q = q.gte("created_at", o.from);
    if (o.to) q = q.lte("created_at", o.to);
    return this.result(q.order("created_at", { ascending: false }));
  }
  findEvents(o: QueryOptions = {}) {
    let q = this.query("calendar_events");
    if (o.from) q = q.gte("start_at", o.from);
    if (o.to) q = q.lte("start_at", o.to);
    return this.result(q.order("start_at", { ascending: true }));
  }
  findProfiles(o: QueryOptions = {}) {
    let q = this.query("profiles");
    if (o.search) q = q.ilike("full_name", `%${literal(o.search)}%`);
    return this.result(q.order("full_name", { ascending: true }));
  }
  findNotifications(o: QueryOptions = {}) {
    let q = this.query("notifications");
    if (o.unread) q = q.eq("read", false);
    return this.result(q.order("created_at", { ascending: false }));
  }
  findConversations(o: QueryOptions = {}) {
    let q = this.query("ai_conversations");
    if (o.documentId) q = q.eq("document_id", o.documentId);
    return this.result(q.order("created_at", { ascending: false }));
  }
  findMessages(o: QueryOptions = {}) {
    let q = this.query("ai_messages");
    if (o.conversationId) q = q.eq("conversation_id", o.conversationId);
    return this.result(q.order("sequence", { ascending: true }));
  }
  findActivity(o: QueryOptions = {}) {
    let q = this.query("activity");
    if (o.from) q = q.gte("created_at", o.from);
    return this.result(q.order("created_at", { ascending: false }));
  }
  async courseProgress() {
    const { data, error } = await client("courses").rpc("course_progress");
    if (error) throw error;
    return data.map((r: RecordData) => ({ ...r, id: r.course_id }));
  }
  async gradeDistribution() {
    const { data, error } =
      await client("submissions").rpc("grade_distribution");
    if (error) throw error;
    return data.map((r: RecordData) => ({ ...r, id: String(r.bucket) }));
  }
  async weeklyLearningActivity() {
    const { data, error } = await client("lesson_completions").rpc(
      "weekly_learning_activity",
    );
    if (error) throw error;
    return data.map((r: RecordData) => ({ ...r, id: r.day }));
  }
  async list(table: string, o: QueryOptions = {}) {
    const methods: Record<string, (o: QueryOptions) => Promise<RecordData[]>> =
      {
        course_progress: this.courseProgress,
        grade_distribution: this.gradeDistribution,
        weekly_learning_activity: this.weeklyLearningActivity,
        courses: this.findCourses,
        enrollments: this.findEnrollments,
        lessons: this.findLessons,
        lesson_completions: this.findCompletions,
        assignments: this.findAssignments,
        submissions: this.findSubmissions,
        documents: this.findDocuments,
        document_analyses: this.findAnalyses,
        quizzes: this.findQuizzes,
        quiz_attempts: this.findAttempts,
        calendar_events: this.findEvents,
        profiles: this.findProfiles,
        notifications: this.findNotifications,
        ai_conversations: this.findConversations,
        ai_messages: this.findMessages,
        activity: this.findActivity,
      };
    if (!methods[table]) throw new AppError("accessDenied");
    return methods[table].call(this, o);
  }
  async get(table: string, id: string) {
    const { data, error } = await client(table)
      .from(table)
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as RecordData;
  }
  async save(table: string, data: Record<string, unknown>) {
    const db = client(table).from(table);
    const q = data.id ? db.update(data).eq("id", data.id) : db.insert(data);
    const { data: record, error } = await q.select().single();
    if (error) throw error;
    return record as RecordData;
  }
  async remove(table: string, id: string) {
    const { error } = await client(table).from(table).delete().eq("id", id);
    if (error) throw error;
  }
}
export const repository = new SupabaseRepository();
