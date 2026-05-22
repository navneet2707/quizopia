// User types
export type AppRole = 'head_admin' | 'admin' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// Quiz types
export interface Quiz {
  id: string;
  title: string;
  description: string;
  duration: number;
  quizType: 'single' | 'multiple';
  maxAttempts: number;
  difficulty: 'easy' | 'medium' | 'hard';
  createdBy: string;
  createdAt: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  questionCount?: number;
  creatorName?: string;
}

export interface Question {
  id: string;
  quizId: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  correctOptions?: ('A' | 'B' | 'C' | 'D')[];
}

export interface QuestionWithAnswer extends Question {
  selectedAnswer?: 'A' | 'B' | 'C' | 'D' | null;
  selectedAnswers?: ('A' | 'B' | 'C' | 'D')[];
  shuffledOptions?: ('A' | 'B' | 'C' | 'D')[];
}

// Result types
export interface Result {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  quizTitle?: string;
  userName?: string;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: AppRole;
}

export interface QuizForm {
  title: string;
  description: string;
  duration: number;
  quizType: 'single' | 'multiple';
}

export interface QuestionForm {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
}
