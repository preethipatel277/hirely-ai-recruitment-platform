-- Create assessments table
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL,
  job_id UUID NOT NULL,
  applicant_id UUID NOT NULL,
  questions JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'in_progress', 'completed', 'expired')),
  assessment_url TEXT NOT NULL,
  score INTEGER,
  responses JSONB,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Recruiters can view assessments for their jobs" 
ON public.assessments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = assessments.job_id 
    AND jobs.recruiter_id = auth.uid()
  )
);

CREATE POLICY "Applicants can view their own assessments" 
ON public.assessments 
FOR SELECT 
USING (auth.uid() = applicant_id);

CREATE POLICY "Applicants can update their own assessment responses" 
ON public.assessments 
FOR UPDATE 
USING (auth.uid() = applicant_id);

CREATE POLICY "Recruiters can create assessments for their jobs" 
ON public.assessments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = assessments.job_id 
    AND jobs.recruiter_id = auth.uid()
  )
);

-- Add trigger for timestamps
CREATE TRIGGER update_assessments_updated_at
BEFORE UPDATE ON public.assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();