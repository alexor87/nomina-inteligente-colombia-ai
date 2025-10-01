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

    // Voucher actions
    if (action.type === 'send_voucher' || action.type === 'confirm_send_voucher') {
      return await executeSendVoucherAction(action);
    }

    if (action.type === 'send_voucher_all') {
      return await executeSendVoucherAllAction(action);
    }

    // Employee CRUD actions
    if (action.type === 'create_employee') {
      return await executeCreateEmployeeAction(action);
    }

    if (action.type === 'update_employee') {
      return await executeUpdateEmployeeAction(action);
    }

    if (action.type === 'delete_employee') {
      return await executeDeleteEmployeeAction(action);
    }

    if (action.type === 'search_employee') {
      return await executeSearchEmployeeAction(action);
    }

    // Payroll CRUD actions
    if (action.type === 'liquidate_payroll') {
      return await executeLiquidatePayrollAction(action);
    }

    if (action.type === 'register_vacation') {
      return await executeRegisterVacationAction(action);
    }

    if (action.type === 'register_absence') {
      return await executeRegisterAbsenceAction(action);
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
        startDate: payrollData.payroll_periods_real.fecha_inicio,
        endDate: payrollData.payroll_periods_real.fecha_fin,
        type: payrollData.payroll_periods_real.tipo_periodo,
        periodo: payrollData.payroll_periods_real.periodo
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

// ============================================================================
// EMPLOYEE CRUD ACTIONS
// ============================================================================

async function executeCreateEmployeeAction(action: any) {
  const { employeeName, basicInfo, companyId } = action.parameters;
  
  if (!employeeName || !companyId) {
    throw new Error('Información incompleta para crear empleado');
  }

  console.log(`[execute-maya-action] Creating employee: ${employeeName}`, basicInfo);

  // Get current user info for created_by field
  const authHeader = Deno.env.get('AUTHORIZATION');
  if (!authHeader) {
    throw new Error('Usuario no autenticado');
  }

  // Use the existing EmployeeUnifiedService pattern - insert directly to employees table
  const employeeData = {
    company_id: companyId,
    nombre: basicInfo.nombre || employeeName.split(' ')[0],
    apellido: basicInfo.apellido || employeeName.split(' ').slice(1).join(' ') || '',
    cedula: basicInfo.cedula || '0000000000', // Will need to be updated
    salario_base: basicInfo.salario_base || 1000000, // Default minimum wage
    cargo: basicInfo.cargo || 'Sin especificar',
    email: basicInfo.email || null,
    telefono: basicInfo.telefono || null,
    estado: 'activo',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    tipo_contrato: 'indefinido'
  };

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .insert(employeeData)
    .select()
    .single();

  if (employeeError) {
    throw new Error(`Error creando empleado: ${employeeError.message}`);
  }

  console.log(`[execute-maya-action] ✅ Employee created successfully:`, employee.nombre);

  return new Response(
    JSON.stringify({
      success: true,
      message: `✅ Empleado ${employeeName} creado exitosamente. Ahora puedes completar información adicional desde la sección Empleados.`,
      data: {
        employeeId: employee.id,
        employeeName: `${employee.nombre} ${employee.apellido}`,
        needsCompletion: true
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function executeUpdateEmployeeAction(action: any) {
  const { employeeId, employeeName, updateInfo } = action.parameters;
  
  if (!employeeId || !updateInfo) {
    throw new Error('Información incompleta para actualizar empleado');
  }

  console.log(`[execute-maya-action] Updating employee: ${employeeName}`, updateInfo);

  const { data: employee, error: updateError } = await supabase
    .from('employees')
    .update(updateInfo)
    .eq('id', employeeId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Error actualizando empleado: ${updateError.message}`);
  }

  console.log(`[execute-maya-action] ✅ Employee updated successfully:`, employee.nombre);

  const updatedFields = Object.keys(updateInfo).map(key => {
    let label = key;
    if (key === 'salario_base') label = 'salario';
    if (key === 'telefono') label = 'teléfono';
    return `${label}: ${updateInfo[key]}`;
  }).join(', ');

  return new Response(
    JSON.stringify({
      success: true,
      message: `✅ Información de ${employeeName} actualizada exitosamente. Cambios: ${updatedFields}`,
      data: {
        employeeId: employee.id,
        employeeName: `${employee.nombre} ${employee.apellido}`,
        updatedFields: Object.keys(updateInfo)
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function executeDeleteEmployeeAction(action: any) {
  const { employeeId, employeeName } = action.parameters;
  
  if (!employeeId) {
    throw new Error('ID de empleado requerido para dar de baja');
  }

  console.log(`[execute-maya-action] Deactivating employee: ${employeeName}`);

  // Instead of deleting, set status to inactive (safer approach)
  const { data: employee, error: updateError } = await supabase
    .from('employees')
    .update({ 
      estado: 'inactivo',
      updated_at: new Date().toISOString()
    })
    .eq('id', employeeId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Error dando de baja empleado: ${updateError.message}`);
  }

  console.log(`[execute-maya-action] ✅ Employee deactivated successfully:`, employee.nombre);

  return new Response(
    JSON.stringify({
      success: true,
      message: `✅ Empleado ${employeeName} dado de baja exitosamente. Su estado cambió a "inactivo" y se mantienen todos los registros históricos.`,
      data: {
        employeeId: employee.id,
        employeeName: `${employee.nombre} ${employee.apellido}`,
        newStatus: 'inactivo'
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function executeSearchEmployeeAction(action: any) {
  const { query, filter, companyId } = action.parameters;
  
  if (!query) {
    throw new Error('Query de búsqueda requerido');
  }

  if (!companyId) {
    throw new Error('Company ID requerido para buscar empleados');
  }

  console.log(`[execute-maya-action] Searching employees with query: "${query}", filter: ${filter || 'all'} in company: ${companyId}`);

  // Search employees in the specified company
  let queryBuilder = supabase
    .from('employees')
    .select('*')
    .eq('company_id', companyId);

  // Apply search based on filter
  const searchTerm = `%${query.toLowerCase()}%`;
  
  if (filter === 'name' || !filter) {
    queryBuilder = queryBuilder.or(`nombre.ilike.${searchTerm},apellido.ilike.${searchTerm}`);
  } else if (filter === 'position') {
    queryBuilder = queryBuilder.ilike('cargo', searchTerm);
  } else if (filter === 'department') {
    queryBuilder = queryBuilder.ilike('departamento', searchTerm);
  } else if (filter === 'cedula') {
    queryBuilder = queryBuilder.ilike('cedula', searchTerm);
  } else {
    // Search across all text fields
    queryBuilder = queryBuilder.or(`nombre.ilike.${searchTerm},apellido.ilike.${searchTerm},cedula.ilike.${searchTerm},cargo.ilike.${searchTerm},email.ilike.${searchTerm}`);
  }

  const { data: employees, error: searchError } = await queryBuilder
    .order('nombre', { ascending: true })
    .limit(20);

  if (searchError) {
    throw new Error(`Error buscando empleados: ${searchError.message}`);
  }

  console.log(`[execute-maya-action] ✅ Found ${employees?.length || 0} employees matching "${query}"`);

  // Transform to EmployeeWithStatus format
  const transformedEmployees = (employees || []).map(emp => ({
    id: emp.id,
    nombre: emp.nombre,
    apellido: emp.apellido,
    cedula: emp.cedula,
    email: emp.email,
    telefono: emp.telefono,
    cargo: emp.cargo,
    estado: emp.estado,
    salarioBase: emp.salario_base,
    fechaIngreso: emp.fecha_ingreso,
    tipoContrato: emp.tipo_contrato,
    eps: emp.eps,
    afp: emp.afp,
    arl: emp.arl,
    cajaCompensacion: emp.caja_compensacion,
    banco: emp.banco,
    tipoCuenta: emp.tipo_cuenta,
    numeroCuenta: emp.numero_cuenta,
    companyId: emp.company_id
  }));

  return new Response(
    JSON.stringify({
      success: true,
      message: `Se encontraron ${transformedEmployees.length} empleados`,
      data: {
        employees: transformedEmployees,
        query,
        filter: filter || 'all',
        count: transformedEmployees.length
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================================================
// PAYROLL CRUD ACTIONS
// ============================================================================

async function executeLiquidatePayrollAction(action: any) {
  const { periodName, companyId } = action.parameters;
  
  if (!periodName || !companyId) {
    throw new Error('Información incompleta para liquidar nómina');
  }

  console.log(`[execute-maya-action] Liquidating payroll for period: ${periodName}`);

  // This is a complex operation that would normally involve:
  // 1. Finding or creating the payroll period
  // 2. Calculating payroll for all active employees
  // 3. Applying deductions and benefits
  // 4. Generating vouchers

  // For now, return guidance to use the UI since this is a critical operation
  return new Response(
    JSON.stringify({
      success: true,
      message: `⚠️ La liquidación de nómina para "${periodName}" es una operación compleja que se debe realizar desde la sección de Nómina para garantizar todos los cálculos y validaciones.\n\n¿Te gustaría que te guíe en el proceso paso a paso?`,
      data: {
        periodName: periodName,
        requiresUIGuidance: true,
        suggestedPath: '/app/payroll'
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function executeRegisterVacationAction(action: any) {
  const { employeeId, employeeName, vacationInfo } = action.parameters;
  
  if (!employeeId) {
    throw new Error('ID de empleado requerido para registrar vacaciones');
  }

  console.log(`[execute-maya-action] Registering vacation for: ${employeeName}`, vacationInfo);

  // Get employee data first
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('company_id')
    .eq('id', employeeId)
    .single();

  if (employeeError || !employee) {
    throw new Error(`No se pudo encontrar el empleado: ${employeeError?.message}`);
  }

  // Create vacation record
  const vacationData = {
    employee_id: employeeId,
    company_id: employee.company_id,
    type: 'vacaciones',
    start_date: vacationInfo.startDate || new Date().toISOString().split('T')[0],
    end_date: vacationInfo.endDate || new Date().toISOString().split('T')[0],
    days_count: vacationInfo.days || 1,
    status: 'pendiente',
    observations: `Vacaciones registradas por MAYA para ${employeeName}`
  };

  const { data: vacation, error: vacationError } = await supabase
    .from('employee_vacation_periods')
    .insert(vacationData)
    .select()
    .single();

  if (vacationError) {
    throw new Error(`Error registrando vacaciones: ${vacationError.message}`);
  }

  console.log(`[execute-maya-action] ✅ Vacation registered successfully for:`, employeeName);

  return new Response(
    JSON.stringify({
      success: true,
      message: `✅ Vacaciones registradas exitosamente para ${employeeName}. Las vacaciones se procesarán en la próxima liquidación de nómina.`,
      data: {
        vacationId: vacation.id,
        employeeName: employeeName,
        startDate: vacation.start_date,
        endDate: vacation.end_date,
        days: vacation.days_count
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function executeRegisterAbsenceAction(action: any) {
  const { employeeId, employeeName, absenceInfo } = action.parameters;
  
  if (!employeeId) {
    throw new Error('ID de empleado requerido para registrar ausencia');
  }

  console.log(`[execute-maya-action] Registering absence for: ${employeeName}`, absenceInfo);

  // Get employee data first
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('company_id')
    .eq('id', employeeId)
    .single();

  if (employeeError || !employee) {
    throw new Error(`No se pudo encontrar el empleado: ${employeeError?.message}`);
  }

  // Create absence record
  const absenceData = {
    employee_id: employeeId,
    company_id: employee.company_id,
    type: absenceInfo.type || 'ausencia',
    start_date: absenceInfo.startDate || new Date().toISOString().split('T')[0],
    end_date: absenceInfo.endDate || absenceInfo.startDate || new Date().toISOString().split('T')[0],
    days_count: absenceInfo.days || 1,
    status: 'pendiente',
    observations: `Ausencia registrada por MAYA para ${employeeName}`
  };

  const { data: absence, error: absenceError } = await supabase
    .from('employee_vacation_periods')
    .insert(absenceData)
    .select()
    .single();

  if (absenceError) {
    throw new Error(`Error registrando ausencia: ${absenceError.message}`);
  }

  console.log(`[execute-maya-action] ✅ Absence registered successfully for:`, employeeName);

  return new Response(
    JSON.stringify({
      success: true,
      message: `✅ Ausencia registrada exitosamente para ${employeeName}. Se descontará automáticamente en la próxima liquidación de nómina.`,
      data: {
        absenceId: absence.id,
        employeeName: employeeName,
        absenceType: absence.type,
        startDate: absence.start_date,
        endDate: absence.end_date,
        days: absence.days_count
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}