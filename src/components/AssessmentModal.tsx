import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  question: string;
  type: 'multiple_choice' | 'text' | 'coding';
  options?: string[];
  required?: boolean;
}

interface Assessment {
  id: string;
  questions: Question[];
  expires_at: string;
  status: string;
  application_id: string;
  applicant_id: string;
  job_id: string;
}

interface AssessmentModalProps {
  assessmentId: string;
  isOpen: boolean;
  onClose: () => void;
}

const AssessmentModal = ({ assessmentId, isOpen, onClose }: AssessmentModalProps) => {
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (isOpen && assessmentId) {
      fetchAssessment();
    }
  }, [isOpen, assessmentId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (assessment && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [assessment, timeRemaining]);

  const fetchAssessment = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .eq('applicant_id', user?.id)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Assessment not found');
        onClose();
        return;
      }

      if (data.status === 'completed') {
        toast.error('Assessment already completed');
        onClose();
        return;
      }

      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      
      if (expiresAt < now) {
        toast.error('Assessment has expired');
        onClose();
        return;
      }

      const timeLeft = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      setTimeRemaining(timeLeft);
      
      // Parse questions if they're stored as JSON string
      let parsedQuestions = typeof data.questions === 'string' 
        ? JSON.parse(data.questions) 
        : data.questions;
        
      // Handle nested question structure (work_ethics + technical)
      let questionsArray = [];
      if (parsedQuestions && typeof parsedQuestions === 'object') {
        if (Array.isArray(parsedQuestions)) {
          questionsArray = parsedQuestions;
        } else {
          // Flatten nested structure: combine work_ethics and technical questions
          const workEthicsQuestions = parsedQuestions.work_ethics || [];
          const technicalQuestions = parsedQuestions.technical || [];
          questionsArray = [...workEthicsQuestions, ...technicalQuestions];
        }
      }
        
      setAssessment({
        ...data,
        questions: questionsArray
      });
    } catch (error) {
      console.error('Error fetching assessment:', error);
      toast.error('Error loading assessment');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < (assessment?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateScore = () => {
    if (!assessment?.questions) return 0;
    
    let correctAnswers = 0;
    const totalQuestions = assessment.questions.length;
    
    // Count answered questions (simple scoring for demo)
    assessment.questions.forEach((question, index) => {
      const questionKey = `question_${index}`;
      const response = responses[questionKey];
      if (response && response.trim().length > 0) {
        correctAnswers++;
      }
    });
    
    return totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  };

  const handleSubmit = async () => {
    if (!assessment) return;

    setSubmitting(true);
    try {
      const score = calculateScore();
      
      const { error } = await supabase
        .from('assessments')
        .update({
          responses,
          score,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', assessmentId);

      if (error) throw error;

      toast.success('Assessment submitted successfully! The recruiter will review your responses.');
      onClose();
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast.error('Error submitting assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!assessment?.questions?.length) return 0;
    return ((currentQuestionIndex + 1) / assessment.questions.length) * 100;
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!assessment || !assessment.questions || assessment.questions.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Assessment Not Available</DialogTitle>
            <DialogDescription>
              This assessment is not available or has no questions.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === assessment.questions.length - 1;

  // Add safety check for currentQuestion
  if (!currentQuestion) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Question Not Found</DialogTitle>
            <DialogDescription>
              The current question could not be loaded.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Skills Assessment</span>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span className={timeRemaining < 300 ? 'text-red-600 font-bold' : ''}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              {timeRemaining < 300 && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">Time running out!</span>
                </div>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            Question {currentQuestionIndex + 1} of {assessment.questions.length} - Complete this skills assessment to proceed with your application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(getProgressPercentage())}% complete</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>

          {/* Current Question */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {currentQuestion?.question || 'Question not available'}
              </CardTitle>
              {currentQuestion?.required && (
                <CardDescription className="text-red-600">
                  * This question is required
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {currentQuestion?.type === 'multiple_choice' && currentQuestion?.options && (
                <RadioGroup
                  value={responses[`question_${currentQuestionIndex}`] || ''}
                  onValueChange={(value) => handleResponseChange(`question_${currentQuestionIndex}`, value)}
                >
                  {currentQuestion?.options?.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion?.type === 'text' && (
                <Textarea
                  value={responses[`question_${currentQuestionIndex}`] || ''}
                  onChange={(e) => handleResponseChange(`question_${currentQuestionIndex}`, e.target.value)}
                  placeholder="Enter your answer here..."
                  rows={4}
                />
              )}

              {currentQuestion?.type === 'coding' && (
                <div className="space-y-2">
                  <Label>Your code solution:</Label>
                  <Textarea
                    value={responses[`question_${currentQuestionIndex}`] || ''}
                    onChange={(e) => handleResponseChange(`question_${currentQuestionIndex}`, e.target.value)}
                    placeholder="Write your code here..."
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {!isLastQuestion ? (
                <Button onClick={handleNext}>
                  Next Question
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {submitting ? 'Submitting...' : 'Submit Assessment'}
                </Button>
              )}
            </div>
          </div>

          {/* Question Overview */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Question Overview</h4>
            <div className="grid grid-cols-10 gap-1">
              {assessment.questions.map((_, index) => (
                <Button
                  key={index}
                  variant={index === currentQuestionIndex ? "default" : "outline"}
                  size="sm"
                  className={`h-8 w-8 p-0 ${
                    responses[`question_${index}`] 
                      ? 'bg-green-100 border-green-300 text-green-800' 
                      : ''
                  }`}
                  onClick={() => setCurrentQuestionIndex(index)}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssessmentModal;