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
    const { salarioBase, diasTrabajados, salarioNeto, deducciones, 
            horasExtra, bonificaciones, subsidioTransporte, fechaInicio, fechaFin,
            salarioProporcional, totalHorasExtra, valorHoraExtra,
            saludEmpleado, pensionEmpleado, totalDeduccionesCalculadas } = data;

    const companyName = company?.razon_social || 'Mi Empresa';
    const companyNit = company?.nit || 'N/A';
    const companyAddress = company?.direccion || '';
    const companyCity = company?.ciudad || '';
    const companyPhone = company?.telefono || '';

    // SYNCHRONIZED WITH MODAL: Replicate exact visual layout
    return `
% ===== BLUE HEADER TITLE =====
BT
/F2 18 Tf
0.12 0.31 0.75 rg
220 750 Td
(${this.escapeText('Comprobante de Nómina')}) Tj
ET

% ===== CARD 1: EMPRESA (Replicating modal card layout) =====
% Card background (gray)
0.94 0.94 0.94 rg
50 650 180 80 re f
% Left blue border
0.12 0.31 0.75 rg
50 650 4 80 re f

% Company logo circle (blue background with white letter)
0.12 0.31 0.75 rg
70 700 30 30 re f
BT
/F2 16 Tf
1 1 1 rg
80 710 Td
(${this.escapeText((companyName).charAt(0))}) Tj
ET

% EMPRESA label (same as modal)
BT
/F2 8 Tf
0.4 0.4 0.4 rg
55 685 Td
(${this.escapeText('EMPRESA')}) Tj
ET

% Company name and details
BT
/F2 10 Tf
0 0 0 rg
55 670 Td
(${this.escapeText(companyName)}) Tj
ET

BT
/F1 8 Tf
0.3 0.3 0.3 rg
55 657 Td
(${this.escapeText('NIT: ' + companyNit)}) Tj
ET

${companyAddress ? `
BT
/F1 8 Tf
0.3 0.3 0.3 rg
55 644 Td
(${this.escapeText('Dirección: ' + companyAddress)}) Tj
ET
` : ''}

% ===== CARD 2: EMPLEADO (Center card) =====
% Card background
0.94 0.94 0.94 rg
250 650 180 80 re f
% Left blue border  
0.12 0.31 0.75 rg
250 650 4 80 re f

% EMPLEADO label
BT
/F2 8 Tf
0.4 0.4 0.4 rg
255 715 Td
(${this.escapeText('EMPLEADO')}) Tj
ET

% Employee details
BT
/F2 10 Tf
0 0 0 rg
255 700 Td
(${this.escapeText(employee.name || 'N/A')}) Tj
ET

BT
/F1 8 Tf
0.3 0.3 0.3 rg
255 687 Td
(${this.escapeText('CC: ' + (employee.cedula || 'N/A'))}) Tj
ET

${employee.position ? `
BT
/F1 8 Tf
0.3 0.3 0.3 rg
255 674 Td
(${this.escapeText('Cargo: ' + employee.position)}) Tj
ET
` : ''}

% ===== CARD 3: PERÍODO (Right card) =====
% Card background
0.94 0.94 0.94 rg
450 650 180 80 re f
% Left blue border
0.12 0.31 0.75 rg
450 650 4 80 re f

% PERÍODO label
BT
/F2 8 Tf
0.4 0.4 0.4 rg
455 715 Td
(${this.escapeText('PERÍODO DE PAGO')}) Tj
ET

% Period details
BT
/F2 10 Tf
0 0 0 rg
455 700 Td
(${this.escapeText(fechaInicio + ' - ' + fechaFin)}) Tj
ET

BT
/F1 8 Tf
0.3 0.3 0.3 rg
455 687 Td
(${this.escapeText('Días trabajados: ' + diasTrabajados)}) Tj
ET

BT
/F1 8 Tf
0.3 0.3 0.3 rg
455 674 Td
(${this.escapeText('Salario Base: ' + this.formatCurrency(salarioBase))}) Tj
ET

% ===== PAYMENT SUMMARY TABLE (Exact replica of modal table) =====
BT
/F2 14 Tf
0.12 0.31 0.75 rg
50 600 Td
(${this.escapeText('💵 Resumen del Pago')}) Tj
ET

% Main table background (white with border)
1 1 1 rg
50 380 540 210 re f
% Table border
0.8 0.8 0.8 RG
0.5 w
50 380 540 210 re S

% Table header background (gray)
0.96 0.96 0.96 rg
50 570 540 20 re f

% Header border
0.8 0.8 0.8 RG
0.3 w
50 570 540 20 re S

% Table headers
BT
/F2 9 Tf
0.3 0.3 0.3 rg
55 576 Td
(${this.escapeText('Concepto')}) Tj
ET

BT
/F2 9 Tf
0.3 0.3 0.3 rg
500 576 Td
(${this.escapeText('Valor')}) Tj
ET

% Table rows with borders (same structure as modal)
q
0.8 0.8 0.8 RG
0.2 w
% Row borders
50 550 540 0 m S
50 530 540 0 m S  
50 510 540 0 m S
50 490 540 0 m S
${subsidioTransporte > 0 ? '50 470 540 0 m S' : ''}
${bonificaciones > 0 ? '50 450 540 0 m S' : ''}
${totalHorasExtra > 0 ? '50 430 540 0 m S' : ''}
50 410 540 0 m S
50 390 540 0 m S
Q

% Table content (matching modal exactly)
BT
/F1 9 Tf
0 0 0 rg
55 555 Td
(${this.escapeText('Salario Base')}) Tj
ET

BT
/F1 9 Tf
0 0 0 rg
520 555 Td
(${this.escapeText(this.formatCurrency(salarioBase))}) Tj
ET

BT
/F1 9 Tf
0 0 0 rg
55 535 Td
(${this.escapeText('Días Trabajados')}) Tj
ET

BT
/F1 9 Tf
0 0 0 rg
520 535 Td
(${this.escapeText(diasTrabajados + ' días')}) Tj
ET

BT
/F1 9 Tf
0 0 0 rg
55 515 Td
(${this.escapeText('Salario Proporcional')}) Tj
ET

BT
/F1 9 Tf
0 0 0 rg
520 515 Td
(${this.escapeText(this.formatCurrency(salarioProporcional))}) Tj
ET

${subsidioTransporte > 0 ? `
BT
/F1 9 Tf
0 0 0 rg
55 495 Td
(${this.escapeText('Subsidio de Transporte')}) Tj
ET

