import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Quiz, Question } from '@/types';
import { quizApi, questionApi } from '@/services/api';
import { Plus, Trash2, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const QuizDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A' as 'A' | 'B' | 'C' | 'D',
    correctOptions: [] as ('A' | 'B' | 'C' | 'D')[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isMultipleChoice = quiz?.quizType === 'multiple';

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    
    const [quizResponse, questionsResponse] = await Promise.all([
      quizApi.getById(id),
      questionApi.getByQuizId(id),
    ]);

    if (quizResponse.success) setQuiz(quizResponse.data || null);
    if (questionsResponse.success) setQuestions(questionsResponse.data || []);
    setIsLoading(false);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (newQuestion.text.length < 5) {
      setErrors({ text: 'Question must be at least 5 characters' });
      return;
    }
    if (!newQuestion.optionA || !newQuestion.optionB || !newQuestion.optionC || !newQuestion.optionD) {
      setErrors({ options: 'All options are required' });
      return;
    }
    if (isMultipleChoice && newQuestion.correctOptions.length < 1) {
      setErrors({ correctOptions: 'Select at least one correct answer' });
      return;
    }

    if (!id) return;

    setIsAddingQuestion(true);
    const questionData: Omit<Question, 'id'> = {
      quizId: id,
      text: newQuestion.text,
      optionA: newQuestion.optionA,
      optionB: newQuestion.optionB,
      optionC: newQuestion.optionC,
      optionD: newQuestion.optionD,
      correctOption: isMultipleChoice ? newQuestion.correctOptions[0] : newQuestion.correctOption,
      ...(isMultipleChoice ? { correctOptions: newQuestion.correctOptions } : {}),
    };

    const response = await questionApi.create(questionData);
    setIsAddingQuestion(false);

    if (response.success) {
      toast.success('Question added successfully');
      setNewQuestion({
        text: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        correctOptions: [],
      });
      fetchData();
    } else {
      toast.error('Failed to add question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    const response = await questionApi.delete(questionId);
    if (response.success) {
      toast.success('Question deleted');
      fetchData();
    } else {
      toast.error('Failed to delete question');
    }
  };

  const toggleCorrectOption = (option: 'A' | 'B' | 'C' | 'D') => {
    setNewQuestion(prev => ({
      ...prev,
      correctOptions: prev.correctOptions.includes(option)
        ? prev.correctOptions.filter(o => o !== option)
        : [...prev.correctOptions, option],
    }));
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

  if (!quiz) {
    return (
      <DashboardLayout title="Quiz Not Found" subtitle="">
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={quiz.title} subtitle={quiz.description}>
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <Badge variant={isMultipleChoice ? 'default' : 'secondary'}>
          {isMultipleChoice ? 'Multiple Choice' : 'Single Choice'}
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Questions List */}
        <div>
          <h2 className="font-display text-xl font-semibold mb-4">
            Questions ({questions.length})
          </h2>

          {questions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center">
                  No questions yet. Add your first question using the form.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => {
                const correctList = isMultipleChoice && question.correctOptions?.length
                  ? question.correctOptions
                  : [question.correctOption];

                return (
                  <Card key={question.id} className="border-border/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium mb-3">
                            <span className="text-muted-foreground mr-2">Q{index + 1}.</span>
                            {question.text}
                          </p>
                          <div className="grid gap-2 text-sm">
                            {(['A', 'B', 'C', 'D'] as const).map((option) => (
                              <div 
                                key={option}
                                className={`flex items-center gap-2 p-2 rounded-lg ${
                                  correctList.includes(option)
                                    ? 'bg-success/10 text-success' 
                                    : 'bg-muted/50'
                                }`}
                              >
                                {correctList.includes(option) && (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                <span className="font-medium">{option}.</span>
                                {question[`option${option}` as keyof Question] as string}
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Question Form */}
        <div>
          <h2 className="font-display text-xl font-semibold mb-4">Add Question</h2>
          
          <Card className="border-border/50 sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">New Question</CardTitle>
              <CardDescription>
                {isMultipleChoice 
                  ? 'Add a question with multiple correct answers (select all that apply)'
                  : 'Add a multiple choice question with 4 options'}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleAddQuestion}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="text">Question</Label>
                  <Textarea
                    id="text"
                    placeholder="Enter your question..."
                    rows={3}
                    value={newQuestion.text}
                    onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                  />
                  {errors.text && <p className="text-sm text-destructive">{errors.text}</p>}
                </div>

                {(['A', 'B', 'C', 'D'] as const).map((option) => (
                  <div key={option} className="space-y-2">
                    <Label htmlFor={`option${option}`}>Option {option}</Label>
                    <Input
                      id={`option${option}`}
                      placeholder={`Enter option ${option}...`}
                      value={newQuestion[`option${option}` as keyof typeof newQuestion] as string}
                      onChange={(e) => 
                        setNewQuestion({ ...newQuestion, [`option${option}`]: e.target.value })
                      }
                    />
                  </div>
                ))}
                {errors.options && <p className="text-sm text-destructive">{errors.options}</p>}

                <div className="space-y-2">
                  <Label>
                    {isMultipleChoice ? 'Correct Answers (select all)' : 'Correct Answer'}
                  </Label>
                  
                  {isMultipleChoice ? (
                    <div className="flex gap-4">
                      {(['A', 'B', 'C', 'D'] as const).map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            id={`correct-${option}`}
                            checked={newQuestion.correctOptions.includes(option)}
                            onCheckedChange={() => toggleCorrectOption(option)}
                          />
                          <Label htmlFor={`correct-${option}`}>{option}</Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <RadioGroup
                      value={newQuestion.correctOption}
                      onValueChange={(value: 'A' | 'B' | 'C' | 'D') => 
                        setNewQuestion({ ...newQuestion, correctOption: value })
                      }
                      className="flex gap-4"
                    >
                      {(['A', 'B', 'C', 'D'] as const).map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`correct-${option}`} />
                          <Label htmlFor={`correct-${option}`}>{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  {errors.correctOptions && (
                    <p className="text-sm text-destructive">{errors.correctOptions}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  variant="hero" 
                  className="w-full gap-2"
                  disabled={isAddingQuestion}
                >
                  {isAddingQuestion ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Question
                    </>
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default QuizDetail;
