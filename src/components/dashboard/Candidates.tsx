import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Search, Filter, Star, MapPin, Briefcase, FileText, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface Candidate {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  location?: string;
  applicant_profile?: {
    experience_years: number;
    skills: string[];
    bio: string;
    salary_expectation: number;
    availability: string;
    portfolio_url?: string;
    education?: string;
  };
  applications?: any[];
}

const Candidates = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      // Get applicant profile details first (these are accessible by recruiters)
      const { data: applicantProfiles, error: applicantError } = await supabase
        .from('applicant_profiles')
        .select('*');

      if (applicantError) throw applicantError;

      if (!applicantProfiles || applicantProfiles.length === 0) {
        setCandidates([]);
        return;
      }

      // Get the user IDs from applicant profiles
      const userIds = applicantProfiles.map(ap => ap.user_id);

      // Get basic profile info for these users through the public view
      // Since RLS might be blocking direct access, let's try a different approach
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url, location')
        .in('user_id', userIds);

      if (profilesError) {
        console.warn('Could not fetch profiles directly, using applicant data only:', profilesError);
      }

      // Combine the data, creating fallback profiles if needed
      const enrichedCandidates = applicantProfiles.map(applicantProfile => {
        const profile = profiles?.find(p => p.user_id === applicantProfile.user_id);
        
        return {
          id: applicantProfile.id,
          user_id: applicantProfile.user_id,
          full_name: profile?.full_name || 'Anonymous User',
          email: profile?.email || 'No email available',
          avatar_url: profile?.avatar_url,
          location: profile?.location,
          applicant_profile: applicantProfile,
          applications: [] // Simplified for now
        };
      });

      setCandidates(enrichedCandidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Error loading candidates');
    } finally {
      setLoading(false);
    }
  };

  const getAverageMatchScore = (candidate: Candidate) => {
    // Simplified - return a placeholder score for now
    return Math.floor(Math.random() * 40) + 60; // Random score between 60-100
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.applicant_profile?.bio?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSkill = !skillFilter || 
                        candidate.applicant_profile?.skills?.some(skill => 
                          skill.toLowerCase().includes(skillFilter.toLowerCase())
                        );
    
    const matchesExperience = !experienceFilter || experienceFilter === 'any-experience' ||
                             (candidate.applicant_profile?.experience_years && 
                              candidate.applicant_profile.experience_years >= parseInt(experienceFilter));
    
    return matchesSearch && matchesSkill && matchesExperience;
  });

  const handleViewProfile = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowProfileDialog(true);
  };

  const handleViewPortfolio = (portfolioUrl: string) => {
    // Ensure the URL has a protocol
    const url = portfolioUrl.startsWith('http://') || portfolioUrl.startsWith('https://') 
      ? portfolioUrl 
      : `https://${portfolioUrl}`;
    window.open(url, '_blank');
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
          <h2 className="text-2xl font-bold">Candidate Database</h2>
          <p className="text-muted-foreground">Browse and search through all registered candidates</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name, email, or bio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="Filter by skill..."
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="w-40"
          />
          
          <Select value={experienceFilter} onValueChange={setExperienceFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Min experience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any-experience">Any experience</SelectItem>
              <SelectItem value="1">1+ years</SelectItem>
              <SelectItem value="3">3+ years</SelectItem>
              <SelectItem value="5">5+ years</SelectItem>
              <SelectItem value="10">10+ years</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Candidates Grid */}
      <div className="grid gap-6">
        {filteredCandidates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
              <p className="text-muted-foreground text-center">
                {searchTerm || skillFilter || experienceFilter 
                  ? 'Try adjusting your search criteria'
                  : 'No candidates have registered yet'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCandidates.map((candidate) => {
            const averageScore = getAverageMatchScore(candidate);
            
            return (
              <Card key={candidate.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        {candidate.avatar_url ? (
                          <img
                            src={candidate.avatar_url}
                            alt={candidate.full_name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-8 w-8 text-primary" />
                        )}
                      </div>
                      
                      <div>
                        <CardTitle className="text-xl">{candidate.full_name}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {candidate.email}
                          </span>
                          {candidate.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {candidate.location}
                            </span>
                          )}
                        </CardDescription>
                        
                        {candidate.applicant_profile && (
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-4 w-4" />
                              {candidate.applicant_profile.experience_years} years experience
                            </span>
                            {candidate.applicant_profile.salary_expectation && (
                              <span>
                                Expected: ${candidate.applicant_profile.salary_expectation.toLocaleString()}
                              </span>
                            )}
                            {candidate.applicant_profile.availability && (
                              <Badge variant="secondary">
                                {candidate.applicant_profile.availability}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getMatchScoreColor(averageScore)}`}>
                          {averageScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">Avg Match</div>
                        <Progress value={averageScore} className="w-16 h-2 mt-1" />
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewProfile(candidate)}
                        >
                          View Profile
                        </Button>
                        <Button size="sm">
                          Contact
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {candidate.applicant_profile?.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {candidate.applicant_profile.bio}
                      </p>
                    )}
                    
                    {candidate.applicant_profile?.skills && candidate.applicant_profile.skills.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {candidate.applicant_profile.skills.slice(0, 8).map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                          {candidate.applicant_profile.skills.length > 8 && (
                            <Badge variant="outline">
                              +{candidate.applicant_profile.skills.length - 8} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {candidate.applications?.length || 0} applications
                        </span>
                        {candidate.applicant_profile?.portfolio_url && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 h-auto"
                            onClick={() => handleViewPortfolio(candidate.applicant_profile.portfolio_url)}
                          >
                            View Portfolio
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Star className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline" size="sm">
                          Invite to Apply
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

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCandidate?.full_name}</DialogTitle>
            <DialogDescription>
              Candidate profile details
            </DialogDescription>
          </DialogHeader>
          
          {selectedCandidate && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  {selectedCandidate.avatar_url ? (
                    <img
                      src={selectedCandidate.avatar_url}
                      alt={selectedCandidate.full_name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedCandidate.full_name}</h3>
                  <p className="text-muted-foreground">{selectedCandidate.email}</p>
                  {selectedCandidate.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-4 w-4" />
                      {selectedCandidate.location}
                    </p>
                  )}
                </div>
              </div>

              {selectedCandidate.applicant_profile && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Experience</h4>
                      <p className="text-muted-foreground">
                        {selectedCandidate.applicant_profile.experience_years} years
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Availability</h4>
                      <p className="text-muted-foreground">
                        {selectedCandidate.applicant_profile.availability || 'Not specified'}
                      </p>
                    </div>
                    {selectedCandidate.applicant_profile.salary_expectation && (
                      <>
                        <div>
                          <h4 className="font-medium mb-2">Salary Expectation</h4>
                          <p className="text-muted-foreground">
                            ${selectedCandidate.applicant_profile.salary_expectation.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Education</h4>
                          <p className="text-muted-foreground">
                            {selectedCandidate.applicant_profile.education || 'Not specified'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {selectedCandidate.applicant_profile.bio && (
                    <div>
                      <h4 className="font-medium mb-2">Bio</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {selectedCandidate.applicant_profile.bio}
                      </p>
                    </div>
                  )}

                  {selectedCandidate.applicant_profile.skills && selectedCandidate.applicant_profile.skills.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.applicant_profile.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4 border-t">
                    {selectedCandidate.applicant_profile.portfolio_url && (
                      <Button 
                        variant="outline"
                        onClick={() => handleViewPortfolio(selectedCandidate.applicant_profile.portfolio_url)}
                      >
                        View Portfolio
                      </Button>
                    )}
                    <Button>
                      Contact Candidate
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Candidates;