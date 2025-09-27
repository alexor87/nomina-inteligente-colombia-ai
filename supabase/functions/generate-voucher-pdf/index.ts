import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employee, period, companyInfo } = await req.json();
    
    console.log('Generating PDF voucher for employee:', employee?.nombre, employee?.apellido);
    console.log('Period:', period);

    // Import jsPDF and autoTable dynamically
    const jsPDF = (await import("https://esm.sh/jspdf@2.5.1")).default;
    const autoTable = (await import("https://esm.sh/jspdf-autotable@3.6.0")).default;

    // Create new PDF instance
    const doc = new jsPDF();
    
    // Company header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(companyInfo?.razon_social || 'Empresa', 20, 20);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`NIT: ${companyInfo?.nit || 'N/A'}`, 20, 30);
    doc.text(`Email: ${companyInfo?.email || 'N/A'}`, 20, 35);
    if (companyInfo?.telefono) {
      doc.text(`Teléfono: ${companyInfo.telefono}`, 20, 40);
    }
    
    // Title
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('COMPROBANTE DE PAGO DE NÓMINA', 20, 55);
    
    // Employee info
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Empleado: ${employee.nombre} ${employee.apellido}`, 20, 70);
    doc.text(`Cédula: ${employee.cedula || 'N/A'}`, 20, 75);
    doc.text(`Cargo: ${employee.cargo || 'N/A'}`, 20, 80);
    doc.text(`Período: ${period.startDate} - ${period.endDate}`, 20, 85);
    
    // Earnings section
    const earningsData = [
      ['Concepto', 'Valor'],
      ['Salario Base', formatCurrency(employee.salario_base || 0)],
      ['Auxilio de Transporte', formatCurrency(employee.auxilio_transporte || 0)],
      ['Horas Extra', formatCurrency(employee.horas_extra || 0)],
      ['Bonificaciones', formatCurrency(employee.bonificaciones || 0)],
      ['Comisiones', formatCurrency(employee.comisiones || 0)],
      ['Prima', formatCurrency(employee.prima || 0)],
      ['Cesantías', formatCurrency(employee.cesantias || 0)],
      ['Vacaciones', formatCurrency(employee.vacaciones || 0)],
      ['Otros Devengos', formatCurrency(employee.otros_devengos || 0)]
    ];

    autoTable(doc, {
      head: [earningsData[0]],
      body: earningsData.slice(1),
      startY: 95,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 20, right: 20 }
    });

    // Deductions section
    const lastEarningsY = (doc as any).lastAutoTable.finalY + 10;
    
    const deductionsData = [
      ['Concepto', 'Valor'],
      ['Salud Empleado', formatCurrency(employee.salud_empleado || 0)],
      ['Pensión Empleado', formatCurrency(employee.pension_empleado || 0)],
      ['Retención en la Fuente', formatCurrency(employee.retencion_fuente || 0)],
      ['Otros Descuentos', formatCurrency(employee.otros_descuentos || 0)]
    ];

    autoTable(doc, {
      head: [deductionsData[0]],
      body: deductionsData.slice(1),
      startY: lastEarningsY,
      theme: 'grid',
      headStyles: { fillColor: [231, 76, 60] },
      margin: { left: 20, right: 20 }
    });

    // Summary
    const lastDeductionsY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Devengado: ${formatCurrency(employee.total_devengado || 0)}`, 20, lastDeductionsY);
    doc.text(`Total Deducciones: ${formatCurrency(employee.total_deducciones || 0)}`, 20, lastDeductionsY + 8);
    doc.text(`NETO A PAGAR: ${formatCurrency(employee.neto_pagado || 0)}`, 20, lastDeductionsY + 16);

    // Footer
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Generado el: ${new Date().toLocaleString('es-CO')}`, 20, doc.internal.pageSize.height - 10);

    // Get PDF as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    
    console.log('PDF generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfBase64,
        message: 'PDF generado exitosamente' 
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Error generando PDF' 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );
  }
};

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

serve(handler);