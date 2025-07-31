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
    // Map Spanish special characters to their PDF octal representation
    const spanishCharMap: { [key: string]: string } = {
      'á': '\\341', 'à': '\\340', 'ä': '\\344', 'â': '\\342',
      'é': '\\351', 'è': '\\350', 'ë': '\\353', 'ê': '\\352',
      'í': '\\355', 'ì': '\\354', 'ï': '\\357', 'î': '\\356',
      'ó': '\\363', 'ò': '\\362', 'ö': '\\366', 'ô': '\\364',
      'ú': '\\372', 'ù': '\\371', 'ü': '\\374', 'û': '\\373',
      'ñ': '\\361',
      'Á': '\\301', 'À': '\\300', 'Ä': '\\304', 'Â': '\\302',
      'É': '\\311', 'È': '\\310', 'Ë': '\\313', 'Ê': '\\312',
      'Í': '\\315', 'Ì': '\\314', 'Ï': '\\317', 'Î': '\\316',
      'Ó': '\\323', 'Ò': '\\322', 'Ö': '\\326', 'Ô': '\\324',
      'Ú': '\\332', 'Ù': '\\331', 'Ü': '\\334', 'Û': '\\333',
      'Ñ': '\\321'
    };

    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      // Replace Spanish special characters with their PDF octal representation
      .replace(/[áàäâéèëêíìïîóòöôúùüûñÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑ]/g, (match) => spanishCharMap[match] || match);
  }

  private formatCurrency(amount: number): string {
    return '$' + amount.toLocaleString('es-CO');
  }

  private formatDate(dateStr: string): string {
    try {
      // Handle both ISO string and date objects
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    } catch {
      return dateStr;
    }
  }

  // NEW METHOD: Generate voucher directly from database data
  async generateVoucherFromDB(payrollData: any, companyData: any): Promise<Uint8Array> {
    console.log('🔧 Generando PDF para:', payrollData.employees.nombre);

    // Use REAL DATABASE VALUES - no calculations
    const salarioBase = Number(payrollData.salario_base) || 0;
    const diasTrabajados = Number(payrollData.dias_trabajados) || 15;
    const totalDevengado = Number(payrollData.total_devengado) || 0;
    const totalDeducciones = Number(payrollData.total_deducciones) || 0;
    const netoAPagar = Number(payrollData.neto_pagado) || 0;
    const auxilioTransporte = Number(payrollData.auxilio_transporte) || 0;
    const horasExtra = Number(payrollData.horas_extra) || 0;
    const bonificaciones = Number(payrollData.bonificaciones) || 0;
    const saludEmpleado = Number(payrollData.salud_empleado) || 0;
    const pensionEmpleado = Number(payrollData.pension_empleado) || 0;

    // Use REAL PERIOD DATES from database
    const fechaInicio = this.formatDate(payrollData.payroll_periods_real.fecha_inicio);
    const fechaFin = this.formatDate(payrollData.payroll_periods_real.fecha_fin);

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

    // Create content stream with REAL database data
    const contentStream = this.generateContentStreamFromDB(payrollData, companyData, {
      salarioBase, diasTrabajados, totalDevengado, totalDeducciones, netoAPagar,
      auxilioTransporte, horasExtra, bonificaciones, fechaInicio, fechaFin,
      saludEmpleado, pensionEmpleado
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

  // LEGACY METHOD: For backward compatibility
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

  // NEW METHOD: Generate content stream from real database data
  private generateContentStreamFromDB(payrollData: any, companyData: any, data: any): string {
    console.log('🎨 UX DESIGNER MODE: Creating PDF with REAL DATABASE values...');
    
    const { salarioBase, diasTrabajados, totalDevengado, totalDeducciones, netoAPagar,
            auxilioTransporte, horasExtra, bonificaciones, fechaInicio, fechaFin,
            saludEmpleado, pensionEmpleado } = data;

    const companyName = companyData?.razon_social || 'Mi Empresa';
    const companyNit = companyData?.nit || 'N/A';
    const companyAddress = companyData?.direccion || '';
    const companyInitial = companyName.charAt(0).toUpperCase();
    const employeeName = `${payrollData.employees.nombre} ${payrollData.employees.apellido}`.trim();
    const periodLabel = payrollData.payroll_periods_real.periodo;

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    };

    // Calculo del ancho del título para centrarlo perfectamente
    const titleText = 'COMPROBANTE DE NOMINA';
    const titleWidth = titleText.length * 12; // Aproximación
    const pageWidth = 612;
    const titleX = (pageWidth - titleWidth) / 2;

    // PREMIUM PDF - Using REAL DATABASE VALUES
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
(${this.escapeText(employeeName.length > 20 ? employeeName.substring(0, 20) + '...' : employeeName)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
230 667 Td
(${this.escapeText('CC: ' + (payrollData.employees.cedula || 'N/A'))}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
230 654 Td
(${this.escapeText('Cargo: ' + (payrollData.employees.cargo || 'N/A'))}) Tj
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

% ============= TABLA PRINCIPAL DE CONCEPTOS - CON DATOS REALES DB =============
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

% ============= FILAS CON DATOS REALES DE LA BASE DE DATOS =============
` + this.generateTableRowsFromDB(salarioBase, totalDevengado, auxilioTransporte, bonificaciones, horasExtra, totalDeducciones, netoAPagar, diasTrabajados, saludEmpleado, pensionEmpleado, formatCurrency) + this.generateExtraSection(companyName, formatCurrency);
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
    const titleText = 'COMPROBANTE DE NOMINA';
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

% ============= FILAS DE CONCEPTOS - TODAS LAS DEL MODAL =============
` + this.generateTableRows(salarioBase, salarioProporcional, subsidioTransporte, bonificaciones, totalHorasExtra, horasExtra, valorHoraExtra, totalDeduccionesCalculadas, salarioNeto, diasTrabajados, formatCurrency) + this.generateExtraSections(totalHorasExtra, horasExtra, valorHoraExtra, saludEmpleado, pensionEmpleado, totalDeduccionesCalculadas, companyName, formatCurrency);
  }

  // NEW METHOD: Generate table rows from real database data
  private generateTableRowsFromDB(salarioBase: number, totalDevengado: number, auxilioTransporte: number, bonificaciones: number, horasExtra: number, totalDeducciones: number, netoAPagar: number, diasTrabajados: number, saludEmpleado: number, pensionEmpleado: number, formatCurrency: (value: number) => string): string {
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

    // 2. Días Trabajados
    tableContent += createRow(`Días Trabajados`, `${diasTrabajados} días`);

    // 3. Auxilio de Transporte (si > 0)
    if (auxilioTransporte > 0) {
      tableContent += createRow('Auxilio de Transporte', formatCurrency(auxilioTransporte));
    }

    // 4. Bonificaciones (si > 0)
    if (bonificaciones > 0) {
      tableContent += createRow('Bonificaciones', formatCurrency(bonificaciones));
    }

    // 5. Horas Extra (si > 0)
    if (horasExtra > 0) {
      tableContent += createRow('Horas Extra', formatCurrency(horasExtra));
    }

    // 6. Total Devengado (destacado)
    tableContent += createRow('TOTAL DEVENGADO', formatCurrency(totalDevengado), true, '0.9 0.95 1');

    // 7. Deducciones (destacado)
    if (totalDeducciones > 0) {
      tableContent += createRow('TOTAL DEDUCCIONES', `-${formatCurrency(totalDeducciones)}`, true, '1 0.9 0.9');
    }

    // 8. Neto a Pagar (destacado)
    tableContent += createRow('NETO A PAGAR', formatCurrency(netoAPagar), true, '0.9 1 0.9');

    return tableContent;
  }

  private generateTableRows(salarioBase: number, salarioProporcional: number, subsidioTransporte: number, bonificaciones: number, totalHorasExtra: number, horasExtra: number, valorHoraExtra: number, totalDeduccionesCalculadas: number, salarioNeto: number, diasTrabajados: number, formatCurrency: (value: number) => string): string {
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
      tableContent += createRow('Horas Extra', formatCurrency(totalHorasExtra));
    }

    // 6. Total Devengado (destacado)
    const totalDevengado = salarioProporcional + subsidioTransporte + bonificaciones + totalHorasExtra;
    tableContent += createRow('TOTAL DEVENGADO', formatCurrency(totalDevengado), true, '0.9 0.95 1');

    // 7. Deducciones (destacado)
    if (totalDeduccionesCalculadas > 0) {
      tableContent += createRow('TOTAL DEDUCCIONES', `-${formatCurrency(totalDeduccionesCalculadas)}`, true, '1 0.9 0.9');
    }

    // 8. Neto a Pagar (destacado)
    tableContent += createRow('NETO A PAGAR', formatCurrency(salarioNeto), true, '0.9 1 0.9');

    return tableContent;
  }

  private generateExtraSection(companyName: string, formatCurrency: (value: number) => string): string {
    return `
% ============= SECCIÓN DE FIRMAS Y PIE DE PÁGINA =============
% Separador entre tabla y firmas
q
0.85 0.85 0.85 rg
40 280 532 1 re
f
Q

% Cuadros para firmas - lado a lado
q
0.98 0.98 0.98 rg
40 180 250 90 re
f
Q

q
0.85 0.85 0.85 RG
1 w
40 180 250 90 re
S
Q

q
0.98 0.98 0.98 rg
322 180 250 90 re
f
Q

q
0.85 0.85 0.85 RG
1 w
322 180 250 90 re
S
Q

% Labels de firmas
BT
/F2 8 Tf
0.2 0.2 0.2 rg
50 190 Td
(${this.escapeText('EMPLEADO')}) Tj
ET

BT
/F1 7 Tf
0.5 0.5 0.5 rg
50 240 Td
(${this.escapeText('Nombre:')}) Tj
ET

BT
/F1 7 Tf
0.5 0.5 0.5 rg
50 225 Td
(${this.escapeText('CC:')}) Tj
ET

BT
/F1 7 Tf
0.5 0.5 0.5 rg
50 210 Td
(${this.escapeText('Firma:')}) Tj
ET

BT
/F2 8 Tf
0.2 0.2 0.2 rg
332 190 Td
(${this.escapeText('EMPRESA')}) Tj
ET

BT
/F1 7 Tf
0.5 0.5 0.5 rg
332 240 Td
(${this.escapeText('Representante Legal:')}) Tj
ET

BT
/F1 7 Tf
0.5 0.5 0.5 rg
332 225 Td
(${this.escapeText(companyName)}) Tj
ET

BT
/F1 7 Tf
0.5 0.5 0.5 rg
332 210 Td
(${this.escapeText('Firma:')}) Tj
ET

% Nota al pie
BT
/F1 6 Tf
0.4 0.4 0.4 rg
40 150 Td
(${this.escapeText('Este comprobante de pago ha sido generado electrónicamente y certifica el pago de salario correspondiente al período indicado.')}) Tj
ET

BT
/F1 6 Tf
0.4 0.4 0.4 rg
40 140 Td
(${this.escapeText('Para dudas o aclaraciones, contactar al departamento de nómina.')}) Tj
ET

% Footer con fecha de generación
BT
/F1 5 Tf
0.6 0.6 0.6 rg
450 50 Td
(${this.escapeText('Generado: ' + new Date().toLocaleDateString('es-CO'))}) Tj
ET`;
  }

  private generateExtraSections(totalHorasExtra: number, horasExtra: number, valorHoraExtra: number, saludEmpleado: number, pensionEmpleado: number, totalDeduccionesCalculadas: number, companyName: string, formatCurrency: (value: number) => string): string {
    return this.generateExtraSection(companyName, formatCurrency);
  }

  private buildPDFWithCorrectStructure(catalogId: number): Uint8Array {
    console.log('🏗️ Building PDF structure...');
    
    // Build PDF header
    let pdf = '%PDF-1.4\n';
    
    // Calculate object positions
    let currentPos = pdf.length;
    
    for (let i = 1; i < this.objects.length; i++) {
      this.objectPositions[i] = currentPos;
      const objectDef = `${i} 0 obj\n${this.objects[i]}\nendobj\n`;
      pdf += objectDef;
      currentPos += objectDef.length;
    }
    
    // Build xref table
    const xrefPos = currentPos;
    pdf += 'xref\n';
    pdf += `0 ${this.objects.length}\n`;
    
    for (let i = 0; i < this.objects.length; i++) {
      const pos = this.objectPositions[i];
      pdf += `${pos.toString().padStart(10, '0')} 00000 ${i === 0 ? 'f' : 'n'} \n`;
    }
    
    // Build trailer
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
    console.log('📥 Full request body received:', JSON.stringify(requestBody, null, 2));
    
    // Check if we received a payrollId (NEW FORMAT) or old format
    if (requestBody.payrollId) {
      console.log('✅ PayrollId found in request:', requestBody.payrollId);
      console.log('🔍 Fetching real payroll data from database for ID:', requestBody.payrollId);
      
      // PHASE 1: DIRECT DATABASE QUERY - Get real liquidated data
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          period_id,
          salario_base,
          total_devengado,
          total_deducciones,
          neto_pagado,
          dias_trabajados,
          auxilio_transporte,
          horas_extra,
          bonificaciones,
          salud_empleado,
          pension_empleado,
          employees!inner(
            id,
            nombre,
            apellido,
            cedula,
            cargo,
            eps,
            afp
          ),
          payroll_periods_real!inner(
            id,
            periodo,
            fecha_inicio,
            fecha_fin,
            tipo_periodo
          )
        `)
        .eq('id', requestBody.payrollId)
        .single();
      
      if (payrollError) {
        console.error('❌ Error fetching payroll data:', payrollError);
        throw new Error('No se encontraron datos de nómina para el ID proporcionado');
      }

      // Get company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .single();

      if (companyError) {
        console.error('❌ Error fetching company data:', companyError);
      }

      console.log('✅ Payroll data fetched successfully:', {
        employee: payrollData.employees.nombre,
        period: payrollData.payroll_periods_real.periodo,
        company: companyData?.razon_social || 'TechSolutions Colombia S.A.S'
      });

      console.log('📊 Valores reales desde base de datos:');
      console.log('- Días trabajados:', payrollData.dias_trabajados);
      console.log('- Total devengado DB:', payrollData.total_devengado);
      console.log('- Deducciones DB:', payrollData.total_deducciones);
      console.log('- Neto a pagar DB:', payrollData.neto_pagado);
      console.log('- Horas extra:', payrollData.horas_extra);

      // Initialize PDF generator
      const generator = new NativePDFGenerator();
      console.log('🎨 UX DESIGNER MODE: Creating PDF with REAL DATABASE values...');
      
      // Generate PDF with real DB data
      const pdfBytes = await generator.generateVoucherFromDB(payrollData, companyData);
      
      console.log('✅ PDF generated successfully:', pdfBytes.length, 'bytes');

      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="comprobante-${payrollData.employees.nombre}-${payrollData.payroll_periods_real.periodo}.pdf"`,
          'Content-Length': pdfBytes.length.toString(),
        },
      });
      
    } else {
      // OLD FORMAT - backward compatibility
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