import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Quiz, Result } from '@/types';
import { quizApi, resultApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Clock, Trophy, CheckCircle2, PlayCircle, Loader2, Search, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [attemptedQuizIds, setAttemptedQuizIds] = useState<Set<string>>(new Set());
  const [quizAttemptCounts, setQuizAttemptCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [instructorFilter, setInstructorFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const instructorOptions = Array.from(
    new Map(quizzes.map(q => [q.createdBy, q.creatorName || 'Unknown'])).entries()
  );

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    
    const [quizResponse, resultResponse] = await Promise.all([
      quizApi.getAll(),
      resultApi.getByUserId(user.id),
    ]);

    if (quizResponse.success) setQuizzes(quizResponse.data || []);
    if (resultResponse.success) {
      setResults(resultResponse.data || []);
      const attemptedIds = new Set<string>();
      const quizAttemptCounts: Record<string, number> = {};
      (resultResponse.data || []).forEach(r => {
        attemptedIds.add(r.quizId);
        quizAttemptCounts[r.quizId] = (quizAttemptCounts[r.quizId] || 0) + 1;
      });
      setAttemptedQuizIds(attemptedIds);
      setQuizAttemptCounts(quizAttemptCounts);
    }
    setIsLoading(false);
  };

  const availableQuizzes = quizzes.filter(q => (q.questionCount || 0) > 0);
  const completedQuizzes = quizzes.filter(q => attemptedQuizIds.has(q.id));

  const stats = [
    { label: 'Available', value: availableQuizzes.length, icon: BookOpen, color: 'text-primary' },
    { label: 'Completed', value: results.length, icon: CheckCircle2, color: 'text-success' },
    { 
      label: 'Avg Score', 
      value: results.length > 0 
        ? `${Math.round((results.reduce((sum, r) => sum + (r.score / r.totalQuestions) * 100, 0) / results.length))}%`
        : 'N/A',
      icon: Trophy, 
      color: 'text-accent' 
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Student Dashboard" subtitle="Take quizzes and track your progress">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Student Dashboard" subtitle="Take quizzes and track your progress">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {stats.map((stat, index) => (
          <Card key={index} className="border-border/50">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`rounded-xl p-3 bg-muted ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available Quizzes */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="font-display text-xl font-semibold">Available Quizzes</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Filter Panel */}
        <Card className="mb-4 border-border/50">
          <CardContent className="grid gap-3 md:grid-cols-3 pt-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Instructor</Label>
              <Select value={instructorFilter} onValueChange={setInstructorFilter}>
                <SelectTrigger><SelectValue placeholder="All instructors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All instructors</SelectItem>
                  {instructorOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Created from</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Created to</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {(() => {
          const filteredQuizzes = availableQuizzes.filter(q => {
            const matchesSearch =
              q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              q.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesInstructor = instructorFilter === 'all' || q.createdBy === instructorFilter;
            const created = new Date(q.createdAt);
            const matchesFrom = !dateFrom || created >= new Date(dateFrom);
            const matchesTo = !dateTo || created <= new Date(dateTo + 'T23:59:59');
            return matchesSearch && matchesInstructor && matchesFrom && matchesTo;
          });

          if (availableQuizzes.length === 0) {
            return (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No quizzes available</h3>
                  <p className="text-muted-foreground text-center">
                    {quizzes.length === 0 
                      ? "There are no quizzes created yet. Check back later!"
                      : "You've completed all available quizzes. Great job!"}
                  </p>
                </CardContent>
              </Card>
            );
          }

          if (filteredQuizzes.length === 0) {
            return (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No quizzes found</h3>
                  <p className="text-muted-foreground text-center">
                    Try a different search term
                  </p>
                </CardContent>
              </Card>
            );
          }

          const now = new Date();
          const quizzesWithStatus = filteredQuizzes.map(q => {
            const startsAt = q.scheduledStart ? new Date(q.scheduledStart) : null;
            const endsAt = q.scheduledEnd ? new Date(q.scheduledEnd) : null;
            const notYet = startsAt && now < startsAt;
            const closed = endsAt && now > endsAt;
            const attemptsUsed = quizAttemptCounts[q.id] || 0;
            const noAttemptsLeft = attemptsUsed >= q.maxAttempts;
            const isOver = !!closed || noAttemptsLeft;
            const locked = notYet || closed || noAttemptsLeft;
            return { quiz: q, startsAt, endsAt, notYet, closed, isOver, locked, noAttemptsLeft };
          }).sort((a, b) => (a.isOver === b.isOver ? 0 : a.isOver ? 1 : -1));

          return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quizzesWithStatus.map(({ quiz, startsAt, endsAt, notYet, closed, isOver, locked, noAttemptsLeft }) => (
                <Card key={quiz.id} className={`border-border/50 transition-colors ${isOver ? 'opacity-50 grayscale' : 'hover:border-accent/50'}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-lg">{quiz.title}</CardTitle>
                      <Badge variant={quiz.quizType === 'multiple' ? 'default' : 'secondary'} className="text-xs">
                        {quiz.quizType === 'multiple' ? 'Multi' : 'Single'}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
                    {quiz.creatorName && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        By <span className="font-medium">{quiz.creatorName}</span>
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {quiz.questionCount} questions
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {quiz.duration} min
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          {quiz.maxAttempts} attempt{quiz.maxAttempts > 1 ? 's' : ''}
                        </div>
                      </div>
                      {(startsAt || endsAt || noAttemptsLeft) && (
                        <div className="mb-4 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground space-y-1">
                          {startsAt && <div>Opens: {startsAt.toLocaleString()}</div>}
                          {endsAt && <div>Closes: {endsAt.toLocaleString()}</div>}
                          {notYet && <div className="text-warning font-medium">Not yet available</div>}
                          {closed && <div className="text-destructive font-medium">Closed</div>}
                          {noAttemptsLeft && !closed && <div className="text-destructive font-medium">No attempts left</div>}
                        </div>
                      )}
                    <Link to={locked ? '#' : `/student/quiz/${quiz.id}`} onClick={(e) => locked && e.preventDefault()}>
                      <Button variant="hero" size="sm" className="w-full gap-2" disabled={locked}>
                        <PlayCircle className="h-4 w-4" />
                        {notYet ? 'Not Open Yet' : closed ? 'Closed' : noAttemptsLeft ? 'No Attempts Left' : 'Start Quiz'}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Completed Quizzes */}
      <div>
        <h2 className="font-display text-xl font-semibold mb-4">Your Results</h2>
        
        {results.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No results yet</h3>
              <p className="text-muted-foreground text-center">
                Complete a quiz to see your results here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((result) => {
              const percentage = Math.round((result.score / result.totalQuestions) * 100);
              const isGood = percentage >= 70;
              const isOkay = percentage >= 50 && percentage < 70;
              
              return (
                <Card key={result.id} className="border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-semibold">{result.quizTitle}</h3>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        isGood ? 'bg-success/10 text-success' : isOkay ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                      }`}>
                        <Trophy className="h-5 w-5" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Score</span>
                        <span className="font-semibold">{result.score}/{result.totalQuestions}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            isGood ? 'bg-success' : isOkay ? 'bg-warning' : 'bg-destructive'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {new Date(result.completedAt).toLocaleDateString()}
                        </span>
                        <span className={`font-bold ${
                          isGood ? 'text-success' : isOkay ? 'text-warning' : 'text-destructive'
                        }`}>
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
