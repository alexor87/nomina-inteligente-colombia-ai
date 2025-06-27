
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

    // Limpiar y validar datos antes de insertar INCLUYENDO TODOS LOS CAMPOS NUEVOS
    const cleanedData = {
      company_id: companyId,
      cedula: String(employeeData.cedula || '').trim(),
      tipo_documento: tipoDocumentoLimpio,
      nombre: String(employeeData.nombre || '').trim(),
      segundo_nombre: employeeData.segundoNombre ? String(employeeData.segundoNombre).trim() : null,
      apellido: String(employeeData.apellido || '').trim(),
      email: employeeData.email ? String(employeeData.email).trim() : null,
      telefono: employeeData.telefono ? String(employeeData.telefono).trim() : null,
      salario_base: Number(employeeData.salarioBase) || 0,
      tipo_contrato: tipoContratoLimpio,
      fecha_ingreso: employeeData.fechaIngreso || new Date().toISOString().split('T')[0],
      estado: estadoLimpio,
      eps: employeeData.eps ? String(employeeData.eps).trim() : null,
      afp: employeeData.afp ? String(employeeData.afp).trim() : null,
      arl: employeeData.arl ? String(employeeData.arl).trim() : null,
      caja_compensacion: employeeData.cajaCompensacion ? String(employeeData.cajaCompensacion).trim() : null,
      cargo: employeeData.cargo ? String(employeeData.cargo).trim() : null,
      estado_afiliacion: estadoAfiliacionLimpio,
      nivel_riesgo_arl: employeeData.nivelRiesgoARL || null,
      // Campos bancarios
      banco: employeeData.banco ? String(employeeData.banco).trim() : null,
      tipo_cuenta: employeeData.tipoCuenta || 'ahorros',
      numero_cuenta: employeeData.numeroCuenta ? String(employeeData.numeroCuenta).trim() : null,
      titular_cuenta: employeeData.titularCuenta ? String(employeeData.titularCuenta).trim() : null,
      // Campos de tipos de cotizante
      tipo_cotizante_id: employeeData.tipoCotizanteId || null,
      subtipo_cotizante_id: employeeData.subtipoCotizanteId || null,
      // Campos de información personal extendida
      sexo: employeeData.sexo || null,
      fecha_nacimiento: employeeData.fechaNacimiento || null,
      direccion: employeeData.direccion ? String(employeeData.direccion).trim() : null,
      ciudad: employeeData.ciudad ? String(employeeData.ciudad).trim() : null,
      departamento: employeeData.departamento ? String(employeeData.departamento).trim() : null,
      // Campos laborales extendidos
      periodicidad_pago: employeeData.periodicidadPago || 'mensual',
      codigo_ciiu: employeeData.codigoCIIU ? String(employeeData.codigoCIIU).trim() : null,
      centro_costos: employeeData.centroCostos ? String(employeeData.centroCostos).trim() : null,
      // Detalles del contrato
      fecha_firma_contrato: employeeData.fechaFirmaContrato || null,
      fecha_finalizacion_contrato: employeeData.fechaFinalizacionContrato || null,
      tipo_jornada: employeeData.tipoJornada || 'completa',
      dias_trabajo: Number(employeeData.diasTrabajo) || 30,
      horas_trabajo: Number(employeeData.horasTrabajo) || 8,
      beneficios_extralegales: Boolean(employeeData.beneficiosExtralegales),
      clausulas_especiales: employeeData.clausulasEspeciales ? String(employeeData.clausulasEspeciales).trim() : null,
      forma_pago: employeeData.formaPago || 'dispersion',
      regimen_salud: employeeData.regimenSalud || 'contributivo'
    };

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
    
    // Mapear TODOS los campos posibles para updates
    if (updates.empresaId !== undefined) supabaseData.company_id = updates.empresaId;
    if (updates.cedula !== undefined) supabaseData.cedula = updates.cedula;
    if (updates.tipoDocumento !== undefined) supabaseData.tipo_documento = updates.tipoDocumento;
    if (updates.nombre !== undefined) supabaseData.nombre = updates.nombre;
    if (updates.segundoNombre !== undefined) supabaseData.segundo_nombre = updates.segundoNombre;
    if (updates.apellido !== undefined) supabaseData.apellido = updates.apellido;
    if (updates.email !== undefined) supabaseData.email = updates.email;
    if (updates.telefono !== undefined) supabaseData.telefono = updates.telefono;
    if (updates.salarioBase !== undefined) supabaseData.salario_base = updates.salarioBase;
    if (updates.tipoContrato !== undefined) supabaseData.tipo_contrato = updates.tipoContrato;
    if (updates.fechaIngreso !== undefined) supabaseData.fecha_ingreso = updates.fechaIngreso;
    if (updates.estado !== undefined) supabaseData.estado = updates.estado;
    if (updates.eps !== undefined) supabaseData.eps = updates.eps;
    if (updates.afp !== undefined) supabaseData.afp = updates.afp;
    if (updates.arl !== undefined) supabaseData.arl = updates.arl;
    if (updates.cajaCompensacion !== undefined) supabaseData.caja_compensacion = updates.cajaCompensacion;
    if (updates.cargo !== undefined) supabaseData.cargo = updates.cargo;
    if (updates.estadoAfiliacion !== undefined) supabaseData.estado_afiliacion = updates.estadoAfiliacion;
    if (updates.nivelRiesgoARL !== undefined) supabaseData.nivel_riesgo_arl = updates.nivelRiesgoARL;

    // Campos bancarios
    if (updates.banco !== undefined) supabaseData.banco = updates.banco;
    if (updates.tipoCuenta !== undefined) supabaseData.tipo_cuenta = updates.tipoCuenta;
    if (updates.numeroCuenta !== undefined) supabaseData.numero_cuenta = updates.numeroCuenta;
    if (updates.titularCuenta !== undefined) supabaseData.titular_cuenta = updates.titularCuenta;

    // Campos de tipos de cotizante
    if (updates.tipoCotizanteId !== undefined) supabaseData.tipo_cotizante_id = updates.tipoCotizanteId;
    if (updates.subtipoCotizanteId !== undefined) supabaseData.subtipo_cotizante_id = updates.subtipoCotizanteId;

    // Campos de información personal extendida
    if (updates.sexo !== undefined) supabaseData.sexo = updates.sexo;
    if (updates.fechaNacimiento !== undefined) supabaseData.fecha_nacimiento = updates.fechaNacimiento;
    if (updates.direccion !== undefined) supabaseData.direccion = updates.direccion;
    if (updates.ciudad !== undefined) supabaseData.ciudad = updates.ciudad;
    if (updates.departamento !== undefined) supabaseData.departamento = updates.departamento;

    // Campos laborales extendidos
    if (updates.periodicidadPago !== undefined) supabaseData.periodicidad_pago = updates.periodicidadPago;
    if (updates.codigoCIIU !== undefined) supabaseData.codigo_ciiu = updates.codigoCIIU;
    if (updates.centroCostos !== undefined) supabaseData.centro_costos = updates.centroCostos;

    // Detalles del contrato
    if (updates.fechaFirmaContrato !== undefined) supabaseData.fecha_firma_contrato = updates.fechaFirmaContrato;
    if (updates.fechaFinalizacionContrato !== undefined) supabaseData.fecha_finalizacion_contrato = updates.fechaFinalizacionContrato;
    if (updates.tipoJornada !== undefined) supabaseData.tipo_jornada = updates.tipoJornada;
    if (updates.diasTrabajo !== undefined) supabaseData.dias_trabajo = updates.diasTrabajo;
    if (updates.horasTrabajo !== undefined) supabaseData.horas_trabajo = updates.horasTrabajo;
    if (updates.beneficiosExtralegales !== undefined) supabaseData.beneficios_extralegales = updates.beneficiosExtralegales;
    if (updates.clausulasEspeciales !== undefined) supabaseData.clausulas_especiales = updates.clausulasEspeciales;
    if (updates.formaPago !== undefined) supabaseData.forma_pago = updates.formaPago;
    if (updates.regimenSalud !== undefined) supabaseData.regimen_salud = updates.regimenSalud;

    console.log('✅ Mapped update data to:', supabaseData);
    return supabaseData;
  }
}
