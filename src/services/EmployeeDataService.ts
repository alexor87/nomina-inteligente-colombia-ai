import { supabase } from '@/integrations/supabase/client';
import { EmployeeWithStatus } from '@/types/employee-extended';

export class EmployeeDataService {
  static async getEmployees(): Promise<EmployeeWithStatus[]> {
    try {
      // Obtener el usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user:', userError);
        return [];
      }

      // Verificar si es superadmin
      const { data: isSuperAdminData } = await supabase.rpc('is_superadmin', {
        _user_id: user.id
      });

      const isSuperAdmin = !!isSuperAdminData;

      let query = supabase.from('employees').select('*');

      // Si no es superadmin, filtrar por empresas accesibles
      if (!isSuperAdmin) {
        const { data: userCompanies } = await supabase.rpc('get_user_companies', {
          _user_id: user.id
        });

        if (!userCompanies || userCompanies.length === 0) {
          console.warn('User has no accessible companies');
          return [];
        }

        const companyIds = userCompanies.map((uc: any) => uc.company_id);
        query = query.in('company_id', companyIds);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
        return [];
      }

      return this.transformEmployeeData(data || []);
    } catch (error) {
      console.error('Error in getEmployees:', error);
      return [];
    }
  }

  static async loadEmployees(): Promise<EmployeeWithStatus[]> {
    return this.getEmployees();
  }

  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user:', userError);
        return null;
      }

      // Verificar si es superadmin (puede acceder a cualquier empresa)
      const { data: isSuperAdminData } = await supabase.rpc('is_superadmin', {
        _user_id: user.id
      });

      if (isSuperAdminData) {
        // Para superadmin, obtener la primera empresa disponible o usar el perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.company_id) {
          return profile.company_id;
        }

        // Si no tiene empresa en el perfil, obtener la primera empresa disponible
        const { data: firstCompany } = await supabase
          .from('companies')
          .select('id')
          .limit(1)
          .maybeSingle();

        return firstCompany?.id || null;
      }

      // Para usuarios normales, obtener su empresa actual del perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting user company:', error);
      return null;
    }
  }

  static transformEmployeeData(employees: any[]): EmployeeWithStatus[] {
    return employees.map(emp => ({
      id: emp.id,
      cedula: emp.cedula,
      tipoDocumento: (emp.tipo_documento || 'CC') as 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT',
      nombre: emp.nombre,
      apellido: emp.apellido,
      email: emp.email,
      telefono: emp.telefono,
      salarioBase: emp.salario_base,
      tipoContrato: (emp.tipo_contrato || 'indefinido') as 'indefinido' | 'fijo' | 'obra' | 'aprendizaje',
      fechaIngreso: emp.fecha_ingreso,
      estado: (emp.estado || 'activo') as 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad',
      eps: emp.eps,
      afp: emp.afp,
      arl: emp.arl,
      cajaCompensacion: emp.caja_compensacion,
      cargo: emp.cargo,
      empresaId: emp.company_id,
      estadoAfiliacion: (emp.estado_afiliacion || 'pendiente') as 'completa' | 'pendiente' | 'inconsistente',
      banco: emp.banco,
      tipoCuenta: emp.tipo_cuenta as 'ahorros' | 'corriente',
      numeroCuenta: emp.numero_cuenta,
      titularCuenta: emp.titular_cuenta,
      createdAt: emp.created_at,
      updatedAt: emp.updated_at,
      payrollStatus: 'al_dia',
      alertCount: 0,
      ultimoProcesamientoNomina: '2024-12-01',
      proximoVencimientoContrato: null,
      diasDesdeUltimaRevision: 5,
      usuarioUltimaModificacion: 'Sistema'
    }));
  }

  static async searchEmployees(searchTerm: string): Promise<EmployeeWithStatus[]> {
    try {
      const employees = await this.getEmployees();
      
      return employees.filter(emp => 
        emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.cedula.includes(searchTerm) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error in searchEmployees:', error);
      return [];
    }
  }

  static async getEmployeeById(id: string): Promise<EmployeeWithStatus | null> {
    try {
      const employees = await this.getEmployees();
      return employees.find(emp => emp.id === id) || null;
    } catch (error) {
      console.error('Error in getEmployeeById:', error);
      return null;
    }
  }
}
