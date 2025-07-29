import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// PDF Generator with improved error handling and fallback
class NativePDFGenerator {
  private objects: string[] = [];
  private objectPositions: number[] = [];
  private currentObjectId = 1;

  constructor() {
    this.objects = [''];  // Object 0 is always empty in PDF
    this.objectPositions = [0]; // Position of object 0
  }

  private addObject(content: string): number {
    const id = this.currentObjectId++;
    this.objects.push(content);
    this.objectPositions.push(0); // Will be calculated later
    return id;
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n');
  }

  private formatCurrency(amount: number): string {
    return '$' + amount.toLocaleString('es-CO');
  }

  private formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
    } catch {
      return dateStr;
    }
  }

  async generateVoucher(employee: any, period: any, company: any): Promise<Uint8Array> {
    console.log('🔧 Generando PDF para:', employee.name);

    // SYNCHRONIZED CALCULATIONS (same as modal)
    const salarioBase = Number(employee.baseSalary) || 0;
    const diasTrabajados = Number(employee.workedDays) || 30;
    const salarioNeto = Number(employee.netPay) || 0;
    const deducciones = Number(employee.deductions) || 0;
    const horasExtra = Number(employee.extraHours) || 0;
    const bonificaciones = Number(employee.bonuses) || 0;
    const subsidioTransporte = Number(employee.transportAllowance) || 0;
    
    // Proportional salary calculation (same as modal)
    const salarioProporcional = Math.round((salarioBase * diasTrabajados) / 30);
    
    // Extra hours calculation (same as modal)
    const valorHoraExtra = Math.round((salarioBase / 240) * 1.25);
    const totalHorasExtra = horasExtra > 0 ? horasExtra * valorHoraExtra : 0;
    
    // Deductions calculation (same as modal)
    const saludEmpleado = Math.round(salarioBase * 0.04);
    const pensionEmpleado = Math.round(salarioBase * 0.04);
    const totalDeduccionesCalculadas = saludEmpleado + pensionEmpleado;

    const fechaInicio = this.formatDate(period.startDate);
    const fechaFin = this.formatDate(period.endDate);

    console.log('📊 Valores calculados sincronizados:');
    console.log('- Salario proporcional:', salarioProporcional);
    console.log('- Total horas extra:', totalHorasExtra);
    console.log('- Deducciones calculadas:', totalDeduccionesCalculadas);

    // KISS: Remove logo processing for reliability
    console.log('📋 KISS: Generando PDF sin logo para máxima confiabilidad');

    // Create fonts first (objects 1 and 2)
    const fontRegularId = this.addObject(`<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>`);

    const fontBoldId = this.addObject(`<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>`);

    // KISS: No logo processing - simple and reliable
    
    // Create content stream with synchronized data
    const contentStream = this.generateContentStream(employee, period, company, {
      salarioBase, diasTrabajados, salarioNeto, deducciones,
      horasExtra, bonificaciones, subsidioTransporte, fechaInicio, fechaFin,
      salarioProporcional, totalHorasExtra, valorHoraExtra,
      saludEmpleado, pensionEmpleado, totalDeduccionesCalculadas
    });

    const contentStreamId = this.addObject(`<<
/Length ${contentStream.length}
>>
stream
${contentStream}
endstream`);

    // Create page with correct references
    const pageId = this.addObject(`<<
/Type /Page
/Parent 5 0 R
/MediaBox [0 0 612 792]
/Contents ${contentStreamId} 0 R
/Resources <<
  /Font <<
    /F1 ${fontRegularId} 0 R
    /F2 ${fontBoldId} 0 R
  >>
>>
>>`);

    // Create pages catalog
    const pagesId = this.addObject(`<<
/Type /Pages
/Kids [${pageId} 0 R]
/Count 1
>>`);

    // Create root catalog
    const catalogId = this.addObject(`<<
/Type /Catalog
/Pages ${pagesId} 0 R
>>`);

    // Generate complete PDF with correct structure
    return this.buildPDFWithCorrectStructure(catalogId);
  }

  private generateContentStream(employee: any, period: any, company: any, data: any): string {
    console.log('✨ Generating premium aesthetic PDF...');
    
    const { salarioBase, diasTrabajados, salarioNeto, deducciones, 
            horasExtra, bonificaciones, subsidioTransporte, fechaInicio, fechaFin,
            salarioProporcional, totalHorasExtra, valorHoraExtra,
            saludEmpleado, pensionEmpleado, totalDeduccionesCalculadas } = data;

    const companyName = company?.razon_social || 'Mi Empresa';
    const companyNit = company?.nit || 'N/A';
    const companyAddress = company?.direccion || '';
    const companyInitial = companyName.charAt(0).toUpperCase();

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    };

    // Premium PDF with refined aesthetics matching modal exactly
    return `
% ===== PREMIUM HEADER - Perfectly Centered =====
BT
/F2 20 Tf
0.118 0.165 0.478 rg
200 750 Td
(${this.escapeText('COMPROBANTE DE NÓMINA')}) Tj
ET

% Period subtitle with elegant spacing
BT
/F1 10 Tf
0.4 0.4 0.4 rg
50 720 Td
(${this.escapeText('Período: ' + fechaInicio + ' - ' + fechaFin)}) Tj
ET

% ===== REFINED INFORMATION CARDS - MODAL REPLICA =====

% ===== CARD 1: EMPRESA - Premium Design =====
% Card background with subtle shadow effect
q
0.953 0.969 0.988 rg
50 640 200 90 re
f
Q

% Blue left border (premium style)
q
0.118 0.165 0.478 rg
50 640 5 90 re
f
Q

% Company logo circle - Refined design
q
0.118 0.165 0.478 rg
70 690 28 28 re
f
Q

% Company initial in white
BT
/F2 14 Tf
1 1 1 rg
78 700 Td
(${this.escapeText(companyInitial)}) Tj
ET

% Company section labels and info
BT
/F2 10 Tf
0.118 0.165 0.478 rg
108 705 Td
(${this.escapeText('EMPRESA')}) Tj
ET

BT
/F1 9 Tf
0.2 0.2 0.2 rg
108 690 Td
(${this.escapeText(companyName)}) Tj
ET

BT
/F1 8 Tf
0.4 0.4 0.4 rg
108 676 Td
(${this.escapeText('NIT: ' + companyNit)}) Tj
ET

${companyAddress ? `
BT
/F1 8 Tf
0.4 0.4 0.4 rg
108 662 Td
(${this.escapeText(companyAddress)}) Tj
ET
` : ''}

% ===== CARD 2: EMPLEADO - Center Position =====
q
0.953 0.969 0.988 rg
270 640 200 90 re
f
Q

q
0.118 0.165 0.478 rg
270 640 5 90 re
f
Q

BT
/F2 10 Tf
0.118 0.165 0.478 rg
280 705 Td
(${this.escapeText('EMPLEADO')}) Tj
ET

BT
/F1 9 Tf
0.2 0.2 0.2 rg
280 690 Td
(${this.escapeText(employee.name || 'N/A')}) Tj
ET

BT
/F1 8 Tf
0.4 0.4 0.4 rg
280 676 Td
(${this.escapeText('CC: ' + (employee.cedula || 'N/A'))}) Tj
ET

${employee.position ? `
BT
/F1 8 Tf
0.4 0.4 0.4 rg
280 662 Td
(${this.escapeText('Cargo: ' + employee.position)}) Tj
ET
` : ''}

% ===== CARD 3: PERÍODO - Right Position =====
q
0.953 0.969 0.988 rg
490 640 200 90 re
f
Q

q
0.118 0.165 0.478 rg
490 640 5 90 re
f
Q

BT
/F2 10 Tf
0.118 0.165 0.478 rg
500 705 Td
(${this.escapeText('PERÍODO')}) Tj
ET

BT
/F1 9 Tf
0.2 0.2 0.2 rg
500 690 Td
(${this.escapeText('Desde: ' + fechaInicio)}) Tj
ET

BT
/F1 8 Tf
0.4 0.4 0.4 rg
500 676 Td
(${this.escapeText('Hasta: ' + fechaFin)}) Tj
ET

BT
/F1 8 Tf
0.4 0.4 0.4 rg
500 662 Td
(${this.escapeText('Días: ' + diasTrabajados)}) Tj
ET

% ===== MAIN PAYMENT TABLE - PREMIUM DESIGN =====
BT
/F2 16 Tf
0.118 0.165 0.478 rg
50 600 Td
(${this.escapeText('RESUMEN DEL PAGO')}) Tj
ET

% Table container with premium shadow
q
0.98 0.98 0.98 rg
50 365 640 220 re
f
Q

% Table border - Professional style
q
0.9 0.9 0.9 RG
1 w
50 365 640 220 re
S
Q

% Table header - Premium blue background
q
0.118 0.165 0.478 rg
50 560 640 25 re
f
Q

% Header text
BT
/F2 11 Tf
1 1 1 rg
60 568 Td
(${this.escapeText('CONCEPTO')}) Tj
ET

BT
/F2 11 Tf
1 1 1 rg
580 568 Td
(${this.escapeText('VALOR')}) Tj
ET

% Table rows with alternating backgrounds
% Basic Salary
q
0.988 0.988 0.988 rg
50 535 640 25 re
f
Q

q
0.9 0.9 0.9 RG
0.5 w
50 535 640 25 re
S
Q

BT
/F1 10 Tf
0.2 0.2 0.2 rg
60 543 Td
(${this.escapeText('Salario Base')}) Tj
ET

BT
/F1 10 Tf
0.2 0.2 0.2 rg
580 543 Td
(${this.escapeText(formatCurrency(salarioBase))}) Tj
ET

% Proportional Salary
q
1 1 1 rg
50 510 640 25 re
f
Q

q
0.9 0.9 0.9 RG
0.5 w
50 510 640 25 re
S
Q

BT
/F1 10 Tf
0.2 0.2 0.2 rg
60 518 Td
(${this.escapeText('Salario Proporcional (' + diasTrabajados + ' días)')}) Tj
ET

BT
/F1 10 Tf
0.2 0.2 0.2 rg
580 518 Td
(${this.escapeText(formatCurrency(salarioProporcional))}) Tj
ET`;

    let yPosition = 485;
    let content = '';
    let isAlternate = true;

    // Transport Allowance
    if (subsidioTransporte > 0) {
      const bgColor = isAlternate ? '0.988 0.988 0.988' : '1 1 1';
      content += `
q
${bgColor} rg
50 ${yPosition} 640 25 re
f
Q

q
0.9 0.9 0.9 RG
0.5 w
50 ${yPosition} 640 25 re
S
Q

BT
/F1 10 Tf
0.2 0.2 0.2 rg
60 ${yPosition + 8} Td
(${this.escapeText('Subsidio de Transporte')}) Tj
ET

BT
/F1 10 Tf
0.2 0.2 0.2 rg
580 ${yPosition + 8} Td
(${this.escapeText(formatCurrency(subsidioTransporte))}) Tj
ET`;
      yPosition -= 25;
      isAlternate = !isAlternate;
    }

    // Bonifications
    if (bonificaciones > 0) {
      const bgColor = isAlternate ? '0.988 0.988 0.988' : '1 1 1';
      content += `
q
${bgColor} rg
50 ${yPosition} 640 25 re
f
Q

q
0.9 0.9 0.9 RG
0.5 w
50 ${yPosition} 640 25 re
S
Q

BT
/F1 10 Tf
0.2 0.2 0.2 rg
60 ${yPosition + 8} Td
(${this.escapeText('Bonificaciones')}) Tj
ET

BT
/F1 10 Tf
0.2 0.2 0.2 rg
580 ${yPosition + 8} Td
(${this.escapeText(formatCurrency(bonificaciones))}) Tj
ET`;
      yPosition -= 25;
      isAlternate = !isAlternate;
    }

    // Extra Hours
    if (totalHorasExtra > 0) {
      const bgColor = isAlternate ? '0.988 0.988 0.988' : '1 1 1';
      content += `
q
${bgColor} rg
50 ${yPosition} 640 25 re
f
Q

q
0.9 0.9 0.9 RG
0.5 w
50 ${yPosition} 640 25 re
S
Q

BT
/F1 10 Tf
0.2 0.2 0.2 rg
60 ${yPosition + 8} Td
(${this.escapeText('Horas Extras (' + horasExtra + ' hrs)')}) Tj
ET

BT
/F1 10 Tf
0.2 0.2 0.2 rg
580 ${yPosition + 8} Td
(${this.escapeText(formatCurrency(totalHorasExtra))}) Tj
ET`;
      yPosition -= 25;
      isAlternate = !isAlternate;
    }

    // Deductions - Red styling
    content += `
q
0.996 0.949 0.949 rg
50 ${yPosition} 640 25 re
f
Q

q
0.9 0.9 0.9 RG
0.5 w
50 ${yPosition} 640 25 re
S
Q

BT
/F1 10 Tf
0.796 0.196 0.196 rg
60 ${yPosition + 8} Td
(${this.escapeText('Total Deducciones')}) Tj
ET

BT
/F1 10 Tf
0.796 0.196 0.196 rg
580 ${yPosition + 8} Td
(${this.escapeText('-' + formatCurrency(deducciones))}) Tj
ET`;

    yPosition -= 25;

    // Net Pay - Green styling with larger font
    content += `
q
0.949 0.996 0.949 rg
50 ${yPosition} 640 30 re
f
Q

q
0.9 0.9 0.9 RG
0.5 w
50 ${yPosition} 640 30 re
S
Q

BT
/F2 12 Tf
0.196 0.698 0.196 rg
60 ${yPosition + 10} Td
(${this.escapeText('NETO A PAGAR')}) Tj
ET

BT
/F2 12 Tf
0.196 0.698 0.196 rg
580 ${yPosition + 10} Td
(${this.escapeText(formatCurrency(salarioNeto))}) Tj
ET`;

    yPosition -= 60;

    // Extra Hours Detail Table (if applicable)
    if (totalHorasExtra > 0) {
      content += `
BT
/F2 14 Tf
0.118 0.165 0.478 rg
50 ${yPosition} Td
(${this.escapeText('DETALLE HORAS EXTRAS')}) Tj
ET

% Extra hours table
q
0.98 0.98 0.98 rg
50 ${yPosition - 70} 640 60 re
f
Q

q
0.9 0.9 0.9 RG
1 w
50 ${yPosition - 70} 640 60 re
S
Q

% Header
q
0.118 0.165 0.478 rg
50 ${yPosition - 25} 640 20 re
f
Q

BT
/F2 9 Tf
1 1 1 rg
60 ${yPosition - 18} Td
(${this.escapeText('CONCEPTO')}) Tj
ET

BT
/F2 9 Tf
1 1 1 rg
300 ${yPosition - 18} Td
(${this.escapeText('CANTIDAD')}) Tj
ET

BT
/F2 9 Tf
1 1 1 rg
580 ${yPosition - 18} Td
(${this.escapeText('VALOR')}) Tj
ET

% Content
BT
/F1 9 Tf
0.2 0.2 0.2 rg
60 ${yPosition - 38} Td
(${this.escapeText('Horas Extras')}) Tj
ET

BT
/F1 9 Tf
0.2 0.2 0.2 rg
300 ${yPosition - 38} Td
(${this.escapeText(horasExtra + ' horas × ' + formatCurrency(valorHoraExtra))}) Tj
ET

BT
/F1 9 Tf
0.2 0.2 0.2 rg
580 ${yPosition - 38} Td
(${this.escapeText(formatCurrency(totalHorasExtra))}) Tj
ET`;
      yPosition -= 90;
    }

    // Professional Footer
    content += `
BT
/F1 9 Tf
0.4 0.4 0.4 rg
50 ${yPosition} Td
(${this.escapeText('Este documento constituye el comprobante oficial de pago de nómina según la legislación laboral vigente.')}) Tj
ET

BT
/F1 8 Tf
0.5 0.5 0.5 rg
50 ${yPosition - 18} Td
(${this.escapeText('Documento generado automáticamente el ' + new Date().toLocaleDateString('es-CO') + ' a las ' + new Date().toLocaleTimeString('es-CO'))}) Tj
ET

BT
/F1 8 Tf
0.5 0.5 0.5 rg
50 ${yPosition - 33} Td
(${this.escapeText('Para consultas contactar al departamento de recursos humanos.')}) Tj
ET`;

    return content;
  }

  // KISS: Remove complex logo processing - causes failures
  // Simple and reliable PDF generation without logos

  private buildPDFWithCorrectStructure(catalogId: number): Uint8Array {
    console.log('🏗️ Building PDF structure...');

    let pdf = '%PDF-1.4\n%âãÏÓ\n';
    let currentPos = pdf.length;

    // Write objects and track positions
    for (let i = 1; i < this.objects.length; i++) {
      this.objectPositions[i] = currentPos;
      const objContent = `${i} 0 obj\n${this.objects[i]}\nendobj\n`;
      pdf += objContent;
      currentPos += objContent.length;
    }

    // xref table position
    const xrefPos = currentPos;

    // Generate xref table
    pdf += 'xref\n';
    pdf += `0 ${this.objects.length}\n`;
    pdf += '0000000000 65535 f \n';

    for (let i = 1; i < this.objects.length; i++) {
      const pos = String(this.objectPositions[i]).padStart(10, '0');
      pdf += `${pos} 00000 n \n`;
    }

    // Trailer
    pdf += 'trailer\n';
    pdf += `<<\n/Size ${this.objects.length}\n/Root ${catalogId} 0 R\n>>\n`;
    pdf += 'startxref\n';
    pdf += `${xrefPos}\n`;
    pdf += '%%EOF\n';

    console.log(`✅ PDF built: ${pdf.length} bytes, ${this.objects.length} objects`);

    // Convert to Uint8Array properly
    const encoder = new TextEncoder();
    return encoder.encode(pdf);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting PDF generation...');

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization provided' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // Parse request body
    const requestBody = await req.json()
    console.log('📥 Request received for employee:', requestBody?.employee?.name)

    const { employee, period, company } = requestBody

    if (!employee || !period) {
      console.error('❌ Missing required data')
      return new Response(
        JSON.stringify({ error: 'Missing employee or period data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate PDF with fallback for logo errors
    console.log('🔧 Starting PDF generation...')
    const generator = new NativePDFGenerator()
    
    try {
      const pdfBytes = await generator.generateVoucher(employee, period, company)

      console.log(`✅ PDF generated successfully: ${pdfBytes.length} bytes`)

      // Verify PDF is valid
      if (pdfBytes.length === 0) {
        throw new Error('Generated PDF is empty')
      }

      // Verify PDF header
      const pdfHeader = String.fromCharCode(...pdfBytes.slice(0, 5))
      if (!pdfHeader.startsWith('%PDF-')) {
        console.error('❌ Invalid PDF header:', pdfHeader)
        throw new Error('Generated file is not a valid PDF')
      }

      // Return PDF with correct headers
      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="comprobante-${employee.name?.replace(/\s+/g, '-') || 'empleado'}.pdf"`,
          'Content-Length': pdfBytes.length.toString(),
          'Cache-Control': 'no-cache'
        }
      })
      
    } catch (pdfError) {
      console.error('❌ PDF generation error:', pdfError.message)
      
      // Fallback: try without logo if logo was the issue
      if (company?.logo_url && (pdfError.message.includes('logo') || pdfError.message.includes('fetch'))) {
        console.log('🔄 Retrying without logo...')
        const companyWithoutLogo = { ...company, logo_url: null }
        
        try {
          const pdfBytes = await generator.generateVoucher(employee, period, companyWithoutLogo)
          
          if (pdfBytes.length > 0) {
            console.log(`✅ PDF generated without logo: ${pdfBytes.length} bytes`)
            return new Response(pdfBytes, {
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="comprobante-${employee.name?.replace(/\s+/g, '-') || 'empleado'}.pdf"`,
                'Content-Length': pdfBytes.length.toString(),
                'Cache-Control': 'no-cache'
              }
            })
          }
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError.message)
        }
      }
      
      throw pdfError
    }

  } catch (error: any) {
    console.error('💥 GENERAL ERROR:', error)
    console.error('💥 Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Error in native PDF generator', 
        details: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})