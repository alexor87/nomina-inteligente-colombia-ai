import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types';
import { EmployeeDataService } from './EmployeeDataService';

interface EmployeeDataWithBanking extends Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> {
  segundoNombre?: string;
  banco?: string;
  tipoCuenta?: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
}

export class EmployeeService {
  static async create(employeeData: EmployeeDataWithBanking) {
    console.log('🚀 EmployeeService.create called with:', employeeData);
    
    // Obtener la empresa del usuario autenticado
    const companyId = await EmployeeDataService.getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('No se encontró la empresa del usuario. Asegúrate de estar autenticado.');
    }

    // Verificar si ya existe un empleado con la misma cédula en la empresa
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id, cedula, nombre, apellido')
      .eq('company_id', companyId)
      .eq('cedula', String(employeeData.cedula || '').trim())
      .single();

    if (existingEmployee) {
      throw new Error(`Ya existe un empleado con la cédula ${employeeData.cedula} en esta empresa: ${existingEmployee.nombre} ${existingEmployee.apellido}`);
    }

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

    console.log('📊 Creando empleado para empresa:', companyId);
    console.log('📋 Datos limpiados a insertar:', cleanedData);

    try {
      const { data, error } = await supabase
        .from('employees')
        .insert(cleanedData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error detallado de Supabase:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        console.error('📋 Datos que causaron el error:', cleanedData);
        
        // Manejar errores específicos de duplicación
        if (error.code === '23505' && error.message.includes('employees_company_id_cedula_key')) {
          throw new Error(`Ya existe un empleado con la cédula ${cleanedData.cedula} en esta empresa`);
        }
        
        throw new Error(`Error al crear empleado: ${error.message}`);
      }

      console.log('✅ Empleado creado exitosamente:', data);
      return data;
    } catch (err: any) {
      console.error('❌ Error durante la inserción:', err);
      throw err;
    }
  }

  static async update(id: string, updates: Partial<Employee & { segundoNombre?: string; tipoCotizanteId?: string; subtipoCotizanteId?: string }>) {
    const supabaseData: any = {};
    
    if (updates.cedula !== undefined) supabaseData.cedula = updates.cedula;
    if (updates.tipoDocumento !== undefined) supabaseData.tipo_documento = updates.tipoDocumento;
    if (updates.nombre !== undefined) supabaseData.nombre = updates.nombre;
    if ((updates as any).segundoNombre !== undefined) supabaseData.segundo_nombre = (updates as any).segundoNombre;
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
    if ((updates as any).banco !== undefined) supabaseData.banco = (updates as any).banco;
    if ((updates as any).tipoCuenta !== undefined) supabaseData.tipo_cuenta = (updates as any).tipoCuenta;
    if ((updates as any).numeroCuenta !== undefined) supabaseData.numero_cuenta = (updates as any).numeroCuenta;
    if ((updates as any).titularCuenta !== undefined) supabaseData.titular_cuenta = (updates as any).titularCuenta;

    // Manejar campos de tipos de cotizante
    if ((updates as any).tipoCotizanteId !== undefined) supabaseData.tipo_cotizante_id = (updates as any).tipoCotizanteId;
    if ((updates as any).subtipoCotizanteId !== undefined) supabaseData.subtipo_cotizante_id = (updates as any).subtipoCotizanteId;

    const { error } = await supabase
      .from('employees')
      .update(supabaseData)
      .eq('id', id);

    if (error) throw error;
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async changeStatus(id: string, newStatus: string) {
    const { error } = await supabase
      .from('employees')
      .update({ estado: newStatus })
      .eq('id', id);

    if (error) throw error;
  }

  static async updateCentroCosto(id: string, centroCosto: string) {
    const { error } = await supabase
      .from('employees')
      .update({ centro_costo: centroCosto } as any)
      .eq('id', id);

    if (error) throw error;
  }

  static async updateNivelRiesgoARL(id: string, nivelRiesgo: 'I' | 'II' | 'III' | 'IV' | 'V') {
    const { error } = await supabase
      .from('employees')
      .update({ nivel_riesgo_arl: nivelRiesgo } as any)
      .eq('id', id);

    if (error) throw error;
  }
}
