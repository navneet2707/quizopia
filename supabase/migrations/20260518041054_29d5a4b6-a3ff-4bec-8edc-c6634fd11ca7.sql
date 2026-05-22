CREATE POLICY "Authenticated users can view quiz creator profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes WHERE quizzes.created_by = profiles.user_id
  )
);