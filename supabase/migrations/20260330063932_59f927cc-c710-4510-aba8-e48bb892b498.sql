
-- =============================================
-- QUIZOPIA Database Schema with Role Hierarchy
-- Roles: head_admin > admin > student
-- =============================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('head_admin', 'admin', 'student');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 5. Profiles RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Head admin can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'head_admin'));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. User roles RLS policies
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Head admin can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'head_admin'));

CREATE POLICY "Head admin can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'head_admin'));

-- 7. Quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 30,
  quiz_type TEXT NOT NULL DEFAULT 'single' CHECK (quiz_type IN ('single', 'multiple')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Admins can only see their own quizzes
CREATE POLICY "Admins can view own quizzes" ON public.quizzes
  FOR SELECT USING (auth.uid() = created_by);

-- Head admin can see ALL quizzes
CREATE POLICY "Head admin can view all quizzes" ON public.quizzes
  FOR SELECT USING (public.has_role(auth.uid(), 'head_admin'));

-- Students can view all quizzes (to take them)
CREATE POLICY "Students can view quizzes" ON public.quizzes
  FOR SELECT USING (public.has_role(auth.uid(), 'student'));

-- Admins can create quizzes
CREATE POLICY "Admins can create quizzes" ON public.quizzes
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'head_admin')
    )
  );

-- Admins can update their own quizzes
CREATE POLICY "Admins can update own quizzes" ON public.quizzes
  FOR UPDATE USING (auth.uid() = created_by);

-- Head admin can update any quiz
CREATE POLICY "Head admin can update any quiz" ON public.quizzes
  FOR UPDATE USING (public.has_role(auth.uid(), 'head_admin'));

-- Admins can delete their own quizzes
CREATE POLICY "Admins can delete own quizzes" ON public.quizzes
  FOR DELETE USING (auth.uid() = created_by);

-- Head admin can delete any quiz
CREATE POLICY "Head admin can delete any quiz" ON public.quizzes
  FOR DELETE USING (public.has_role(auth.uid(), 'head_admin'));

-- 8. Questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  correct_options TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Questions follow the same access as their quiz
CREATE POLICY "Users can view questions of accessible quizzes" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes WHERE id = quiz_id
    )
  );

CREATE POLICY "Admins can insert questions to own quizzes" ON public.questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE id = quiz_id AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'head_admin'))
    )
  );

CREATE POLICY "Admins can delete questions from own quizzes" ON public.questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE id = quiz_id AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'head_admin'))
    )
  );

-- 9. Results table
CREATE TABLE public.results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, quiz_id)
);

ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Students can view their own results
CREATE POLICY "Students can view own results" ON public.results
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view results for their quizzes
CREATE POLICY "Admins can view results for own quizzes" ON public.results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes WHERE id = quiz_id AND created_by = auth.uid()
    )
  );

-- Head admin can view all results
CREATE POLICY "Head admin can view all results" ON public.results
  FOR SELECT USING (public.has_role(auth.uid(), 'head_admin'));

-- Students can submit results
CREATE POLICY "Students can submit results" ON public.results
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'student'));

-- 10. Auto-create profile and assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Question count helper
CREATE OR REPLACE FUNCTION public.get_question_count(_quiz_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.questions WHERE quiz_id = _quiz_id
$$;
