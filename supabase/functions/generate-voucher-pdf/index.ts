
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Iniciando generación de comprobante PDF');
    
    const requestBody = await req.json();
    console.log('📋 Datos recibidos:', JSON.stringify(requestBody, null, 2));

    const { employee, period } = requestBody;

    if (!employee || !period) {
      console.error('❌ Faltan datos del empleado o período');
      return new Response(
        JSON.stringify({ error: 'Faltan datos del empleado o período' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Inicializar Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener información de la empresa
    const { data: { user } } = await supabase.auth.getUser();
    let companyInfo = null;

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (profile?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();
        
        companyInfo = company;
      }
    }

    console.log('🏢 Información de empresa obtenida:', companyInfo?.razon_social || 'No disponible');

    // Generar PDF usando lógica simplificada sin dependencias externas
    const pdfContent = await generateVoucherPDF(employee, period, companyInfo);

    console.log('✅ PDF generado exitosamente');

    return new Response(pdfContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="comprobante-${employee.name.replace(/\s+/g, '-')}.pdf"`
      }
    });

  } catch (error) {
    console.error('💥 Error crítico generando PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Función para generar PDF simplificado sin dependencias externas
async function generateVoucherPDF(employee: any, period: any, companyInfo: any): Promise<Uint8Array> {
  console.log('📄 Generando contenido del PDF...');
  
  // Crear un PDF básico usando lógica manual
  // Esta es una implementación simplificada que genera un PDF básico
  const pdfHeader = '%PDF-1.4\n';
  
  // Calcular valores
  const salarioProporcional = Math.round((employee.baseSalary / 30) * employee.workedDays);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Contenido del comprobante
  const content = `
COMPROBANTE DE PAGO DE NÓMINA
${companyInfo?.razon_social || 'Empresa'}
${companyInfo?.nit ? `NIT: ${companyInfo.nit}` : ''}

PERÍODO: ${formatDate(period.startDate)} - ${formatDate(period.endDate)}
TIPO: ${period.type.toUpperCase()}

EMPLEADO: ${employee.name}
CARGO: ${employee.position || 'N/A'}
EPS: ${employee.eps || 'No asignada'}
AFP: ${employee.afp || 'No asignada'}

DETALLES DE PAGO:
- Salario Base (Mensual): ${formatCurrency(employee.baseSalary)}
- Días Trabajados: ${employee.workedDays}
- Salario Proporcional: ${formatCurrency(salarioProporcional)}
- Horas Extra: ${employee.extraHours}
- Bonificaciones: ${formatCurrency(employee.bonuses)}
- Auxilio de Transporte: ${formatCurrency(employee.transportAllowance)}
${employee.disabilities > 0 ? `- Incapacidades: -${formatCurrency(employee.disabilities)}` : ''}

TOTAL DEVENGADO: ${formatCurrency(employee.grossPay)}
TOTAL DEDUCCIONES: -${formatCurrency(employee.deductions)}
NETO A PAGAR: ${formatCurrency(employee.netPay)}

Generado el: ${new Date().toLocaleString('es-CO')}
  `.trim();

  // Crear un PDF básico con el contenido
  // Nota: Esta es una implementación muy simplificada
  // En producción, se debería usar una librería como PDFKit o similar
  
  const textEncoder = new TextEncoder();
  const contentBytes = textEncoder.encode(content);
  
  // Simular estructura PDF básica
  const pdfStructure = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${contentBytes.length + 100}
>>
stream
BT
/F1 12 Tf
50 750 Td
${content.split('\n').map((line, index) => `(${line}) Tj 0 -15 Td`).join('\n')}
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000136 00000 n 
0000000301 00000 n 
0000000456 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
553
%%EOF`;

  return textEncoder.encode(pdfStructure);
}
