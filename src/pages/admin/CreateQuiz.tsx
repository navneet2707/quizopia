import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { quizApi, questionApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Loader2, Upload, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const quizSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description too long'),
  duration: z.number().min(1, 'Duration must be at least 1 minute').max(180, 'Duration cannot exceed 180 minutes'),
  quizType: z.enum(['single', 'multiple']),
  maxAttempts: z.number().min(1, 'At least 1 attempt required').max(100, 'Max 100 attempts'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return text;
}

const CreateQuiz = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [topic, setTopic] = useState('');
  const [genSource, setGenSource] = useState<'pdf' | 'topic'>('topic');
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulties, setDifficulties] = useState<Array<'easy' | 'medium' | 'hard'>>(['medium']);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 30,
    quizType: 'single' as 'single' | 'multiple',
    maxAttempts: 1,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
  });
  const [scheduleMode, setScheduleMode] = useState<'live' | 'later'>('live');
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    } else {
      toast.error('Please select a valid PDF file');
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    if (genSource === 'pdf' && !pdfFile) {
      toast.error('Please upload a PDF first');
      return;
    }
    if (genSource === 'topic' && topic.trim().length < 3) {
      toast.error('Please enter a topic (min 3 characters)');
      return;
    }

    if (difficulties.length === 0) {
      toast.error('Select at least one difficulty level');
      return;
    }

    setIsGenerating(true);
    try {
      let pdfText: string | undefined;
      if (genSource === 'pdf' && pdfFile) {
        toast.info('Extracting text from PDF...');
        pdfText = await extractTextFromPdf(pdfFile);
        if (pdfText.trim().length < 50) {
          toast.error('Could not extract enough text from the PDF. Try a different file.');
          setIsGenerating(false);
          return;
        }
      }

      // If multiple difficulties selected, store as 'medium' as the quiz-level label
      const storedDifficulty: 'easy' | 'medium' | 'hard' =
        difficulties.length === 1 ? difficulties[0] : 'medium';

      toast.info('Generating quiz questions with AI...');
      const { data, error } = await supabase.functions.invoke('generate-quiz-from-pdf', {
        body: {
          pdfText,
          topic: genSource === 'topic' ? topic.trim() : undefined,
          difficulties,
          quizType: formData.quizType,
          numQuestions,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const questions = data.questions;
      if (!questions?.length) {
        toast.error('No questions were generated. Try a different PDF.');
        setIsGenerating(false);
        return;
      }

      // Create the quiz first
      const mergedFormData = { ...formData, difficulty: storedDifficulty };
      const result = quizSchema.safeParse(mergedFormData);
      if (!result.success) {
        toast.error('Please fill in all quiz details before generating');
        setIsGenerating(false);
        return;
      }

      const quizResponse = await quizApi.create({
        ...mergedFormData,
        createdBy: user.id,
        scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
      });

      if (!quizResponse.success || !quizResponse.data) {
        toast.error(quizResponse.error || 'Failed to create quiz');
        setIsGenerating(false);
        return;
      }

      const quizId = quizResponse.data.id;

      // Insert all generated questions
      let added = 0;
      for (const q of questions) {
        const res = await questionApi.create({
          quizId,
          text: q.text,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption || (q.correctOptions?.[0]) || 'A',
          correctOptions: q.correctOptions || [],
        });
        if (res.success) added++;
      }

      toast.success(`Quiz created with ${added} AI-generated questions!`);
      navigate(`/admin/quiz/${quizId}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to generate quiz from PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const storedDifficulty: 'easy' | 'medium' | 'hard' =
      difficulties.length === 1 ? difficulties[0] : 'medium';
    const mergedFormData = { ...formData, difficulty: storedDifficulty };

    const result = quizSchema.safeParse(mergedFormData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0] as string] = error.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (scheduleMode === 'later') {
      if (!scheduledStart || !scheduledEnd) {
        toast.error('Please pick both start and end times, or choose "Live Now"');
        return;
      }
      if (new Date(scheduledEnd) <= new Date(scheduledStart)) {
        toast.error('Schedule end must be after schedule start');
        return;
      }
    }

    setIsLoading(true);
    const response = await quizApi.create({
      ...mergedFormData,
      createdBy: user.id,
      scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
    });
    setIsLoading(false);

    if (response.success && response.data) {
      toast.success('Quiz created! Now add some questions.');
      navigate(`/admin/quiz/${response.data.id}`);
    } else {
      toast.error(response.error || 'Failed to create quiz');
    }
  };

  const difficultyColors = {
    easy: 'border-green-500 bg-green-500/10 text-green-700',
    medium: 'border-yellow-500 bg-yellow-500/10 text-yellow-700',
    hard: 'border-red-500 bg-red-500/10 text-red-700',
  };

  return (
    <DashboardLayout title="Create New Quiz" subtitle="Set up your quiz details">
      <div className="max-w-2xl space-y-6">
        {/* PDF Upload Card */}
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI Quiz Generation
            </CardTitle>
            <CardDescription>
              Generate quiz questions automatically from a topic or by uploading a PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={genSource === 'topic' ? 'default' : 'outline'}
                onClick={() => setGenSource('topic')}
              >
                From Topic
              </Button>
              <Button
                type="button"
                variant={genSource === 'pdf' ? 'default' : 'outline'}
                onClick={() => setGenSource('pdf')}
              >
                From PDF
              </Button>
            </div>

            {genSource === 'topic' ? (
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Textarea
                  id="topic"
                  placeholder="e.g., Photosynthesis in plants, Newton's laws of motion, React hooks..."
                  rows={3}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Describe the topic clearly. The more specific, the better the questions.
                </p>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handlePdfSelect}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-accent/50 hover:bg-accent/5"
                >
                  {pdfFile ? (
                    <>
                      <FileText className="h-10 w-10 text-accent" />
                      <span className="font-medium">{pdfFile.name}</span>
                      <span className="text-xs text-muted-foreground">Click to change file</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <span className="font-medium">Click to upload PDF</span>
                      <span className="text-xs text-muted-foreground">Supports .pdf files</span>
                    </>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="numQuestions">Number of Questions to Generate</Label>
              <Input
                id="numQuestions"
                type="number"
                min={3}
                max={20}
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value) || 10)}
              />
            </div>

          </CardContent>
        </Card>

        {/* Quiz Details Card */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display">Quiz Details</CardTitle>
            <CardDescription>
              Fill in the basic information for your quiz. You can add questions manually after creating it, or use AI generation above.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., JavaScript Fundamentals"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this quiz covers..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>

              {/* Difficulty Selection */}
              <div className="space-y-3">
                <Label>Difficulty Levels</Label>
                <p className="text-xs text-muted-foreground">
                  Select one or more. AI will generate a mix across the chosen levels.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {(['easy', 'medium', 'hard'] as const).map((level) => {
                    const checked = difficulties.includes(level);
                    return (
                      <Label
                        key={level}
                        htmlFor={`difficulty-${level}`}
                        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${
                          checked ? difficultyColors[level] : 'border-border hover:border-accent/50'
                        }`}
                      >
                        <Checkbox
                          id={`difficulty-${level}`}
                          checked={checked}
                          onCheckedChange={(c) => {
                            setDifficulties((prev) =>
                              c ? [...prev, level] : prev.filter((l) => l !== level)
                            );
                          }}
                        />
                        <span className="font-semibold capitalize">{level}</span>
                      </Label>
                    );
                  })}
                </div>
                {difficulties.length === 0 && (
                  <p className="text-sm text-destructive">Select at least one difficulty</p>
                )}
              </div>

              {/* Quiz Type Selection */}
              <div className="space-y-3">
                <Label>Answer Type</Label>
                <RadioGroup
                  value={formData.quizType}
                  onValueChange={(value: 'single' | 'multiple') => 
                    setFormData({ ...formData, quizType: value })
                  }
                  className="grid grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="type-single"
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${
                      formData.quizType === 'single'
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <RadioGroupItem value="single" id="type-single" />
                    <span className="font-semibold">Single Choice</span>
                    <span className="text-xs text-muted-foreground">
                      One correct answer per question
                    </span>
                  </Label>
                  <Label
                    htmlFor="type-multiple"
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${
                      formData.quizType === 'multiple'
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <RadioGroupItem value="multiple" id="type-multiple" />
                    <span className="font-semibold">Multiple Choice</span>
                    <span className="text-xs text-muted-foreground">
                      Multiple correct answers per question
                    </span>
                  </Label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAttempts">Max Attempts</Label>
                <Input
                  id="maxAttempts"
                  type="number"
                  min={1}
                  max={100}
                  value={formData.maxAttempts}
                  onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) || 1 })}
                />
                {errors.maxAttempts && <p className="text-sm text-destructive">{errors.maxAttempts}</p>}
                <p className="text-sm text-muted-foreground">
                  How many times a student can attempt this quiz
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  max={180}
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
                />
                {errors.duration && <p className="text-sm text-destructive">{errors.duration}</p>}
                <p className="text-sm text-muted-foreground">
                  Set how long students have to complete this quiz
                </p>
              </div>

              {/* Add Manual Questions */}
              <div className="flex gap-4 pt-2">
                <Button type="submit" variant="hero" className="gap-2 flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Add Manual Questions
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Schedule */}
              <div className="space-y-3 rounded-lg border border-border/50 p-4">
                <div>
                  <Label className="text-base font-semibold">Availability</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose whether to make this quiz available immediately or schedule it for later.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={scheduleMode === 'live' ? 'default' : 'outline'}
                    onClick={() => {
                      setScheduleMode('live');
                      setScheduledStart('');
                      setScheduledEnd('');
                    }}
                  >
                    🟢 Live Now
                  </Button>
                  <Button
                    type="button"
                    variant={scheduleMode === 'later' ? 'default' : 'outline'}
                    onClick={() => setScheduleMode('later')}
                  >
                    📅 Schedule Later
                  </Button>
                </div>
                {scheduleMode === 'later' && (
                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledStart">Available From</Label>
                      <Input
                        id="scheduledStart"
                        type="datetime-local"
                        value={scheduledStart}
                        onChange={(e) => setScheduledStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduledEnd">Available Until</Label>
                      <Input
                        id="scheduledEnd"
                        type="datetime-local"
                        value={scheduledEnd}
                        onChange={(e) => setScheduledEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </form>

          {/* Bottom actions */}
          <CardContent className="pt-0 space-y-2">
            <Button
              type="button"
              variant="hero"
              className="w-full gap-2"
              disabled={
                isGenerating ||
                !formData.title ||
                !formData.description ||
                (genSource === 'pdf' ? !pdfFile : topic.trim().length < 3)
              }
              onClick={handleGenerate}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Quiz
                </>
              )}
            </Button>
            {(!formData.title || !formData.description || (genSource === 'pdf' ? !pdfFile : topic.trim().length < 3)) && (
              <p className="text-xs text-muted-foreground text-center">
                Fill in the quiz details above and choose a topic or PDF first
              </p>
            )}
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/admin')}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreateQuiz;
