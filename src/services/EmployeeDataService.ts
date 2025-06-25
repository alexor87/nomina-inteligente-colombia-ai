
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
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching employees:', error);
        throw error;
      }

      console.log('✅ Employees fetched:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ Error in getEmployees:', error);
      throw error;
    }
  }
}
