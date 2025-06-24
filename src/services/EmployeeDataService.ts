
import { supabase } from '@/integrations/supabase/client';
import { EmployeeWithStatus } from '@/types/employee-extended';

export class EmployeeDataService {
  static async loadEmployees(): Promise<EmployeeWithStatus[]> {
    // Solo cargar empleados de la empresa del usuario autenticado
    // Las políticas RLS se encargan de filtrar automáticamente
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading employees:', error);
      throw error;
    }

    console.log('Empleados cargados desde la base de datos:', data?.length || 0);

    return (data || []).map(emp => ({
      id: emp.id,
      cedula: emp.cedula,
      nombre: emp.nombre,
      apellido: emp.apellido,
      email: emp.email || '',
      telefono: emp.telefono,
      salarioBase: Number(emp.salario_base),
      tipoContrato: emp.tipo_contrato as 'indefinido' | 'fijo' | 'obra' | 'aprendizaje',
      fechaIngreso: emp.fecha_ingreso,
      estado: emp.estado as 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad',
      eps: emp.eps,
      afp: emp.afp,
      arl: emp.arl,
      cajaCompensacion: emp.caja_compensacion,
      cargo: emp.cargo,
      empresaId: emp.company_id,
      estadoAfiliacion: emp.estado_afiliacion as 'completa' | 'pendiente' | 'inconsistente',
      createdAt: emp.created_at,
      updatedAt: emp.updated_at,
      centrosocial: (emp as any).centro_costo || 'Sin asignar',
      nivelRiesgoARL: (emp as any).nivel_riesgo_arl as 'I' | 'II' | 'III' | 'IV' | 'V' | undefined,
      ultimaLiquidacion: (emp as any).ultima_liquidacion,
      contratoVencimiento: (emp as any).contrato_vencimiento,
      fechaUltimaModificacion: emp.updated_at,
      usuarioUltimaModificacion: 'Sistema'
    }));
  }

  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error || !profile?.company_id) {
        console.error('Error getting user profile or no company assigned:', error);
        return null;
      }

      return profile.company_id;
    } catch (error) {
      console.error('Error getting user company ID:', error);
      return null;
    }
  }
}
