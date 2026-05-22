/**
 * API Service Layer - Supabase Backend
 */

import { supabase } from '@/integrations/supabase/client';
import { Quiz, Question, Result } from '@/types';

// Quiz API
export const quizApi = {
  getAll: async (): Promise<{ success: boolean; data?: Quiz[]; error?: string }> => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    // Get question counts and creator names
    const quizIds = (data || []).map(q => q.id);
    const creatorIds = [...new Set((data || []).map(q => q.created_by))];

    const [questionsRes, profilesRes] = await Promise.all([
      quizIds.length > 0
        ? supabase.from('questions').select('quiz_id').in('quiz_id', quizIds)
        : Promise.resolve({ data: [] }),
      creatorIds.length > 0
        ? supabase.from('profiles').select('user_id, name').in('user_id', creatorIds)
        : Promise.resolve({ data: [] }),
    ]);

    const questionCounts: Record<string, number> = {};
    (questionsRes.data || []).forEach((q: any) => {
      questionCounts[q.quiz_id] = (questionCounts[q.quiz_id] || 0) + 1;
    });

    const creatorNames: Record<string, string> = {};
    (profilesRes.data || []).forEach((p: any) => {
      creatorNames[p.user_id] = p.name;
    });

    const quizzes: Quiz[] = (data || []).map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      duration: q.duration,
      quizType: q.quiz_type as 'single' | 'multiple',
      maxAttempts: q.max_attempts ?? 1,
      difficulty: (q as any).difficulty as 'easy' | 'medium' | 'hard' || 'medium',
      createdBy: q.created_by,
      createdAt: q.created_at,
      scheduledStart: (q as any).scheduled_start ?? null,
      scheduledEnd: (q as any).scheduled_end ?? null,
      questionCount: questionCounts[q.id] || 0,
      creatorName: creatorNames[q.created_by] || 'Unknown',
    }));

    return { success: true, data: quizzes };
  },

  getById: async (id: string): Promise<{ success: boolean; data?: Quiz; error?: string }> => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: {
        id: data.id,
        title: data.title,
        description: data.description,
        duration: data.duration,
        quizType: data.quiz_type as 'single' | 'multiple',
        maxAttempts: data.max_attempts ?? 1,
        difficulty: (data as any).difficulty as 'easy' | 'medium' | 'hard' || 'medium',
        createdBy: data.created_by,
        createdAt: data.created_at,
        scheduledStart: (data as any).scheduled_start ?? null,
        scheduledEnd: (data as any).scheduled_end ?? null,
      },
    };
  },

  create: async (quiz: { title: string; description: string; duration: number; quizType: string; maxAttempts: number; difficulty: string; createdBy: string; scheduledStart?: string | null; scheduledEnd?: string | null }): Promise<{ success: boolean; data?: Quiz; error?: string }> => {
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        title: quiz.title,
        description: quiz.description,
        duration: quiz.duration,
        quiz_type: quiz.quizType,
        max_attempts: quiz.maxAttempts,
        difficulty: quiz.difficulty,
        created_by: quiz.createdBy,
        scheduled_start: quiz.scheduledStart ?? null,
        scheduled_end: quiz.scheduledEnd ?? null,
      } as any)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: {
        id: data.id,
        title: data.title,
        description: data.description,
        duration: data.duration,
        quizType: data.quiz_type as 'single' | 'multiple',
        maxAttempts: data.max_attempts ?? 1,
        difficulty: (data as any).difficulty as 'easy' | 'medium' | 'hard' || 'medium',
        createdBy: data.created_by,
        createdAt: data.created_at,
        scheduledStart: (data as any).scheduled_start ?? null,
        scheduledEnd: (data as any).scheduled_end ?? null,
      },
    };
  },

  delete: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },
};

