
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generador PDF Nativo - Sin dependencias externas
class NativePDFGenerator {
  private objects: string[] = [];
  private currentObjectId = 1;

  constructor() {
    this.objects = [''];  // El objeto 0 siempre está vacío en PDF
  }

  private addObject(content: string): number {
    const id = this.currentObjectId++;
    this.objects.push(content);
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
    console.log('🔧 Generando PDF nativo para:', employee.name);

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

    // Crear objetos PDF
    
    // 1. Catálogo del documento
    const catalogId = this.addObject(`<<
/Type /Catalog
/Pages 2 0 R
>>`);

    // 2. Páginas del documento
    const pagesId = this.addObject(`<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>`);

    // 3. Contenido de la página principal
    const contentStreamId = this.addObject(`<<
/Length ${this.generateContentStream(employee, period, {
  salarioBase, diasTrabajados, salarioNeto, deducciones,
  horasExtra, bonificaciones, subsidioTransporte, fechaInicio, fechaFin
}).length}
>>
stream
${this.generateContentStream(employee, period, {
  salarioBase, diasTrabajados, salarioNeto, deducciones,
  horasExtra, bonificaciones, subsidioTransporte, fechaInicio, fechaFin
})}
endstream`);

    // 4. Definición de la página
    const pageId = this.addObject(`<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents ${contentStreamId} 0 R
/Resources <<
  /Font <<
    /F1 ${this.addObject(`<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>`)} 0 R
    /F2 ${this.addObject(`<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>`)} 0 R
  >>
>>
>>`);

    // Generar el archivo PDF completo
    return this.buildPDF();
  }

  private generateContentStream(employee: any, period: any, data: any): string {
    const { salarioBase, diasTrabajados, salarioNeto, deducciones, 
            horasExtra, bonificaciones, subsidioTransporte, fechaInicio, fechaFin } = data;

    return `
BT
/F2 18 Tf
72 720 Td
(${this.escapeText('COMPROBANTE DE NOMINA')}) Tj
ET

BT
/F2 12 Tf
72 680 Td
(${this.escapeText('EMPRESA:')}) Tj
ET

BT
/F1 11 Tf
72 665 Td
(${this.escapeText('Mi Empresa')}) Tj
ET

BT
/F1 10 Tf
72 650 Td
(${this.escapeText('NIT: N/A')}) Tj
ET

BT
/F2 12 Tf
250 680 Td
(${this.escapeText('EMPLEADO:')}) Tj
ET

BT
/F1 11 Tf
250 665 Td
(${this.escapeText(employee.name || 'N/A')}) Tj
ET

BT
/F1 10 Tf
250 650 Td
(${this.escapeText('CC: ' + (employee.id?.slice(0, 8) || 'N/A'))}) Tj
ET

BT
/F2 12 Tf
450 680 Td
(${this.escapeText('PERIODO:')}) Tj
ET

BT
/F1 11 Tf
450 665 Td
(${this.escapeText(fechaInicio + ' - ' + fechaFin)}) Tj
ET

BT
/F1 10 Tf
450 650 Td
(${this.escapeText('Dias: ' + diasTrabajados)}) Tj
ET

72 630 m
540 630 l
S

BT
/F2 14 Tf
72 600 Td
(${this.escapeText('RESUMEN DE PAGO')}) Tj
ET

BT
/F1 10 Tf
72 570 Td
(${this.escapeText('Salario Base:')}) Tj
ET

BT
/F1 10 Tf
400 570 Td
(${this.escapeText(this.formatCurrency(salarioBase))}) Tj
ET

${subsidioTransporte > 0 ? `
BT
/F1 10 Tf
72 550 Td
(${this.escapeText('Subsidio Transporte:')}) Tj
ET

BT
/F1 10 Tf
400 550 Td
(${this.escapeText(this.formatCurrency(subsidioTransporte))}) Tj
ET
` : ''}

${bonificaciones > 0 ? `
BT
/F1 10 Tf
72 530 Td
(${this.escapeText('Bonificaciones:')}) Tj
ET

BT
/F1 10 Tf
400 530 Td
(${this.escapeText(this.formatCurrency(bonificaciones))}) Tj
ET
` : ''}

${horasExtra > 0 ? `
BT
/F1 10 Tf
72 510 Td
(${this.escapeText('Horas Extra:')}) Tj
ET

BT
/F1 10 Tf
400 510 Td
(${this.escapeText(this.formatCurrency(horasExtra * Math.round((salarioBase / 240) * 1.25)))}) Tj
ET
` : ''}

${deducciones > 0 ? `
BT
/F1 10 Tf
1 0 0 rg
72 490 Td
(${this.escapeText('Deducciones:')}) Tj
ET

BT
/F1 10 Tf
1 0 0 rg
400 490 Td
(${this.escapeText('-' + this.formatCurrency(deducciones))}) Tj
ET

0 0 0 rg
` : ''}

72 470 m
540 470 l
S

BT
/F2 14 Tf
0 0.4 0 rg
72 440 Td
(${this.escapeText('TOTAL NETO:')}) Tj
ET

BT
/F2 14 Tf
0 0.4 0 rg
350 440 Td
(${this.escapeText(this.formatCurrency(salarioNeto))}) Tj
ET

0 0 0 rg

BT
/F1 8 Tf
72 100 Td
(${this.escapeText('Generado con Finppi - Sistema de Nomina')}) Tj
ET

BT
/F1 8 Tf
72 85 Td
(${this.escapeText('Fecha: ' + new Date().toLocaleDateString('es-CO'))}) Tj
ET
`;
  }

