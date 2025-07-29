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
    console.log('🎨 UX DESIGNER MODE: Creating pixel-perfect PDF...');
    
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

    // Calculo del ancho del título para centrarlo perfectamente
    const titleText = 'COMPROBANTE DE NÓMINA';
    const titleWidth = titleText.length * 12; // Aproximación
    const pageWidth = 612;
    const titleX = (pageWidth - titleWidth) / 2;

    // PREMIUM PDF - UX REPLICA 100% MODAL
    return `
% ============= PREMIUM HEADER - PERFECTAMENTE CENTRADO =============
% Título principal centrado dinámicamente
BT
/F2 22 Tf
0.118 0.165 0.478 rg
${titleX} 750 Td
(${this.escapeText(titleText)}) Tj
ET

% Subtítulo del período - elegante y sutil
BT
/F1 12 Tf
0.3 0.3 0.3 rg
${titleX} 725 Td
(${this.escapeText('Período: ' + fechaInicio + ' - ' + fechaFin)}) Tj
ET

% Separador horizontal elegante
q
0.118 0.165 0.478 rg
50 710 512 1 re
f
Q

% ============= INFORMACIÓN CARDS - DISEÑO MODAL EXACTO =============

% CARD 1: EMPRESA - Diseño Premium con sombra
q
0.95 0.97 0.99 rg
40 630 170 80 re
f
Q

% Borde izquierdo azul distintivo
q
0.118 0.165 0.478 rg
40 630 4 80 re
f
Q

% Sombra sutil de la card
q
0.85 0.85 0.85 rg
42 628 170 80 re
f
Q
q
0.95 0.97 0.99 rg
40 630 170 80 re
f
Q

% Logo circular de empresa - profesional
q
0.118 0.165 0.478 rg
55 680 24 24 re
f
Q

% Inicial de empresa en blanco
BT
/F2 12 Tf
1 1 1 rg
64 689 Td
(${this.escapeText(companyInitial)}) Tj
ET

% Labels y datos de empresa
BT
/F2 9 Tf
0.118 0.165 0.478 rg
88 695 Td
(${this.escapeText('EMPRESA')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
88 680 Td
(${this.escapeText(companyName.length > 18 ? companyName.substring(0, 18) + '...' : companyName)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
88 667 Td
(${this.escapeText('NIT: ' + companyNit)}) Tj
ET

% CARD 2: EMPLEADO - Centrada
q
0.95 0.97 0.99 rg
221 630 170 80 re
f
Q

q
0.118 0.165 0.478 rg
221 630 4 80 re
f
Q

% Sombra
q
0.85 0.85 0.85 rg
223 628 170 80 re
f
Q
q
0.95 0.97 0.99 rg
221 630 170 80 re
f
Q

BT
/F2 9 Tf
0.118 0.165 0.478 rg
230 695 Td
(${this.escapeText('EMPLEADO')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
230 680 Td
(${this.escapeText((employee.name || 'N/A').length > 20 ? (employee.name || 'N/A').substring(0, 20) + '...' : (employee.name || 'N/A'))}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
230 667 Td
(${this.escapeText('CC: ' + (employee.cedula || 'N/A'))}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
230 654 Td
(${this.escapeText('Cargo: ' + (employee.position || 'N/A'))}) Tj
ET

% CARD 3: PERÍODO - Derecha
q
0.95 0.97 0.99 rg
402 630 170 80 re
f
Q

q
0.118 0.165 0.478 rg
402 630 4 80 re
f
Q

% Sombra
q
0.85 0.85 0.85 rg
404 628 170 80 re
f
Q
q
0.95 0.97 0.99 rg
402 630 170 80 re
f
Q

BT
/F2 9 Tf
0.118 0.165 0.478 rg
411 695 Td
(${this.escapeText('PERÍODO')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
411 680 Td
(${this.escapeText('Desde: ' + fechaInicio)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
411 667 Td
(${this.escapeText('Hasta: ' + fechaFin)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
411 654 Td
(${this.escapeText('Días trabajados: ' + diasTrabajados)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
411 641 Td
(${this.escapeText('Salario base: ' + formatCurrency(salarioBase))}) Tj
ET

% ============= TABLA PRINCIPAL DE CONCEPTOS - MODAL EXACTO =============
% Título de sección
BT
/F2 14 Tf
0.118 0.165 0.478 rg
40 600 Td
(${this.escapeText('RESUMEN DEL PAGO')}) Tj
ET

% Contenedor de tabla con borde elegante
q
0.98 0.98 0.98 rg
40 320 532 260 re
f
Q

% Borde de tabla profesional
q
0.85 0.85 0.85 RG
1 w
40 320 532 260 re
S
Q

% HEADER DE TABLA - Azul premium
q
0.118 0.165 0.478 rg
40 555 532 25 re
f
Q

% Textos del header
BT
/F2 10 Tf
1 1 1 rg
50 563 Td
(${this.escapeText('CONCEPTO')}) Tj
ET

BT
/F2 10 Tf
1 1 1 rg
480 563 Td
(${this.escapeText('VALOR')}) Tj
ET

% ============= FILAS DE CONCEPTOS - TODAS LAS DEL MODAL =============`;

    let yPos = 530;
    let rowCount = 0;

    // Función para crear una fila
    const createRow = (concept: string, value: string, isHighlighted = false, bgColorOverride?: string) => {
      const bgColor = bgColorOverride || (rowCount % 2 === 0 ? '0.98 0.98 0.98' : '1 1 1');
      const textColor = isHighlighted ? '0.118 0.165 0.478' : '0.2 0.2 0.2';
      const fontType = isHighlighted ? '/F2' : '/F1';
      
      let row = `
% Fila ${rowCount + 1}: ${concept}
q
${bgColor} rg
40 ${yPos} 532 25 re
f
Q

q
0.9 0.9 0.9 RG
0.5 w
40 ${yPos} 532 25 re
S
Q

BT
${fontType} 9 Tf
${textColor} rg
50 ${yPos + 8} Td
(${this.escapeText(concept)}) Tj
ET

BT
${fontType} 9 Tf
${textColor} rg
480 ${yPos + 8} Td
(${this.escapeText(value)}) Tj
ET`;
      
      yPos -= 25;
      rowCount++;
      return row;
    };

    let tableContent = '';

    // 1. Salario Base
    tableContent += createRow('Salario Base', formatCurrency(salarioBase));

    // 2. Salario Proporcional
    tableContent += createRow(`Salario Proporcional (${diasTrabajados} días)`, formatCurrency(salarioProporcional));

    // 3. Subsidio de Transporte (si > 0)
    if (subsidioTransporte > 0) {
      tableContent += createRow('Subsidio de Transporte', formatCurrency(subsidioTransporte));
    }

    // 4. Bonificaciones (si > 0)
    if (bonificaciones > 0) {
      tableContent += createRow('Bonificaciones', formatCurrency(bonificaciones));
    }

    // 5. Horas Extra (si > 0)
    if (totalHorasExtra > 0) {
      tableContent += createRow(`Horas Extra (${horasExtra} hrs x ${formatCurrency(valorHoraExtra)})`, formatCurrency(totalHorasExtra));
    }

    // 6. Total Deducciones (rojo)
    tableContent += createRow('Total Deducciones', '- ' + formatCurrency(totalDeduccionesCalculadas), false, '0.99 0.95 0.95');

    // 7. NETO A PAGAR (verde destacado)
    tableContent += createRow('NETO A PAGAR', formatCurrency(salarioNeto), true, '0.95 0.99 0.95');

    // ============= SECCIONES ADICIONALES (CONDICIONALES) =============
    let extraSections = '';
    let yPos2 = 280; // Position below main table
    
    // TABLA DE HORAS EXTRA (si aplica)
    if (totalHorasExtra > 0) {
      extraSections += `

% ============= DETALLE HORAS EXTRA =============
BT
/F2 12 Tf
0.118 0.165 0.478 rg
40 ${yPos2} Td
(${this.escapeText('DETALLE HORAS EXTRA')}) Tj
ET

% Container
q
0.98 0.98 0.98 rg
40 ${yPos2 - 70} 532 60 re
f
Q

q
0.85 0.85 0.85 RG
1 w
40 ${yPos2 - 70} 532 60 re
S
Q

% Header
q
0.118 0.165 0.478 rg
40 ${yPos2 - 25} 532 20 re
f
Q

BT
/F2 9 Tf
1 1 1 rg
50 ${yPos2 - 18} Td
(${this.escapeText('CONCEPTO')}) Tj
ET

BT
/F2 9 Tf
1 1 1 rg
250 ${yPos2 - 18} Td
(${this.escapeText('CANTIDAD')}) Tj
ET

BT
/F2 9 Tf
1 1 1 rg
450 ${yPos2 - 18} Td
(${this.escapeText('VALOR')}) Tj
ET

% Content row
q
1 1 1 rg
40 ${yPos2 - 45} 532 20 re
f
Q

BT
/F1 8 Tf
0.2 0.2 0.2 rg
50 ${yPos2 - 38} Td
(${this.escapeText('Horas Extra')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
250 ${yPos2 - 38} Td
(${this.escapeText(horasExtra + ' hrs × ' + formatCurrency(valorHoraExtra))}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
450 ${yPos2 - 38} Td
(${this.escapeText(formatCurrency(totalHorasExtra))}) Tj
ET`;
      yPos2 -= 85;
    }

    // SECCIÓN DE DEDUCCIONES DETALLADAS
    extraSections += `

% ============= DETALLE DEDUCCIONES =============
BT
/F2 12 Tf
0.118 0.165 0.478 rg
40 ${yPos2} Td
(${this.escapeText('DETALLE DEDUCCIONES')}) Tj
ET

% Container
q
0.98 0.98 0.98 rg
40 ${yPos2 - 100} 532 85 re
f
Q

q
0.85 0.85 0.85 RG
1 w
40 ${yPos2 - 100} 532 85 re
S
Q

% Header
q
0.796 0.196 0.196 rg
40 ${yPos2 - 25} 532 20 re
f
Q

BT
/F2 9 Tf
1 1 1 rg
50 ${yPos2 - 18} Td
(${this.escapeText('CONCEPTO')}) Tj
ET

BT
/F2 9 Tf
1 1 1 rg
250 ${yPos2 - 18} Td
(${this.escapeText('PORCENTAJE')}) Tj
ET

BT
/F2 9 Tf
1 1 1 rg
450 ${yPos2 - 18} Td
(${this.escapeText('VALOR')}) Tj
ET

% Salud 4%
q
0.99 0.95 0.95 rg
40 ${yPos2 - 45} 532 20 re
f
Q

BT
/F1 8 Tf
0.2 0.2 0.2 rg
50 ${yPos2 - 38} Td
(${this.escapeText('Salud (EPS)')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
250 ${yPos2 - 38} Td
(${this.escapeText('4.00%')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
450 ${yPos2 - 38} Td
(${this.escapeText(formatCurrency(saludEmpleado))}) Tj
ET

% Pensión 4%
q
1 1 1 rg
40 ${yPos2 - 65} 532 20 re
f
Q

BT
/F1 8 Tf
0.2 0.2 0.2 rg
50 ${yPos2 - 58} Td
(${this.escapeText('Pensión (AFP)')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
250 ${yPos2 - 58} Td
(${this.escapeText('4.00%')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
450 ${yPos2 - 58} Td
(${this.escapeText(formatCurrency(pensionEmpleado))}) Tj
ET

% Total deducciones
q
0.99 0.95 0.95 rg
40 ${yPos2 - 85} 532 20 re
f
Q

BT
/F2 9 Tf
0.796 0.196 0.196 rg
50 ${yPos2 - 78} Td
(${this.escapeText('TOTAL DEDUCCIONES')}) Tj
ET

BT
/F2 9 Tf
0.796 0.196 0.196 rg
450 ${yPos2 - 78} Td
(${this.escapeText(formatCurrency(totalDeduccionesCalculadas))}) Tj
ET`;

    yPos2 -= 120;

    // ============= FOOTER PROFESIONAL =============
    extraSections += `

% ============= FOOTER PROFESIONAL =============
BT
/F1 8 Tf
0.4 0.4 0.4 rg
40 ${yPos2} Td
(${this.escapeText('Este documento constituye el comprobante oficial de pago de nómina según la legislación laboral colombiana vigente.')}) Tj
ET

BT
/F1 7 Tf
0.5 0.5 0.5 rg
40 ${yPos2 - 15} Td
(${this.escapeText('Documento generado automáticamente el ' + new Date().toLocaleDateString('es-CO') + ' a las ' + new Date().toLocaleTimeString('es-CO'))}) Tj
ET

BT
/F1 7 Tf
0.5 0.5 0.5 rg
40 ${yPos2 - 28} Td
(${this.escapeText('Para consultas contactar al departamento de recursos humanos de ' + companyName + '.')}) Tj
ET

% Logo/firma placeholder
q
0.9 0.9 0.9 RG
1 w
450 ${yPos2 - 50} 120 35 re
S
Q

BT
/F1 7 Tf
0.6 0.6 0.6 rg
470 ${yPos2 - 35} Td
(${this.escapeText('Firma Autorizada')}) Tj
ET`;

    // ✅ CRITICAL FIX: Extract main content and return complete PDF
    const mainContent = `
% ============= PREMIUM HEADER - PERFECTAMENTE CENTRADO =============
% Título principal centrado dinámicamente
BT
/F2 22 Tf
0.118 0.165 0.478 rg
${titleX} 750 Td
(${this.escapeText(titleText)}) Tj
ET

% Subtítulo del período - elegante y sutil
BT
/F1 12 Tf
0.3 0.3 0.3 rg
${titleX} 725 Td
(${this.escapeText('Período: ' + fechaInicio + ' - ' + fechaFin)}) Tj
ET

% Separador horizontal elegante
q
0.118 0.165 0.478 rg
50 710 512 1 re
f
Q

% ============= INFORMACIÓN CARDS - DISEÑO MODAL EXACTO =============

% CARD 1: EMPRESA - Diseño Premium con sombra
q
0.95 0.97 0.99 rg
40 630 170 80 re
f
Q

% Borde izquierdo azul distintivo
q
0.118 0.165 0.478 rg
40 630 4 80 re
f
Q

% Sombra sutil de la card
q
0.85 0.85 0.85 rg
42 628 170 80 re
f
Q
q
0.95 0.97 0.99 rg
40 630 170 80 re
f
Q

% Logo circular de empresa - profesional
q
0.118 0.165 0.478 rg
55 680 24 24 re
f
Q

% Inicial de empresa en blanco
BT
/F2 12 Tf
1 1 1 rg
64 689 Td
(${this.escapeText(companyInitial)}) Tj
ET

% Labels y datos de empresa
BT
/F2 9 Tf
0.118 0.165 0.478 rg
88 695 Td
(${this.escapeText('EMPRESA')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
88 680 Td
(${this.escapeText(companyName.length > 18 ? companyName.substring(0, 18) + '...' : companyName)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
88 667 Td
(${this.escapeText('NIT: ' + companyNit)}) Tj
ET

% CARD 2: EMPLEADO - Centrada
q
0.95 0.97 0.99 rg
221 630 170 80 re
f
Q

q
0.118 0.165 0.478 rg
221 630 4 80 re
f
Q

% Sombra
q
0.85 0.85 0.85 rg
223 628 170 80 re
f
Q
q
0.95 0.97 0.99 rg
221 630 170 80 re
f
Q

BT
/F2 9 Tf
0.118 0.165 0.478 rg
230 695 Td
(${this.escapeText('EMPLEADO')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
230 680 Td
(${this.escapeText((employee.name || 'N/A').length > 20 ? (employee.name || 'N/A').substring(0, 20) + '...' : (employee.name || 'N/A'))}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
230 667 Td
(${this.escapeText('CC: ' + (employee.cedula || 'N/A'))}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
230 654 Td
(${this.escapeText('Cargo: ' + (employee.position || 'N/A'))}) Tj
ET

% CARD 3: PERÍODO - Derecha
q
0.95 0.97 0.99 rg
402 630 170 80 re
f
Q

q
0.118 0.165 0.478 rg
402 630 4 80 re
f
Q

% Sombra
q
0.85 0.85 0.85 rg
404 628 170 80 re
f
Q
q
0.95 0.97 0.99 rg
402 630 170 80 re
f
Q

BT
/F2 9 Tf
0.118 0.165 0.478 rg
411 695 Td
(${this.escapeText('PERÍODO')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
411 680 Td
(${this.escapeText('Desde: ' + fechaInicio)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
411 667 Td
(${this.escapeText('Hasta: ' + fechaFin)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
411 654 Td
(${this.escapeText('Días trabajados: ' + diasTrabajados)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
411 641 Td
(${this.escapeText('Salario base: ' + formatCurrency(salarioBase))}) Tj
ET

% ============= TABLA PRINCIPAL DE CONCEPTOS - MODAL EXACTO =============
% Título de sección
BT
/F2 14 Tf
0.118 0.165 0.478 rg
40 600 Td
(${this.escapeText('RESUMEN DEL PAGO')}) Tj
ET

% Contenedor de tabla con borde elegante
q
0.98 0.98 0.98 rg
40 320 532 260 re
f
Q

% Borde de tabla profesional
q
0.85 0.85 0.85 RG
1 w
40 320 532 260 re
S
Q

% HEADER DE TABLA - Azul premium
q
0.118 0.165 0.478 rg
40 555 532 25 re
f
Q

% Textos del header
BT
/F2 10 Tf
1 1 1 rg
50 563 Td
(${this.escapeText('CONCEPTO')}) Tj
ET

BT
/F2 10 Tf
1 1 1 rg
480 563 Td
(${this.escapeText('VALOR')}) Tj
ET

% ============= FILAS DE CONCEPTOS - TODAS LAS DEL MODAL =============`;

    // Return complete PDF content: header + cards + table setup + table rows + extra sections
    return mainContent + tableContent + extraSections;
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