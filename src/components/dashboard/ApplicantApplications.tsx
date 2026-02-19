import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Building, MapPin, Clock, DollarSign, FileText, User, Star, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import AssessmentModal from '@/components/AssessmentModal';

interface Application {
  id: string;
  applicant_id: string;
  job_id: string;
  cover_letter: string;
  resume_url: string;
  status: string;
  applied_at: string;
  jobs: {
    id: string;
    title: string;
    description: string;
    location: string;
    job_type: string;
    experience_level: string;
    salary_min?: number;
    salary_max?: number;
    companies?: {
      name: string;
      logo_url?: string;
    };
  };
  assessments?: Array<{
    id: string;
    status: string;
    assessment_url: string;
    expires_at: string;
    score?: number;
  }>;
}

const ApplicantApplications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data: applicationsData, error } = await supabase
        .from('applications')
        .select(`
          id,
          applicant_id,
          job_id,
          cover_letter,
          resume_url,
          status,
          applied_at
        `)
        .eq('applicant_id', user?.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      // Get job details for each application
      const jobIds = applicationsData?.map(app => app.job_id) || [];
      const { data: jobsData } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          description,
          location,
          job_type,
          experience_level,
          salary_min,
          salary_max,
          companies(name, logo_url)
        `)
        .in('id', jobIds);

      // Get assessments for each application
      const applicationIds = applicationsData?.map(app => app.id) || [];
      const { data: assessmentsData } = await supabase
        .from('assessments')
        .select('id, application_id, status, assessment_url, expires_at, score')
        .in('application_id', applicationIds);

      // Combine the data
      const enrichedApplications = applicationsData?.map(app => {
        const job = jobsData?.find(j => j.id === app.job_id);
        const assessments = assessmentsData?.filter(a => a.application_id === app.id) || [];
        
        return {
          ...app,
          jobs: job || { 
            id: app.job_id, 
            title: 'Unknown Job', 
            description: '', 
            location: '', 
            job_type: '', 
            experience_level: '',
            companies: null 
          },
          assessments
        };
      }) || [];

      setApplications(enrichedApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Error loading applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reviewed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shortlisted': return 'bg-green-100 text-green-800 border-green-200';
      case 'interview': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'hired': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAssessmentStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Applications</h2>
          <p className="text-muted-foreground">Track your job applications and their status</p>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {applications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
              <p className="text-muted-foreground text-center">
                Start applying to jobs to see your applications here
              </p>
            </CardContent>
          </Card>
        ) : (
          applications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      {application.jobs.companies?.logo_url ? (
                        <img
                          src={application.jobs.companies.logo_url}
                          alt={application.jobs.companies.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <Building className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    
                    <div>
                      <CardTitle className="text-lg">{application.jobs.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        {application.jobs.companies && (
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {application.jobs.companies.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {application.jobs.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {application.jobs.job_type}
                        </span>
                      </CardDescription>
                      
                      {application.jobs.salary_min && application.jobs.salary_max && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          ${application.jobs.salary_min.toLocaleString()} - ${application.jobs.salary_max.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(application.status)}
                    >
                      {application.status}
                    </Badge>
                    
                    <div className="text-sm text-muted-foreground text-right">
                      Applied {new Date(application.applied_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Job Description Preview */}
                  <div>
                    <h4 className="font-semibold mb-2">Job Description</h4>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {application.jobs.description}
                    </p>
                  </div>

                  {/* Cover Letter Preview */}
                  {application.cover_letter && (
                    <div>
                      <h4 className="font-semibold mb-2">Your Cover Letter</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded line-clamp-4">
                        {application.cover_letter}
                      </p>
                    </div>
                  )}

                  {/* Assessments */}
                  {application.assessments && application.assessments.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Assessments</h4>
                      <div className="space-y-2">
                        {application.assessments.map((assessment) => (
                          <div key={assessment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-primary" />
                              <div>
                                <p className="text-sm font-medium">Skills Assessment</p>
                                <p className="text-xs text-muted-foreground">
                                  {assessment.status === 'sent' && `Expires: ${new Date(assessment.expires_at).toLocaleDateString()}`}
                                  {assessment.status === 'completed' && assessment.score && `Score: ${assessment.score}%`}
                                  {assessment.status === 'expired' && 'Assessment expired'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={getAssessmentStatusColor(assessment.status)}
                              >
                                {assessment.status}
                              </Badge>
                              
                              {assessment.status === 'sent' && new Date(assessment.expires_at) > new Date() && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setSelectedAssessment(assessment.id)}
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Take Assessment
                                </Button>
        )}
      </div>

      {/* Assessment Modal */}
      {selectedAssessment && (
        <AssessmentModal
          assessmentId={selectedAssessment}
          isOpen={!!selectedAssessment}
          onClose={() => {
            setSelectedAssessment(null);
            fetchApplications(); // Refresh to show updated status
          }}
        />
      )}
    </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ApplicantApplications;