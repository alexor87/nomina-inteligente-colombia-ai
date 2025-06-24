import { supabase } from '@/integrations/supabase/client';
import { EmployeeWithStatus } from '@/types/employee-extended';

export class EmployeeDataService {
  static async getEmployees(): Promise<EmployeeWithStatus[]> {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) return [];

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }

    return data?.map(emp => ({
      id: emp.id,
      cedula: emp.cedula,
      tipoDocumento: emp.tipo_documento || 'CC',
      nombre: emp.nombre,
      apellido: emp.apellido,
      email: emp.email,
      telefono: emp.telefono,
      salarioBase: emp.salario_base,
      tipoContrato: emp.tipo_contrato,
      fechaIngreso: emp.fecha_ingreso,
      estado: emp.estado,
      eps: emp.eps,
      afp: emp.afp,
      arl: emp.arl,
      cajaCompensacion: emp.caja_compensacion,
      cargo: emp.cargo,
      empresaId: emp.company_id,
      estadoAfiliacion: emp.estado_afiliacion || 'pendiente',
      createdAt: emp.created_at,
      updatedAt: emp.updated_at,
      // Status fields
      payrollStatus: 'al_dia',
      alertCount: 0,
      ultimoProcesamientoNomina: '2024-12-01',
      proximoVencimientoContrato: null,
      diasDesdeUltimaRevision: 5,
      usuarioUltimaModificacion: 'Sistema'
    })) || [];
  }

  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting user company:', error);
      return null;
    }
  }

  static async searchEmployees(searchTerm: string): Promise<EmployeeWithStatus[]> {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) return [];

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,cedula.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching employees:', error);
      throw error;
    }

    return data?.map(emp => ({
      id: emp.id,
      cedula: emp.cedula,
      tipoDocumento: emp.tipo_documento || 'CC',
      nombre: emp.nombre,
      apellido: emp.apellido,
      email: emp.email,
      telefono: emp.telefono,
      salarioBase: emp.salario_base,
      tipoContrato: emp.tipo_contrato,
      fechaIngreso: emp.fecha_ingreso,
      estado: emp.estado,
      eps: emp.eps,
      afp: emp.afp,
      arl: emp.arl,
      cajaCompensacion: emp.caja_compensacion,
      cargo: emp.cargo,
      empresaId: emp.company_id,
      estadoAfiliacion: emp.estado_afiliacion || 'pendiente',
      createdAt: emp.created_at,
      updatedAt: emp.updated_at,
      // Status fields
      payrollStatus: 'al_dia',
      alertCount: 0,
      ultimoProcesamientoNomina: '2024-12-01',
      proximoVencimientoContrato: null,
      diasDesdeUltimaRevision: 5,
      usuarioUltimaModificacion: 'Sistema'
    })) || [];
  }

  static async getEmployeeById(id: string): Promise<EmployeeWithStatus | null> {
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) return null;

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      console.error('Error fetching employee:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      cedula: data.cedula,
      tipoDocumento: data.tipo_documento || 'CC',
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono,
      salarioBase: data.salario_base,
      tipoContrato: data.tipo_contrato,
      fechaIngreso: data.fecha_ingreso,
      estado: data.estado,
      eps: data.eps,
      afp: data.afp,
      arl: data.arl,
      cajaCompensacion: data.caja_compensacion,
      cargo: data.cargo,
      empresaId: data.company_id,
      estadoAfiliacion: data.estado_afiliacion || 'pendiente',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      // Status fields
      payrollStatus: 'al_dia',
      alertCount: 0,
      ultimoProcesamientoNomina: '2024-12-01',
      proximoVencimientoContrato: null,
      diasDesdeUltimaRevision: 5,
      usuarioUltimaModificacion: 'Sistema'
    };
  }
}