// Question API
export const questionApi = {
  getByQuizId: async (quizId: string): Promise<{ success: boolean; data?: Question[]; error?: string }> => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };

    const questions: Question[] = (data || []).map(q => ({
      id: q.id,
      quizId: q.quiz_id,
      text: q.text,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      correctOption: q.correct_option as 'A' | 'B' | 'C' | 'D',
      correctOptions: (q.correct_options || []) as ('A' | 'B' | 'C' | 'D')[],
    }));

    return { success: true, data: questions };
  },

  create: async (question: Omit<Question, 'id'>): Promise<{ success: boolean; data?: Question; error?: string }> => {
    const { data, error } = await supabase
      .from('questions')
      .insert({
        quiz_id: question.quizId,
        text: question.text,
        option_a: question.optionA,
        option_b: question.optionB,
        option_c: question.optionC,
        option_d: question.optionD,
        correct_option: question.correctOption,
        correct_options: question.correctOptions || [],
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: {
        id: data.id,
        quizId: data.quiz_id,
        text: data.text,
        optionA: data.option_a,
        optionB: data.option_b,
        optionC: data.option_c,
        optionD: data.option_d,
        correctOption: data.correct_option as 'A' | 'B' | 'C' | 'D',
        correctOptions: (data.correct_options || []) as ('A' | 'B' | 'C' | 'D')[],
      },
    };
  },

  delete: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },
};

// Result API
export const resultApi = {
  getAll: async (): Promise<{ success: boolean; data?: Result[]; error?: string }> => {
    const { data, error } = await supabase
      .from('results')
      .select('*, quizzes(title), profiles:user_id(name)')
      .order('completed_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    const results: Result[] = (data || []).map((r: any) => ({
      id: r.id,
      quizId: r.quiz_id,
      userId: r.user_id,
      score: r.score,
      totalQuestions: r.total_questions,
      completedAt: r.completed_at,
      quizTitle: r.quizzes?.title || 'Unknown Quiz',
      userName: r.profiles?.name || 'Unknown User',
    }));

    return { success: true, data: results };
  },

  getByUserId: async (userId: string): Promise<{ success: boolean; data?: Result[]; error?: string }> => {
    const { data, error } = await supabase
      .from('results')
      .select('*, quizzes(title)')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    const results: Result[] = (data || []).map((r: any) => ({
      id: r.id,
      quizId: r.quiz_id,
      userId: r.user_id,
      score: r.score,
      totalQuestions: r.total_questions,
      completedAt: r.completed_at,
      quizTitle: r.quizzes?.title || 'Unknown Quiz',
    }));

    return { success: true, data: results };
  },

  getAttemptCount: async (userId: string, quizId: string): Promise<{ success: boolean; data?: number }> => {
    const { data, error, count } = await supabase
      .from('results')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('quiz_id', quizId);

    if (error) return { success: false, data: 0 };
    return { success: true, data: count ?? 0 };
  },

  submit: async (
    userId: string,
    quizId: string,
    answers: { questionId: string; answer: string; answers?: string[] }[]
  ): Promise<{ success: boolean; data?: Result; error?: string }> => {
    // Get questions to calculate score
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId);

    const { data: quiz } = await supabase
      .from('quizzes')
      .select('quiz_type')
      .eq('id', quizId)
      .single();

    if (!questions || !quiz) return { success: false, error: 'Quiz not found' };

    const isMultiple = quiz.quiz_type === 'multiple';
    let score = 0;

    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) return;

      if (isMultiple && question.correct_options && question.correct_options.length > 0) {
        const selected = answer.answers || [];
        const correct = question.correct_options;
        const isCorrect = correct.length === selected.length &&
          correct.every(c => selected.includes(c));
        if (isCorrect) score++;
      } else {
        if (question.correct_option === answer.answer) score++;
      }
    });

    const { data, error } = await supabase
      .from('results')
      .insert({
        user_id: userId,
        quiz_id: quizId,
        score,
        total_questions: questions.length,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: {
        id: data.id,
        quizId: data.quiz_id,
        userId: data.user_id,
        score: data.score,
        totalQuestions: data.total_questions,
        completedAt: data.completed_at,
      },
    };
  },
};
