import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  question: string;
  type: string;
  options: string[];
}

interface Assessment {
  id: string;
  questions: any;
  status: string;
  job_id: string;
  applicant_id: string;
  expires_at: string;
}

const Assessment = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState<'work_ethics' | 'technical'>('work_ethics');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (assessmentId) {
      fetchAssessment();
    }
  }, [assessmentId]);

  const fetchAssessment = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (error) {
        toast.error('Assessment not found');
        navigate('/');
        return;
      }

      // Check if assessment is expired
      if (new Date(data.expires_at) < new Date()) {
        toast.error('This assessment has expired');
        navigate('/');
        return;
      }

      // Check if already completed
      if (data.status === 'completed') {
        toast.error('This assessment has already been completed');
        navigate('/');
        return;
      }

      setAssessment({
        ...data,
        questions: typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions
      });
    } catch (error) {
      console.error('Error fetching assessment:', error);
      toast.error('Failed to load assessment');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentQuestions = () => {
    if (!assessment) return [];
    return assessment.questions[currentSection] || [];
  };

  const getTotalQuestions = () => {
    if (!assessment) return 0;
    return (assessment.questions.work_ethics?.length || 0) + (assessment.questions.technical?.length || 0);
  };

  const getCompletedQuestions = () => {
    return Object.keys(answers).length;
  };

  const handleAnswerChange = (value: string) => {
    const questionKey = `${currentSection}_${currentQuestionIndex}`;
    setAnswers(prev => ({ ...prev, [questionKey]: value }));
  };

  const handleNext = () => {
    const currentQuestions = getCurrentQuestions();
    
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentSection === 'work_ethics') {
      setCurrentSection('technical');
      setCurrentQuestionIndex(0);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentSection === 'technical') {
      setCurrentSection('work_ethics');
      const workEthicsQuestions = assessment?.questions.work_ethics || [];
      setCurrentQuestionIndex(workEthicsQuestions.length - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Calculate score (simplified scoring)
      const totalQuestions = getTotalQuestions();
      const score = Math.round((getCompletedQuestions() / totalQuestions) * 100);

      const { error } = await supabase
        .from('assessments')
        .update({
          responses: answers,
          score: score,
          status: 'completed'
        })
        .eq('id', assessmentId);

      if (error) throw error;

      toast.success('Assessment submitted successfully!');
      navigate('/assessment-complete');
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast.error('Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Assessment Not Found</CardTitle>
            <CardDescription>The assessment you're looking for doesn't exist or has expired.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentQuestions = getCurrentQuestions();
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const questionKey = `${currentSection}_${currentQuestionIndex}`;
  const currentAnswer = answers[questionKey];
  const progress = ((getCompletedQuestions()) / getTotalQuestions()) * 100;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Assessment</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Expires: {new Date(assessment.expires_at).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress: {getCompletedQuestions()} of {getTotalQuestions()} questions</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Section Indicator */}
        <div className="flex gap-4 mb-8">
          <div className={`px-4 py-2 rounded-lg ${currentSection === 'work_ethics' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            Work Ethics ({assessment.questions.work_ethics?.length || 0} questions)
            {currentSection === 'work_ethics' && <span className="ml-2">← Current</span>}
          </div>
          <div className={`px-4 py-2 rounded-lg ${currentSection === 'technical' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            Technical ({assessment.questions.technical?.length || 0} questions)
            {currentSection === 'technical' && <span className="ml-2">← Current</span>}
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Question {currentQuestionIndex + 1} of {currentQuestions.length}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {currentSection === 'work_ethics' ? 'Work Ethics' : 'Technical'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg leading-relaxed">{currentQuestion?.question}</p>
            
            <RadioGroup value={currentAnswer} onValueChange={handleAnswerChange}>
              {currentQuestion?.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            disabled={currentSection === 'work_ethics' && currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          <Button 
            onClick={handleNext}
            disabled={!currentAnswer || submitting}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : currentSection === 'technical' && currentQuestionIndex === currentQuestions.length - 1 ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Assessment
              </>
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Assessment;