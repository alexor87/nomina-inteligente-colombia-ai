export class EmployeeValidationService {
  static validateAndCleanEmployeeData(employeeData: any, companyId: string) {
    // Validar y limpiar el estado específicamente
    const validStates = ['activo', 'inactivo', 'vacaciones', 'incapacidad'];
    const estadoLimpio = employeeData.estado && validStates.includes(employeeData.estado) 
      ? employeeData.estado 
      : 'activo';

    // Validar y limpiar el tipo de contrato
    const validContractTypes = ['indefinido', 'fijo', 'obra', 'aprendizaje'];
    const tipoContratoLimpio = employeeData.tipoContrato && validContractTypes.includes(employeeData.tipoContrato)
      ? employeeData.tipoContrato
      : 'indefinido';

    // Validar y limpiar el tipo de documento
    const validDocumentTypes = ['CC', 'TI', 'CE', 'PA', 'RC', 'NIT', 'PEP', 'PPT'];
    const tipoDocumentoLimpio = employeeData.tipoDocumento && validDocumentTypes.includes(employeeData.tipoDocumento)
      ? employeeData.tipoDocumento
      : 'CC';

    // Validar y limpiar el estado de afiliación
    const validAffiliationStates = ['completa', 'pendiente', 'inconsistente'];
    const estadoAfiliacionLimpio = employeeData.estadoAfiliacion && validAffiliationStates.includes(employeeData.estadoAfiliacion)
      ? employeeData.estadoAfiliacion
      : 'pendiente';

    // Helper function to handle text fields - convert empty strings to null, keep null as null
    const cleanTextField = (value: any) => {
      if (value === '' || value === undefined) return null;
      return value ? String(value).trim() : null;
    };

    // Limpiar y validar datos antes de insertar INCLUYENDO TODOS LOS CAMPOS NUEVOS
    const cleanedData = {
      company_id: companyId,
      cedula: String(employeeData.cedula || '').trim(),
      tipo_documento: tipoDocumentoLimpio,
      nombre: String(employeeData.nombre || '').trim(),
      segundo_nombre: cleanTextField(employeeData.segundoNombre),
      apellido: String(employeeData.apellido || '').trim(),
      email: cleanTextField(employeeData.email),
      telefono: cleanTextField(employeeData.telefono),
      salario_base: Number(employeeData.salarioBase) || 0,
      tipo_contrato: tipoContratoLimpio,
      fecha_ingreso: employeeData.fechaIngreso || new Date().toISOString().split('T')[0],
      estado: estadoLimpio,
      // Campos de afiliaciones - manejo correcto de valores nulos
      eps: cleanTextField(employeeData.eps),
      afp: cleanTextField(employeeData.afp),
      arl: cleanTextField(employeeData.arl),
      caja_compensacion: cleanTextField(employeeData.cajaCompensacion),
      cargo: cleanTextField(employeeData.cargo),
      estado_afiliacion: estadoAfiliacionLimpio,
      nivel_riesgo_arl: employeeData.nivelRiesgoARL || null,
      // Campos bancarios
      banco: cleanTextField(employeeData.banco),
      tipo_cuenta: employeeData.tipoCuenta || 'ahorros',
      numero_cuenta: cleanTextField(employeeData.numeroCuenta),
      titular_cuenta: cleanTextField(employeeData.titularCuenta),
      // Campos de tipos de cotizante - convertir strings vacíos a null
      tipo_cotizante_id: employeeData.tipoCotizanteId || null,
      subtipo_cotizante_id: employeeData.subtipoCotizanteId || null,
      // Campos de información personal extendida
      sexo: employeeData.sexo || null,
      fecha_nacimiento: employeeData.fechaNacimiento || null,
      direccion: cleanTextField(employeeData.direccion),
      ciudad: cleanTextField(employeeData.ciudad),
      departamento: cleanTextField(employeeData.departamento),
      // Campos laborales extendidos
      periodicidad_pago: employeeData.periodicidadPago || 'mensual',
      codigo_ciiu: cleanTextField(employeeData.codigoCIIU),
      centro_costos: cleanTextField(employeeData.centroCostos),
      // ✅ CRÍTICO: Agregar tipo_salario que faltaba
      tipo_salario: employeeData.tipoSalario || 'mensual',
      // Detalles del contrato
      fecha_firma_contrato: employeeData.fechaFirmaContrato || null,
      fecha_finalizacion_contrato: employeeData.fechaFinalizacionContrato || null,
      tipo_jornada: employeeData.tipoJornada || 'completa',
      dias_trabajo: Number(employeeData.diasTrabajo) || 30,
      horas_trabajo: Number(employeeData.horasTrabajo) || 8,
      beneficios_extralegales: Boolean(employeeData.beneficiosExtralegales),
      clausulas_especiales: cleanTextField(employeeData.clausulasEspeciales),
      forma_pago: employeeData.formaPago || 'dispersion',
      regimen_salud: employeeData.regimenSalud || 'contributivo'
    };

    console.log('🧹 EmployeeValidationService: Cleaned affiliations data:', {
      eps: cleanedData.eps,
      afp: cleanedData.afp,
      arl: cleanedData.arl,
      caja_compensacion: cleanedData.caja_compensacion,
      tipo_cotizante_id: cleanedData.tipo_cotizante_id,
      subtipo_cotizante_id: cleanedData.subtipo_cotizante_id,
      regimen_salud: cleanedData.regimen_salud,
      estado_afiliacion: cleanedData.estado_afiliacion
    });

    return cleanedData;
  }

  static validateBasicFields(cleanedData: any) {
    // Validaciones básicas
    if (!cleanedData.cedula) {
      throw new Error('El número de documento es requerido');
    }
    if (!cleanedData.nombre) {
      throw new Error('El nombre es requerido');
    }
    if (cleanedData.salario_base <= 0) {
      throw new Error('El salario base debe ser mayor a 0');
    }
  }

  static prepareUpdateData(updates: any) {
    console.log('🔄 Preparing update data from:', updates);
    
    const supabaseData: any = {};
    
    // Helper function to handle text fields properly
    const cleanTextField = (value: any) => {
      if (value === '' || value === undefined) return null;
      return value ? String(value).trim() : null;
    };
    
    // Mapear TODOS los campos posibles para updates
    if (updates.empresaId !== undefined) supabaseData.company_id = updates.empresaId;
    if (updates.cedula !== undefined) supabaseData.cedula = updates.cedula;
    if (updates.tipoDocumento !== undefined) supabaseData.tipo_documento = updates.tipoDocumento;
    if (updates.nombre !== undefined) supabaseData.nombre = updates.nombre;
    if (updates.segundoNombre !== undefined) supabaseData.segundo_nombre = cleanTextField(updates.segundoNombre);
    if (updates.apellido !== undefined) supabaseData.apellido = updates.apellido;
    if (updates.email !== undefined) supabaseData.email = cleanTextField(updates.email);
    if (updates.telefono !== undefined) supabaseData.telefono = cleanTextField(updates.telefono);
    if (updates.salarioBase !== undefined) supabaseData.salario_base = updates.salarioBase;
    
    // ✅ CRÍTICO: Mapear tipo_salario que faltaba
    if (updates.tipoSalario !== undefined) supabaseData.tipo_salario = updates.tipoSalario;
    
    if (updates.tipoContrato !== undefined) supabaseData.tipo_contrato = updates.tipoContrato;
    if (updates.fechaIngreso !== undefined) supabaseData.fecha_ingreso = updates.fechaIngreso;
    if (updates.estado !== undefined) supabaseData.estado = updates.estado;
    
    // Campos de afiliaciones - manejo correcto de valores nulos
    if (updates.eps !== undefined) supabaseData.eps = cleanTextField(updates.eps);
    if (updates.afp !== undefined) supabaseData.afp = cleanTextField(updates.afp);
    if (updates.arl !== undefined) supabaseData.arl = cleanTextField(updates.arl);
    if (updates.cajaCompensacion !== undefined) supabaseData.caja_compensacion = cleanTextField(updates.cajaCompensacion);
    if (updates.cargo !== undefined) supabaseData.cargo = cleanTextField(updates.cargo);
    if (updates.estadoAfiliacion !== undefined) supabaseData.estado_afiliacion = updates.estadoAfiliacion;
    if (updates.nivelRiesgoARL !== undefined) supabaseData.nivel_riesgo_arl = updates.nivelRiesgoARL;

    // Campos bancarios
    if (updates.banco !== undefined) supabaseData.banco = cleanTextField(updates.banco);
    if (updates.tipoCuenta !== undefined) supabaseData.tipo_cuenta = updates.tipoCuenta;
    if (updates.numeroCuenta !== undefined) supabaseData.numero_cuenta = cleanTextField(updates.numeroCuenta);
    if (updates.titularCuenta !== undefined) supabaseData.titular_cuenta = cleanTextField(updates.titularCuenta);

    // Campos de tipos de cotizante - convertir strings vacíos a null
    if (updates.tipoCotizanteId !== undefined) supabaseData.tipo_cotizante_id = updates.tipoCotizanteId || null;
    if (updates.subtipoCotizanteId !== undefined) supabaseData.subtipo_cotizante_id = updates.subtipoCotizanteId || null;

    // Campos de información personal extendida
    if (updates.sexo !== undefined) supabaseData.sexo = updates.sexo;
    if (updates.fechaNacimiento !== undefined) supabaseData.fecha_nacimiento = updates.fechaNacimiento;
    if (updates.direccion !== undefined) supabaseData.direccion = cleanTextField(updates.direccion);
    if (updates.ciudad !== undefined) supabaseData.ciudad = cleanTextField(updates.ciudad);
    if (updates.departamento !== undefined) supabaseData.departamento = updates.departamento;

    // Campos laborales extendidos
    if (updates.periodicidadPago !== undefined) supabaseData.periodicidad_pago = updates.periodicidadPago;
    if (updates.codigoCIIU !== undefined) supabaseData.codigo_ciiu = cleanTextField(updates.codigoCIIU);
    if (updates.centroCostos !== undefined) supabaseData.centro_costos = cleanTextField(updates.centroCostos);

    // Detalles del contrato
    if (updates.fechaFirmaContrato !== undefined) supabaseData.fecha_firma_contrato = updates.fechaFirmaContrato;
    if (updates.fechaFinalizacionContrato !== undefined) supabaseData.fecha_finalizacion_contrato = updates.fechaFinalizacionContrato;
    if (updates.tipoJornada !== undefined) supabaseData.tipo_jornada = updates.tipoJornada;
    if (updates.diasTrabajo !== undefined) supabaseData.dias_trabajo = updates.diasTrabajo;
    if (updates.horasTrabajo !== undefined) supabaseData.horas_trabajo = updates.horasTrabajo;
    if (updates.beneficiosExtralegales !== undefined) supabaseData.beneficios_extralegales = updates.beneficiosExtralegales;
    if (updates.clausulasEspeciales !== undefined) supabaseData.clausulas_especiales = cleanTextField(updates.clausulasEspeciales);
    if (updates.formaPago !== undefined) supabaseData.forma_pago = updates.formaPago;
    if (updates.regimenSalud !== undefined) supabaseData.regimen_salud = updates.regimenSalud;

    console.log('✅ Mapped update data to:', supabaseData);
    console.log('🔍 Affiliations data mapped:', {
      eps: supabaseData.eps,
      afp: supabaseData.afp,
      arl: supabaseData.arl,
      caja_compensacion: supabaseData.caja_compensacion,
      tipo_cotizante_id: supabaseData.tipo_cotizante_id,
      subtipo_cotizante_id: supabaseData.subtipo_cotizante_id,
      regimen_salud: supabaseData.regimen_salud,
      estado_afiliacion: supabaseData.estado_afiliacion
    });
    
    return supabaseData;
  }
}
