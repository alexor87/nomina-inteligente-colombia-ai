
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  "https://xrmorlkakwujyozgmilf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhybW9ybGtha3d1anlvemdtaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NzMxNDYsImV4cCI6MjA2NjE0OTE0Nn0.JSKbniDUkbNEAVCxCkrG_J5NQTt0yHc7W5PPheJ8X_U"
);

// Function calling definitions for payroll system
const CLIENT_TOOLS = {
  getActiveEmployees: async () => {
    console.log('🔍 Getting active employees...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "Error: Usuario no autenticado";

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return "Error: No se encontró la empresa del usuario";

    const { data: employees, error } = await supabase
      .from('employees')
      .select('nombre, apellido, cargo, salario_base, estado')
      .eq('company_id', profile.company_id)
      .eq('estado', 'activo')
      .order('nombre');

    if (error) return `Error al consultar empleados: ${error.message}`;
    
    const summary = `Tienes ${employees.length} empleados activos. Los primeros son: ${employees.slice(0, 5).map(e => 
      `${e.nombre} ${e.apellido} - ${e.cargo || 'Sin cargo'} (${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(e.salario_base)})`
    ).join(', ')}`;
    
    return summary;
  },

  getPayrollPeriods: async () => {
    console.log('🔍 Getting payroll periods...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "Error: Usuario no autenticado";

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return "Error: No se encontró la empresa del usuario";

    const { data: periods, error } = await supabase
      .from('payroll_periods_real')
      .select('periodo, estado, fecha_inicio, fecha_fin, empleados_count, total_neto')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) return `Error al consultar períodos: ${error.message}`;
    
    if (!periods.length) return "No hay períodos de nómina registrados";
    
    const current = periods[0];
    const summary = `El período actual es ${current.periodo} (${current.estado}). ` +
      `Incluye ${current.empleados_count || 0} empleados con un total neto de ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(current.total_neto || 0)}. ` +
      `Los últimos períodos son: ${periods.map(p => `${p.periodo} (${p.estado})`).join(', ')}`;
    
    return summary;
  },

  getCompanyInfo: async () => {
    console.log('🔍 Getting company info...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "Error: Usuario no autenticado";

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, first_name, last_name')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return "Error: No se encontró la empresa del usuario";

    // Get employee count
    const { count: employeeCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('estado', 'activo');

    // Get recent periods count
    const { count: periodsCount } = await supabase
      .from('payroll_periods_real')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id);

    const userName = profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Usuario';
    
    return `Hola ${userName}! Tu empresa tiene ${employeeCount || 0} empleados activos y ${periodsCount || 0} períodos de nómina procesados. ¿En qué puedo ayudarte hoy?`;
  },

  navigateToSection: async (parameters: { section: string }) => {
    const { section } = parameters;
    console.log(`🧭 Navigation request to: ${section}`);
    
    const sectionMap: Record<string, string> = {
      'empleados': '/app/employees',
      'employees': '/app/employees',
      'nomina': '/app/payroll',
      'payroll': '/app/payroll',
      'reportes': '/app/reports',
      'reports': '/app/reports',
      'prestaciones': '/app/prestaciones-sociales',
      'configuracion': '/app/settings',
      'settings': '/app/settings',
      'dashboard': '/app/dashboard'
    };

    const route = sectionMap[section.toLowerCase()];
    if (route) {
      return `Perfecto, te estoy dirigiendo a la sección de ${section}. La página se cargará automáticamente.`;
    } else {
      return `No reconozco la sección "${section}". Las secciones disponibles son: empleados, nómina, reportes, prestaciones sociales, configuración y dashboard.`;
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const { action, agentId, sessionId, ...body } = await req.json();

    if (action === 'start_session') {
      console.log('🚀 Starting new ElevenLabs conversation session');
      
      const response = await fetch("https://api.elevenlabs.io/v1/convai/conversation/get_signed_url", {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: new URLSearchParams({
          agent_id: agentId || "default"
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ ElevenLabs session error:', error);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Session created successfully');
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'tool_call') {
      const { tool_name, parameters } = body;
      console.log(`🛠️ Tool call: ${tool_name}`, parameters);

      if (CLIENT_TOOLS[tool_name]) {
        const result = await CLIENT_TOOLS[tool_name](parameters);
        return new Response(JSON.stringify({ result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ error: `Unknown tool: ${tool_name}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Conversation proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
