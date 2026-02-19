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
    const { applicationId, jobId, applicantId } = await req.json();
    console.log('Starting simple AI analysis for application:', applicationId);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get basic data
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    const { data: profile } = await supabase
      .from('applicant_profiles')
      .select('*')
      .eq('user_id', applicantId)
      .single();

    // Simple scoring logic
    let matchScore = 60; // Base score
    
    if (profile?.skills && job?.skills_required) {
      const applicantSkills = profile.skills.map((s: string) => s.toLowerCase());
      const requiredSkills = job.skills_required.map((s: string) => s.toLowerCase());
      const matchingSkills = applicantSkills.filter((skill: string) => 
        requiredSkills.some((req: string) => req.includes(skill) || skill.includes(req))
      );
      matchScore += (matchingSkills.length / requiredSkills.length) * 30;
    }

    if (profile?.experience_years && job?.experience_level) {
      const expYears = profile.experience_years;
      if (job.experience_level === 'senior' && expYears >= 5) matchScore += 10;
      else if (job.experience_level === 'mid' && expYears >= 2) matchScore += 10;
      else if (job.experience_level === 'junior' && expYears >= 0) matchScore += 10;
    }

    matchScore = Math.min(Math.round(matchScore), 100);

    // Simple assessment questions
    const assessmentQuestions = {
      work_ethics: [
        {"question": "How do you handle tight deadlines?", "type": "multiple_choice", "options": ["Plan ahead", "Work overtime", "Ask for help", "Prioritize tasks"]},
        {"question": "What motivates you at work?", "type": "multiple_choice", "options": ["Recognition", "Growth", "Team success", "Challenges"]},
        {"question": "How do you handle conflicts?", "type": "multiple_choice", "options": ["Avoid them", "Discuss openly", "Seek mediation", "Find compromise"]},
        {"question": "How do you stay organized?", "type": "multiple_choice", "options": ["To-do lists", "Digital tools", "Calendars", "Memory"]},
        {"question": "Your approach to learning?", "type": "multiple_choice", "options": ["Online courses", "Mentorship", "Practice", "Reading"]},
        {"question": "How do you handle feedback?", "type": "multiple_choice", "options": ["Accept gracefully", "Ask questions", "Implement changes", "Reflect privately"]},
        {"question": "Your work style preference?", "type": "multiple_choice", "options": ["Independent", "Collaborative", "Structured", "Flexible"]},
        {"question": "How do you prioritize tasks?", "type": "multiple_choice", "options": ["By deadline", "By importance", "By difficulty", "By preference"]},
        {"question": "How do you handle stress?", "type": "multiple_choice", "options": ["Take breaks", "Exercise", "Talk to others", "Stay focused"]},
        {"question": "What drives your career?", "type": "multiple_choice", "options": ["Growth", "Stability", "Impact", "Compensation"]}
      ],
      technical: [
        {"question": "Your experience with required tech?", "type": "multiple_choice", "options": ["Expert level", "Intermediate", "Beginner", "No experience"]},
        {"question": "Your problem-solving approach?", "type": "multiple_choice", "options": ["Research first", "Trial and error", "Ask colleagues", "Break into steps"]},
        {"question": "Preferred development method?", "type": "multiple_choice", "options": ["Agile", "Waterfall", "Kanban", "Hybrid"]},
        {"question": "How do you ensure quality?", "type": "multiple_choice", "options": ["Testing", "Code reviews", "Documentation", "Standards"]},
        {"question": "Version control experience?", "type": "multiple_choice", "options": ["Git expert", "Git intermediate", "Other tools", "Limited"]},
        {"question": "How do you stay updated?", "type": "multiple_choice", "options": ["Tech blogs", "Conferences", "Courses", "Experimentation"]},
        {"question": "Your debugging approach?", "type": "multiple_choice", "options": ["Systematic", "Intuitive", "Tool-based", "Collaborative"]},
        {"question": "Handling technical challenges?", "type": "multiple_choice", "options": ["Research", "Experiment", "Seek help", "Break down"]},
        {"question": "Your testing philosophy?", "type": "multiple_choice", "options": ["Test everything", "Critical paths", "User scenarios", "Automated first"]},
        {"question": "How do you document work?", "type": "multiple_choice", "options": ["Detailed docs", "Code comments", "README files", "Video walkthroughs"]}
      ]
    };

    // Save match score using upsert to handle duplicates
    const { error: scoreError } = await supabase
      .from('ai_match_scores')
      .upsert({
        applicant_id: applicantId,
        job_id: jobId,
        match_score: matchScore,
        analysis: `Candidate shows ${matchScore}% compatibility with the role. ${matchScore >= 80 ? 'Strong' : matchScore >= 60 ? 'Good' : 'Moderate'} match based on skills and experience.`,
        criteria: {
          skills_match: matchScore,
          experience_match: matchScore,
          requirements_match: matchScore,
          overall_fit: matchScore
        }
      }, {
        onConflict: 'job_id,applicant_id'
      });

    if (scoreError) {
      console.error('Error saving match score:', scoreError);
      throw new Error('Failed to save match score');
    }

    console.log('Simple AI analysis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      match_score: matchScore,
      analysis: `Candidate shows ${matchScore}% compatibility with the role. ${matchScore >= 80 ? 'Strong' : matchScore >= 60 ? 'Good' : 'Moderate'} match based on skills and experience.`,
      criteria: {
        skills_match: matchScore,
        experience_match: matchScore,
        requirements_match: matchScore,
        overall_fit: matchScore
      },
      skill_improvements: ["Communication", "Technical skills", "Industry knowledge"],
      assessment_questions: assessmentQuestions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in simple ai-analysis:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});