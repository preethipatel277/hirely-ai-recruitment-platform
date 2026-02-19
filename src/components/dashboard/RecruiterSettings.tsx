import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Building, Globe, MapPin, FileText } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  description: string;
  website: string;
  location: string;
  logo_url: string;
  created_at: string;
}

const RecruiterSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    location: '',
    logo_url: ''
  });

  useEffect(() => {
    fetchCompanyProfile();
  }, []);

  const fetchCompanyProfile = async () => {
    try {
      // First check if recruiter has a company profile
      const { data: recruiterProfile } = await supabase
        .from('recruiter_profiles')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (recruiterProfile?.company_id) {
        // Fetch existing company
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', recruiterProfile.company_id)
          .single();

        if (companyData) {
          setCompany(companyData);
          setFormData({
            name: companyData.name || '',
            description: companyData.description || '',
            website: companyData.website || '',
            location: companyData.location || '',
            logo_url: companyData.logo_url || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching company profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (company) {
        // Update existing company
        const { error } = await supabase
          .from('companies')
          .update(formData)
          .eq('id', company.id);

        if (error) throw error;
        toast.success('Company profile updated successfully!');
      } else {
        // Create new company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert(formData)
          .select()
          .single();

        if (companyError) throw companyError;

        // Create or update recruiter profile with company_id
        const { error: recruiterError } = await supabase
          .from('recruiter_profiles')
          .upsert({
            user_id: user?.id,
            company_id: newCompany.id
          });

        if (recruiterError) throw recruiterError;

        setCompany(newCompany);
        toast.success('Company profile created successfully!');
      }
      
      fetchCompanyProfile();
    } catch (error) {
      console.error('Error saving company profile:', error);
      toast.error('Failed to save company profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Company Profile Settings</h2>
        <p className="text-muted-foreground">
          Manage your company information and branding
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Update your company details to attract the best candidates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://company.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, Country"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo-url">Logo URL</Label>
            <Input
              id="logo-url"
              value={formData.logo_url}
              onChange={(e) => handleInputChange('logo_url', e.target.value)}
              placeholder="https://company.com/logo.png"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Company Description</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Tell candidates about your company, culture, and mission..."
                className="pl-10 min-h-[120px]"
              />
            </div>
          </div>

          {formData.logo_url && (
            <div className="space-y-2">
              <Label>Logo Preview</Label>
              <div className="flex items-center gap-4">
                <img 
                  src={formData.logo_url} 
                  alt="Company logo preview" 
                  className="w-16 h-16 object-contain border rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  Logo preview (appears in job listings)
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.name.trim()}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                company ? 'Update Company Profile' : 'Create Company Profile'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {company && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Status</CardTitle>
            <CardDescription>
              Your company profile is {company ? 'active' : 'inactive'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Company Name</span>
                <span className="font-medium">{company.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Website</span>
                <span className="font-medium">{company.website || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Location</span>
                <span className="font-medium">{company.location || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Created</span>
                <span className="font-medium">
                  {new Date(company.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecruiterSettings;