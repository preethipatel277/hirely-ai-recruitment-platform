import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { User, Plus, X, Save, Mail, MapPin, Phone, Globe, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  location?: string;
  phone?: string;
}

interface ApplicantProfileData {
  id?: string;
  user_id: string;
  experience_years?: number;
  skills: string[];
  bio?: string;
  salary_expectation?: number;
  availability?: string;
  portfolio_url?: string;
  education?: string;
  resume_url?: string;
}

const ApplicantProfile = ({ profile }: { profile: Profile }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applicantProfile, setApplicantProfile] = useState<ApplicantProfileData>({
    user_id: profile.user_id,
    skills: [],
  });
  const [profileData, setProfileData] = useState({
    full_name: profile.full_name || '',
    email: profile.email || '',
    location: profile.location || '',
    phone: profile.phone || '',
  });
  const [newSkill, setNewSkill] = useState('');
  const [jobAlerts, setJobAlerts] = useState(true);

  useEffect(() => {
    fetchApplicantProfile();
  }, []);

  const fetchApplicantProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('applicant_profiles')
        .select('*')
        .eq('user_id', profile.user_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setApplicantProfile(data);
      }
    } catch (error) {
      console.error('Error fetching applicant profile:', error);
      toast.error('Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Update main profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          location: profileData.location,
          phone: profileData.phone,
        })
        .eq('user_id', profile.user_id);

      if (profileError) throw profileError;

      // Upsert applicant profile
      const { error: applicantError } = await supabase
        .from('applicant_profiles')
        .upsert({
          ...applicantProfile,
          user_id: profile.user_id,
        });

      if (applicantError) throw applicantError;

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !applicantProfile.skills.includes(newSkill.trim())) {
      setApplicantProfile({
        ...applicantProfile,
        skills: [...applicantProfile.skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setApplicantProfile({
      ...applicantProfile,
      skills: applicantProfile.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
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
          <h2 className="text-2xl font-bold">My Profile</h2>
          <p className="text-muted-foreground">Complete your profile to get better job matches</p>
        </div>
        <Button onClick={handleSaveProfile} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>Your personal and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profileData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={profileData.location}
                onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                placeholder="City, State/Country"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>Your career and experience details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="experience_years">Years of Experience</Label>
              <Select 
                value={applicantProfile.experience_years?.toString() || ''} 
                onValueChange={(value) => setApplicantProfile({ 
                  ...applicantProfile, 
                  experience_years: parseInt(value) 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Entry Level (0-1 years)</SelectItem>
                  <SelectItem value="2">Junior (2-3 years)</SelectItem>
                  <SelectItem value="4">Mid-level (4-6 years)</SelectItem>
                  <SelectItem value="7">Senior (7-10 years)</SelectItem>
                  <SelectItem value="11">Expert (10+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary_expectation">Salary Expectation (Annual)</Label>
              <Input
                id="salary_expectation"
                type="number"
                value={applicantProfile.salary_expectation || ''}
                onChange={(e) => setApplicantProfile({ 
                  ...applicantProfile, 
                  salary_expectation: parseFloat(e.target.value) 
                })}
                placeholder="80000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability">Availability</Label>
              <Select 
                value={applicantProfile.availability || ''} 
                onValueChange={(value) => setApplicantProfile({ 
                  ...applicantProfile, 
                  availability: value 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediately">Available immediately</SelectItem>
                  <SelectItem value="2-weeks">2 weeks notice</SelectItem>
                  <SelectItem value="1-month">1 month notice</SelectItem>
                  <SelectItem value="2-months">2+ months</SelectItem>
                  <SelectItem value="not-looking">Not actively looking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio_url">Portfolio/Website URL</Label>
              <Input
                id="portfolio_url"
                value={applicantProfile.portfolio_url || ''}
                onChange={(e) => setApplicantProfile({ 
                  ...applicantProfile, 
                  portfolio_url: e.target.value 
                })}
                placeholder="https://yourportfolio.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Skills & Expertise</CardTitle>
            <CardDescription>Add your technical and professional skills</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a skill"
              />
              <Button onClick={addSkill} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {applicantProfile.skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {skill}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => removeSkill(skill)}
                  />
                </Badge>
              ))}
            </div>

            {applicantProfile.skills.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No skills added yet. Add skills to improve your job matches.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Bio & Education */}
        <Card>
          <CardHeader>
            <CardTitle>About & Education</CardTitle>
            <CardDescription>Tell employers about yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea
                id="bio"
                value={applicantProfile.bio || ''}
                onChange={(e) => setApplicantProfile({ 
                  ...applicantProfile, 
                  bio: e.target.value 
                })}
                placeholder="Write a brief description about your professional background, achievements, and career goals..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="education">Education</Label>
              <Textarea
                id="education"
                value={applicantProfile.education || ''}
                onChange={(e) => setApplicantProfile({ 
                  ...applicantProfile, 
                  education: e.target.value 
                })}
                placeholder="Bachelor's in Computer Science, University of Technology (2020)&#10;Relevant certifications, courses, etc."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Job Alerts */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Job Alerts & Preferences
            </CardTitle>
            <CardDescription>Configure how you want to receive job notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Email Job Alerts</h4>
                <p className="text-sm text-muted-foreground">
                  Get notified when jobs matching your profile are posted
                </p>
              </div>
              <Switch
                checked={jobAlerts}
                onCheckedChange={setJobAlerts}
              />
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Alert Criteria</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Skills:</span>
                  <p>{applicantProfile.skills.slice(0, 3).join(', ')}{applicantProfile.skills.length > 3 ? '...' : ''}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Experience:</span>
                  <p>{applicantProfile.experience_years ? `${applicantProfile.experience_years}+ years` : 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <p>{profileData.location || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Salary Range:</span>
                  <p>{applicantProfile.salary_expectation ? `$${applicantProfile.salary_expectation.toLocaleString()}+` : 'Not specified'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApplicantProfile;