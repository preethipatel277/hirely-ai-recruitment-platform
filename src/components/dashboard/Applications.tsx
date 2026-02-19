import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FileText, User, Calendar, Star, MessageSquare, CheckCircle, Clock, XCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import AssessmentResults from './AssessmentResults';

interface Application {
  id: string;
  applicant_id: string;
  job_id: string;
  cover_letter: string;
  resume_url: string;
  status: string;
  applied_at: string;
  jobs: {
    title: string;
    recruiter_id: string;
    companies?: {
      name: string;
    };
  };
  profiles: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  ai_match_scores?: Array<{
    match_score: number;
    analysis: string;
    criteria: any;
  }>;
}

const Applications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      // Simplified query to avoid complex joins
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
        .order('applied_at', { ascending: false });

      if (error) throw error;

      // Get jobs for the recruiter
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, title, recruiter_id, companies(name)')
        .eq('recruiter_id', user?.id);

      // Get profiles for applicants
      const applicantIds = applicationsData?.map(app => app.applicant_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', applicantIds);

      // Combine the data
      const enrichedApplications = applicationsData?.map(app => {
        const job = jobsData?.find(j => j.id === app.job_id);
        const profile = profilesData?.find(p => p.user_id === app.applicant_id);
        
        return {
          ...app,
          jobs: job || { title: 'Unknown Job', recruiter_id: '', companies: null },
          profiles: profile || { full_name: 'Unknown', email: 'Unknown', avatar_url: null }
        };
      }).filter(app => app.jobs.recruiter_id === user?.id) || [];

      setApplications(enrichedApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Error loading applications');
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;
      
      toast.success(`Application ${newStatus}`);
      fetchApplications();
    } catch (error) {
      console.error('Error updating application status:', error);
      toast.error('Error updating application status');
    }
  };

  const generateAIAnalysis = async (applicationId: string, jobId: string, applicantId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: { applicationId, jobId, applicantId }
      });

      if (error) throw error;

      setAnalysisData(data);
      toast.success('AI analysis completed successfully!');
      
      // Refresh applications to show updated match scores
      fetchApplications();
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      toast.error('Failed to generate AI analysis');
    }
  };

  const generateAssessment = async (applicationId: string, applicantEmail: string, applicantName: string, jobTitle: string) => {
    if (!analysisData?.assessment_questions) {
      toast.error('Please run AI analysis first to generate assessment questions');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-assessment', {
        body: { 
          applicationId, 
          questions: analysisData.assessment_questions,
          applicantEmail,
          applicantName,
          jobTitle
        }
      });

      if (error) throw error;

      toast.success('Assessment generated and sent to applicant!');
    } catch (error) {
      console.error('Error generating assessment:', error);
      toast.error('Failed to generate assessment');
    }
  };

  const contactCandidate = async () => {
    if (!selectedCandidate || !contactMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      // Get recruiter profile for name
      const { data: recruiterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user?.id)
        .single();

      const { data, error } = await supabase.functions.invoke('contact-candidate', {
        body: { 
          candidateEmail: selectedCandidate.profiles.email,
          candidateName: selectedCandidate.profiles.full_name,
          recruiterName: recruiterProfile?.full_name || 'Recruiter',
          jobTitle: selectedCandidate.jobs.title,
          message: contactMessage
        }
      });

      if (error) throw error;

      toast.success('Message sent successfully to candidate!');
      setContactMessage('');
      setSelectedCandidate(null);
    } catch (error) {
      console.error('Error contacting candidate:', error);
      toast.error('Failed to send message to candidate');
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'reviewing': return 'bg-blue-500';
      case 'shortlisted': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredApplications = applications.filter(app => {
    if (selectedStatus === 'all') return true;
    if (selectedStatus === 'high-match') {
      return app.ai_match_scores?.[0]?.match_score >= 85;
    }
    return app.status === selectedStatus;
  });

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
          <h2 className="text-2xl font-bold">Applications</h2>
          <p className="text-muted-foreground">Review and manage candidate applications</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Applications</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="shortlisted">Shortlisted</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Overview - Clickable Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${selectedStatus === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedStatus('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Applications</p>
                <p className="text-2xl font-bold">{applications.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${selectedStatus === 'pending' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedStatus('pending')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">
                  {applications.filter(app => app.status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${selectedStatus === 'shortlisted' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedStatus('shortlisted')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Shortlisted</p>
                <p className="text-2xl font-bold">
                  {applications.filter(app => app.status === 'shortlisted').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${selectedStatus === 'high-match' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedStatus('high-match')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Match (85%+)</p>
                <p className="text-2xl font-bold">
                  {applications.filter(app => 
                    app.ai_match_scores?.[0]?.match_score >= 85
                  ).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Star className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No applications found</h3>
              <p className="text-muted-foreground text-center">
                {selectedStatus === 'all' 
                  ? 'Applications will appear here when candidates apply to your jobs'
                  : `No applications with status "${selectedStatus}"`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredApplications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{application.profiles.full_name}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span>{application.profiles.email}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Applied {new Date(application.applied_at).toLocaleDateString()}
                        </span>
                      </CardDescription>
                      <div className="mt-2">
                        <p className="text-sm font-medium">{application.jobs.title}</p>
                        {application.jobs.companies && (
                          <p className="text-sm text-muted-foreground">{application.jobs.companies.name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* AI Match Score */}
                    {application.ai_match_scores?.[0] && (
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getMatchScoreColor(application.ai_match_scores[0].match_score)}`}>
                          {application.ai_match_scores[0].match_score}%
                        </div>
                        <div className="text-xs text-muted-foreground">Match Score</div>
                        <Progress 
                          value={application.ai_match_scores[0].match_score} 
                          className="w-16 h-2 mt-1"
                        />
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-2">
                      <Badge 
                        variant="outline" 
                        className={`${application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                   application.status === 'shortlisted' ? 'bg-green-100 text-green-800' : 
                                   application.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                   'bg-blue-100 text-blue-800'} border-none`}
                      >
                        {application.status}
                      </Badge>
                      
                      <Select 
                        value={application.status} 
                        onValueChange={(value) => updateApplicationStatus(application.id, value)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="reviewed">Reviewed</SelectItem>
                          <SelectItem value="shortlisted">Shortlisted</SelectItem>
                          <SelectItem value="interview">Interview</SelectItem>
                          <SelectItem value="hired">Hired</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="application" className="w-full">
                  <TabsList>
                    <TabsTrigger value="application">Application</TabsTrigger>
                    <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
                    <TabsTrigger value="assessment">Assessment</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="application" className="space-y-4">
                    {application.cover_letter && (
                      <div>
                        <h4 className="font-semibold mb-2">Cover Letter</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                          {application.cover_letter}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      {application.resume_url && (
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View Resume
                        </Button>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedCandidate(application)}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Contact Candidate
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Contact Candidate</DialogTitle>
                            <DialogDescription>
                              Send a message to {application.profiles.full_name} regarding the {application.jobs.title} position.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Candidate Contact Details */}
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <h4 className="font-semibold mb-2">Candidate Details</h4>
                              <div className="space-y-1 text-sm">
                                <p><strong>Name:</strong> {application.profiles.full_name}</p>
                                <p><strong>Email:</strong> {application.profiles.email}</p>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Message</label>
                              <Textarea
                                value={contactMessage}
                                onChange={(e) => setContactMessage(e.target.value)}
                                placeholder="Write your message to the candidate..."
                                className="mt-1"
                                rows={6}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => {
                                setContactMessage('');
                                setSelectedCandidate(null);
                              }}>
                                Cancel
                              </Button>
                              <Button onClick={contactCandidate}>
                                Send Message
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="analysis" className="space-y-4">
                    {application.ai_match_scores?.[0] ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-muted/50 rounded">
                            <div className={`text-2xl font-bold ${getMatchScoreColor(application.ai_match_scores[0].match_score)}`}>
                              {application.ai_match_scores[0].match_score}%
                            </div>
                            <div className="text-sm text-muted-foreground">Overall Match</div>
                          </div>
                          <div className="text-center p-4 bg-muted/50 rounded">
                            <div className="text-2xl font-bold text-blue-600">85%</div>
                            <div className="text-sm text-muted-foreground">Skills Match</div>
                          </div>
                          <div className="text-center p-4 bg-muted/50 rounded">
                            <div className="text-2xl font-bold text-purple-600">78%</div>
                            <div className="text-sm text-muted-foreground">Experience Match</div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">AI Analysis</h4>
                          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                            {application.ai_match_scores[0].analysis || 'Detailed analysis will appear here...'}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Skill Improvement Suggestions</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Consider developing expertise in cloud technologies (AWS/Azure)</li>
                            <li>• Leadership experience would strengthen candidacy for senior roles</li>
                            <li>• Modern frontend frameworks knowledge could be beneficial</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">AI analysis will be generated shortly...</p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => generateAIAnalysis(application.id, application.job_id, application.applicant_id)}
                        >
                          Generate Analysis
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="assessment" className="space-y-4">
                    {/* Fetch and display assessment results here */}
                    <AssessmentResults applicationId={application.id} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Applications;