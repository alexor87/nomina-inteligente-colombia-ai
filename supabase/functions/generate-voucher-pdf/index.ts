
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

  generateVoucher(employee: any, period: any): Uint8Array {
    console.log('🔧 Generando PDF nativo corregido para:', employee.name);

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

    // PASO 2: Crear contenido del stream
    const contentStream = this.generateContentStream(employee, period, {
      salarioBase, diasTrabajados, salarioNeto, deducciones,
      horasExtra, bonificaciones, subsidioTransporte, fechaInicio, fechaFin
    });

    const contentStreamId = this.addObject(`<<
/Length ${contentStream.length}
>>
stream
${contentStream}
endstream`);

    // PASO 3: Crear página con referencias correctas
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

    // PASO 4: Crear catálogo de páginas
    const pagesId = this.addObject(`<<
/Type /Pages
/Kids [${pageId} 0 R]
/Count 1
>>`);

    // PASO 5: Crear catálogo raíz
    const catalogId = this.addObject(`<<
/Type /Catalog
/Pages ${pagesId} 0 R
>>`);

    // Generar el archivo PDF completo con estructura corregida
    return this.buildPDFWithCorrectStructure(catalogId);
  }

  private generateContentStream(employee: any, period: any, data: any): string {
    const { salarioBase, diasTrabajados, salarioNeto, deducciones, 
            horasExtra, bonificaciones, subsidioTransporte, fechaInicio, fechaFin } = data;

    return `BT
/F2 18 Tf
50 750 Td
(${this.escapeText('COMPROBANTE DE NOMINA')}) Tj
ET

BT
/F2 12 Tf
50 710 Td
(${this.escapeText('EMPRESA:')}) Tj
ET

BT
/F1 11 Tf
50 695 Td
(${this.escapeText('Mi Empresa S.A.S.')}) Tj
ET

BT
/F1 10 Tf
50 680 Td
(${this.escapeText('NIT: 900123456-1')}) Tj
ET

BT
/F2 12 Tf
200 710 Td
(${this.escapeText('EMPLEADO:')}) Tj
ET

BT
/F1 11 Tf
200 695 Td
(${this.escapeText(employee.name || 'N/A')}) Tj
ET

BT
/F1 10 Tf
200 680 Td
(${this.escapeText('CC: ' + (employee.id?.slice(0, 8) || 'N/A'))}) Tj
ET

BT
/F2 12 Tf
400 710 Td
(${this.escapeText('PERIODO:')}) Tj
ET

BT
/F1 11 Tf
400 695 Td
(${this.escapeText(fechaInicio + ' - ' + fechaFin)}) Tj
ET

BT
/F1 10 Tf
400 680 Td
(${this.escapeText('Dias: ' + diasTrabajados)}) Tj
ET

50 660 m
550 660 l
S

BT
/F2 14 Tf
50 630 Td
(${this.escapeText('DETALLE DE PAGO')}) Tj
ET

BT
/F1 10 Tf
50 600 Td
(${this.escapeText('Salario Base:')}) Tj
ET

BT
/F1 10 Tf
400 600 Td
(${this.escapeText(this.formatCurrency(salarioBase))}) Tj
ET

${subsidioTransporte > 0 ? `
BT
/F1 10 Tf
50 580 Td
(${this.escapeText('Subsidio Transporte:')}) Tj
ET

BT
/F1 10 Tf
400 580 Td
(${this.escapeText(this.formatCurrency(subsidioTransporte))}) Tj
ET
` : ''}

${bonificaciones > 0 ? `
BT
/F1 10 Tf
50 560 Td
(${this.escapeText('Bonificaciones:')}) Tj
ET

BT
/F1 10 Tf
400 560 Td
(${this.escapeText(this.formatCurrency(bonificaciones))}) Tj
ET
` : ''}

${horasExtra > 0 ? `
BT
/F1 10 Tf
50 540 Td
(${this.escapeText('Horas Extra:')}) Tj
ET

BT
/F1 10 Tf
400 540 Td
(${this.escapeText(this.formatCurrency(horasExtra * Math.round((salarioBase / 240) * 1.25)))}) Tj
ET
` : ''}

${deducciones > 0 ? `
BT
/F1 10 Tf
1 0 0 rg
50 520 Td
(${this.escapeText('Deducciones:')}) Tj
ET

BT
/F1 10 Tf
1 0 0 rg
400 520 Td
(${this.escapeText('-' + this.formatCurrency(deducciones))}) Tj
ET

0 0 0 rg
` : ''}

50 500 m
550 500 l
S

BT
/F2 14 Tf
0 0.6 0 rg
50 470 Td
(${this.escapeText('TOTAL NETO A PAGAR:')}) Tj
ET

BT
/F2 14 Tf
0 0.6 0 rg
350 470 Td
(${this.escapeText(this.formatCurrency(salarioNeto))}) Tj
ET

0 0 0 rg

BT
/F1 8 Tf
50 120 Td
(${this.escapeText('Generado con Finppi - Sistema de Nomina Profesional')}) Tj
ET

BT
/F1 8 Tf
50 105 Td
(${this.escapeText('Fecha de generacion: ' + new Date().toLocaleDateString('es-CO'))}) Tj
ET`;
  }

  private buildPDFWithCorrectStructure(catalogId: number): Uint8Array {
    console.log('🏗️ Construyendo PDF con estructura corregida...');

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

    console.log('✅ PDF nativo con estructura corregida generado exitosamente');
    console.log(`📊 Objetos creados: ${this.objects.length - 1}`);
    console.log(`📏 Posición xref: ${xrefPos}`);
    
    const encoder = new TextEncoder();
    const pdfBytes = encoder.encode(pdf);
    
    console.log(`📋 Tamaño final del PDF: ${pdfBytes.length} bytes`);
    
    return pdfBytes;
  }
}

serve(async (req) => {
  console.log('🚀 PDF Generator Nativo Corregido - Iniciando...');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📋 Request recibido para PDF nativo corregido');

    const { employee, period } = requestBody;

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

    console.log('📄 Generando PDF con estructura corregida...');
    
    const generator = new NativePDFGenerator();
    const pdfBytes = generator.generateVoucher(employee, period);
    
    console.log(`✅ PDF nativo corregido generado - Tamaño: ${pdfBytes.length} bytes`);
    
    // Validaciones de seguridad mejoradas
    if (pdfBytes.length < 1000) {
      throw new Error(`PDF muy pequeño: ${pdfBytes.length} bytes - posible error`);
    }
    
    const pdfString = new TextDecoder().decode(pdfBytes.slice(0, 15));
    if (!pdfString.startsWith('%PDF-')) {
      throw new Error(`Header PDF inválido: ${pdfString}`);
    }
    
    console.log('✅ PDF nativo corregido validado correctamente');
    console.log(`🔍 Header verificado: ${pdfString.slice(0, 8)}`);
    
    const fileName = `comprobante-${employee.name?.replace(/\s+/g, '-') || 'empleado'}.pdf`;
    
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
    console.error('💥 ERROR en generador nativo corregido:', error);
    console.error('💥 Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: `Error generando PDF nativo corregido: ${error.message}`,
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
