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

    // Calculated data
    const salarioBase = Number(employee.baseSalary) || 0;
    const diasTrabajados = Number(employee.workedDays) || 30;
    const salarioNeto = Number(employee.netPay) || 0;
    const deducciones = Number(employee.deductions) || 0;
    const horasExtra = Number(employee.extraHours) || 0;
    const bonificaciones = Number(employee.bonuses) || 0;
    const subsidioTransporte = Number(employee.transportAllowance) || 0;

    const fechaInicio = this.formatDate(period.startDate);
    const fechaFin = this.formatDate(period.endDate);

    // Process logo with improved error handling
    let logoImageObject = null;
    if (company?.logo_url) {
      try {
        logoImageObject = await this.processCompanyLogo(company.logo_url);
        if (logoImageObject) {
          console.log('✅ Logo procesado correctamente');
        }
      } catch (error) {
        console.warn('⚠️ Error procesando logo, continuando sin logo:', error.message);
        logoImageObject = null;
      }
    }

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

    // Add logo if exists
    let logoObjectId = null;
    if (logoImageObject) {
      logoObjectId = this.addObject(logoImageObject);
    }

    // Create content stream
    const contentStream = this.generateContentStream(employee, period, company, {
      salarioBase, diasTrabajados, salarioNeto, deducciones,
      horasExtra, bonificaciones, subsidioTransporte, fechaInicio, fechaFin,
      logoObjectId
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
  ${logoObjectId ? `/XObject <</Logo ${logoObjectId} 0 R>>` : ''}
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
            horasExtra, bonificaciones, subsidioTransporte, fechaInicio, fechaFin, logoObjectId } = data;

    const companyName = company?.razon_social || 'Mi Empresa S.A.S.';
    const companyNit = company?.nit || '900123456-1';
    const companyAddress = company?.direccion || 'Dirección no disponible';
    const companyCity = company?.ciudad || 'Ciudad no disponible';

    // Create professional header with logo
    let logoContent = '';
    let companyTextPosition = 50;
    
    if (logoObjectId) {
      logoContent = `q
80 0 0 40 50 710 cm
/Logo Do
Q
`;
      companyTextPosition = 150; // Move company text to the right of logo
    }

    return `${logoContent}
BT
/F2 20 Tf
50 750 Td
(${this.escapeText('COMPROBANTE DE NOMINA')}) Tj
ET

BT
/F2 12 Tf
${companyTextPosition} 710 Td
(${this.escapeText('EMPRESA:')}) Tj
ET

BT
/F1 11 Tf
${companyTextPosition} 695 Td
(${this.escapeText(companyName)}) Tj
ET

BT
/F1 10 Tf
${companyTextPosition} 680 Td
(${this.escapeText('NIT: ' + companyNit)}) Tj
ET

BT
/F1 10 Tf
${companyTextPosition} 665 Td
(${this.escapeText(companyAddress + ' - ' + companyCity)}) Tj
ET

BT
/F2 12 Tf
300 710 Td
(${this.escapeText('EMPLEADO:')}) Tj
ET

BT
/F1 11 Tf
300 695 Td
(${this.escapeText(employee.name || 'N/A')}) Tj
ET

BT
/F1 10 Tf
300 680 Td
(${this.escapeText('CC: ' + (employee.cedula || employee.id?.slice(0, 8) || 'N/A'))}) Tj
ET

BT
/F1 10 Tf
300 665 Td
(${this.escapeText('Cargo: ' + (employee.position || 'N/A'))}) Tj
ET

BT
/F2 12 Tf
450 710 Td
(${this.escapeText('PERIODO:')}) Tj
ET

BT
/F1 11 Tf
450 695 Td
(${this.escapeText(fechaInicio + ' - ' + fechaFin)}) Tj
ET

BT
/F1 10 Tf
450 680 Td
(${this.escapeText('Dias: ' + diasTrabajados)}) Tj
ET

BT
/F1 10 Tf
450 665 Td
(${this.escapeText('Tipo: ' + (period.type || 'mensual'))}) Tj
ET

50 645 m
550 645 l
S

BT
/F2 16 Tf
50 615 Td
(${this.escapeText('DETALLE DE LIQUIDACION')}) Tj
ET

BT
/F2 12 Tf
50 585 Td
(${this.escapeText('DEVENGADOS')}) Tj
ET

BT
/F1 10 Tf
50 565 Td
(${this.escapeText('Salario Base:')}) Tj
ET

BT
/F1 10 Tf
400 565 Td
(${this.escapeText(this.formatCurrency(salarioBase))}) Tj
ET

${subsidioTransporte > 0 ? `
BT
/F1 10 Tf
50 545 Td
(${this.escapeText('Subsidio Transporte:')}) Tj
ET

BT
/F1 10 Tf
400 545 Td
(${this.escapeText(this.formatCurrency(subsidioTransporte))}) Tj
ET
` : ''}

${bonificaciones > 0 ? `
BT
/F1 10 Tf
50 525 Td
(${this.escapeText('Bonificaciones:')}) Tj
ET

BT
/F1 10 Tf
400 525 Td
(${this.escapeText(this.formatCurrency(bonificaciones))}) Tj
ET
` : ''}

${horasExtra > 0 ? `
BT
/F1 10 Tf
50 505 Td
(${this.escapeText('Horas Extra (' + horasExtra + ' hrs):')}) Tj
ET

BT
/F1 10 Tf
400 505 Td
(${this.escapeText(this.formatCurrency(horasExtra * Math.round((salarioBase / 240) * 1.25)))}) Tj
ET
` : ''}

BT
/F2 12 Tf
50 475 Td
(${this.escapeText('DEDUCCIONES')}) Tj
ET

${deducciones > 0 ? `
BT
/F1 10 Tf
1 0 0 rg
50 455 Td
(${this.escapeText('Salud (4%):')}) Tj
ET

BT
/F1 10 Tf
1 0 0 rg
400 455 Td
(${this.escapeText('-' + this.formatCurrency(salarioBase * 0.04))}) Tj
ET

BT
/F1 10 Tf
1 0 0 rg
50 435 Td
(${this.escapeText('Pension (4%):')}) Tj
ET

BT
/F1 10 Tf
1 0 0 rg
400 435 Td
(${this.escapeText('-' + this.formatCurrency(salarioBase * 0.04))}) Tj
ET

BT
/F1 10 Tf
1 0 0 rg
50 415 Td
(${this.escapeText('Total Deducciones:')}) Tj
ET

BT
/F1 10 Tf
1 0 0 rg
400 415 Td
(${this.escapeText('-' + this.formatCurrency(deducciones))}) Tj
ET

0 0 0 rg
` : ''}

50 395 m
550 395 l
S

BT
/F2 18 Tf
0 0.6 0 rg
50 365 Td
(${this.escapeText('NETO A PAGAR:')}) Tj
ET

BT
/F2 18 Tf
0 0.6 0 rg
350 365 Td
(${this.escapeText(this.formatCurrency(salarioNeto))}) Tj
ET

0 0 0 rg

50 340 m
550 340 l
S

BT
/F1 8 Tf
50 150 Td
(${this.escapeText('Este comprobante se genera electronicamente y tiene validez legal.')}) Tj
ET

BT
/F1 8 Tf
50 135 Td
(${this.escapeText('Generado con Finppi - Sistema de Nomina Profesional')}) Tj
ET

BT
/F1 8 Tf
50 120 Td
(${this.escapeText('Fecha de generacion: ' + new Date().toLocaleDateString('es-CO'))}) Tj
ET

BT
/F1 8 Tf
50 105 Td
(${this.escapeText('Hora de generacion: ' + new Date().toLocaleTimeString('es-CO'))}) Tj
ET`;
  }

  private async processCompanyLogo(logoUrl: string): Promise<string | null> {
    try {
      console.log('🖼️ Procesando logo:', logoUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout
      
      const response = await fetch(logoUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PDFGenerator/1.0)'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn('⚠️ Logo download failed:', response.status);
        return null;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > 1500000) { // 1.5MB limit
        console.warn('⚠️ Logo size invalid:', arrayBuffer.byteLength);
        return null;
      }
      
      // Convert to binary string for PDF
      const uint8Array = new Uint8Array(arrayBuffer);
      let binaryData = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryData += String.fromCharCode(uint8Array[i]);
      }
      
      console.log(`✅ Logo processed: ${arrayBuffer.byteLength} bytes`);
      
      return `<<
/Type /XObject
/Subtype /Image
/Width 120
/Height 60
/ColorSpace /DeviceRGB
/BitsPerComponent 8
/Filter /DCTDecode
/Length ${arrayBuffer.byteLength}
>>
stream
${binaryData}
endstream`;
      
    } catch (error) {
      console.warn('⚠️ Logo processing error:', error.message);
      return null;
    }
  }

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