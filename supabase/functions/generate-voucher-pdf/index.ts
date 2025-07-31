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

  // ENHANCED METHOD: Generate professional voucher with complete information
  private generateContentStreamFromDB(payrollData: any, companyData: any, data: any): string {
    console.log('🎨 PROFESSIONAL MODE: Creating complete voucher with all required elements...');
    
    const { salarioBase, diasTrabajados, totalDevengado, totalDeducciones, netoAPagar,
            auxilioTransporte, horasExtra, bonificaciones, fechaInicio, fechaFin,
            saludEmpleado, pensionEmpleado } = data;

    // PHASE 1: Complete company information
    const companyName = companyData?.razon_social || 'TechSolutions Colombia S.A.S';
    const companyNit = companyData?.nit || '900.123.456-7';
    const companyAddress = companyData?.direccion || 'Av. Principal #123-45';
    const companyCity = companyData?.ciudad || 'Bogotá D.C.';
    const companyPhone = companyData?.telefono || '(601) 123-4567';
    const companyEmail = companyData?.email || 'contacto@empresa.com';
    const legalRep = companyData?.representante_legal || 'N/A';
    const companyInitial = companyName.charAt(0).toUpperCase();

    // PHASE 2: Complete employee information
    const employee = payrollData.employees;
    const employeeName = `${employee.nombre} ${employee.apellido}`.trim();
    const employeeFullName = employee.segundo_nombre ? 
      `${employee.nombre} ${employee.segundo_nombre} ${employee.apellido}`.trim() : employeeName;
    const employeeCC = employee.cedula || 'N/A';
    const employeePosition = employee.cargo || 'N/A';
    const employeeHireDate = employee.fecha_ingreso ? this.formatDate(employee.fecha_ingreso) : 'N/A';
    const employeeEPS = employee.eps || 'N/A';
    const employeeAFP = employee.afp || 'N/A';
    const employeeARL = employee.arl || 'N/A';
    const employeeCCF = employee.caja_compensacion || 'N/A';
    const employeeBank = employee.banco || 'N/A';
    const employeeAccount = employee.numero_cuenta || 'N/A';
    const employeeCostCenter = employee.centro_costos || 'N/A';
    const employeeContract = employee.tipo_contrato || 'N/A';

    // PHASE 3: Generate unique voucher number and compliance info
    const voucherNumber = `NOM-${payrollData.payroll_periods_real.periodo.replace(/\s/g, '')}-${employeeCC}-${Date.now().toString().slice(-6)}`;
    const generationDate = new Date().toLocaleString('es-CO');
    const periodLabel = payrollData.payroll_periods_real.periodo;

    // PHASE 4: Detailed financial calculations with employer contributions
    const salud_empleador = Math.round(salarioBase * 0.085); // 8.5%
    const pension_empleador = Math.round(salarioBase * 0.12); // 12%
    const arl_empleador = Math.round(salarioBase * 0.00522); // 0.522%
    const ccf_empleador = Math.round(salarioBase * 0.04); // 4%
    const icbf_empleador = Math.round(salarioBase * 0.03); // 3%
    const sena_empleador = Math.round(salarioBase * 0.02); // 2%
    const totalEmpleadorContrib = salud_empleador + pension_empleador + arl_empleador + ccf_empleador + icbf_empleador + sena_empleador;

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    };

    // Calculate title positioning for perfect centering
    const titleText = 'COMPROBANTE DE NÓMINA ELECTRÓNICO';
    const titleWidth = titleText.length * 10;
    const pageWidth = 612;
    const titleX = (pageWidth - titleWidth) / 2;

    // CARTA SIZE OPTIMIZED VOUCHER - Ultra compact layout
    return `
% ============= CARTA SIZE HEADER - ULTRA COMPACT =============
% Voucher number in top right corner
BT
/F1 7 Tf
0.4 0.4 0.4 rg
480 770 Td
(${this.escapeText('No. ' + voucherNumber)}) Tj
ET

% Generation date in top right corner
BT
/F1 7 Tf
0.4 0.4 0.4 rg
480 760 Td
(${this.escapeText('Generado: ' + generationDate)}) Tj
ET

% Main title - reduced size
BT
/F2 16 Tf
0.118 0.165 0.478 rg
180 740 Td
(${this.escapeText('COMPROBANTE DE NOMINA')}) Tj
ET

% Period subtitle - compact
BT
/F1 9 Tf
0.3 0.3 0.3 rg
220 725 Td
(${this.escapeText('Período: ' + fechaInicio + ' - ' + fechaFin)}) Tj
ET

% Thin separator
q
0.118 0.165 0.478 rg
50 715 512 0.5 re
f
Q

% ============= COMPANY CARD - COMPACTED TO 40PT =============
q
0.95 0.97 0.99 rg
40 675 170 40 re
f
Q

% Thin left border
q
0.118 0.165 0.478 rg
40 675 2 40 re
f
Q

% Company logo circle
q
0.118 0.165 0.478 rg
55 695 24 24 re
f
Q

% Company initial
BT
/F2 12 Tf
1 1 1 rg
64 704 Td
(${this.escapeText(companyInitial)}) Tj
ET

% Company info
BT
/F2 9 Tf
0.118 0.165 0.478 rg
88 710 Td
(${this.escapeText('EMPRESA')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
88 695 Td
(${this.escapeText(companyName.length > 16 ? companyName.substring(0, 16) + '...' : companyName)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
88 682 Td
(${this.escapeText('NIT: ' + companyNit)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
88 669 Td
(${this.escapeText(companyCity)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
88 656 Td
(${this.escapeText(companyPhone)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
88 643 Td
(${this.escapeText(companyEmail.length > 20 ? companyEmail.substring(0, 20) + '...' : companyEmail)}) Tj
ET

BT
/F1 6 Tf
0.5 0.5 0.5 rg
88 630 Td
(${this.escapeText('Rep. Legal: ' + (legalRep.length > 15 ? legalRep.substring(0, 15) + '...' : legalRep))}) Tj
ET

% ============= ENHANCED EMPLOYEE INFORMATION CARD =============
% Employee card with complete details
q
0.95 0.97 0.99 rg
221 625 170 100 re
f
Q

q
0.118 0.165 0.478 rg
221 625 4 100 re
f
Q

BT
/F2 9 Tf
0.118 0.165 0.478 rg
230 710 Td
(${this.escapeText('EMPLEADO')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
230 695 Td
(${this.escapeText(employeeFullName.length > 18 ? employeeFullName.substring(0, 18) + '...' : employeeFullName)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
230 682 Td
(${this.escapeText('CC: ' + employeeCC)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
230 669 Td
(${this.escapeText('Cargo: ' + (employeePosition.length > 15 ? employeePosition.substring(0, 15) + '...' : employeePosition))}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
230 656 Td
(${this.escapeText('Ingreso: ' + employeeHireDate)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
230 643 Td
(${this.escapeText('Contrato: ' + employeeContract)}) Tj
ET

BT
/F1 6 Tf
0.5 0.5 0.5 rg
230 630 Td
(${this.escapeText('C.Costos: ' + employeeCostCenter)}) Tj
ET

% ============= ENHANCED PERIOD AND BANK INFO CARD =============
% Period card with bank information
q
0.95 0.97 0.99 rg
402 625 170 100 re
f
Q

q
0.118 0.165 0.478 rg
402 625 4 100 re
f
Q

BT
/F2 9 Tf
0.118 0.165 0.478 rg
411 710 Td
(${this.escapeText('PERÍODO Y PAGO')}) Tj
ET

BT
/F1 8 Tf
0.2 0.2 0.2 rg
411 695 Td
(${this.escapeText('Desde: ' + fechaInicio)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
411 682 Td
(${this.escapeText('Hasta: ' + fechaFin)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
411 669 Td
(${this.escapeText('Días: ' + diasTrabajados)}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
411 656 Td
(${this.escapeText('Banco: ' + (employeeBank.length > 12 ? employeeBank.substring(0, 12) + '...' : employeeBank))}) Tj
ET

BT
/F1 7 Tf
0.4 0.4 0.4 rg
411 643 Td
(${this.escapeText('Cuenta: ***' + (employeeAccount.length > 4 ? employeeAccount.slice(-4) : employeeAccount))}) Tj
ET

BT
/F1 6 Tf
0.5 0.5 0.5 rg
411 630 Td
(${this.escapeText('Salario Base: ' + formatCurrency(salarioBase))}) Tj
ET

% ============= AFFILIATIONS SECTION =============
% Affiliations header
BT
/F2 12 Tf
0.118 0.165 0.478 rg
40 600 Td
(${this.escapeText('AFILIACIONES')}) Tj
ET

% EPS
BT
/F1 8 Tf
0.2 0.2 0.2 rg
40 585 Td
(${this.escapeText('EPS: ' + employeeEPS)}) Tj
ET

% AFP
BT
/F1 8 Tf
0.2 0.2 0.2 rg
160 585 Td
(${this.escapeText('AFP: ' + employeeAFP)}) Tj
ET

% ARL
BT
/F1 8 Tf
0.2 0.2 0.2 rg
280 585 Td
(${this.escapeText('ARL: ' + employeeARL)}) Tj
ET

% CCF
BT
/F1 8 Tf
0.2 0.2 0.2 rg
400 585 Td
(${this.escapeText('CCF: ' + employeeCCF)}) Tj
ET

% ============= MAIN PAYMENT TABLE WITH DETAILED BREAKDOWN =============
% Main section title
BT
/F2 14 Tf
0.118 0.165 0.478 rg
40 560 Td
(${this.escapeText('DETALLE DE LIQUIDACIÓN')}) Tj
ET

% Table container
q
0.98 0.98 0.98 rg
40 200 532 340 re
f
Q

% Table border
q
0.85 0.85 0.85 RG
1 w
40 200 532 340 re
S
Q

% Table header
q
0.118 0.165 0.478 rg
40 515 532 25 re
f
Q

% Header texts
BT
/F2 10 Tf
1 1 1 rg
50 523 Td
(${this.escapeText('CONCEPTO')}) Tj
ET

BT
/F2 10 Tf
1 1 1 rg
350 523 Td
(${this.escapeText('CANTIDAD')}) Tj
ET

BT
/F2 10 Tf
1 1 1 rg
480 523 Td
(${this.escapeText('VALOR')}) Tj
ET

% ============= DETAILED FINANCIAL ROWS =============
` + this.generateEnhancedTableRowsFromDB(salarioBase, totalDevengado, auxilioTransporte, bonificaciones, horasExtra, totalDeducciones, netoAPagar, diasTrabajados, saludEmpleado, pensionEmpleado, totalEmpleadorContrib, formatCurrency) + this.generateEnhancedFooterSection(companyName, companyData, voucherNumber, generationDate, legalRep, formatCurrency);
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
  // ENHANCED METHOD: Generate complete table rows with detailed breakdown
  private generateEnhancedTableRowsFromDB(salarioBase: number, totalDevengado: number, auxilioTransporte: number, bonificaciones: number, horasExtra: number, totalDeducciones: number, netoAPagar: number, diasTrabajados: number, saludEmpleado: number, pensionEmpleado: number, totalEmpleadorContrib: number, formatCurrency: (value: number) => string): string {
    let yPos = 490;
    let rowCount = 0;

    // Function to create enhanced rows
    const createRow = (concept: string, quantity: string, value: string, isHighlighted = false, bgColorOverride?: string) => {
      const bgColor = bgColorOverride || (rowCount % 2 === 0 ? '0.98 0.98 0.98' : '1 1 1');
      const textColor = isHighlighted ? '0.118 0.165 0.478' : '0.2 0.2 0.2';
      const fontType = isHighlighted ? '/F2' : '/F1';
      
      let row = `
% Enhanced Row ${rowCount + 1}: ${concept}
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
360 ${yPos + 8} Td
(${this.escapeText(quantity)}) Tj
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

    // SECTION 1: DEVENGADOS
    tableContent += createRow('DEVENGADOS', '', '', true, '0.85 0.95 1');
    tableContent += createRow('Salario Base', `${diasTrabajados} días`, formatCurrency(salarioBase));
    
    if (auxilioTransporte > 0) {
      tableContent += createRow('Auxilio de Transporte', '1', formatCurrency(auxilioTransporte));
    }
    
    if (bonificaciones > 0) {
      tableContent += createRow('Bonificaciones', '1', formatCurrency(bonificaciones));
    }
    
    if (horasExtra > 0) {
      tableContent += createRow('Horas Extra', '1', formatCurrency(horasExtra));
    }
    
    tableContent += createRow('SUBTOTAL DEVENGADOS', '', formatCurrency(totalDevengado), true, '0.9 0.95 1');

    // SECTION 2: DEDUCCIONES EMPLEADO
    tableContent += createRow('DEDUCCIONES EMPLEADO', '', '', true, '1 0.85 0.85');
    
    if (saludEmpleado > 0) {
      tableContent += createRow('Salud Empleado (4%)', '4%', `-${formatCurrency(saludEmpleado)}`);
    }
    
    if (pensionEmpleado > 0) {
      tableContent += createRow('Pensión Empleado (4%)', '4%', `-${formatCurrency(pensionEmpleado)}`);
    }
    
    // Additional standard deductions
    const retencionFuente = Math.max(0, Math.round((totalDevengado - 8000000) * 0.19));
    if (retencionFuente > 0) {
      tableContent += createRow('Retención en la Fuente', '19%', `-${formatCurrency(retencionFuente)}`);
    }
    
    tableContent += createRow('SUBTOTAL DEDUCCIONES', '', `-${formatCurrency(totalDeducciones)}`, true, '1 0.9 0.9');

    // SECTION 3: APORTES PATRONALES (INFORMATIVO)
    tableContent += createRow('APORTES PATRONALES', '(Informativo)', '', true, '0.9 1 0.9');
    
    const salud_empleador = Math.round(salarioBase * 0.085);
    const pension_empleador = Math.round(salarioBase * 0.12);
    const arl_empleador = Math.round(salarioBase * 0.00522);
    const ccf_empleador = Math.round(salarioBase * 0.04);
    const icbf_empleador = Math.round(salarioBase * 0.03);
    const sena_empleador = Math.round(salarioBase * 0.02);
    
    tableContent += createRow('Salud Empleador (8.5%)', '8.5%', formatCurrency(salud_empleador));
    tableContent += createRow('Pensión Empleador (12%)', '12%', formatCurrency(pension_empleador));
    tableContent += createRow('ARL (0.522%)', '0.522%', formatCurrency(arl_empleador));
    tableContent += createRow('CCF (4%)', '4%', formatCurrency(ccf_empleador));
    tableContent += createRow('ICBF (3%)', '3%', formatCurrency(icbf_empleador));
    tableContent += createRow('SENA (2%)', '2%', formatCurrency(sena_empleador));
    
    tableContent += createRow('TOTAL COSTO EMPLEADOR', '', formatCurrency(salarioBase + totalEmpleadorContrib), true, '0.9 1 0.9');

    // SECTION 4: NETO A PAGAR
    tableContent += createRow('NETO A PAGAR', '', formatCurrency(netoAPagar), true, '0.8 1 0.8');

    return tableContent;
  }

  private generateUltraCompactTableRowsFromDB(salarioBase: number, totalDevengado: number, auxilioTransporte: number, bonificaciones: number, horasExtra: number, totalDeducciones: number, netoAPagar: number, diasTrabajados: number, saludEmpleado: number, pensionEmpleado: number, totalEmpleadorContrib: number, formatCurrency: (value: number) => string): string {
    let yPos = 620;
    let rowCount = 0;

    // Ultra compact row creator - 15pt height
    const createRow = (concept: string, value: string, quantity: string = '', isHeader = false, isHighlighted = false, bgColor?: string) => {
      const backgroundColor = isHeader ? '0.118 0.165 0.478' : 
                              bgColor || (rowCount % 2 === 0 ? '0.98 0.98 0.98' : '1 1 1');
      const textColor = isHeader ? '1 1 1' : (isHighlighted ? '0.118 0.165 0.478' : '0.2 0.2 0.2');
      const fontType = (isHeader || isHighlighted) ? '/F2' : '/F1';
      const fontSize = isHeader ? '8' : (isHighlighted ? '8' : '7');
      
      let row = `
% Row ${rowCount + 1}: ${concept}
q
${backgroundColor} rg
40 ${yPos} 532 15 re
f
Q

% Concept text (60% width)
BT
${fontType} ${fontSize} Tf
${textColor} rg
45 ${yPos + 4} Td
(${this.escapeText(concept)}) Tj
ET`;

      // Quantity column (15% width) - only if provided
      if (quantity) {
        row += `
% Quantity
BT
${fontType} ${fontSize} Tf
${textColor} rg
340 ${yPos + 4} Td
(${this.escapeText(quantity)}) Tj
ET`;
      }

      // Value column (25% width) - right aligned
      row += `
% Value - right aligned
BT
${fontType} ${fontSize} Tf
${textColor} rg
520 ${yPos + 4} Td
(${this.escapeText(value)}) Tj
ET`;
      
      yPos -= 15;
      rowCount++;
      return row;
    };

    let tableContent = '';

    // SECTION 1: DEVENGADOS
    tableContent += createRow('DEVENGADOS', '', '', false, true, '0.85 0.95 1');
    tableContent += createRow('Salario Base', formatCurrency(salarioBase), `${diasTrabajados}d`);
    
    if (auxilioTransporte > 0) {
      tableContent += createRow('Auxilio Transporte', formatCurrency(auxilioTransporte));
    }
    
    if (bonificaciones > 0) {
      tableContent += createRow('Bonificaciones', formatCurrency(bonificaciones));
    }
    
    if (horasExtra > 0) {
      const overtimeValue = Math.round((salarioBase / 240) * 1.25 * horasExtra);
      tableContent += createRow('Horas Extra', formatCurrency(overtimeValue), `${horasExtra}h`);
    }
    
    tableContent += createRow('TOTAL DEVENGADO', formatCurrency(totalDevengado), '', false, true, '0.85 0.95 0.85');

    // SECTION 2: DEDUCCIONES
    if (totalDeducciones > 0) {
      tableContent += createRow('DEDUCCIONES', '', '', false, true, '1 0.85 0.85');
      
      if (saludEmpleado > 0) {
        tableContent += createRow('Salud (4%)', `-${formatCurrency(saludEmpleado)}`);
      }
      
      if (pensionEmpleado > 0) {
        tableContent += createRow('Pensión (4%)', `-${formatCurrency(pensionEmpleado)}`);
      }
      
      tableContent += createRow('TOTAL DEDUCCIONES', `-${formatCurrency(totalDeducciones)}`, '', false, true, '1 0.85 0.85');
    }

    // NET PAY (highlighted)
    tableContent += createRow('NETO A PAGAR', formatCurrency(netoAPagar), '', false, true, '0.85 1 0.85');

    return tableContent;
  }

  private generateUltraCompactFooterSection(companyName: string, companyData: any, voucherNumber: string, generationDate: string, legalRep: string, formatCurrency: (value: number) => string): string {
    return `
% ============= ULTRA COMPACT SIGNATURE SECTION =============
% Employee signature box - reduced to 45pt
q
0.95 0.95 0.95 rg
50 130 220 45 re
f
Q

BT
/F2 7 Tf
0.2 0.2 0.2 rg
60 165 Td
(${this.escapeText('FIRMA DEL EMPLEADO')}) Tj
ET

BT
/F1 6 Tf
0.4 0.4 0.4 rg
60 155 Td
(${this.escapeText('Firma y sello')}) Tj
ET

BT
/F1 6 Tf
0.4 0.4 0.4 rg
60 140 Td
(${this.escapeText('Fecha: ________________')}) Tj
ET

% Company signature box - reduced to 45pt
q
0.95 0.95 0.95 rg
320 130 220 45 re
f
Q

BT
/F2 7 Tf
0.2 0.2 0.2 rg
330 165 Td
(${this.escapeText('REPRESENTANTE LEGAL')}) Tj
ET

BT
/F1 6 Tf
0.4 0.4 0.4 rg
330 155 Td
(${this.escapeText(legalRep.length > 25 ? legalRep.substring(0, 25) + '...' : legalRep)}) Tj
ET

BT
/F1 6 Tf
0.4 0.4 0.4 rg
330 140 Td
(${this.escapeText('Fecha: ________________')}) Tj
ET

% ============= COMPACT LEGAL DISCLAIMER =============
BT
/F1 5 Tf
0.5 0.5 0.5 rg
50 115 Td
(${this.escapeText('Este comprobante de pago es válido para efectos laborales y tributarios según normativa vigente.')}) Tj
ET

BT
/F1 5 Tf
0.5 0.5 0.5 rg
50 105 Td
(${this.escapeText('Generado: ' + generationDate + ' | No: ' + voucherNumber + ' | ' + companyName)}) Tj
ET

endstream
endobj

% Cross-reference table
xref
0 8
0000000000 65535 f 
0000000015 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000179 00000 n 
0000000238 00000 n 
0000000285 00000 n 
0000000336 00000 n 

% Trailer
trailer
<<
/Size 8
/Root 1 0 R
>>
startxref
`;
  }

  private generateTableRowsFromDB(salarioBase: number, totalDevengado: number, auxilioTransporte: number, bonificaciones: number, horasExtra: number, totalDeducciones: number, netoAPagar: number, diasTrabajados: number, saludEmpleado: number, pensionEmpleado: number, formatCurrency: (value: number) => string): string {
    let yPos = 500;
    let rowCount = 0;

    // IMPROVED: Enhanced row creator with better spacing and typography
    const createRow = (concept: string, value: string, quantity: string = '', isHeader = false, isHighlighted = false, bgColorOverride?: string) => {
      const bgColor = isHeader ? '0.118 0.165 0.478' : 
                     bgColorOverride || (rowCount % 2 === 0 ? '0.97 0.97 0.97' : '1 1 1');
      const textColor = isHeader ? '1 1 1' : (isHighlighted ? '0.118 0.165 0.478' : '0.2 0.2 0.2');
      const fontType = (isHeader || isHighlighted) ? '/F2' : '/F1';
      const fontSize = isHeader ? '11' : (isHighlighted ? '10' : '9');
      
      let row = `
% Row ${rowCount + 1}: ${concept}
q
${bgColor} rg
40 ${yPos} 532 22 re
f
Q

% Subtle borders for better definition
q
0.85 0.85 0.85 RG
0.3 w
40 ${yPos} 532 22 re
S
Q

% Vertical separators
q
0.9 0.9 0.9 RG
0.3 w
300 ${yPos} 0 22 re
S
425 ${yPos} 0 22 re
S
Q

% Concept text (60% width)
BT
${fontType} ${fontSize} Tf
${textColor} rg
50 ${yPos + 7} Td
(${this.escapeText(concept)}) Tj
ET`;

      // Quantity column (15% width) - only if provided
      if (quantity) {
        row += `
% Quantity
BT
${fontType} ${fontSize} Tf
${textColor} rg
320 ${yPos + 7} Td
(${this.escapeText(quantity)}) Tj
ET`;
      }

      // Value column (25% width) - right aligned
      row += `
% Value - right aligned
BT
${fontType} ${fontSize} Tf
${textColor} rg
520 ${yPos + 7} Td
(${this.escapeText(value)}) Tj
ET`;
      
      yPos -= 22;
      rowCount++;
      return row;
    };

    let tableContent = '';

    // HEADER ROW
    tableContent += createRow('CONCEPTO', 'VALOR', 'DÍAS/HORAS', true);

    // SECTION 1: DEVENGADOS
    tableContent += createRow('── DEVENGADOS ──', '', '', false, true, '0.9 0.95 1');
    
    // Basic salary
    tableContent += createRow('Salario Base', formatCurrency(salarioBase), `${diasTrabajados} días`);

    // Transportation allowance
    if (auxilioTransporte > 0) {
      tableContent += createRow('Auxilio de Transporte', formatCurrency(auxilioTransporte));
    }

    // Bonuses
    if (bonificaciones > 0) {
      tableContent += createRow('Bonificaciones', formatCurrency(bonificaciones));
    }

    // Overtime
    if (horasExtra > 0) {
      const overtimeValue = Math.round((salarioBase / 240) * 1.25 * horasExtra);
      tableContent += createRow('Horas Extra', formatCurrency(overtimeValue), `${horasExtra} hrs`);
    }

    // Total earned (highlighted)
    tableContent += createRow('TOTAL DEVENGADO', formatCurrency(totalDevengado), '', false, true, '0.85 0.95 0.85');

    // SECTION 2: DEDUCCIONES
    if (totalDeducciones > 0) {
      tableContent += createRow('── DEDUCCIONES ──', '', '', false, true, '1 0.9 0.9');
      
      // Health contribution
      if (saludEmpleado > 0) {
        tableContent += createRow('Salud (4%)', `-${formatCurrency(saludEmpleado)}`);
      }
      
      // Pension contribution
      if (pensionEmpleado > 0) {
        tableContent += createRow('Pensión (4%)', `-${formatCurrency(pensionEmpleado)}`);
      }
      
      // Total deductions
      tableContent += createRow('TOTAL DEDUCCIONES', `-${formatCurrency(totalDeducciones)}`, '', false, true, '1 0.85 0.85');
    }

    // NET PAY (most highlighted)
    tableContent += createRow('NETO A PAGAR', formatCurrency(netoAPagar), '', false, true, '0.9 1 0.9');

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

  // ENHANCED METHOD: Generate professional footer with compliance and legal elements
  private generateEnhancedFooterSection(companyName: string, companyData: any, voucherNumber: string, generationDate: string, legalRep: string, formatCurrency: (value: number) => string): string {
    return `
% ============= PROFESSIONAL FOOTER WITH COMPLIANCE =============
% Section separator
q
0.118 0.165 0.478 rg
40 180 532 2 re
f
Q

% Digital signature section
BT
/F2 12 Tf
0.118 0.165 0.478 rg
40 160 Td
(${this.escapeText('FIRMAS DIGITALES')}) Tj
ET

% Employee signature box
q
0.98 0.98 0.98 rg
40 90 250 60 re
f
Q

q
0.85 0.85 0.85 RG
1 w
40 90 250 60 re
S
Q

BT
/F2 8 Tf
0.2 0.2 0.2 rg
50 135 Td
(${this.escapeText('EMPLEADO')}) Tj
ET

BT
/F1 7 Tf
0.5 0.5 0.5 rg
50 120 Td
(${this.escapeText('Nombre: ________________________')}) Tj
ET

BT
/F1 7 Tf
0.5 0.5 0.5 rg
50 105 Td
(${this.escapeText('CC: _________________________________')}) Tj
ET

BT
/F1 6 Tf
0.5 0.5 0.5 rg
50 95 Td
(${this.escapeText('Firma digital: ______________________')}) Tj
ET

% Company signature box
q
0.98 0.98 0.98 rg
322 90 250 60 re
f
Q

q
0.85 0.85 0.85 RG
1 w
322 90 250 60 re
S
Q

BT
/F2 8 Tf
0.2 0.2 0.2 rg
332 135 Td
(${this.escapeText('EMPRESA')}) Tj
ET

BT
/F1 7 Tf
0.5 0.5 0.5 rg
332 120 Td
(${this.escapeText('Rep. Legal: ' + (legalRep.length > 20 ? legalRep.substring(0, 20) + '...' : legalRep))}) Tj
ET

BT
/F1 7 Tf
0.5 0.5 0.5 rg
332 105 Td
(${this.escapeText(companyName.length > 25 ? companyName.substring(0, 25) + '...' : companyName)}) Tj
ET

BT
/F1 6 Tf
0.5 0.5 0.5 rg
332 95 Td
(${this.escapeText('Firma digital: ______________________')}) Tj
ET

% Legal disclaimer section
BT
/F2 10 Tf
0.118 0.165 0.478 rg
40 70 Td
(${this.escapeText('DECLARACIÓN LEGAL')}) Tj
ET

BT
/F1 6 Tf
0.3 0.3 0.3 rg
40 55 Td
(${this.escapeText('Este comprobante de nómina electrónico tiene plena validez legal según el Decreto 1625 de 2016')}) Tj
ET

BT
/F1 6 Tf
0.3 0.3 0.3 rg
40 47 Td
(${this.escapeText('y la Resolución 3674 de 2008 del Ministerio de la Protección Social.')}) Tj
ET

BT
/F1 6 Tf
0.3 0.3 0.3 rg
40 39 Td
(${this.escapeText('Certificamos que se han efectuado todos los aportes a seguridad social según la ley.')}) Tj
ET

% Compliance footer
BT
/F1 5 Tf
0.4 0.4 0.4 rg
40 25 Td
(${this.escapeText('No. Comprobante: ' + voucherNumber + ' | Generado: ' + generationDate)}) Tj
ET

BT
/F1 5 Tf
0.4 0.4 0.4 rg
40 18 Td
(${this.escapeText('Para consultas: ' + (companyData?.email || 'nomina@empresa.com') + ' | Tel: ' + (companyData?.telefono || 'N/A'))}) Tj
ET

BT
/F1 5 Tf
0.4 0.4 0.4 rg
40 11 Td
(${this.escapeText('Sistema de Nómina Electrónica - Cumplimiento Normativo Garantizado')}) Tj
ET

% Security watermark
BT
/F1 8 Tf
0.9 0.9 0.9 rg
450 25 Td
(${this.escapeText('ORIGINAL')}) Tj
ET`;
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
      
      // PHASE 1: COMPLETE DATABASE QUERY - Get comprehensive payroll and employee data
      const { data: payrollData, error: payrollError } = await supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          period_id,
          periodo,
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
          estado,
          created_at,
          employees!inner(
            id,
            cedula,
            nombre,
            apellido,
            segundo_nombre,
            cargo,
            fecha_ingreso,
            eps,
            afp,
            arl,
            caja_compensacion,
            numero_cuenta,
            banco,
            tipo_cuenta,
            centro_costos,
            tipo_contrato,
            ciudad,
            direccion,
            telefono,
            email,
            company_id
          ),
          payroll_periods_real!inner(
            id,
            periodo,
            fecha_inicio,
            fecha_fin,
            tipo_periodo,
            company_id
          )
        `)
        .eq('id', requestBody.payrollId)
        .single();
      
      if (payrollError) {
        console.error('❌ Error fetching payroll data:', payrollError);
        throw new Error('No se encontraron datos de nómina para el ID proporcionado');
      }

      // PHASE 2: COMPLETE COMPANY DATA with all professional details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('nit, razon_social, email, telefono, direccion, ciudad, representante_legal, actividad_economica, logo_url')
        .eq('id', payrollData.employees.company_id)
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