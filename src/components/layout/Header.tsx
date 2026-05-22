import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, BookOpen, LayoutDashboard, Crown, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (user?.role === 'head_admin') return '/head-admin';
    if (user?.role === 'admin') return '/admin';
    return '/student';
  };

  const getRoleLabel = () => {
    if (user?.role === 'head_admin') return 'Head Admin';
    return user?.role;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Quizopia
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link to={getDashboardPath()}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              {user?.role === 'head_admin' && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Crown className="h-4 w-4" />
                    Admin Panel
                  </Button>
                </Link>
              )}
              {user?.role === 'student' && (
                <Link to="/claim-role">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <KeyRound className="h-4 w-4" />
                    Become Admin
                  </Button>
                </Link>
              )}
              <div className="flex items-center gap-3 rounded-full bg-muted px-3 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none">{user?.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{getRoleLabel()}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="hero" size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