  private buildPDF(): Uint8Array {
    console.log('🏗️ Construyendo estructura PDF nativa...');

    let pdf = '%PDF-1.4\n';
    pdf += '%âãÏÓ\n'; // Comentario binario para compatibilidad

    // Tabla de referencias cruzadas
    const xrefTable: number[] = [];
    let currentPos = pdf.length;

    // Agregar objetos
    for (let i = 1; i < this.objects.length; i++) {
      xrefTable.push(currentPos);
      const objContent = `${i} 0 obj\n${this.objects[i]}\nendobj\n`;
      pdf += objContent;
      currentPos += objContent.length;
    }

    // Posición de la tabla xref
    const xrefPos = currentPos;

    // Generar tabla xref
    pdf += 'xref\n';
    pdf += `0 ${this.objects.length}\n`;
    pdf += '0000000000 65535 f \n'; // Objeto 0

    for (const pos of xrefTable) {
      pdf += String(pos).padStart(10, '0') + ' 00000 n \n';
    }

    // Trailer
    pdf += 'trailer\n';
    pdf += `<<\n/Size ${this.objects.length}\n/Root 1 0 R\n>>\n`;
    pdf += 'startxref\n';
    pdf += `${xrefPos}\n`;
    pdf += '%%EOF\n';

    console.log('✅ PDF nativo generado exitosamente');
    
    const encoder = new TextEncoder();
    const pdfBytes = encoder.encode(pdf);
    
    console.log(`📋 Tamaño final: ${pdfBytes.length} bytes`);
    
    return pdfBytes;
  }
}

serve(async (req) => {
  console.log('🚀 PDF Generator Nativo - Iniciando...');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📋 Request recibido para PDF nativo');

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

    console.log('📄 Generando PDF con generador nativo...');
    
    const generator = new NativePDFGenerator();
    const pdfBytes = generator.generateVoucher(employee, period);
    
    console.log(`✅ PDF nativo generado - Tamaño: ${pdfBytes.length} bytes`);
    
    // Validaciones de seguridad
    if (pdfBytes.length < 500) {
      throw new Error(`PDF muy pequeño: ${pdfBytes.length} bytes`);
    }
    
    const pdfString = new TextDecoder().decode(pdfBytes.slice(0, 10));
    if (!pdfString.startsWith('%PDF-')) {
      throw new Error(`Header PDF inválido: ${pdfString}`);
    }
    
    console.log('✅ PDF nativo validado correctamente');
    
    const fileName = `comprobante-${employee.name?.replace(/\s+/g, '-') || 'empleado'}.pdf`;
    
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBytes.length.toString(),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Accept-Ranges': 'bytes'
      }
    });

  } catch (error) {
    console.error('💥 ERROR en generador nativo:', error);
    console.error('💥 Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: `Error generando PDF nativo: ${error.message}`,
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
