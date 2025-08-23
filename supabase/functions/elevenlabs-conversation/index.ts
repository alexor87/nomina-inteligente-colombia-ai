
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

// Enhanced function calling definitions for payroll system
const CLIENT_TOOLS = {
  getActiveEmployees: async () => {
    console.log('🔍 Getting active employees...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "Error: Usuario no autenticado";

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, first_name')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) return "Error: No se encontró la empresa del usuario";

      const { data: employees, error } = await supabase
        .from('employees')
        .select('nombre, apellido, cargo, salario_base, estado, fecha_ingreso')
        .eq('company_id', profile.company_id)
        .eq('estado', 'activo')
        .order('nombre');

      if (error) {
        console.error('Database error:', error);
        return `Error al consultar empleados: ${error.message}`;
      }
      
      if (!employees?.length) {
        return "No tienes empleados activos registrados en el sistema.";
      }

      const totalEmployees = employees.length;
      const avgSalary = employees.reduce((sum, emp) => sum + (emp.salario_base || 0), 0) / totalEmployees;
      
      const summary = `Tienes ${totalEmployees} empleados activos. ` +
        `El salario promedio es ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(avgSalary)}. ` +
        `Los empleados incluyen: ${employees.slice(0, 3).map(e => 
          `${e.nombre} ${e.apellido} - ${e.cargo || 'Sin cargo'}`
        ).join(', ')}${totalEmployees > 3 ? ` y ${totalEmployees - 3} más` : ''}.`;
      
      return summary;
    } catch (error) {
      console.error('Error in getActiveEmployees:', error);
      return "Error interno al consultar empleados. Por favor intenta de nuevo.";
    }
  },

  getPayrollPeriods: async () => {
    console.log('🔍 Getting payroll periods...');
    
    try {
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
        .select('periodo, estado, fecha_inicio, fecha_fin, empleados_count, total_neto, created_at')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Database error:', error);
        return `Error al consultar períodos: ${error.message}`;
      }
      
      if (!periods?.length) {
        return "No hay períodos de nómina registrados. Puedes crear uno nuevo desde la sección de nómina.";
      }
      
      const current = periods[0];
      const totalProcessed = periods.filter(p => p.estado === 'procesado').length;
      
      const summary = `El período más reciente es ${current.periodo} y está ${current.estado}. ` +
        `Incluye ${current.empleados_count || 0} empleados con un total neto de ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(current.total_neto || 0)}. ` +
        `Has procesado ${totalProcessed} períodos en total. ` +
        `Los últimos períodos son: ${periods.map(p => `${p.periodo} (${p.estado})`).join(', ')}.`;
      
      return summary;
    } catch (error) {
      console.error('Error in getPayrollPeriods:', error);
      return "Error interno al consultar períodos. Por favor intenta de nuevo.";
    }
  },

  getCompanyInfo: async () => {
    console.log('🔍 Getting company info...');
    
    try {
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

      // Get recent activity
      const { data: recentPeriod } = await supabase
        .from('payroll_periods_real')
        .select('periodo, estado, created_at')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const userName = profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Usuario';
      
      let summary = `¡Hola ${userName}! Soy Ana, tu asistente de nómina. `;
      summary += `Tu empresa tiene ${employeeCount || 0} empleados activos y has procesado ${periodsCount || 0} períodos de nómina. `;
      
      if (recentPeriod) {
        const daysSince = Math.floor((new Date().getTime() - new Date(recentPeriod.created_at).getTime()) / (1000 * 60 * 60 * 24));
        summary += `Tu último período fue ${recentPeriod.periodo} (${recentPeriod.estado}) hace ${daysSince} días. `;
      }
      
      summary += "¿En qué puedo ayudarte hoy? Puedo consultar empleados, períodos de nómina, o llevarte a cualquier sección del sistema.";
      
      return summary;
    } catch (error) {
      console.error('Error in getCompanyInfo:', error);
      return "Error interno al obtener información. Por favor intenta de nuevo.";
    }
  },

  navigateToSection: async (parameters: { section: string }) => {
    const { section } = parameters;
    console.log(`🧭 Navigation request to: ${section}`);
    
    try {
      const sectionMap: Record<string, { route: string; name: string }> = {
        'empleados': { route: '/app/employees', name: 'empleados' },
        'employees': { route: '/app/employees', name: 'empleados' },
        'nomina': { route: '/app/payroll', name: 'nómina' },
        'payroll': { route: '/app/payroll', name: 'nómina' },
        'reportes': { route: '/app/reports', name: 'reportes' },
        'reports': { route: '/app/reports', name: 'reportes' },
        'prestaciones': { route: '/app/prestaciones-sociales', name: 'prestaciones sociales' },
        'configuracion': { route: '/app/settings', name: 'configuración' },
        'settings': { route: '/app/settings', name: 'configuración' },
        'dashboard': { route: '/app/dashboard', name: 'dashboard' },
        'inicio': { route: '/app/dashboard', name: 'inicio' },
        'home': { route: '/app/dashboard', name: 'inicio' }
      };

      const target = sectionMap[section.toLowerCase()];
      if (target) {
        return `Perfecto, te estoy dirigiendo a la sección de ${target.name}. La página se cargará en un momento.`;
      } else {
        const availableSections = Object.values(sectionMap)
          .map(s => s.name)
          .filter((name, index, arr) => arr.indexOf(name) === index)
          .join(', ');
        return `No reconozco la sección "${section}". Las secciones disponibles son: ${availableSections}. ¿A cuál te gustaría que te lleve?`;
      }
    } catch (error) {
      console.error('Error in navigateToSection:', error);
      return "Error al procesar la navegación. Por favor intenta de nuevo.";
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
      console.error('❌ ELEVENLABS_API_KEY not configured');
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const { action, ...body } = await req.json();
    console.log(`📥 Action received: ${action}`, body);

    if (action === 'start_session') {
      console.log('🚀 Starting new ElevenLabs conversation session');

      // NEW: accept agent_id from client, with safe default (user’s agent)
      const agentId =
        (body && (body.agent_id || body.agentId)) ||
        'agent_8701k3by6j9ef8ka0wqzm6xtj3d9';

      if (!agentId) {
        console.error('❌ Missing agentId for session start');
        throw new Error('Missing agent_id for ElevenLabs conversation');
      }

      console.log('🎯 Using ElevenLabs Agent ID:', agentId);

      try {
        // NEW: request a signed URL specific to the provided agent_id
        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`,
          {
            method: "GET",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ ElevenLabs API error:', response.status, errorText);
          throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Session created successfully for agent:', agentId);
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (fetchError) {
        console.error('❌ Fetch error:', fetchError);
        throw new Error(`Failed to create session: ${fetchError.message}`);
      }
    }

    if (action === 'tool_call') {
      const { tool_name, parameters } = body;
      console.log(`🛠️ Tool call: ${tool_name}`, parameters);

      if ((CLIENT_TOOLS as any)[tool_name]) {
        try {
          const result = await (CLIENT_TOOLS as any)[tool_name](parameters);
          console.log(`✅ Tool call result for ${tool_name}:`, result);
          
          return new Response(JSON.stringify({ result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (toolError) {
          console.error(`❌ Tool execution error for ${tool_name}:`, toolError);
          return new Response(JSON.stringify({ 
            result: `Error ejecutando ${tool_name}: ${toolError.message}` 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        console.error(`❌ Unknown tool: ${tool_name}`);
        return new Response(JSON.stringify({ 
          error: `Unknown tool: ${tool_name}`,
          result: `No reconozco la función ${tool_name}. Funciones disponibles: getActiveEmployees, getPayrollPeriods, getCompanyInfo, navigateToSection`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`❌ Invalid action: ${action}`);
    return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Conversation proxy error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check server logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
