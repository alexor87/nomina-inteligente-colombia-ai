import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticResult {
  success: boolean;
  timestamp: string;
  authentication: {
    isAuthenticated: boolean;
    userId: string | null;
    hasValidToken: boolean;
  };
  profile: {
    exists: boolean;
    companyId: string | null;
    email: string | null;
  };
  companyAccess: {
    hasAccess: boolean;
    requestedCompany: string | null;
    userCompany: string | null;
    matches: boolean;
  };
  errors: string[];
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    const { companyId } = await req.json();

    const diagnostic: DiagnosticResult = {
      success: true,
      timestamp: new Date().toISOString(),
      authentication: {
        isAuthenticated: false,
        userId: null,
        hasValidToken: false
      },
      profile: {
        exists: false,
        companyId: null,
        email: null
      },
      companyAccess: {
        hasAccess: false,
        requestedCompany: companyId || null,
        userCompany: null,
        matches: false
      },
      errors: [],
      recommendations: []
    };

    // Step 1: Check authentication
    console.log('[MAYA Diagnostics] Checking user authentication...');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      diagnostic.errors.push(`Authentication error: ${authError.message}`);
      diagnostic.recommendations.push('User needs to log in again');
    } else if (user) {
      diagnostic.authentication.isAuthenticated = true;
      diagnostic.authentication.userId = user.id;
      diagnostic.authentication.hasValidToken = true;
      console.log(`[MAYA Diagnostics] User authenticated: ${user.id}`);
    } else {
      diagnostic.errors.push('No authenticated user found');
      diagnostic.recommendations.push('User session has expired, login required');
    }

    // Step 2: Check user profile
    if (diagnostic.authentication.isAuthenticated) {
      console.log('[MAYA Diagnostics] Checking user profile...');
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('company_id, email')
        .eq('user_id', user!.id)
        .single();

      if (profileError) {
        diagnostic.errors.push(`Profile lookup error: ${profileError.message}`);
        diagnostic.recommendations.push('User profile may be missing or corrupted');
      } else if (profile) {
        diagnostic.profile.exists = true;
        diagnostic.profile.companyId = profile.company_id;
        diagnostic.profile.email = profile.email;
        diagnostic.companyAccess.userCompany = profile.company_id;
        console.log(`[MAYA Diagnostics] Profile found - Company: ${profile.company_id}`);
      } else {
        diagnostic.errors.push('User profile not found in profiles table');
        diagnostic.recommendations.push('Create user profile with company assignment');
      }
    }

    // Step 3: Check company access
    if (diagnostic.profile.exists && companyId) {
      diagnostic.companyAccess.matches = diagnostic.profile.companyId === companyId;
      diagnostic.companyAccess.hasAccess = diagnostic.companyAccess.matches;
      
      if (!diagnostic.companyAccess.matches) {
        diagnostic.errors.push(
          `Company mismatch: User belongs to ${diagnostic.profile.companyId}, but requested ${companyId}`
        );
        diagnostic.recommendations.push('Verify user has access to the requested company');
      } else {
        console.log('[MAYA Diagnostics] Company access validated successfully');
      }
    }

    // Step 4: Test execute_safe_query function
    if (diagnostic.companyAccess.hasAccess) {
      console.log('[MAYA Diagnostics] Testing execute_safe_query function...');
      try {
        const { data: testData, error: queryError } = await supabaseClient.rpc('execute_safe_query', {
          query_sql: 'SELECT COUNT(*) as employee_count FROM employees WHERE company_id = $1',
          company_id_param: companyId
        });

        if (queryError) {
          diagnostic.errors.push(`Query execution test failed: ${queryError.message}`);
          diagnostic.recommendations.push('Check execute_safe_query function and RLS policies');
        } else {
          console.log('[MAYA Diagnostics] Query execution test successful');
        }
      } catch (testError) {
        diagnostic.errors.push(`Query test exception: ${testError.message}`);
      }
    }

    // Step 5: Generate final recommendations
    if (diagnostic.errors.length === 0) {
      diagnostic.recommendations.push('MAYA authentication is working correctly');
    } else {
      diagnostic.success = false;
      if (!diagnostic.authentication.isAuthenticated) {
        diagnostic.recommendations.push('Priority: Fix user authentication');
      } else if (!diagnostic.profile.exists) {
        diagnostic.recommendations.push('Priority: Create or fix user profile');
      } else if (!diagnostic.companyAccess.hasAccess) {
        diagnostic.recommendations.push('Priority: Fix company access validation');
      }
    }

    // Log diagnostic results
    console.log('[MAYA Diagnostics] Diagnostic completed:', {
      success: diagnostic.success,
      errorsCount: diagnostic.errors.length,
      isAuthenticated: diagnostic.authentication.isAuthenticated,
      profileExists: diagnostic.profile.exists,
      hasCompanyAccess: diagnostic.companyAccess.hasAccess
    });

    return new Response(JSON.stringify(diagnostic), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[MAYA Diagnostics] Unexpected error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      recommendations: ['Check server logs for detailed error information']
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});