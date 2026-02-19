import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Bot,
  Briefcase, 
  Users, 
  FileText, 
  Calendar, 
  Settings,
  LogOut,
  Plus,
  Search,
  Filter,
  Home
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

// Import dashboard components
import JobPostings from '@/components/dashboard/JobPostings';
import Applications from '@/components/dashboard/Applications';
import Candidates from '@/components/dashboard/Candidates';
import ApplicantProfile from '@/components/dashboard/ApplicantProfile';
import ApplicantJobs from '@/components/dashboard/ApplicantJobs';
import ApplicantResumes from '@/components/dashboard/ApplicantResumes';
import ApplicantApplications from '@/components/dashboard/ApplicantApplications';
import RecruiterSettings from '@/components/dashboard/RecruiterSettings';

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

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error loading profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Bot className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
              Aling IQ
            </span>
            <Badge variant="outline" className="ml-4">
              {profile.role === 'recruiter' ? 'Recruiter' : 'Job Seeker'}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/'}>
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <span className="text-sm text-muted-foreground">
              Welcome, {profile.full_name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {profile.role === 'recruiter' ? (
          <RecruiterDashboard profile={profile} />
        ) : (
          <ApplicantDashboard profile={profile} />
        )}
      </div>
    </div>
  );
};

const RecruiterDashboard = ({ profile }: { profile: Profile }) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
          <p className="text-muted-foreground">Manage your job postings and candidates</p>
        </div>
      </div>

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Job Postings
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Applications
          </TabsTrigger>
          <TabsTrigger value="candidates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Candidates
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <JobPostings />
        </TabsContent>

        <TabsContent value="applications">
          <Applications />
        </TabsContent>

        <TabsContent value="candidates">
          <Candidates />
        </TabsContent>

        <TabsContent value="settings">
          <RecruiterSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ApplicantDashboard = ({ profile }: { profile: Profile }) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Seeker Dashboard</h1>
          <p className="text-muted-foreground">Find your dream job and manage applications</p>
        </div>
      </div>

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find Jobs
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="resumes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Resumes
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            My Applications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <ApplicantJobs />
        </TabsContent>

        <TabsContent value="profile">
          <ApplicantProfile profile={profile} />
        </TabsContent>

        <TabsContent value="resumes">
          <ApplicantResumes />
        </TabsContent>

        <TabsContent value="applications">
          <ApplicantApplications />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;