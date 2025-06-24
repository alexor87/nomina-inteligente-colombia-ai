import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types';
import { EmployeeDataService } from './EmployeeDataService';

export class EmployeeService {
  static async create(employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) {
    // Obtener la empresa del usuario autenticado
    const companyId = await EmployeeDataService.getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('No se encontró la empresa del usuario. Asegúrate de estar autenticado.');
    }

    // Mapear los datos del Employee interface a las columnas de la base de datos
    const supabaseData = {
      company_id: companyId,
      cedula: employeeData.cedula,
      tipo_documento: employeeData.tipoDocumento,
      nombre: employeeData.nombre,
      apellido: employeeData.apellido,
      email: employeeData.email || null,
      telefono: employeeData.telefono || null,
      salario_base: employeeData.salarioBase,
      tipo_contrato: employeeData.tipoContrato,
      fecha_ingreso: employeeData.fechaIngreso,
      estado: employeeData.estado,
      eps: employeeData.eps || null,
      afp: employeeData.afp || null,
      arl: employeeData.arl || null,
      caja_compensacion: employeeData.cajaCompensacion || null,
      cargo: employeeData.cargo || null,
      estado_afiliacion: employeeData.estadoAfiliacion,
      banco: (employeeData as any).banco || null,
      tipo_cuenta: (employeeData as any).tipoCuenta || 'ahorros',
      numero_cuenta: (employeeData as any).numeroCuenta || null,
      titular_cuenta: (employeeData as any).titularCuenta || null
    };

    console.log('Creando empleado para empresa:', companyId);
    console.log('Datos a insertar:', supabaseData);

    const { data, error } = await supabase
      .from('employees')
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      console.error('Error en Supabase:', error);
      throw error;
    }
    return data;
  }

  static async update(id: string, updates: Partial<Employee>) {
    const supabaseData: any = {};
    
    if (updates.cedula !== undefined) supabaseData.cedula = updates.cedula;
    if (updates.tipoDocumento !== undefined) supabaseData.tipo_documento = updates.tipoDocumento;
    if (updates.nombre !== undefined) supabaseData.nombre = updates.nombre;
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

    if ((updates as any).banco !== undefined) supabaseData.banco = (updates as any).banco;
    if ((updates as any).tipoCuenta !== undefined) supabaseData.tipo_cuenta = (updates as any).tipoCuenta;
    if ((updates as any).numeroCuenta !== undefined) supabaseData.numero_cuenta = (updates as any).numeroCuenta;
    if ((updates as any).titularCuenta !== undefined) supabaseData.titular_cuenta = (updates as any).titularCuenta;

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
