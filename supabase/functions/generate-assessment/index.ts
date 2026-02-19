import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicationId, questions } = await req.json();
    console.log('Generating assessment for application:', applicationId);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get application details
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();

    if (appError || !application) {
      console.error('Error fetching application:', appError);
      throw new Error('Failed to fetch application');
    }

    // Generate unique assessment
    const assessmentId = crypto.randomUUID();
    const assessmentUrl = `https://3546ba8a-43ad-441c-9ebb-78d22208b095.lovableproject.com/assessment/${assessmentId}`;

    // Simple assessment questions if none provided
    const defaultQuestions = {
      work_ethics: [
        {"question": "How do you handle tight deadlines?", "type": "multiple_choice", "options": ["Plan ahead", "Work overtime", "Ask for help", "Prioritize tasks"]},
        {"question": "What motivates you at work?", "type": "multiple_choice", "options": ["Recognition", "Growth", "Team success", "Challenges"]}
      ],
      technical: [
        {"question": "Your experience with required tech?", "type": "multiple_choice", "options": ["Expert level", "Intermediate", "Beginner", "No experience"]},
        {"question": "Your problem-solving approach?", "type": "multiple_choice", "options": ["Research first", "Trial and error", "Ask colleagues", "Break into steps"]}
      ]
    };

    // Create assessment record
    const { error: assessmentError } = await supabase
      .from('assessments')
      .insert({
        id: assessmentId,
        application_id: applicationId,
        job_id: application.job_id,
        applicant_id: application.applicant_id,
        questions: questions || defaultQuestions,
        assessment_url: assessmentUrl,
        status: 'sent'
      });

    if (assessmentError) {
      console.error('Error creating assessment:', assessmentError);
      throw new Error('Failed to create assessment');
    }

    console.log('Assessment created successfully');

    return new Response(JSON.stringify({
      success: true,
      assessmentId: assessmentId,
      assessmentUrl: assessmentUrl,
      message: 'Assessment created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-assessment function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});