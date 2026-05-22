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
import { Plus, BookOpen, Users, Trophy, Clock, Trash2, Eye, Loader2, Search, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [instructorFilter, setInstructorFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const isHeadAdmin = user?.role === 'head_admin';

  const instructorOptions = Array.from(
    new Map(quizzes.map(q => [q.createdBy, q.creatorName || 'Unknown'])).entries()
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [quizResponse, resultResponse] = await Promise.all([
      quizApi.getAll(),
      resultApi.getAll(),
    ]);

    if (quizResponse.success) {
      // Regular admins only see their own quizzes (RLS handles this)
      setQuizzes(quizResponse.data || []);
    }
    if (resultResponse.success) setResults(resultResponse.data || []);
    setIsLoading(false);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? All associated questions and results will be deleted.')) {
      return;
    }

    const response = await quizApi.delete(quizId);
    if (response.success) {
      toast.success('Quiz deleted successfully');
      fetchData();
    } else {
      toast.error('Failed to delete quiz');
    }
  };

  const stats = [
    { label: isHeadAdmin ? 'All Quizzes' : 'Your Quizzes', value: quizzes.length, icon: BookOpen, color: 'text-primary' },
    { label: 'Total Attempts', value: results.length, icon: Users, color: 'text-accent' },
    { 
      label: 'Avg Score', 
      value: results.length > 0 
        ? `${Math.round((results.reduce((sum, r) => sum + (r.score / r.totalQuestions) * 100, 0) / results.length))}%`
        : 'N/A',
      icon: Trophy, 
      color: 'text-success' 
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Admin Dashboard" subtitle="Manage your quizzes and view student progress">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={isHeadAdmin ? "Head Admin Dashboard" : "Admin Dashboard"} 
      subtitle={isHeadAdmin ? "View all admins' quizzes and results" : "Manage your quizzes and view student progress"}
    >
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

      {/* Quizzes Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="font-display text-xl font-semibold">
            {isHeadAdmin ? 'All Quizzes' : 'Your Quizzes'}
          </h2>
          <div className="flex items-center gap-2">
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
            <Link to="/admin/quiz/new">
              <Button variant="hero" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Quiz
              </Button>
            </Link>
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
          const filteredQuizzes = quizzes.filter(q => {
            const matchesSearch =
              q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              q.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesInstructor = instructorFilter === 'all' || q.createdBy === instructorFilter;
            const created = new Date(q.createdAt);
            const matchesFrom = !dateFrom || created >= new Date(dateFrom);
            const matchesTo = !dateTo || created <= new Date(dateTo + 'T23:59:59');
            return matchesSearch && matchesInstructor && matchesFrom && matchesTo;
          });

          if (quizzes.length === 0) {
            return (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No quizzes yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first quiz to get started
                  </p>
                  <Link to="/admin/quiz/new">
                    <Button variant="hero" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Quiz
                    </Button>
                  </Link>
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
            const endsAt = q.scheduledEnd ? new Date(q.scheduledEnd) : null;
            const closed = endsAt && now > endsAt;
            const isOver = !!closed;
            return { quiz: q, closed, isOver };
          }).sort((a, b) => (a.isOver === b.isOver ? 0 : a.isOver ? 1 : -1));

          return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quizzesWithStatus.map(({ quiz, isOver }) => (
                <Card key={quiz.id} className={`border-border/50 transition-colors ${isOver ? 'opacity-50 grayscale' : 'hover:border-accent/50'}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-lg">{quiz.title}</CardTitle>
                      {isOver && <Badge variant="secondary" className="text-xs">Closed</Badge>}
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
                        {quiz.questionCount || 0} questions
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {quiz.duration} min
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/admin/quiz/${quiz.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1">
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                      </Link>
                      {(quiz.createdBy === user?.id || isHeadAdmin) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteQuiz(quiz.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Recent Results Section */}
      <div>
        <h2 className="font-display text-xl font-semibold mb-4">Recent Results</h2>
        
        {results.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No results yet</h3>
              <p className="text-muted-foreground text-center">
                Results will appear here when students complete quizzes
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Student</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Quiz</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Score</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, 10).map((result) => (
                      <tr key={result.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">{result.userName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{result.quizTitle}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${
                            (result.score / result.totalQuestions) >= 0.7 
                              ? 'text-success' 
                              : (result.score / result.totalQuestions) >= 0.5 
                                ? 'text-warning' 
                                : 'text-destructive'
                          }`}>
                            {result.score}/{result.totalQuestions} ({Math.round((result.score / result.totalQuestions) * 100)}%)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(result.completedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
