
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Iniciando generación de comprobante PDF PROFESIONAL');
    
    const requestBody = await req.json();
    console.log('📋 Datos recibidos para PDF profesional:', JSON.stringify(requestBody, null, 2));

    const { employee, period } = requestBody;

    if (!employee || !period) {
      console.error('❌ Faltan datos del empleado o período');
      return new Response(
        JSON.stringify({ error: 'Faltan datos del empleado o período' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Inicializar Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener información de la empresa
    let companyInfo = null;
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', user.id)
            .single();
          
          if (profile?.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('*')
              .eq('id', profile.company_id)
              .single();
            
            companyInfo = company;
          }
        }
      }
    } catch (authError) {
      console.log('ℹ️ No se pudo obtener información de la empresa:', authError.message);
    }

    console.log('🏢 Información de empresa obtenida:', companyInfo?.razon_social || 'No disponible');

    // Generar PDF profesional usando jsPDF
    const pdfContent = await generateProfessionalPDFWithJsPDF(employee, period, companyInfo);

    console.log('✅ PDF profesional generado exitosamente');

    return new Response(pdfContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="comprobante-${employee.name.replace(/\s+/g, '-')}.pdf"`
      }
    });

  } catch (error) {
    console.error('💥 Error crítico generando PDF profesional:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Función para generar PDF profesional usando jsPDF con AutoTable
async function generateProfessionalPDFWithJsPDF(employee: any, period: any, companyInfo: any): Promise<Uint8Array> {
  console.log('📄 Generando PDF profesional con jsPDF...');
  
  // Importar jsPDF y AutoTable desde CDN
  const jsPDFModule = await import('https://esm.sh/jspdf@2.5.1');
  const autoTableModule = await import('https://esm.sh/jspdf-autotable@3.5.31');
  
  const { jsPDF } = jsPDFModule.default;
  
  // Crear nueva instancia de PDF
  const doc = new jsPDF();
  
  // Función auxiliar para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Función auxiliar para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Configurar fuente
  doc.setFont('helvetica');
  
  // ENCABEZADO PROFESIONAL CON COLORES
  // Fondo azul para el encabezado
  doc.setFillColor(30, 64, 175); // #1e40af
  doc.rect(0, 0, 210, 40, 'F');
  
  // Texto del encabezado en blanco
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo?.razon_social || 'MI EMPRESA', 20, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (companyInfo?.nit) doc.text(`NIT: ${companyInfo.nit}`, 20, 22);
  if (companyInfo?.telefono) doc.text(`Tel: ${companyInfo.telefono}`, 20, 27);
  if (companyInfo?.email) doc.text(`Email: ${companyInfo.email}`, 20, 32);
  
  // Título del documento
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROBANTE DE PAGO DE NÓMINA', 105, 20, { align: 'center' });
  
  // Información del período
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, 105, 27, { align: 'center' });
  doc.text(`Tipo: ${period.type.toUpperCase()}`, 105, 32, { align: 'center' });
  
  // Resetear color de texto a negro
  doc.setTextColor(0, 0, 0);
  
  // INFORMACIÓN DEL EMPLEADO CON FONDO GRIS
  let yPosition = 50;
  
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.rect(15, yPosition, 180, 25, 'F');
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.rect(15, yPosition, 180, 25, 'S');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // #1e40af
  doc.text('📋 INFORMACIÓN DEL EMPLEADO', 20, yPosition + 8);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  // Datos del empleado en dos columnas
  doc.text(`Nombre: ${employee.name}`, 20, yPosition + 15);
  doc.text(`Cargo: ${employee.position || 'No especificado'}`, 110, yPosition + 15);
  doc.text(`EPS: ${employee.eps || 'No asignada'}`, 20, yPosition + 20);
  doc.text(`AFP: ${employee.afp || 'No asignada'}`, 110, yPosition + 20);
  
  yPosition += 35;
  
  // TABLA DE CONCEPTOS CON AUTOTABLE
  const salarioProporcional = Math.round((employee.baseSalary / 30) * employee.workedDays);
  
  const tableData = [
    ['Salario Base (Mensual)', '-', formatCurrency(employee.baseSalary)],
    ['Salario Proporcional', `${employee.workedDays} días`, formatCurrency(salarioProporcional)],
    ['Horas Extra', `${employee.extraHours} hrs`, formatCurrency(0)],
    ['Bonificaciones', '-', formatCurrency(employee.bonuses)],
    ['Auxilio de Transporte', '-', formatCurrency(employee.transportAllowance)]
  ];
  
  if (employee.disabilities > 0) {
    tableData.push(['Incapacidades', '-', `-${formatCurrency(employee.disabilities)}`]);
  }
  
  // Usar AutoTable para crear tabla profesional
  (doc as any).autoTable({
    startY: yPosition,
    head: [['Concepto', 'Cantidad', 'Valor']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 64, 175], // #1e40af
      textColor: [255, 255, 255],
      fontSize: 11,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // #f8fafc
    },
    margin: { left: 15, right: 15 }
  });
  
  // Obtener posición Y después de la tabla
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // TOTALES EN RECUADROS CON COLORES
  const boxWidth = 55;
  const boxHeight = 20;
  const spacing = 10;
  const startX = 15;
  
  // Total Devengado (Verde)
  doc.setFillColor(220, 252, 231); // #dcfce7
  doc.setDrawColor(34, 197, 94); // #22c55e
  doc.rect(startX, yPosition, boxWidth, boxHeight, 'FD');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61); // #15803d
  doc.text('TOTAL DEVENGADO', startX + boxWidth/2, yPosition + 6, { align: 'center' });
  doc.setFontSize(12);
  doc.text(formatCurrency(employee.grossPay), startX + boxWidth/2, yPosition + 14, { align: 'center' });
  
  // Total Deducciones (Rojo)
  const deduccionesX = startX + boxWidth + spacing;
  doc.setFillColor(254, 226, 226); // #fee2e2
  doc.setDrawColor(239, 68, 68); // #ef4444
  doc.rect(deduccionesX, yPosition, boxWidth, boxHeight, 'FD');
  
  doc.setTextColor(220, 38, 38); // #dc2626
  doc.setFontSize(8);
  doc.text('TOTAL DEDUCCIONES', deduccionesX + boxWidth/2, yPosition + 6, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`-${formatCurrency(employee.deductions)}`, deduccionesX + boxWidth/2, yPosition + 14, { align: 'center' });
  
  // Neto a Pagar (Azul) - Más grande
  const netoX = deduccionesX + boxWidth + spacing;
  const netoWidth = 65;
  doc.setFillColor(219, 234, 254); // #dbeafe
  doc.setDrawColor(59, 130, 246); // #3b82f6
  doc.rect(netoX, yPosition, netoWidth, boxHeight, 'FD');
  
  doc.setTextColor(29, 78, 216); // #1d4ed8
  doc.setFontSize(8);
  doc.text('NETO A PAGAR', netoX + netoWidth/2, yPosition + 6, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(employee.netPay), netoX + netoWidth/2, yPosition + 14, { align: 'center' });
  
  yPosition += 35;
  
  // FIRMAS
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Líneas para firmas
  doc.line(30, yPosition + 20, 80, yPosition + 20);
  doc.line(130, yPosition + 20, 180, yPosition + 20);
  
  doc.text('Elaboró', 55, yPosition + 25, { align: 'center' });
  doc.text('Empleado', 155, yPosition + 25, { align: 'center' });
  
  // PIE DE PÁGINA
  yPosition += 40;
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.rect(0, yPosition, 210, 15, 'F');
  
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text(`Documento generado electrónicamente el ${new Date().toLocaleString('es-CO')}`, 105, yPosition + 6, { align: 'center' });
  doc.text('Comprobante de pago válido según normativa laboral colombiana', 105, yPosition + 10, { align: 'center' });
  
  // Convertir a Uint8Array
  const pdfBuffer = doc.output('arraybuffer');
  return new Uint8Array(pdfBuffer);
}
