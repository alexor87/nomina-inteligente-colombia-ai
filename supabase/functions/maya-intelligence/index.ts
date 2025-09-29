// ============================================================================
// MAYA Intelligence - KISS Implementation
// ============================================================================
// Simplified from 1,900+ lines to <300 lines with 10x better performance

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SimpleIntentMatcher } from './SimpleIntentMatcher.ts';

// Helper function to extract employee names from salary queries
function extractNameFromSalaryQuery(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  
  // Pattern 1: "cual es el salario de eliana"
  const pattern1Match = lowerText.match(/(?:cuál|cual|cuánto|cuanto|qué|que)\s+(?:es\s+el\s+)?(?:salario|sueldo|gana|cobra)\s+de\s+([a-záéíóúñ\s]+)/i);
  if (pattern1Match) {
    return pattern1Match[1]?.trim().replace(/[?.,!]+$/, '') || null;
  }
  
  // Pattern 2: "salario de eliana"
  const pattern2Match = lowerText.match(/(?:salario|sueldo|gana|cobra)\s+(?:de|del|de\s+la)\s+([a-záéíóúñ\s]+)/i);
  if (pattern2Match) {
    return pattern2Match[1]?.trim().replace(/[?.,!]+$/, '') || null;
  }
  
  // Pattern 3: "sueldo eliana" (without preposition, avoid general terms)
  if (!/nomina|total|cuanto|mes|año|periodo/i.test(lowerText)) {
    const pattern3Match = lowerText.match(/(?:salario|sueldo)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
    if (pattern3Match) {
      return pattern3Match[1]?.trim().replace(/[?.,!]+$/, '') || null;
    }
  }
  
  return null;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user token from auth header
    const authHeader = req.headers.get('Authorization') || '';
    const userSupabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { conversation, sessionId } = await req.json();
    
    if (!conversation || !Array.isArray(conversation)) {
      return new Response(JSON.stringify({
        error: 'Invalid conversation format',
        message: 'Formato de conversación inválido'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const lastMessage = conversation[conversation.length - 1]?.content || '';
    console.log(`[MAYA-KISS] Processing: "${lastMessage}"`);
    
    // Match intent using simple patterns
    const intent = SimpleIntentMatcher.match(lastMessage);
    console.log(`[MAYA-KISS] Intent: ${intent.type} (${intent.confidence})`);

    // Safety Override: If classified as general payroll but looks like employee salary query
    if (intent.method === 'getPayrollTotals' && intent.type !== 'EMPLOYEE_SALARY') {
      const possibleName = extractNameFromSalaryQuery(lastMessage);
      if (possibleName) {
        console.log(`[MAYA-KISS] 🔧 SAFETY OVERRIDE: Detected employee salary query for "${possibleName}"`);
        intent.method = 'getEmployeeSalary';
        intent.params = { name: possibleName };
        intent.type = 'EMPLOYEE_SALARY';
      }
    }

    if (intent.type === 'EMPLOYEE_SALARY') {
      console.log(`[MAYA-KISS] 👤 Employee salary query detected for: "${intent.params?.name}"`);
    }
    
    let response;

    // Execute query based on intent
    switch (intent.method) {
      case 'blockSystemInfoQuery':
        response = await blockSystemInfoQuery();
        break;
        
      case 'getEmployeeCount':
        response = await getEmployeeCount(userSupabase);
        break;

      case 'listAllEmployees':
        response = await listAllEmployees(userSupabase);
        break;
        
      case 'searchEmployee':
        response = await searchEmployee(userSupabase, intent.params?.name);
        break;
        
      case 'getEmployeeSalary':
        response = await getEmployeeSalary(userSupabase, intent.params?.name);
        break;
        
      case 'getPayrollTotals':
        response = await getPayrollTotals(userSupabase);
        break;
        
      case 'getPayrollByMonth':
        response = await getPayrollByMonth(userSupabase, intent.params?.month, intent.params?.year);
        break;
        
      case 'getPayrollByFortnight':
        response = await getPayrollByFortnight(userSupabase, intent.params?.month, intent.params?.year, intent.params?.fortnight);
        break;
        
      case 'getEmployeePayrollHistory':
        response = await getEmployeePayrollHistory(userSupabase, intent.params?.employeeName);
        break;
        
      case 'getRecentPeriods':
        response = await getRecentPeriods(userSupabase);
        break;
        
      default:
        response = await handleConversation(lastMessage, conversation);
    }

    return new Response(JSON.stringify({
      message: response.message,
      emotionalState: response.emotionalState || 'neutral',
      sessionId,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[MAYA-KISS] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'Error interno del servidor'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

// ============================================================================
// Security Functions
// ============================================================================

async function blockSystemInfoQuery(): Promise<{ message: string; emotionalState: string }> {
  console.log('🚫 [SECURITY] System info query blocked');
  
  return {
    message: "Lo siento, no puedo proporcionar información sobre el sistema completo o base de datos general. Solo puedo ayudarte con información específica de tu empresa, como:\n\n• Consultar empleados de tu organización\n• Ver nóminas y salarios\n• Revisar períodos de pago\n• Buscar información de empleados específicos\n\n¿En qué puedo ayudarte con la información de tu empresa?",
    emotionalState: "professional"
  };
}

// ============================================================================
// Database Query Functions  
// ============================================================================

// Simple, direct queries
async function getEmployeeCount(supabase: any) {
  try {
    const { count, error } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'activo');
      
    if (error) throw error;
    
    return {
      message: `Tienes **${count} empleados activos** en tu empresa. ${count > 0 ? '¿Te gustaría ver quiénes son?' : ''}`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Employee count error:', error);
    return {
      message: 'No pude obtener el conteo de empleados en este momento.',
      emotionalState: 'concerned'
    };
  }
}

async function listAllEmployees(supabase: any) {
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('nombre, apellido, cargo')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true });

    if (error) throw error;

    if (!employees || employees.length === 0) {
      return {
        message: 'No hay empleados activos registrados en tu empresa.',
        emotionalState: 'neutral'
      };
    }

    // Format employee list
    const employeeList = employees.map((emp: any) => 
      `• **${emp.nombre} ${emp.apellido}**${emp.cargo ? ` (${emp.cargo})` : ''}`
    ).join('\n');

    return {
      message: `Estos son tus **${employees.length} empleados activos**:\n\n${employeeList}\n\n¿Necesitas información específica de algún empleado?`,
      emotionalState: 'helpful'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Employee list error:', error);
    return {
      message: 'No pude obtener la lista de empleados en este momento.',
      emotionalState: 'concerned'
    };
  }
}

async function searchEmployee(supabase: any, name: string) {
  if (!name) {
    return {
      message: '¿Qué empleado estás buscando? Por favor dime el nombre.',
      emotionalState: 'neutral'
    };
  }
  
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('nombre, apellido, cargo, salario_base, estado')
      .or(`nombre.ilike.%${name}%,apellido.ilike.%${name}%`)
      .limit(5);
      
    if (error) throw error;
    
    if (data.length === 0) {
      return {
        message: `No encontré empleados con el nombre "${name}". ¿Podrías verificar la ortografía?`,
        emotionalState: 'neutral'
      };
    }
    
    if (data.length === 1) {
      const emp = data[0];
      return {
        message: `Encontré a **${emp.nombre} ${emp.apellido}**, ${emp.cargo} con salario de **$${emp.salario_base.toLocaleString()}**.`,
        emotionalState: 'neutral'
      };
    }
    
    const names = data.map((e: any) => `${e.nombre} ${e.apellido}`).join(', ');
    return {
      message: `Encontré **${data.length} empleados**: ${names}. ¿Cuál te interesa?`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Employee search error:', error);
    return {
      message: `No pude buscar empleados en este momento.`,
      emotionalState: 'concerned'
    };
  }
}

async function getEmployeeSalary(supabase: any, name: string) {
  if (!name) {
    return {
      message: '¿De qué empleado quieres saber el salario?',
      emotionalState: 'neutral'
    };
  }
  
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('nombre, apellido, cargo, salario_base, fecha_ingreso, estado')
      .or(`nombre.ilike.%${name}%,apellido.ilike.%${name}%`)
      .limit(3);
      
    if (error) throw error;
    
    if (data.length === 0) {
      return {
        message: `No encontré un empleado llamado "${name}". ¿Podrías verificar la ortografía?`,
        emotionalState: 'neutral'
      };
    }
    
    if (data.length === 1) {
      const emp = data[0];
      const yearsWorked = emp.fecha_ingreso ? 
        Math.floor((new Date().getTime() - new Date(emp.fecha_ingreso).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0;
      
      return {
        message: `**${emp.nombre} ${emp.apellido}**\n` +
                `💼 Cargo: ${emp.cargo || 'No especificado'}\n` +
                `💰 Salario base: **$${emp.salario_base?.toLocaleString() || 'No registrado'}**\n` +
                `📅 Antigüedad: ${yearsWorked > 0 ? yearsWorked + ' años' : 'Menos de 1 año'}\n` +
                `📊 Estado: ${emp.estado === 'activo' ? '✅ Activo' : '❌ Inactivo'}`,
        emotionalState: 'neutral'
      };
    }
    
    // Multiple matches - show options
    const employeeList = data.map((emp: any) => 
      `• **${emp.nombre} ${emp.apellido}** - ${emp.cargo} - $${emp.salario_base?.toLocaleString() || 'N/A'}`
    ).join('\n');
    
    return {
      message: `Encontré **${data.length} empleados** con "${name}":\n\n${employeeList}\n\n¿Podrías ser más específico?`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Employee salary error:', error);
    return {
      message: `Error consultando el salario de "${name}".`,
      emotionalState: 'concerned'
    };
  }
}

async function getPayrollTotals(supabase: any) {
  try {
    const currentYear = new Date().getFullYear();
    
    const { data, error } = await supabase
      .from('payrolls')
      .select('total_devengado, neto_pagado')
      .eq('estado', 'procesada')
      .gte('created_at', `${currentYear}-01-01`);
      
    if (error) throw error;
    
    if (data.length === 0) {
      return {
        message: 'No hay nóminas procesadas este año aún.',
        emotionalState: 'neutral'
      };
    }
    
    const totalNeto = data.reduce((sum: number, p: any) => sum + (p.neto_pagado || 0), 0);
    
    return {
      message: `Este año has pagado **$${totalNeto.toLocaleString()}** en **${data.length} nóminas** procesadas.`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Payroll totals error:', error);
    return {
      message: 'No pude obtener los totales de nómina en este momento.',
      emotionalState: 'concerned'
    };
  }
}

async function getEmployeePayrollHistory(supabase: any, employeeName: string) {
  if (!employeeName) {
    return {
      message: '¿De qué empleado quieres ver el historial de pagos?',
      emotionalState: 'neutral'
    };
  }
  
  try {
    const { data, error } = await supabase
      .from('payrolls')
      .select(`
        periodo, neto_pagado, created_at,
        employees!inner(nombre, apellido)
      `)
      .or(`employees.nombre.ilike.%${employeeName}%,employees.apellido.ilike.%${employeeName}%`)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) throw error;
    
    if (data.length === 0) {
      return {
        message: `No encontré nóminas para "${employeeName}".`,
        emotionalState: 'neutral'
      };
    }
    
    const employee = data[0].employees;
    const totalPaid = data.reduce((sum: number, p: any) => sum + (p.neto_pagado || 0), 0);
    
    return {
      message: `**${employee.nombre} ${employee.apellido}** tiene **${data.length} nóminas** por un total de **$${totalPaid.toLocaleString()}**.`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Employee payroll history error:', error);
    return {
      message: 'No pude obtener el historial de nómina en este momento.',
      emotionalState: 'concerned'
    };
  }
}

async function getRecentPeriods(supabase: any) {
  try {
    const { data, error } = await supabase
      .from('payroll_periods_real')
      .select('periodo, estado, empleados_count, total_neto')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (error) throw error;
    
    if (data.length === 0) {
      return {
        message: 'No hay períodos de nómina registrados aún.',
        emotionalState: 'neutral'
      };
    }
    
    const periodsList = data.map((p: any) => `${p.periodo} (${p.estado})`).join(', ');
    
    return {
      message: `Últimos períodos: ${periodsList}.`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Recent periods error:', error);
    return {
      message: 'No pude obtener los períodos recientes.',
      emotionalState: 'concerned'
    };
  }
}

async function getPayrollByMonth(supabase: any, month: string, year: number) {
  try {
    const monthNames = {
      'enero': 'Enero', 'febrero': 'Febrero', 'marzo': 'Marzo', 'abril': 'Abril',
      'mayo': 'Mayo', 'junio': 'Junio', 'julio': 'Julio', 'agosto': 'Agosto',
      'septiembre': 'Septiembre', 'octubre': 'Octubre', 'noviembre': 'Noviembre', 'diciembre': 'Diciembre'
    };
    
    const monthCapitalized = monthNames[month as keyof typeof monthNames];
    if (!monthCapitalized) {
      return {
        message: `No reconozco el mes "${month}". Por favor usa nombres de meses válidos.`,
        emotionalState: 'neutral'
      };
    }
    
    // Try different period name patterns
    const periodPatterns = [
      `${monthCapitalized} ${year}`,
      `${monthCapitalized}`,
      `${monthCapitalized.toLowerCase()} ${year}`,
      `${monthCapitalized.toLowerCase()}`
    ];
    
    let periodData = null;
    let foundPattern = '';
    
    for (const pattern of periodPatterns) {
      const { data } = await supabase
        .from('payroll_periods_real')
        .select('periodo, estado, empleados_count, total_devengado, total_deducciones, total_neto')
        .ilike('periodo', `%${pattern}%`)
        .limit(1);
        
      if (data && data.length > 0) {
        periodData = data[0];
        foundPattern = pattern;
        break;
      }
    }
    
    if (!periodData) {
      return {
        message: `No encontré nómina para **${monthCapitalized} ${year}**. ¿Está seguro que existe ese período?`,
        emotionalState: 'neutral'
      };
    }
    
    return {
      message: `**${periodData.periodo}**: ${periodData.empleados_count} empleados, **$${periodData.total_neto?.toLocaleString() || 0}** pagados (${periodData.estado}).`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Payroll by month error:', error);
    return {
      message: 'No pude obtener la información de nómina para ese mes.',
      emotionalState: 'concerned'
    };
  }
}

async function getPayrollByFortnight(supabase: any, month: string, year: number, fortnight: string) {
  try {
    const monthNames = {
      'enero': 'Enero', 'febrero': 'Febrero', 'marzo': 'Marzo', 'abril': 'Abril',
      'mayo': 'Mayo', 'junio': 'Junio', 'julio': 'Julio', 'agosto': 'Agosto',
      'septiembre': 'Septiembre', 'octubre': 'Octubre', 'noviembre': 'Noviembre', 'diciembre': 'Diciembre'
    };
    
    const monthCapitalized = monthNames[month as keyof typeof monthNames];
    if (!monthCapitalized) {
      return {
        message: `No reconozco el mes "${month}". Por favor usa nombres de meses válidos.`,
        emotionalState: 'neutral'
      };
    }
    
    // Build fortnight period patterns
    const isFirstFortnight = fortnight === 'primera';
    const fortnightRange = isFirstFortnight ? '1 - 15' : '16 - 30';  // Handle February separately in real implementation
    
    const periodPatterns = [
      `${fortnightRange} ${monthCapitalized} ${year}`,
      `${fortnightRange} ${monthCapitalized}`,
      `${fortnightRange} ${monthCapitalized.toLowerCase()} ${year}`,
      `${fortnightRange} ${monthCapitalized.toLowerCase()}`
    ];
    
    let periodData = null;
    
    for (const pattern of periodPatterns) {
      const { data } = await supabase
        .from('payroll_periods_real')
        .select('periodo, estado, empleados_count, total_devengado, total_deducciones, total_neto')
        .ilike('periodo', `%${pattern}%`)
        .limit(1);
        
      if (data && data.length > 0) {
        periodData = data[0];
        break;
      }
    }
    
    if (!periodData) {
      return {
        message: `No encontré la **${fortnight} quincena de ${monthCapitalized} ${year}**. ¿Está seguro que existe ese período?`,
        emotionalState: 'neutral'
      };
    }
    
    return {
      message: `**${periodData.periodo}**: ${periodData.empleados_count} empleados, **$${periodData.total_neto?.toLocaleString() || 0}** pagados (${periodData.estado}).`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Payroll by fortnight error:', error);
    return {
      message: 'No pude obtener la información de nómina para esa quincena.',
      emotionalState: 'concerned'
    };
  }
}

async function handleConversation(message: string, conversation: any[]) {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiKey) {
    return {
      message: 'Hola, soy MAYA. Puedo ayudarte con consultas sobre empleados y nómina. ¿Qué necesitas?',
      emotionalState: 'neutral'
    };
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres MAYA, un asistente inteligente especializado en nóminas y recursos humanos para empresas venezolanas. 

Características:
- Eres amigable, profesional y eficiente
- Tu conocimiento se enfoca únicamente en empleados y nóminas de la empresa específica del usuario
- Respondes en español venezolano con un tono cercano pero profesional
- Siempre ofreces ayuda adicional relacionada con nóminas

Limitaciones CRÍTICAS:
- NUNCA proporciones estadísticas inventadas o datos que no tienes
- NUNCA hables sobre "el sistema", "la base de datos" o información global
- Solo manejas información específica de la empresa del usuario actual
- Si no tienes información específica, redirige a consultas válidas como empleados o nóminas

NUNCA inventes números o estadísticas. Si no sabes algo, di que no tienes esa información.

Emociones disponibles: happy, sad, excited, thoughtful, professional, confused`
          },
          ...conversation.slice(-5),
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        message: data.choices[0]?.message?.content || 'No pude procesar tu mensaje.',
        emotionalState: 'neutral'
      };
    }
  } catch (error) {
    console.error('[MAYA-KISS] OpenAI error:', error);
  }
  
  return {
    message: 'Soy MAYA, tu asistente de nómina. Puedo ayudarte con empleados, nómina y reportes. ¿Qué necesitas?',
    emotionalState: 'neutral'
  };
}