import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight,
  Brain,
  ShieldCheck,
  BarChart3,
  FileText,
  Users,
  Sparkles,
} from 'lucide-react';

const Index = () => {
  const { isAuthenticated, user } = useAuth();

  const getDashboardPath = () => {
    if (user?.role === 'head_admin') return '/head-admin';
    if (user?.role === 'admin') return '/admin';
    return '/student';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Decorative blobs */}
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl" />

        <div className="container relative py-20 md:py-32 lg:py-40">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left */}
            <div className="animate-slide-up">
              <span className="mb-4 inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                AI-Powered Quiz Platform
              </span>
              <h1 className="font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
                Smarter Quizzes,{' '}
                <span className="text-gradient">Better Learning</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-muted-foreground">
                Generate quizzes from PDFs with AI, manage multiple admins with strict data isolation, and give students instant feedback with detailed answer reviews.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                {isAuthenticated ? (
                  <Link to={getDashboardPath()}>
                    <Button variant="hero" size="xl" className="gap-2">
                      Go to Dashboard
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/register">
                      <Button variant="hero" size="xl" className="gap-2">
                        Get Started Free
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button variant="outline" size="xl">
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Right — stats card cluster */}
            <div className="relative hidden lg:block animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <StatCard emoji="👑" label="Head Admin" desc="Full oversight" className="translate-y-6" />
                <StatCard emoji="🛡️" label="Admins" desc="Isolated data" />
                <StatCard emoji="🎓" label="Students" desc="Learn & grow" />
                <StatCard emoji="🤖" label="AI Powered" desc="PDF → Quiz" className="translate-y-6" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Built for Modern Education
            </h2>
            <p className="mt-3 text-muted-foreground">
              Everything you need to create, manage, and take quizzes — all in one place.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Brain}
              title="AI Quiz Generation"
              description="Upload a PDF and let AI generate MCQ questions with configurable difficulty levels."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Role-Based Access"
              description="Head Admin oversees all. Admins manage only their own quizzes. Students take and review."
            />
            <FeatureCard
              icon={BarChart3}
              title="Instant Analytics"
              description="Students see scores and correct answers immediately after submission."
            />
            <FeatureCard
              icon={FileText}
              title="Flexible Attempts"
              description="Admins set how many times students can attempt each quiz."
            />
            <FeatureCard
              icon={Users}
              title="Data Isolation"
              description="Admins can never access each other's quizzes or student data."
            />
            <FeatureCard
              icon={Sparkles}
              title="Smart Review"
              description="Color-coded answer review with mark-for-review navigation during quizzes."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      {!isAuthenticated && (
        <section className="border-t border-border bg-muted/40 py-20">
          <div className="container">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="font-display text-3xl font-bold text-foreground">
                Ready to transform your assessments?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Create your free account and start building AI-powered quizzes in minutes.
              </p>
              <Link to="/register" className="mt-8 inline-block">
                <Button variant="hero" size="xl" className="gap-2">
                  Create Free Account
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Quizopia. Built for modern education.
        </div>
      </footer>
    </div>
  );
};

/* ---------- Sub-components ---------- */

function StatCard({ emoji, label, desc, className = '' }: { emoji: string; label: string; desc: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-md transition-transform hover:-translate-y-1 ${className}`}>
      <span className="text-3xl">{emoji}</span>
      <h3 className="mt-2 font-display text-sm font-bold text-foreground">{label}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

export default Index;