BT
/F1 9 Tf
0 0 0 rg
520 495 Td
(${this.escapeText(this.formatCurrency(subsidioTransporte))}) Tj
ET
` : ''}

${bonificaciones > 0 ? `
BT
/F1 9 Tf
0 0 0 rg
55 475 Td
(${this.escapeText('Bonificaciones')}) Tj
ET

BT
/F1 9 Tf
0 0 0 rg
520 475 Td
(${this.escapeText(this.formatCurrency(bonificaciones))}) Tj
ET
` : ''}

${totalHorasExtra > 0 ? `
BT
/F1 9 Tf
0 0 0 rg
55 455 Td
(${this.escapeText('Horas Extras (' + horasExtra + ' hrs)')}) Tj
ET

BT
/F1 9 Tf
0 0 0 rg
520 455 Td
(${this.escapeText(this.formatCurrency(totalHorasExtra))}) Tj
ET
` : ''}

% Deductions row (red background like modal)
1 0.94 0.94 rg
50 410 540 20 re f

BT
/F2 9 Tf
0.8 0.2 0.2 rg
55 415 Td
(${this.escapeText('Total Deducciones')}) Tj
ET

BT
/F2 9 Tf
0.8 0.2 0.2 rg
520 415 Td
(${this.escapeText('-' + this.formatCurrency(deducciones))}) Tj
ET

% Net pay row (green background like modal)
0.94 1 0.94 rg
50 390 540 20 re f

BT
/F2 10 Tf
0.2 0.6 0.2 rg
55 395 Td
(${this.escapeText('NETO A PAGAR')}) Tj
ET

BT
/F2 10 Tf
0.2 0.6 0.2 rg
520 395 Td
(${this.escapeText(this.formatCurrency(salarioNeto))}) Tj
ET

${totalHorasExtra > 0 ? `
% ===== EXTRA HOURS TABLE (Same as modal) =====
BT
/F2 14 Tf
0.12 0.31 0.75 rg
50 340 Td
(${this.escapeText('⏱ Horas Extras, Ordinarias y Recargos')}) Tj
ET

% Extra hours table background
1 1 1 rg
50 250 540 80 re f
0.8 0.8 0.8 RG
0.5 w
50 250 540 80 re S

% Extra hours header
0.96 0.96 0.96 rg
50 310 540 20 re f

BT
/F2 9 Tf
0.3 0.3 0.3 rg
55 316 Td
(${this.escapeText('Concepto')}) Tj
ET

BT
/F2 9 Tf
0.3 0.3 0.3 rg
280 316 Td
(${this.escapeText('Cantidad')}) Tj
ET

BT
/F2 9 Tf
0.3 0.3 0.3 rg
500 316 Td
(${this.escapeText('Valor')}) Tj
ET

% Extra hours row border
q
0.8 0.8 0.8 RG
0.2 w
50 310 540 0 m S
50 290 540 0 m S
Q

% Extra hours content
BT
/F1 9 Tf
0 0 0 rg
55 295 Td
(${this.escapeText('Horas Extra (' + horasExtra + ' hrs)')}) Tj
ET

BT
/F1 9 Tf
0 0 0 rg
280 295 Td
(${this.escapeText('Valor por hora: ' + this.formatCurrency(valorHoraExtra))}) Tj
ET

BT
/F1 9 Tf
0 0 0 rg
520 295 Td
(${this.escapeText(this.formatCurrency(totalHorasExtra))}) Tj
ET
` : ''}

% Footer (legal text)
BT
/F1 8 Tf
0.4 0.4 0.4 rg
50 150 Td
(${this.escapeText('Este comprobante se genera electrónicamente y tiene validez legal.')}) Tj
ET

BT
/F1 8 Tf
0.4 0.4 0.4 rg
50 135 Td
(${this.escapeText('Generado con Finppi - Sistema de Nómina Profesional')}) Tj
ET

BT
/F1 8 Tf
0.4 0.4 0.4 rg
50 120 Td
(${this.escapeText('Fecha: ' + new Date().toLocaleDateString('es-CO') + ' - Hora: ' + new Date().toLocaleTimeString('es-CO'))}) Tj
ET`;
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