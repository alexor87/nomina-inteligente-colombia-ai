
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Project constants
const SUPABASE_URL = "https://xrmorlkakwujyozgmilf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhybW9ybGtha3d1anlvemdtaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NzMxNDYsImV4cCI6MjA2NjE0OTE0Nn0.JSKbniDUkbNEAVCxCkrG_J5NQTt0yHc7W5PPheJ8X_U";

function createSupabaseForRequest(req: Request) {
  const authorization = req.headers.get('Authorization') || '';
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } }
  });
}

function createClientTools(supabase: any) {
  return {
    getActiveEmployees: async () => {
      console.log('🔍 [TOOL] Getting active employees...');
      
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

        if (error) return `Error al consultar empleados: ${error.message}`;
        if (!employees?.length) return "No tienes empleados activos registrados en el sistema.";

        const totalEmployees = employees.length;
        const avgSalary = employees.reduce((sum: number, emp: any) => sum + (emp.salario_base || 0), 0) / totalEmployees;
        
        return `Tienes ${totalEmployees} empleados activos. ` +
          `El salario promedio es ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(avgSalary)}. ` +
          `Los empleados incluyen: ${employees.slice(0, 3).map((e: any) => 
            `${e.nombre} ${e.apellido} - ${e.cargo || 'Sin cargo'}`
          ).join(', ')}${totalEmployees > 3 ? ` y ${totalEmployees - 3} más` : ''}.`;
      } catch (error) {
        console.error('❌ [TOOL] Error in getActiveEmployees:', error);
        return "Error interno al consultar empleados.";
      }
    },

    getPayrollPeriods: async () => {
      console.log('🔍 [TOOL] Getting payroll periods...');
      
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

        if (error) return `Error al consultar períodos: ${error.message}`;
        if (!periods?.length) return "No hay períodos de nómina registrados.";
        
        const current = periods[0];
        const totalProcessed = periods.filter((p: any) => p.estado === 'procesado').length;
        
        return `El período más reciente es ${current.periodo} y está ${current.estado}. ` +
          `Incluye ${current.empleados_count || 0} empleados con un total neto de ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(current.total_neto || 0)}. ` +
          `Has procesado ${totalProcessed} períodos en total.`;
      } catch (error) {
        console.error('❌ [TOOL] Error in getPayrollPeriods:', error);
        return "Error interno al consultar períodos.";
      }
    },

    getCompanyInfo: async () => {
      console.log('🔍 [TOOL] Getting company info...');
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return "Error: Usuario no autenticado";

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id, first_name, last_name')
          .eq('user_id', user.id)
          .single();

        if (!profile?.company_id) return "Error: No se encontró la empresa del usuario";

        const { count: employeeCount } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .eq('estado', 'activo');

        const userName = profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Usuario';
        
        return `¡Hola ${userName}! Soy Ana, tu asistente de nómina. ` +
          `Tu empresa tiene ${employeeCount || 0} empleados activos. ` +
          "¿En qué puedo ayudarte hoy? Puedo consultar empleados, períodos de nómina, o llevarte a cualquier sección del sistema.";
      } catch (error) {
        console.error('❌ [TOOL] Error in getCompanyInfo:', error);
        return "Error interno al obtener información.";
      }
    },

    navigateToSection: async (parameters: { section: string }) => {
      const { section } = parameters;
      console.log(`🧭 [TOOL] Navigation request to: ${section}`);
      
      const sectionMap: Record<string, { route: string; name: string }> = {
        'empleados': { route: '/app/employees', name: 'empleados' },
        'employees': { route: '/app/employees', name: 'empleados' },
        'nomina': { route: '/app/payroll', name: 'nómina' },
        'payroll': { route: '/app/payroll', name: 'nómina' },
        'reportes': { route: '/app/reports', name: 'reportes' },
        'reports': { route: '/app/reports', name: 'reportes' },
        'dashboard': { route: '/app/dashboard', name: 'dashboard' },
        'inicio': { route: '/app/dashboard', name: 'inicio' }
      };

      const target = sectionMap[section.toLowerCase()];
      if (target) {
        return `Perfecto, te estoy dirigiendo a la sección de ${target.name}.`;
      } else {
        const availableSections = Object.values(sectionMap)
          .map(s => s.name)
          .filter((name, index, arr) => arr.indexOf(name) === index)
          .join(', ');
        return `No reconozco la sección "${section}". Las secciones disponibles son: ${availableSections}.`;
      }
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createSupabaseForRequest(req);
  const CLIENT_TOOLS = createClientTools(supabase);

  try {
    const { action, ...body } = await req.json();
    console.log(`📥 Action received: ${action}`);

    if (action === 'health_check') {
      console.log('🏥 Health check requested');
      
      const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
      const has_api_key = !!ELEVENLABS_API_KEY;
      
      return new Response(JSON.stringify({
        ok: true,
        has_api_key,
        agent_id_received: true,
        env: 'prod',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'start_session') {
      console.log('🚀 Starting ElevenLabs conversation session');

      const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
      if (!ELEVENLABS_API_KEY) {
        return new Response(JSON.stringify({ 
          ok: false,
          error: 'ELEVENLABS_API_KEY not configured',
          message: 'Clave de API no configurada.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const agentId = body.agent_id || 'agent_3701k3bzfyn5f4ws09536v7bk5wf';

      try {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`,
          {
            method: "GET",
            headers: { "xi-api-key": ELEVENLABS_API_KEY },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ ElevenLabs API error:', response.status, errorText);
          
          return new Response(JSON.stringify({ 
            ok: false,
            error: `ElevenLabs API error: ${response.status}`,
            message: response.status === 401 ? 'Clave de API inválida.' : 'Error del servicio de voz.'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = await response.json();
        console.log('✅ Session created successfully');
        
        return new Response(JSON.stringify({ ok: true, ...data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        console.error('❌ Network error:', error);
        return new Response(JSON.stringify({ 
          ok: false,
          error: `Failed to create session: ${error.message}`,
          message: 'Error de red. Verifica tu conexión.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'tool_call') {
      const { tool_name, parameters } = body;
      console.log(`🛠️ Tool call: ${tool_name}`);

      if ((CLIENT_TOOLS as any)[tool_name]) {
        try {
          const result = await (CLIENT_TOOLS as any)[tool_name](parameters);
          return new Response(JSON.stringify({ result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ 
            result: `Error ejecutando ${tool_name}: ${error.message}` 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        return new Response(JSON.stringify({ 
          error: `Unknown tool: ${tool_name}`,
          result: `No reconozco la función ${tool_name}.`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ 
      ok: false,
      error: `Invalid action: ${action}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Edge function error:', error);
    return new Response(JSON.stringify({ 
      ok: false,
      error: error.message,
      message: 'Error interno del servidor.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
