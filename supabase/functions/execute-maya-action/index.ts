import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    console.log(`[execute-maya-action] Executing action:`, action);

    if (action.type === 'send_voucher' || action.type === 'confirm_send_voucher') {
      return await executeSendVoucherAction(action);
    }

    if (action.type === 'send_voucher_all') {
      return await executeSendVoucherAllAction(action);
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Tipo de acción no soportado' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[execute-maya-action] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function executeSendVoucherAction(action: any) {
  const { employeeId, employeeName, email, periodId } = action.parameters;
  
  if (!employeeId) {
    throw new Error('Employee ID es requerido para ejecutar la acción');
  }

  console.log(`[execute-maya-action] Processing voucher for employee: ${employeeName}, email: ${email}`);

  // Step 1: Get employee data
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single();

  if (employeeError || !employee) {
    throw new Error(`No se pudo encontrar el empleado: ${employeeError?.message}`);
  }

  // Step 2: Get period data for this employee (specific period or latest)
  let payrollQuery = supabase
    .from('payrolls')
    .select(`
      *,
      payroll_periods_real!inner(*)
    `)
    .eq('employee_id', employeeId);
    
  if (periodId) {
    // Use specific period if provided
    payrollQuery = payrollQuery.eq('period_id', periodId);
  } else {
    // Use latest period if no specific period provided
    payrollQuery = payrollQuery.order('created_at', { ascending: false }).limit(1);
  }
  
  const { data: payrollData, error: payrollError } = await payrollQuery.single();

  if (payrollError || !payrollData) {
    throw new Error(`No se encontraron datos de nómina para ${employeeName}: ${payrollError?.message}`);
  }

  // Step 3: Get company info
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', employee.company_id)
    .single();

  if (companyError || !company) {
    throw new Error(`No se pudo obtener información de la empresa: ${companyError?.message}`);
  }

  // Step 4: Generate PDF using generate-voucher-pdf function
  const pdfResponse = await supabase.functions.invoke('generate-voucher-pdf', {
    body: {
      employee: {
        id: employee.id,
        nombre: employee.nombre,
        apellido: employee.apellido,
        cedula: employee.cedula,
        salario_base: employee.salario_base,
        email: employee.email,
        telefono: employee.telefono,
        cargo: employee.cargo,
        banco: employee.banco,
        numero_cuenta: employee.numero_cuenta
      },
      period: {
        id: payrollData.payroll_periods_real.id,
        periodo: payrollData.payroll_periods_real.periodo,
        fecha_inicio: payrollData.payroll_periods_real.fecha_inicio,
        fecha_fin: payrollData.payroll_periods_real.fecha_fin,
        tipo_periodo: payrollData.payroll_periods_real.tipo_periodo
      },
      companyInfo: {
        nombre: company.nombre,
        nit: company.nit,
        direccion: company.direccion || 'Dirección no especificada',
        telefono: company.telefono || 'Teléfono no especificado',
        email: company.email || 'Email no especificado'
      }
    }
  });

  if (pdfResponse.error) {
    throw new Error(`Error generando PDF: ${pdfResponse.error.message}`);
  }

  const { pdfBase64 } = pdfResponse.data;
  if (!pdfBase64) {
    throw new Error('No se pudo generar el PDF del comprobante');
  }

  // Step 5: Send email using send-voucher-email function
  const targetEmail = email || employee.email;
  if (!targetEmail) {
    throw new Error(`No se especificó email de destino y el empleado ${employeeName} no tiene email registrado`);
  }

  const emailResponse = await supabase.functions.invoke('send-voucher-email', {
    body: {
      emails: [targetEmail],
      pdfBase64,
      employee: {
        nombre: employee.nombre,
        apellido: employee.apellido,
        periodo: payrollData.payroll_periods_real.periodo
      },
      period: {
        periodo: payrollData.payroll_periods_real.periodo,
        fecha_inicio: payrollData.payroll_periods_real.fecha_inicio,
        fecha_fin: payrollData.payroll_periods_real.fecha_fin
      },
      companyInfo: {
        nombre: company.nombre,
        nit: company.nit
      }
    }
  });

  if (emailResponse.error) {
    throw new Error(`Error enviando email: ${emailResponse.error.message}`);
  }

  console.log(`[execute-maya-action] ✅ Voucher sent successfully to ${targetEmail} for ${employeeName}`);

  return new Response(
    JSON.stringify({
      success: true,
      message: `✅ Comprobante de ${employeeName} enviado exitosamente a ${targetEmail}`,
      data: {
        employeeName,
        email: targetEmail,
        period: payrollData.payroll_periods_real.periodo
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function executeSendVoucherAllAction(action: any) {
  const { periodId, periodName, employeeCount } = action.parameters;
  
  console.log(`[execute-maya-action] Processing mass voucher sending for ${employeeCount} employees, period: ${periodName || periodId}`);

  if (!periodId) {
    throw new Error('Period ID es requerido para envío masivo');
  }

  // Get period data
  const { data: period, error: periodError } = await supabase
    .from('payroll_periods_real')
    .select('*')
    .eq('id', periodId)
    .single();

  if (periodError || !period) {
    throw new Error(`No se pudo encontrar el período: ${periodError?.message}`);
  }

  // Get all active employees for this company
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', period.company_id)
    .eq('estado', 'activo');

  if (employeesError || !employees || employees.length === 0) {
    throw new Error('No se encontraron empleados activos para envío masivo');
  }

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  // Process each employee
  for (let i = 0; i < employees.length; i++) {
    const employee = employees[i];
    console.log(`[execute-maya-action] Processing ${i + 1}/${employees.length}: ${employee.nombre} ${employee.apellido}`);

    try {
      // Create individual voucher action for each employee
      const individualAction = {
        type: 'send_voucher',
        parameters: {
          employeeId: employee.id,
          employeeName: `${employee.nombre} ${employee.apellido}`,
          email: employee.email,
          periodId: periodId
        }
      };

      // Execute individual voucher sending
      const result = await executeSendVoucherAction(individualAction);
      
      if (result.status === 200) {
        successCount++;
        results.push({
          employee: `${employee.nombre} ${employee.apellido}`,
          success: true,
          email: employee.email
        });
      } else {
        errorCount++;
        results.push({
          employee: `${employee.nombre} ${employee.apellido}`,
          success: false,
          error: 'Error en envío'
        });
      }
    } catch (error: any) {
      console.error(`[execute-maya-action] Error with employee ${employee.nombre}:`, error);
      errorCount++;
      results.push({
        employee: `${employee.nombre} ${employee.apellido}`,
        success: false,
        error: error.message
      });
    }
  }

  const totalProcessed = successCount + errorCount;
  const message = successCount === totalProcessed 
    ? `✅ ¡Envío masivo completado! Se enviaron ${successCount} desprendibles exitosamente para el período "${period.periodo}".`
    : `⚠️ Envío masivo completado con algunos errores: ${successCount} exitosos, ${errorCount} fallidos de ${totalProcessed} empleados para el período "${period.periodo}".`;

  console.log(`[execute-maya-action] ✅ Mass voucher sending completed: ${successCount} success, ${errorCount} errors`);

  return new Response(
    JSON.stringify({
      success: successCount > 0,
      message,
      data: {
        totalProcessed,
        successCount,
        errorCount,
        period: period.periodo,
        results
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}