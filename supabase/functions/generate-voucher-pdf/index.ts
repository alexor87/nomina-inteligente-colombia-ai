
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generador PDF Nativo Corregido - Estructura válida
class NativePDFGenerator {
  private objects: string[] = [];
  private objectPositions: number[] = [];
  private currentObjectId = 1;

  constructor() {
    this.objects = [''];  // El objeto 0 siempre está vacío en PDF
    this.objectPositions = [0]; // Posición del objeto 0
  }

  private addObject(content: string): number {
    const id = this.currentObjectId++;
    this.objects.push(content);
    this.objectPositions.push(0); // Se calculará después
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
    console.log('🔧 Generando PDF profesional para:', employee.name);

    // Datos calculados
    const salarioBase = Number(employee.baseSalary) || 0;
    const diasTrabajados = Number(employee.workedDays) || 30;
    const salarioNeto = Number(employee.netPay) || 0;
    const deducciones = Number(employee.deductions) || 0;
    const horasExtra = Number(employee.extraHours) || 0;
    const bonificaciones = Number(employee.bonuses) || 0;
    const subsidioTransporte = Number(employee.transportAllowance) || 0;

    const fechaInicio = this.formatDate(period.startDate);
    const fechaFin = this.formatDate(period.endDate);

    // Procesar logo si existe
    let logoImageObject = null;
    if (company?.logo_url) {
      logoImageObject = await this.processCompanyLogo(company.logo_url);
    }

    // PASO 1: Crear fuentes primero (objetos 1 y 2)
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

    // PASO 2: Agregar logo si existe
    let logoObjectId = null;
    if (logoImageObject) {
      logoObjectId = this.addObject(logoImageObject);
    }

    // PASO 3: Crear contenido del stream
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

    // PASO 4: Crear página con referencias correctas incluyendo logo
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

    // PASO 5: Crear catálogo de páginas
    const pagesId = this.addObject(`<<
/Type /Pages
/Kids [${pageId} 0 R]
/Count 1
>>`);

    // PASO 6: Crear catálogo raíz
    const catalogId = this.addObject(`<<
/Type /Catalog
/Pages ${pagesId} 0 R
>>`);

    // Generar el archivo PDF completo con estructura corregida
    return this.buildPDFWithCorrectStructure(catalogId);
  }

  private generateContentStream(employee: any, period: any, company: any, data: any): string {
    const { salarioBase, diasTrabajados, salarioNeto, deducciones, 
            horasExtra, bonificaciones, subsidioTransporte, fechaInicio, fechaFin, logoObjectId } = data;

    const companyName = company?.razon_social || 'Mi Empresa S.A.S.';
    const companyNit = company?.nit || '900123456-1';
    const companyAddress = company?.direccion || 'Dirección no disponible';
    const companyCity = company?.ciudad || 'Ciudad no disponible';

    // Crear header profesional con logo
    let logoContent = '';
    let companyTextPosition = 50;
    
    if (logoObjectId) {
      // Posicionar logo elegantemente en la esquina superior izquierda
      logoContent = `
q
60 0 0 60 50 720 cm
/Logo Do
Q
`;
      companyTextPosition = 130; // Mover texto de empresa a la derecha del logo
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
      console.log('🖼️ Procesando logo de empresa:', logoUrl);
      
      // Descargar imagen con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
      
      const response = await fetch(logoUrl, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn('⚠️ No se pudo descargar el logo:', response.status);
        return null;
      }
      
      const imageData = await response.arrayBuffer();
      const uint8Array = new Uint8Array(imageData);
      
      if (imageData.byteLength === 0) {
        console.warn('⚠️ Logo vacío');
        return null;
      }
      
      // Convertir a base64
      const base64 = btoa(String.fromCharCode(...uint8Array));
      
      // Detectar tipo de imagen
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const isJPEG = contentType.includes('jpeg') || contentType.includes('jpg');
      
      console.log(`✅ Logo procesado: ${imageData.byteLength} bytes, tipo: ${contentType}`);
      
      // Crear objeto de imagen PDF
      return `<<
/Type /XObject
/Subtype /Image
/Width 120
/Height 60
/ColorSpace /DeviceRGB
/BitsPerComponent 8
/Filter [/DCTDecode]
/Length ${imageData.byteLength}
>>
stream
${base64}
endstream`;
      
    } catch (error) {
      console.warn('⚠️ Error procesando logo:', error.message);
      return null;
    }
  }

