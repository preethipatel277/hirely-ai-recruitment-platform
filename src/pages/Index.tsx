import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Bot, Briefcase, Users, Zap, Star, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
              Hirely
            </span>
          </div>
          <nav className="flex items-center space-x-4">
            {user ? (
              <Link to="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                AI-Powered
              </span>
              <br />
              Recruiting Platform
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect top talent with leading companies using advanced AI matching algorithms. 
              Find your perfect job or hire the ideal candidate with unprecedented precision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" className="group">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth">
                    <Button size="lg" className="group">
                      Start Your Journey
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="lg" variant="outline">
                      I'm a Recruiter
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Choose Hirely ?</h2>
            <p className="text-muted-foreground text-lg">
              Revolutionary features that transform the recruiting experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Bot className="h-12 w-12 text-primary mb-4" />
                <CardTitle>AI Matching</CardTitle>
                <CardDescription>
                  Advanced algorithms analyze skills, experience, and culture fit to find perfect matches
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Target className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Smart Analytics</CardTitle>
                <CardDescription>
                  Get detailed insights and match scores above 85% with beautiful visualizations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Instant Results</CardTitle>
                <CardDescription>
                  Lightning-fast job searches and candidate screening powered by cutting-edge AI
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* For Recruiters & Job Seekers */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Card className="p-8 border-0 shadow-xl">
                <CardHeader className="text-center pb-6">
                  <Briefcase className="h-16 w-16 text-primary mx-auto mb-4" />
                  <CardTitle className="text-2xl">For Recruiters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Star className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Smart Candidate Matching</h4>
                      <p className="text-sm text-muted-foreground">Find candidates with 85%+ match scores</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Star className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Document Management</h4>
                      <p className="text-sm text-muted-foreground">Access resumes, portfolios, and documents</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Star className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Advanced Analytics</h4>
                      <p className="text-sm text-muted-foreground">Beautiful visualizations and match criteria</p>
                    </div>
                  </div>
                  <Link to="/auth" className="block pt-4">
                    <Button className="w-full">
                      Start Recruiting
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="p-8 border-0 shadow-xl">
                <CardHeader className="text-center pb-6">
                  <Users className="h-16 w-16 text-primary mx-auto mb-4" />
                  <CardTitle className="text-2xl">For Job Seekers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Star className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Personalized Job Matches</h4>
                      <p className="text-sm text-muted-foreground">AI finds jobs that fit your skills perfectly</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Star className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Career Insights</h4>
                      <p className="text-sm text-muted-foreground">Get match scores and improvement suggestions</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Star className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Easy Applications</h4>
                      <p className="text-sm text-muted-foreground">Apply to multiple jobs with one click</p>
                    </div>
                  </div>
                  <Link to="/auth" className="block pt-4">
                    <Button className="w-full" variant="outline">
                      Find Jobs
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Recruiting?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of companies and job seekers who have found their perfect match
          </p>
          <Link to={user ? "/dashboard" : "/auth"}>
            <Button size="lg" className="group">
              {user ? "Go to Dashboard" : "Get Started Today"}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-semibold">Hirely</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Hirely. Revolutionizing recruitment with AI.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
