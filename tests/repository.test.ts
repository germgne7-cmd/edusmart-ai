import { beforeEach, describe, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({
  calls: [] as { method: string; args: unknown[] }[],
  rows: [{ id: "record" }],
  error: null as unknown,
}));
vi.mock("../src/lib/supabase", () => {
  const chain: any = {
    then: (resolve: any) =>
      Promise.resolve({ data: state.rows, error: state.error }).then(resolve),
  };
  for (const method of [
    "from",
    "select",
    "order",
    "ilike",
    "eq",
    "gte",
    "lte",
    "is",
    "not",
    "insert",
    "update",
    "delete",
    "single",
  ])
    chain[method] = (...args: unknown[]) => {
      state.calls.push({ method, args });
      return chain;
    };
  return { supabase: chain };
});
import { SupabaseRepository } from "../src/repositories/data";
let repo: SupabaseRepository;
beforeEach(() => {
  repo = new SupabaseRepository();
  state.calls = [];
  state.error = null;
});
describe("PostgREST repository query contracts", () => {
  it.each([
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
  ])("dispatches %s to a scoped query", async (table) => {
    expect(await repo.list(table)).toEqual(state.rows);
    expect(state.calls).toContainEqual({ method: "from", args: [table] });
  });
  it("filters course category and sorts alphabetically", async () => {
    await repo.findCourses({
      search: "100%_test",
      category: "AI",
      sort: "title",
    });
    expect(state.calls).toContainEqual({
      method: "ilike",
      args: ["title", "%100\\%\\_test%"],
    });
    expect(state.calls).toContainEqual({
      method: "eq",
      args: ["category", "AI"],
    });
    expect(state.calls).toContainEqual({
      method: "order",
      args: ["title", { ascending: true }],
    });
  });
  it("queries lessons in pedagogical order", async () => {
    await repo.findLessons({ courseId: "course" });
    expect(state.calls).toContainEqual({
      method: "eq",
      args: ["course_id", "course"],
    });
    expect(state.calls).toContainEqual({
      method: "order",
      args: ["position", { ascending: true }],
    });
  });
  it("filters upcoming assignments", async () => {
    await repo.findAssignments({ from: "2099-01-01" });
    expect(state.calls).toContainEqual({
      method: "gte",
      args: ["deadline", "2099-01-01"],
    });
  });
  it("filters ungraded submission review", async () => {
    await repo.findSubmissions({ assignmentId: "assignment", graded: false });
    expect(state.calls).toContainEqual({
      method: "eq",
      args: ["assignment_id", "assignment"],
    });
    expect(state.calls).toContainEqual({ method: "is", args: ["grade", null] });
  });
  it("filters private document name and extension", async () => {
    await repo.findDocuments({ search: "lecture", fileType: "pdf" });
    expect(state.calls).toContainEqual({
      method: "ilike",
      args: ["name", "%lecture%"],
    });
    expect(state.calls).toContainEqual({
      method: "ilike",
      args: ["name", "%.pdf"],
    });
  });
  it("limits calendar queries by range", async () => {
    await repo.findEvents({ from: "2026-01-01", to: "2026-02-01" });
    expect(state.calls).toContainEqual({
      method: "gte",
      args: ["start_at", "2026-01-01"],
    });
    expect(state.calls).toContainEqual({
      method: "lte",
      args: ["start_at", "2026-02-01"],
    });
  });
  it("filters unread notifications", async () => {
    await repo.findNotifications({ unread: true });
    expect(state.calls).toContainEqual({ method: "eq", args: ["read", false] });
  });
  it("scopes conversation history and chronological ordering", async () => {
    await repo.findMessages({ conversationId: "chat" });
    expect(state.calls).toContainEqual({
      method: "eq",
      args: ["conversation_id", "chat"],
    });
    expect(state.calls).toContainEqual({
      method: "order",
      args: ["sequence", { ascending: true }],
    });
  });
  it("searches user names with bound data", async () => {
    await repo.findProfiles({ search: "Aidana" });
    expect(state.calls).toContainEqual({
      method: "ilike",
      args: ["full_name", "%Aidana%"],
    });
  });
  it("rejects unsupported table before issuing query", async () => {
    await expect(repo.list("auth.users")).rejects.toThrow("accessDenied");
    expect(state.calls).toHaveLength(0);
  });
  it("propagates database failures", async () => {
    state.error = new Error("RLS denied");
    await expect(repo.findCourses()).rejects.toThrow("RLS denied");
  });
  it("updates only the supplied record id", async () => {
    await repo.save("courses", { id: "owned-course", title: "Edited" });
    expect(state.calls).toContainEqual({
      method: "eq",
      args: ["id", "owned-course"],
    });
  });
  it("inserts new records instead of accidental update", async () => {
    await repo.save("courses", { title: "New" });
    expect(state.calls).toContainEqual({
      method: "insert",
      args: [{ title: "New" }],
    });
    expect(state.calls.some((c) => c.method === "update")).toBe(false);
  });
  it("deletes by explicit record id", async () => {
    await repo.remove("documents", "doc");
    expect(state.calls).toContainEqual({ method: "eq", args: ["id", "doc"] });
  });
});
