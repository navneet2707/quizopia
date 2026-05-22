ALTER TABLE public.quizzes 
  ADD COLUMN scheduled_start TIMESTAMPTZ,
  ADD COLUMN scheduled_end TIMESTAMPTZ;