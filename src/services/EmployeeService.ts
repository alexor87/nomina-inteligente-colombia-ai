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

    const supabaseData = {
      company_id: companyId, // Usar la empresa del usuario autenticado
      cedula: employeeData.cedula,
      nombre: employeeData.nombre,
      apellido: employeeData.apellido,
      email: employeeData.email,
      telefono: employeeData.telefono,
      salario_base: employeeData.salarioBase,
      tipo_contrato: employeeData.tipoContrato,
      fecha_ingreso: employeeData.fechaIngreso,
      estado: employeeData.estado,
      eps: employeeData.eps,
      afp: employeeData.afp,
      arl: employeeData.arl,
      caja_compensacion: employeeData.cajaCompensacion,
      cargo: employeeData.cargo,
      estado_afiliacion: employeeData.estadoAfiliacion,
      centro_costo: null,
      nivel_riesgo_arl: null,
      contrato_vencimiento: null,
      ultima_liquidacion: null
    };

    console.log('Creando empleado para empresa:', companyId);

    const { data, error } = await supabase
      .from('employees')
      .insert([supabaseData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id: string, updates: Partial<Employee>) {
    const supabaseData: any = {};
    
    if (updates.cedula !== undefined) supabaseData.cedula = updates.cedula;
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
