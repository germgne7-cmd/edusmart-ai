export type Role = "student" | "teacher" | "admin";
export interface RecordData {
  id: string;
  [key: string]: any;
}
export interface Profile extends RecordData {
  full_name: string;
  role: Role;
  language: string;
  bio: string;
}
export interface Course extends RecordData {
  title: string;
  description: string;
  teacher_id: string;
  category: string;
  difficulty: string;
  duration: number;
  status: string;
  created_at: string;
}
export interface Question {
  id?: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}
export class AppError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
