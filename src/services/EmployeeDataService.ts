
import { supabase } from '@/integrations/supabase/client';

export class EmployeeDataService {
  static async getCurrentUserCompanyId(): Promise<string | null> {
    console.log('🔍 Getting current user company ID...');
    
    try {
      // Usar la función SECURITY DEFINER para obtener el company_id
      const { data, error } = await supabase
        .rpc('get_current_user_company_id');

      if (error) {
        console.error('❌ Error calling get_current_user_company_id function:', error);
        throw new Error('Error al obtener empresa del usuario');
      }

      if (!data) {
        console.error('❌ No company found for current user');
        throw new Error('Usuario no tiene empresa asignada');
      }

      console.log('🏢 User company ID:', data);
      return data;

    } catch (error) {
      console.error('❌ Error in getCurrentUserCompanyId:', error);
      throw error;
    }
  }

  static async getEmployees(companyId: string) {
    console.log('📋 Getting employees for company:', companyId);
    
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          id,
          company_id,
          cedula,
          tipo_documento,
          nombre,
          segundo_nombre,
          apellido,
          email,
          telefono,
          salario_base,
          tipo_contrato,
          fecha_ingreso,
          estado,
          eps,
          afp,
          arl,
          caja_compensacion,
          cargo,
          estado_afiliacion,
          nivel_riesgo_arl,
          banco,
          tipo_cuenta,
          numero_cuenta,
          titular_cuenta,
          tipo_cotizante_id,
          subtipo_cotizante_id,
          sexo,
          fecha_nacimiento,
          direccion,
          ciudad,
          departamento,
          periodicidad_pago,
          codigo_ciiu,
          centro_costos,
          fecha_firma_contrato,
          fecha_finalizacion_contrato,
          tipo_jornada,
          dias_trabajo,
          horas_trabajo,
          beneficios_extralegales,
          clausulas_especiales,
          forma_pago,
          regimen_salud,
          created_at,
          updated_at
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching employees:', error);
        throw error;
      }

      console.log('✅ Employees fetched with all fields:', data?.length || 0);
      console.log('📊 Sample employee data:', data?.[0]);
      return data || [];
    } catch (error) {
      console.error('❌ Error in getEmployees:', error);
      throw error;
    }
  }
}
