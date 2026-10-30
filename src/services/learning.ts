import type { Repository } from "../repositories/data";
import { AppError } from "../domain/models";
import { courseSchema, validateDeadline } from "../domain/rules";
export class LearningService {
  constructor(private repo: Repository) {}
  async enroll(userId: string, courseId: string) {
    const rows = await this.repo.list("enrollments");
    if (rows.some((r) => r.user_id === userId && r.course_id === courseId))
      throw new AppError("enrolled");
    return this.repo.save("enrollments", {
      user_id: userId,
      course_id: courseId,
    });
  }
  async saveCourse(input: unknown, teacherId: string, id?: string) {
    return this.repo.save("courses", {
      ...courseSchema.parse(input),
      teacher_id: teacherId,
      ...(id ? { id } : {}),
    });
  }
  async submit(
    assignmentId: string,
    userId: string,
    answer: string,
    filePath?: string,
  ) {
    if (!answer.trim() && !filePath) throw new AppError("required");
    const a = await this.repo.get("assignments", assignmentId);
    validateDeadline(a.deadline);
    return this.repo.save("submissions", {
      assignment_id: assignmentId,
      user_id: userId,
      answer,
      attachment_path: filePath || null,
    });
  }
  async grade(id: string, grade: number, feedback: string) {
    if (!Number.isFinite(grade) || grade < 0 || grade > 100)
      throw new AppError("invalidNumber");
    return this.repo.save("submissions", { id, grade, feedback });
  }
  async complete(lessonId: string, userId: string) {
    const old = await this.repo.list("lesson_completions");
    if (old.some((r) => r.lesson_id === lessonId && r.user_id === userId))
      return;
    return this.repo.save("lesson_completions", {
      lesson_id: lessonId,
      user_id: userId,
    });
  }
}
