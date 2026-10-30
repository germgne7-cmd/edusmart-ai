import { z } from "zod";
import { AppError, type Question, type Role } from "./models";
export const loginSchema = z.object({
  email: z.email("invalidEmail"),
  password: z.string().min(8, "shortPassword"),
});
export const registrationSchema = loginSchema.extend({
  full_name: z.string().trim().min(2, "required").max(120),
});
export const courseSchema = z.object({
  title: z.string().trim().min(3, "required").max(180),
  description: z.string().min(10, "required").max(10000),
  category: z.string().min(1, "required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  duration: z.coerce.number().positive("invalidNumber").max(1000),
  status: z.enum(["draft", "published"]),
  cover_url: z.union([z.literal(""), z.url()]).optional(),
});
export const questionSchema = z.object({
  question: z.string().min(5).max(2000),
  options: z.array(z.string().min(1).max(1000)).length(4),
  correct_answer: z.number().int().min(0).max(3),
  explanation: z.string().min(1).max(4000),
});
export const quizSchema = z.array(questionSchema).min(5).max(20);
export function scoreQuiz(questions: Question[], answers: number[]) {
  if (
    answers.length !== questions.length ||
    answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)
  )
    throw new AppError("required");
  const correct = questions.filter(
    (q, i) => q.correct_answer === answers[i],
  ).length;
  return {
    correct,
    total: questions.length,
    score: Math.round((correct / questions.length) * 100),
  };
}
export function validateFile(file: Pick<File, "name" | "size">) {
  if (
    !/\.(pdf|docx|txt)$/i.test(file.name) ||
    file.size === 0 ||
    file.size > 10 * 1024 * 1024
  )
    throw new AppError("invalidFile");
}
export function validateDeadline(deadline: string) {
  if (
    !Number.isFinite(Date.parse(deadline)) ||
    Date.parse(deadline) < Date.now()
  )
    throw new AppError("expired");
}
export function requireRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) throw new AppError("accessDenied");
}
export function safeMessage(e: unknown) {
  return e instanceof AppError ? e.code : "error";
}
