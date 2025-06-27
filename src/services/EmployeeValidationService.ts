
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

    // Limpiar y validar datos antes de insertar INCLUYENDO SEGUNDO NOMBRE, CAMPOS BANCARIOS Y TIPOS DE COTIZANTE
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
      // AGREGAR CAMPOS BANCARIOS
      banco: employeeData.banco ? String(employeeData.banco).trim() : null,
      tipo_cuenta: employeeData.tipoCuenta || 'ahorros',
      numero_cuenta: employeeData.numeroCuenta ? String(employeeData.numeroCuenta).trim() : null,
      titular_cuenta: employeeData.titularCuenta ? String(employeeData.titularCuenta).trim() : null,
      // AGREGAR CAMPOS DE TIPOS DE COTIZANTE
      tipo_cotizante_id: employeeData.tipoCotizanteId || null,
      subtipo_cotizante_id: employeeData.subtipoCotizanteId || null
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
    
    // Mapear empresaId a company_id para actualizaciones
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

    // Manejar campos bancarios en updates también
    if (updates.banco !== undefined) supabaseData.banco = updates.banco;
    if (updates.tipoCuenta !== undefined) supabaseData.tipo_cuenta = updates.tipoCuenta;
    if (updates.numeroCuenta !== undefined) supabaseData.numero_cuenta = updates.numeroCuenta;
    if (updates.titularCuenta !== undefined) supabaseData.titular_cuenta = updates.titularCuenta;

    // Manejar campos de tipos de cotizante
    if (updates.tipoCotizanteId !== undefined) supabaseData.tipo_cotizante_id = updates.tipoCotizanteId;
    if (updates.subtipoCotizanteId !== undefined) supabaseData.subtipo_cotizante_id = updates.subtipoCotizanteId;

    console.log('✅ Mapped update data to:', supabaseData);
    return supabaseData;
  }
}
