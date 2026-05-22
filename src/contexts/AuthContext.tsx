import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, AppRole } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: AppRole) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId).single(),
    ]);

    if (profileRes.data && roleRes.data) {
      return {
        id: userId,
        email: profileRes.data.email,
        name: profileRes.data.name,
        role: roleRes.data.role as AppRole,
        createdAt: profileRes.data.created_at,
      };
    }
    return null;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Use setTimeout to avoid Supabase auth deadlock
        setTimeout(async () => {
          const user = await fetchUserProfile(session.user.id);
          if (user) {
            setAuthState({ user, isAuthenticated: true });
          }
          setIsLoading(false);
        }, 0);
      } else {
        setAuthState({ user: null, isAuthenticated: false });
        setIsLoading(false);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const user = await fetchUserProfile(session.user.id);
        if (user) {
          setAuthState({ user, isAuthenticated: true });
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return false;
      }
      toast.success('Welcome back!');
      return true;
    } catch {
      toast.error('Login failed. Please try again.');
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: AppRole
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role },
        },
      });
      if (error) {
        toast.error(error.message);
        return false;
      }
      toast.success(`Welcome to Quizopia!`);
      return true;
    } catch {
      toast.error('Registration failed. Please try again.');
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthState({ user: null, isAuthenticated: false });
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        register,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
