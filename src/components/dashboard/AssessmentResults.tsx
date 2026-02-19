import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

interface AssessmentResultsProps {
  applicationId: string;
}

interface Assessment {
  id: string;
  status: string;
  score?: number;
  responses?: any;
  questions?: any;
  created_at: string;
  expires_at: string;
  applicant_id: string;
}

const AssessmentResults = ({ applicationId }: AssessmentResultsProps) => {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssessment();
  }, [applicationId]);

  const fetchAssessment = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      setAssessment(data?.[0] || null);
    } catch (error) {
      console.error('Error fetching assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAssessment = async () => {
    try {
      // Get application details first
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('id, applicant_id, job_id')
        .eq('id', applicationId)
        .single();

      if (appError) throw appError;

      // Get job details
      const { data: jobData } = await supabase
        .from('jobs')
        .select('title')
        .eq('id', appData.job_id)
        .single();

      // Get profile details
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', appData.applicant_id)
        .single();

      // Generate assessment via edge function
      const { error } = await supabase.functions.invoke('generate-assessment', {
        body: { 
          applicationId,
          applicantEmail: profileData?.email,
          applicantName: profileData?.full_name,
          jobTitle: jobData?.title
        }
      });

      if (error) throw error;

      // Refresh assessment data
      fetchAssessment();
    } catch (error) {
      console.error('Error generating assessment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Sent</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getQuestionCount = (questions: any) => {
    if (!questions) return 0;
    
    if (typeof questions === 'string') {
      try {
        const parsed = JSON.parse(questions);
        if (Array.isArray(parsed)) return parsed.length;
        if (parsed.work_ethics && parsed.technical) {
          return (parsed.work_ethics.length || 0) + (parsed.technical.length || 0);
        }
      } catch {
        return 0;
      }
    }
    
    if (Array.isArray(questions)) return questions.length;
    if (questions.work_ethics && questions.technical) {
      return (questions.work_ethics.length || 0) + (questions.technical.length || 0);
    }
    
    return 0;
  };

  const getResponseCount = (responses: any) => {
    if (!responses) return 0;
    if (typeof responses === 'object') {
      return Object.keys(responses).length;
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">
          No assessment generated yet for this application.
        </p>
        <Button onClick={generateAssessment}>
          Generate Assessment Test
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Assessment Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">Assessment Status</h4>
                {getStatusBadge(assessment.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                Created: {new Date(assessment.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Expires: {new Date(assessment.expires_at).toLocaleDateString()}
              </p>
            </div>
            
            {assessment.status === 'completed' && assessment.score !== null && (
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {assessment.score}%
                </div>
                <div className="text-xs text-muted-foreground">Score</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assessment Details */}
      {assessment.questions && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">Assessment Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Questions:</span>
                <span className="ml-2 font-medium">{getQuestionCount(assessment.questions)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Answered:</span>
                <span className="ml-2 font-medium">{getResponseCount(assessment.responses)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Results */}
      {assessment.status === 'completed' && assessment.responses && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">Candidate Responses</h4>
            <div className="space-y-2">
              {Object.entries(assessment.responses).map(([questionKey, answer], index) => (
                <div key={questionKey} className="p-3 bg-muted/50 rounded">
                  <div className="text-sm font-medium mb-1">Question {index + 1}</div>
                  <div className="text-sm text-muted-foreground">
                    {typeof answer === 'string' ? answer : JSON.stringify(answer)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Messages */}
      {assessment.status === 'sent' && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded text-blue-800 text-sm">
          <Clock className="h-4 w-4" />
          Assessment sent to candidate. Waiting for completion.
        </div>
      )}
      
      {assessment.status === 'expired' && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded text-red-800 text-sm">
          <XCircle className="h-4 w-4" />
          Assessment has expired. Consider generating a new one.
        </div>
      )}
    </div>
  );
};

export default AssessmentResults;