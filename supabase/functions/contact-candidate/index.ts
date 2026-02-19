import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateEmail, candidateName, recruiterName, jobTitle, message } = await req.json();
    
    console.log('Sending contact email to candidate:', candidateEmail);

    // Send email to candidate
    const emailResult = await resend.emails.send({
      from: 'TalentHub <onboarding@resend.dev>',
      to: [candidateEmail],
      subject: `Message from ${recruiterName} regarding ${jobTitle} position`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Message from Recruiter</h2>
          <p>Dear ${candidateName},</p>
          <p>You have received a message from <strong>${recruiterName}</strong> regarding the <strong>${jobTitle}</strong> position.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h3 style="color: #333; margin-top: 0;">Message:</h3>
            <p style="white-space: pre-line; color: #555;">${message}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666;">If you would like to respond, please reply to this email or contact the recruiter directly.</p>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This message was sent through TalentHub recruitment platform.
          </p>
        </div>
      `,
    });

    if (emailResult.error) {
      console.error('Error sending email:', emailResult.error);
      throw new Error('Failed to send contact email');
    }

    console.log('Contact email sent successfully');

    return new Response(JSON.stringify({
      success: true,
      emailSent: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in contact-candidate function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});