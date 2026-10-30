import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registrationSchema,
  courseSchema,
  validateFile,
  validateDeadline,
  scoreQuiz,
  requireRole,
  quizSchema,
} from "../src/domain/rules";
import type { Question } from "../src/domain/models";
import { LearningService } from "../src/services/learning";
import type { Repository } from "../src/repositories/data";
const q: Question = {
  question: "What is encapsulation?",
  options: ["A", "B", "C", "D"],
  correct_answer: 1,
  explanation: "Hide internal details.",
};
describe("domain validation", () => {
  it("accepts valid credentials", () =>
    expect(
      loginSchema.safeParse({ email: "a@edu.kz", password: "secure123" })
        .success,
    ).toBe(true));
  it.each(["", "foo", "a@"])("rejects invalid email %s", (email) =>
    expect(
      loginSchema.safeParse({ email, password: "secure123" }).success,
    ).toBe(false),
  );
  it("rejects weak password", () =>
    expect(
      loginSchema.safeParse({ email: "a@edu.kz", password: "abc" }).success,
    ).toBe(false));
  it("registration cannot elevate privileges", () =>
    expect(
      registrationSchema.parse({
        full_name: "Student",
        email: "a@edu.kz",
        password: "secure123",
        role: "admin",
      }),
    ).not.toHaveProperty("role"));
  it("requires profile name", () =>
    expect(
      registrationSchema.safeParse({
        full_name: "",
        email: "a@edu.kz",
        password: "secure123",
      }).success,
    ).toBe(false));
  it("validates course duration", () =>
    expect(
      courseSchema.safeParse({
        title: "Course",
        description: "Description",
        category: "AI",
        difficulty: "easy",
        duration: -1,
        status: "published",
      }).success,
    ).toBe(false));
  it.each(["pdf", "docx", "txt", "PDF"])("accepts %s files", (ext) =>
    expect(() =>
      validateFile({ name: "lecture." + ext, size: 100 }),
    ).not.toThrow(),
  );
  it.each([
    { name: "x.exe", size: 30 },
    { name: "x.pdf", size: 0 },
    { name: "x.txt", size: 10485761 },
  ])("rejects invalid file %o", (file) =>
    expect(() => validateFile(file)).toThrow("invalidFile"),
  );
  it("rejects past deadline", () =>
    expect(() => validateDeadline("2000-01-01")).toThrow("expired"));
  it("rejects invalid deadline", () =>
    expect(() => validateDeadline("bad")).toThrow("expired"));
  it("accepts future deadline", () =>
    expect(() => validateDeadline("2099-01-01")).not.toThrow());
  it("scores answers correctly", () =>
    expect(scoreQuiz([q, { ...q, correct_answer: 0 }], [1, 1])).toEqual({
      correct: 1,
      total: 2,
      score: 50,
    }));
  it("rejects incomplete answers", () =>
    expect(() => scoreQuiz([q], [])).toThrow());
  it("rejects out-of-range answers", () =>
    expect(() => scoreQuiz([q], [4])).toThrow());
  it("rejects invalid AI questions", () =>
    expect(
      quizSchema.safeParse(Array(5).fill({ ...q, options: ["A"] })).success,
    ).toBe(false));
  it("accepts structured AI questions", () =>
    expect(quizSchema.safeParse(Array(5).fill(q)).success).toBe(true));
  it("denies student teacher actions", () =>
    expect(() => requireRole("student", ["teacher", "admin"])).toThrow(
      "accessDenied",
    ));
  it("allows teachers", () =>
    expect(() => requireRole("teacher", ["teacher", "admin"])).not.toThrow());
});
function memory(): Repository {
  const data: Record<string, any[]> = {
    enrollments: [],
    assignments: [{ id: "a", deadline: "2099-01-01" }],
    submissions: [],
  };
  return {
    async list(t) {
      return data[t] || [];
    },
    async get(t, id) {
      return data[t].find((x) => x.id === id);
    },
    async save(t, v) {
      const r = { id: String(Math.random()), ...v };
      data[t] ??= [];
      data[t].push(r);
      return r;
    },
    async remove(t, id) {
      data[t] = data[t].filter((x) => x.id !== id);
    },
  };
}
describe("service and repository integration", () => {
  it("enrolls and persists through injected repository", async () => {
    const r = memory();
    await new LearningService(r).enroll("u", "c");
    expect(await r.list("enrollments")).toHaveLength(1);
  });
  it("prevents duplicate enrollment", async () => {
    const s = new LearningService(memory());
    await s.enroll("u", "c");
    await expect(s.enroll("u", "c")).rejects.toThrow("enrolled");
  });
  it("persists student answer", async () => {
    const r = memory();
    await new LearningService(r).submit("a", "u", "My answer");
    expect((await r.list("submissions"))[0].answer).toBe("My answer");
  });
  it("rejects blank submission", async () =>
    await expect(
      new LearningService(memory()).submit("a", "u", " "),
    ).rejects.toThrow("required"));
  it.each([-1, 101, NaN])(
    "rejects grade %s",
    async (grade) =>
      await expect(
        new LearningService(memory()).grade("s", grade, ""),
      ).rejects.toThrow("invalidNumber"),
  );
});
