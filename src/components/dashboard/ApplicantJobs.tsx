import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, MapPin, DollarSign, Clock, Building, Star, FileText, Send, Bot } from 'lucide-react';
import { toast } from 'sonner';

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  job_type: string;
  experience_level: string;
  salary_min?: number;
  salary_max?: number;
  skills_required: string[];
  requirements: string[];
  created_at: string;
  company?: {
    name: string;
    logo_url?: string;
  };
}

interface ApplicantProfile {
  skills: string[];
  experience_years?: number;
  bio?: string;
}

const ApplicantJobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicantProfile, setApplicantProfile] = useState<ApplicantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchApplicantProfile();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          companies(name, logo_url)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Error loading jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicantProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('applicant_profiles')
        .select('skills, experience_years, bio')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setApplicantProfile(data);
    } catch (error) {
      console.error('Error fetching applicant profile:', error);
    }
  };

  const calculateMatchScore = (job: Job) => {
    if (!applicantProfile) return 0;

    let score = 0;
    let factors = 0;

    // Skills match (40% weight)
    if (job.skills_required && applicantProfile.skills) {
      const matchingSkills = job.skills_required.filter(skill =>
        applicantProfile.skills.some(userSkill =>
          userSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(userSkill.toLowerCase())
        )
      );
      const skillScore = (matchingSkills.length / job.skills_required.length) * 100;
      score += skillScore * 0.4;
      factors += 0.4;
    }

    // Experience match (30% weight)
    if (applicantProfile.experience_years) {
      let experienceScore = 0;
      switch (job.experience_level) {
        case 'entry':
          experienceScore = applicantProfile.experience_years >= 0 ? 100 : 50;
          break;
        case 'mid':
          experienceScore = applicantProfile.experience_years >= 3 ? 100 : Math.max(0, applicantProfile.experience_years * 33);
          break;
        case 'senior':
          experienceScore = applicantProfile.experience_years >= 7 ? 100 : Math.max(0, applicantProfile.experience_years * 14);
          break;
        case 'lead':
          experienceScore = applicantProfile.experience_years >= 10 ? 100 : Math.max(0, applicantProfile.experience_years * 10);
          break;
        default:
          experienceScore = 75;
      }
      score += experienceScore * 0.3;
      factors += 0.3;
    }

    // Base compatibility (30% weight)
    score += 75 * 0.3;
    factors += 0.3;

    return Math.round(score / factors);
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const generateCoverLetter = async (job: Job) => {
    setGeneratingCoverLetter(true);
    try {
      // This would call an AI service to generate a cover letter
      // For now, we'll create a template-based cover letter
      const template = `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company?.name || 'your company'}. With ${applicantProfile?.experience_years || 'several'} years of experience and expertise in ${applicantProfile?.skills?.slice(0, 3).join(', ') || 'relevant technologies'}, I am confident that I would be a valuable addition to your team.

${applicantProfile?.bio ? `${applicantProfile.bio}\n\n` : ''}I am particularly excited about this opportunity because it aligns perfectly with my career goals and technical expertise. The job requirements match well with my background in ${job.skills_required?.slice(0, 2).join(' and ') || 'software development'}.

I would welcome the opportunity to discuss how my skills and experience can contribute to your team's success. Thank you for considering my application.

Best regards,
[Your Name]`;

      setCoverLetter(template);
      toast.success('Cover letter generated successfully!');
    } catch (error) {
      console.error('Error generating cover letter:', error);
      toast.error('Error generating cover letter');
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  const handleApply = async () => {
    if (!selectedJob) return;

    setApplying(true);
    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          applicant_id: user?.id,
          job_id: selectedJob.id,
          cover_letter: coverLetter,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Application submitted successfully!');
      setShowApplicationDialog(false);
      setCoverLetter('');
      setSelectedJob(null);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Error submitting application');
    } finally {
      setApplying(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.company?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = !locationFilter || 
                           job.location.toLowerCase().includes(locationFilter.toLowerCase());
    
    const matchesJobType = !jobTypeFilter || jobTypeFilter === 'all-types' || job.job_type === jobTypeFilter;
    
    return matchesSearch && matchesLocation && matchesJobType;
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
          <h2 className="text-2xl font-bold">Find Jobs</h2>
          <p className="text-muted-foreground">Discover opportunities that match your skills and experience</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title, company, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="Location..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-40"
          />
          
          <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-types">All Types</SelectItem>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid gap-6">
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
              <p className="text-muted-foreground text-center">
                {searchTerm || locationFilter || jobTypeFilter 
                  ? 'Try adjusting your search criteria'
                  : 'No active job postings available'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => {
            const matchScore = calculateMatchScore(job);
            
            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        {job.company?.logo_url ? (
                          <img
                            src={job.company.logo_url}
                            alt={job.company.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <Building className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      
                      <div>
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {job.company?.name || 'Company'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {job.job_type}
                          </span>
                        </CardDescription>
                        
                        {job.salary_min && job.salary_max && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getMatchScoreColor(matchScore)}`}>
                          {matchScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">Match</div>
                        <Progress value={matchScore} className="w-16 h-2 mt-1" />
                      </div>
                      
                      <Dialog 
                        open={showApplicationDialog && selectedJob?.id === job.id} 
                        onOpenChange={(open) => {
                          setShowApplicationDialog(open);
                          if (!open) {
                            setSelectedJob(null);
                            setCoverLetter('');
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button 
                            onClick={() => setSelectedJob(job)}
                            className={matchScore >= 85 ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            Apply Now
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Apply for {job.title}</DialogTitle>
                            <DialogDescription>
                              Complete your application for this position
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold">Job Match Analysis</h4>
                                <div className={`text-lg font-bold ${getMatchScoreColor(matchScore)}`}>
                                  {matchScore}% Match
                                </div>
                              </div>
                              <Progress value={matchScore} className="mb-2" />
                              <p className="text-sm text-muted-foreground">
                                {matchScore >= 85 ? 'Excellent match! You meet most requirements.' :
                                 matchScore >= 70 ? 'Good match. Consider highlighting relevant experience.' :
                                 'Some skills may be missing, but your unique background could be valuable.'}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="cover_letter">Cover Letter</Label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => generateCoverLetter(job)}
                                  disabled={generatingCoverLetter}
                                  className="flex items-center gap-2"
                                >
                                  <Bot className="h-4 w-4" />
                                  {generatingCoverLetter ? 'Generating...' : 'AI Generate'}
                                </Button>
                              </div>
                              <Textarea
                                id="cover_letter"
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                placeholder="Write your cover letter here..."
                                rows={8}
                                className="resize-none"
                              />
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                              <Button 
                                variant="outline" 
                                onClick={() => setShowApplicationDialog(false)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleApply}
                                disabled={applying || !coverLetter.trim()}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {applying ? 'Submitting...' : 'Submit Application'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {job.description}
                    </p>
                    
                    {job.skills_required && job.skills_required.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Required Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.skills_required.map((skill, index) => {
                            const hasSkill = applicantProfile?.skills?.some(userSkill =>
                              userSkill.toLowerCase().includes(skill.toLowerCase()) ||
                              skill.toLowerCase().includes(userSkill.toLowerCase())
                            );
                            
                            return (
                              <Badge 
                                key={index} 
                                variant={hasSkill ? "default" : "secondary"}
                                className={hasSkill ? "bg-green-600" : ""}
                              >
                                {skill}
                                {hasSkill && <Star className="h-3 w-3 ml-1" />}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Posted {new Date(job.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{job.title}</DialogTitle>
                              <DialogDescription>
                                {job.company?.name && `${job.company.name} • `}
                                {job.location} • {job.job_type}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-6">
                              {/* Job Overview */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <h4 className="font-semibold">Experience Level</h4>
                                  <p className="text-sm text-muted-foreground capitalize">{job.experience_level}</p>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="font-semibold">Job Type</h4>
                                  <p className="text-sm text-muted-foreground capitalize">{job.job_type}</p>
                                </div>
                                {job.salary_min && job.salary_max && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold">Salary Range</h4>
                                    <p className="text-sm text-muted-foreground">
                                      ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Description */}
                              <div>
                                <h4 className="font-semibold mb-2">Job Description</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                              </div>

                              {/* Skills Required */}
                              {job.skills_required && job.skills_required.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2">Required Skills</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {job.skills_required.map((skill, index) => {
                                      const hasSkill = applicantProfile?.skills?.some(userSkill =>
                                        userSkill.toLowerCase().includes(skill.toLowerCase()) ||
                                        skill.toLowerCase().includes(userSkill.toLowerCase())
                                      );
                                      
                                      return (
                                        <Badge 
                                          key={index} 
                                          variant={hasSkill ? "default" : "secondary"}
                                          className={hasSkill ? "bg-green-600" : ""}
                                        >
                                          {skill}
                                          {hasSkill && <Star className="h-3 w-3 ml-1" />}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Requirements */}
                              {job.requirements && job.requirements.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2">Requirements</h4>
                                  <ul className="list-disc list-inside space-y-1">
                                    {job.requirements.map((requirement, index) => (
                                      <li key={index} className="text-sm text-muted-foreground">{requirement}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Match Analysis */}
                              <div className="p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold">Job Match Analysis</h4>
                                  <div className={`text-lg font-bold ${getMatchScoreColor(calculateMatchScore(job))}`}>
                                    {calculateMatchScore(job)}% Match
                                  </div>
                                </div>
                                <Progress value={calculateMatchScore(job)} className="mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  {calculateMatchScore(job) >= 85 ? 'Excellent match! You meet most requirements.' :
                                   calculateMatchScore(job) >= 70 ? 'Good match. Consider highlighting relevant experience.' :
                                   'Some skills may be missing, but your unique background could be valuable.'}
                                </p>
                              </div>

                              {/* Apply Button */}
                              <div className="flex justify-end pt-4 border-t">
                                <Button 
                                  onClick={() => {
                                    setSelectedJob(job);
                                    setShowApplicationDialog(true);
                                  }}
                                  className={calculateMatchScore(job) >= 85 ? 'bg-green-600 hover:bg-green-700' : ''}
                                >
                                  Apply for this Position
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm">
                          <Star className="h-4 w-4 mr-2" />
                          Save Job
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ApplicantJobs;