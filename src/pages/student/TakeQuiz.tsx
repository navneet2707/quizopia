import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Quiz, Question, QuestionWithAnswer } from '@/types';
import { quizApi, questionApi, resultApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, ArrowLeft, ArrowRight, Send, Loader2, AlertTriangle, Trophy, CheckCircle2, XCircle, Flag } from 'lucide-react';
import { toast } from 'sonner';
import QuestionContent from '@/components/QuestionContent';

const TakeQuiz = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());

  const isMultipleChoice = quiz?.quizType === 'multiple';

  // Fisher-Yates shuffle
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const prepareShuffledQuestions = (rawQuestions: any[]): QuestionWithAnswer[] => {
    const withAnswers = rawQuestions.map(q => ({
      ...q,
      selectedAnswer: null,
      selectedAnswers: [],
      shuffledOptions: shuffleArray(['A', 'B', 'C', 'D'] as const),
    }));
    return shuffleArray(withAnswers);
  };

  useEffect(() => {
    if (id && user) checkAndFetchData();
  }, [id, user]);

  const checkAndFetchData = async () => {
    if (!id || !user) return;
    setIsLoading(true);

    const [quizResponse, questionsResponse, attemptRes] = await Promise.all([
      quizApi.getById(id),
      questionApi.getByQuizId(id),
      resultApi.getAttemptCount(user.id, id),
    ]);

    const attempts = attemptRes.data ?? 0;
    setAttemptCount(attempts);

    if (quizResponse.success && quizResponse.data) {
      setQuiz(quizResponse.data);
      setTimeLeft(quizResponse.data.duration * 60);
      if (attempts >= quizResponse.data.maxAttempts) {
        setMaxAttemptsReached(true);
        setIsLoading(false);
        return;
      }
    }
    
    if (questionsResponse.success && questionsResponse.data) {
      setQuestions(prepareShuffledQuestions(questionsResponse.data));
    }
    
    setIsLoading(false);
  };

  const submitQuiz = useCallback(async () => {
    if (!user || !quiz || isSubmitting) return;
    
    setIsSubmitting(true);
    
    const answers = questions.map(q => ({
      questionId: q.id,
      answer: q.selectedAnswer || '',
      answers: q.selectedAnswers || [],
    }));

    const response = await resultApi.submit(user.id, quiz.id, answers);
    
    if (response.success && response.data) {
      setResult({ score: response.data.score, total: response.data.totalQuestions });
      setAttemptCount(prev => prev + 1);
      toast.success('Quiz submitted successfully!');
    } else {
      toast.error(response.error || 'Failed to submit quiz');
    }
    
    setIsSubmitting(false);
  }, [user, quiz, questions, isSubmitting]);

  useEffect(() => {
    if (!hasStarted || result) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.warning('Time is up! Auto-submitting your quiz...');
          submitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, result, submitQuiz]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSingleSelect = (originalLetter: 'A' | 'B' | 'C' | 'D') => {
    setQuestions(questions.map((q, i) => 
      i === currentIndex ? { ...q, selectedAnswer: originalLetter } : q
    ));
  };

  const handleMultiSelect = (originalLetter: 'A' | 'B' | 'C' | 'D') => {
    setQuestions(questions.map((q, i) => {
      if (i !== currentIndex) return q;
      const current = q.selectedAnswers || [];
      const updated = current.includes(originalLetter)
        ? current.filter(o => o !== originalLetter)
        : [...current, originalLetter];
      return { ...q, selectedAnswers: updated };
    }));
  };

  const handleSubmit = () => {
    const unanswered = questions.filter(q => {
      if (isMultipleChoice) return !(q.selectedAnswers && q.selectedAnswers.length > 0);
      return !q.selectedAnswer;
    }).length;

    if (unanswered > 0) {
      if (!confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) {
        return;
      }
    }
    submitQuiz();
  };

  const handleRetry = () => {
    setResult(null);
    setHasStarted(false);
    setQuestions(prepareShuffledQuestions(questions));
    setCurrentIndex(0);
    setMarkedForReview(new Set());
    if (quiz) setTimeLeft(quiz.duration * 60);
  };

  const toggleMarkForReview = () => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Loading..." subtitle="">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (maxAttemptsReached) {
    return (
      <DashboardLayout title="Max Attempts Reached" subtitle="">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center py-12">
            <AlertTriangle className="h-16 w-16 text-warning mb-4" />
            <h2 className="font-display text-xl font-bold mb-2">No More Attempts</h2>
            <p className="text-muted-foreground text-center mb-6">
              You've used all {quiz?.maxAttempts} attempt(s) for this quiz.
            </p>
            <Button onClick={() => navigate('/student')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Schedule gating
  const now = new Date();
  const startsAt = quiz?.scheduledStart ? new Date(quiz.scheduledStart) : null;
  const endsAt = quiz?.scheduledEnd ? new Date(quiz.scheduledEnd) : null;
  const notYetAvailable = quiz && startsAt && now < startsAt;
  const expired = quiz && endsAt && now > endsAt;

  if ((notYetAvailable || expired) && !result) {
    return (
      <DashboardLayout title={notYetAvailable ? 'Quiz Not Yet Available' : 'Quiz Closed'} subtitle="">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center py-12">
            <Clock className="h-16 w-16 text-warning mb-4" />
            <h2 className="font-display text-xl font-bold mb-2">
              {notYetAvailable ? 'Not Open Yet' : 'No Longer Available'}
            </h2>
            <p className="text-muted-foreground text-center mb-6">
              {notYetAvailable
                ? `This quiz opens on ${startsAt!.toLocaleString()}.`
                : `This quiz closed on ${endsAt!.toLocaleString()}.`}
            </p>
            <Button onClick={() => navigate('/student')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <DashboardLayout title="Quiz Not Available" subtitle="">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center py-12">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="font-display text-xl font-bold mb-2">Quiz Unavailable</h2>
            <p className="text-muted-foreground text-center mb-6">
              This quiz doesn't exist or has no questions yet.
            </p>
            <Button onClick={() => navigate('/student')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Result screen with correct answers
  if (result) {
    const percentage = Math.round((result.score / result.total) * 100);
    const isGood = percentage >= 70;
    const isOkay = percentage >= 50 && percentage < 70;
    const canRetry = attemptCount < quiz.maxAttempts;

    return (
      <DashboardLayout title="Quiz Complete!" subtitle="">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Score Card */}
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <div className={`flex h-24 w-24 items-center justify-center rounded-full mb-6 ${
                isGood ? 'bg-success/10' : isOkay ? 'bg-warning/10' : 'bg-destructive/10'
              }`}>
                <Trophy className={`h-12 w-12 ${
                  isGood ? 'text-success' : isOkay ? 'text-warning' : 'text-destructive'
                }`} />
              </div>
              
              <h2 className="font-display text-2xl font-bold mb-2">
                {isGood ? 'Excellent!' : isOkay ? 'Good Job!' : 'Keep Practicing!'}
              </h2>
              
              <p className="text-muted-foreground mb-6">
                You scored {result.score} out of {result.total}
              </p>

              <div className="w-full max-w-xs mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Score</span>
                  <span className="font-bold">{percentage}%</span>
                </div>
                <Progress value={percentage} className="h-3" />
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Attempts used: {attemptCount} / {quiz.maxAttempts}
              </p>

              <div className="flex gap-4">
                {canRetry && (
                  <Button variant="outline" onClick={handleRetry}>
                    Retry Quiz
                  </Button>
                )}
                <Button variant="hero" onClick={() => navigate('/student')}>
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Answer Review */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Answer Review</CardTitle>
              <CardDescription>See which answers were correct</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q, index) => {
                const isCorrectSingle = !isMultipleChoice && q.selectedAnswer === q.correctOption;
                const isCorrectMultiple = isMultipleChoice && q.correctOptions && q.selectedAnswers &&
                  q.correctOptions.length === q.selectedAnswers.length &&
                  q.correctOptions.every(c => q.selectedAnswers?.includes(c));
                const isCorrect = isMultipleChoice ? isCorrectMultiple : isCorrectSingle;

                return (
                  <div key={q.id} className={`rounded-lg border-2 p-4 ${
                    isCorrect ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'
                  }`}>
                    <div className="flex items-start gap-3 mb-3">
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium mb-1">Q{index + 1}.</p>
                        <QuestionContent text={q.text} />
                      </div>
                    </div>
                    <div className="ml-8 space-y-1 text-sm">
                      {(q.shuffledOptions || ['A', 'B', 'C', 'D'] as const).map((originalLetter, idx) => {
                        const displayLabel = ['A', 'B', 'C', 'D'][idx];
                        const isThisCorrect = isMultipleChoice
                          ? q.correctOptions?.includes(originalLetter)
                          : q.correctOption === originalLetter;
                        const wasSelected = isMultipleChoice
                          ? q.selectedAnswers?.includes(originalLetter)
                          : q.selectedAnswer === originalLetter;

                        return (
                          <div key={originalLetter} className={`flex items-start gap-2 rounded px-2 py-1 ${
                            isThisCorrect ? 'bg-success/10 text-success font-medium' :
                            wasSelected && !isThisCorrect ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground'
                          }`}>
                            <span>{displayLabel}.</span>
                            <QuestionContent text={q[`option${originalLetter}` as keyof Question] as string} inline className="flex-1 min-w-0" />
                            {isThisCorrect && <CheckCircle2 className="h-3 w-3 ml-auto mt-1" />}
                            {wasSelected && !isThisCorrect && <XCircle className="h-3 w-3 ml-auto mt-1" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasStarted) {
    return (
      <DashboardLayout title={quiz.title} subtitle={quiz.description}>
        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Ready to Start?</CardTitle>
            <CardDescription>
              Review the quiz details before you begin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-2xl font-bold font-display">{questions.length}</p>
                <p className="text-sm text-muted-foreground">Questions</p>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-2xl font-bold font-display">{quiz.duration}</p>
                <p className="text-sm text-muted-foreground">Minutes</p>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <Badge variant={isMultipleChoice ? 'default' : 'secondary'} className="mt-1">
                  {isMultipleChoice ? 'Multi' : 'Single'}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">Answer Type</p>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-2xl font-bold font-display">{quiz.maxAttempts - attemptCount}</p>
                <p className="text-sm text-muted-foreground">Attempts Left</p>
              </div>
            </div>

            <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Important Notes:</p>
                  <ul className="mt-1 text-muted-foreground list-disc list-inside">
                    <li>You have {quiz.maxAttempts - attemptCount} attempt(s) remaining</li>
                    <li>Quiz will auto-submit when time runs out</li>
                    {isMultipleChoice && (
                      <li>Some questions may have multiple correct answers — select all that apply</li>
                    )}
                    <li>You can navigate between questions</li>
                    <li>Correct answers will be shown after submission</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => navigate('/student')}>
                Cancel
              </Button>
              <Button variant="hero" className="flex-1" onClick={() => setHasStarted(true)}>
                Start Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter(q => {
    if (isMultipleChoice) return q.selectedAnswers && q.selectedAnswers.length > 0;
    return q.selectedAnswer;
  }).length;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header with Timer */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="font-display text-lg font-bold">{quiz.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Question {currentIndex + 1} of {questions.length}
                </p>
              </div>
              <Badge variant={isMultipleChoice ? 'default' : 'secondary'} className="text-xs">
                {isMultipleChoice ? 'Select all that apply' : 'Single answer'}
              </Badge>
            </div>
            
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono font-bold ${
              timeLeft <= 60 ? 'bg-destructive/10 text-destructive' : 'bg-muted'
            }`}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          </div>
          
          <Progress value={progress} className="mt-3 h-1" />
        </div>
      </div>

      <main className="container py-8">
        <div className="max-w-2xl mx-auto">
          {/* Question Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-xl">
                <QuestionContent text={currentQuestion.text} />
              </CardTitle>
              {isMultipleChoice && (
                <CardDescription>Select all correct answers</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {isMultipleChoice ? (
                <div className="space-y-3">
                  {(currentQuestion.shuffledOptions || ['A', 'B', 'C', 'D'] as const).map((originalLetter, idx) => {
                    const displayLabel = ['A', 'B', 'C', 'D'][idx];
                    const isSelected = currentQuestion.selectedAnswers?.includes(originalLetter);
                    return (
                      <Label
                        key={originalLetter}
                        htmlFor={`option-${displayLabel}`}
                        className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-all ${
                          isSelected
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-accent/50'
                        }`}
                      >
                        <Checkbox
                          id={`option-${displayLabel}`}
                          checked={isSelected}
                          onCheckedChange={() => handleMultiSelect(originalLetter)}
                          className="mt-1"
                        />
                        <span className="font-medium mt-0.5">{displayLabel}.</span>
                        <QuestionContent
                          text={currentQuestion[`option${originalLetter}` as keyof Question] as string}
                          className="flex-1 min-w-0"
                        />
                      </Label>
                    );
                  })}
                </div>
              ) : (
                <RadioGroup
                  value={currentQuestion.selectedAnswer || ''}
                  onValueChange={(value: 'A' | 'B' | 'C' | 'D') => handleSingleSelect(value)}
                  className="space-y-3"
                >
                  {(currentQuestion.shuffledOptions || ['A', 'B', 'C', 'D'] as const).map((originalLetter, idx) => {
                    const displayLabel = ['A', 'B', 'C', 'D'][idx];
                    return (
                      <Label
                        key={originalLetter}
                        htmlFor={`option-${displayLabel}`}
                        className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-all ${
                          currentQuestion.selectedAnswer === originalLetter
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-accent/50'
                        }`}
                      >
                        <RadioGroupItem value={originalLetter} id={`option-${displayLabel}`} className="mt-1" />
                        <span className="font-medium mt-0.5">{displayLabel}.</span>
                        <QuestionContent
                          text={currentQuestion[`option${originalLetter}` as keyof Question] as string}
                          className="flex-1 min-w-0"
                        />
                      </Label>
                    );
                  })}
                </RadioGroup>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(prev => prev - 1)}
              disabled={currentIndex === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              variant={markedForReview.has(currentIndex) ? 'destructive' : 'outline'}
              onClick={toggleMarkForReview}
              className="gap-2"
            >
              <Flag className="h-4 w-4" />
              {markedForReview.has(currentIndex) ? 'Marked for Review' : 'Mark for Review'}
            </Button>

            {currentIndex === questions.length - 1 ? (
              <Button
                variant="hero"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Quiz
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Question Navigator */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Question Navigator</CardTitle>
              <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded gradient-primary" /> Current
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-success/30 border border-success/50" /> Answered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-warning/30 border border-warning/50" /> Marked for Review
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-muted border border-border" /> Not Visited
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, index) => {
                  const isAnswered = isMultipleChoice
                    ? q.selectedAnswers && q.selectedAnswers.length > 0
                    : !!q.selectedAnswer;
                  const isCurrent = index === currentIndex;
                  const isReview = markedForReview.has(index);

                  let classes = 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border';
                  if (isCurrent) {
                    classes = 'gradient-primary text-primary-foreground shadow-md scale-110';
                  } else if (isReview && isAnswered) {
                    classes = 'bg-warning/20 text-warning-foreground border-2 border-warning ring-2 ring-success/40';
                  } else if (isReview) {
                    classes = 'bg-warning/20 text-warning-foreground border-2 border-warning';
                  } else if (isAnswered) {
                    classes = 'bg-success/15 text-success border border-success/50';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(index)}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-all ${classes}`}
                    >
                      {isReview ? <Flag className="h-3.5 w-3.5" /> : index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>{answeredCount} of {questions.length} answered</span>
                {markedForReview.size > 0 && (
                  <span className="text-warning font-medium">{markedForReview.size} marked for review</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default TakeQuiz;