  private buildPDFWithCorrectStructure(catalogId: number): Uint8Array {
    console.log('🏗️ Construyendo PDF con estructura profesional...');

    let pdf = '%PDF-1.4\n';
    pdf += '%âãÏÓ\n'; // Comentario binario

    // Calcular posiciones exactas de cada objeto
    let currentPos = pdf.length;

    // Escribir objetos y registrar posiciones
    for (let i = 1; i < this.objects.length; i++) {
      this.objectPositions[i] = currentPos;
      const objContent = `${i} 0 obj\n${this.objects[i]}\nendobj\n`;
      pdf += objContent;
      currentPos += objContent.length;
    }

    // Posición de la tabla xref
    const xrefPos = currentPos;

    // Generar tabla xref con posiciones correctas
    pdf += 'xref\n';
    pdf += `0 ${this.objects.length}\n`;
    pdf += '0000000000 65535 f \n'; // Objeto 0 (siempre libre)

    for (let i = 1; i < this.objects.length; i++) {
      const pos = String(this.objectPositions[i]).padStart(10, '0');
      pdf += `${pos} 00000 n \n`;
    }

    // Trailer corregido
    pdf += 'trailer\n';
    pdf += `<<\n/Size ${this.objects.length}\n/Root ${catalogId} 0 R\n>>\n`;
    pdf += 'startxref\n';
    pdf += `${xrefPos}\n`;
    pdf += '%%EOF\n';

    console.log('✅ PDF profesional generado exitosamente');
    console.log(`📊 Objetos creados: ${this.objects.length - 1}`);
    console.log(`📏 Posición xref: ${xrefPos}`);
    
    const encoder = new TextEncoder();
    const pdfBytes = encoder.encode(pdf);
    
    console.log(`📋 Tamaño final del PDF: ${pdfBytes.length} bytes`);
    
    return pdfBytes;
  }
}

serve(async (req) => {
  console.log('🚀 PDF Generator Profesional - Iniciando...');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticación
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorización requerido' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Crear cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verificar usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Error de autenticación:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const requestBody = await req.json();
    console.log('📋 Request autenticado para usuario:', user.id);

    const { employee, period, company } = requestBody;

    if (!employee || !period) {
      console.error('❌ Datos faltantes');
      return new Response(
        JSON.stringify({ error: 'Faltan datos del empleado o período' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📄 Generando PDF profesional...');
    console.log('👤 Empleado:', employee.name);
    console.log('📅 Período:', period.startDate, '-', period.endDate);
    console.log('🏢 Empresa:', company?.razon_social || 'No especificada');
    console.log('🖼️ Logo empresa:', company?.logo_url ? 'Sí' : 'No');
    
    const generator = new NativePDFGenerator();
    const pdfBytes = await generator.generateVoucher(employee, period, company);
    
    console.log(`✅ PDF profesional generado - Tamaño: ${pdfBytes.length} bytes`);
    
    // Validaciones de seguridad mejoradas
    if (pdfBytes.length < 1000) {
      throw new Error(`PDF muy pequeño: ${pdfBytes.length} bytes - posible error`);
    }
    
    const pdfString = new TextDecoder().decode(pdfBytes.slice(0, 15));
    if (!pdfString.startsWith('%PDF-')) {
      throw new Error(`Header PDF inválido: ${pdfString}`);
    }
    
    console.log('✅ PDF profesional validado correctamente');
    console.log(`🔍 Header verificado: ${pdfString.slice(0, 8)}`);
    
    const fileName = `comprobante-${employee.name?.replace(/\s+/g, '-') || 'empleado'}-${period.startDate?.replace(/-/g, '') || 'periodo'}.pdf`;
    
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBytes.length.toString(),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('💥 ERROR en generador profesional:', error);
    console.error('💥 Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: `Error generando PDF profesional: ${error.message}`,
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
