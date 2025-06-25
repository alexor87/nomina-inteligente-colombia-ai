
import { supabase } from '@/integrations/supabase/client';

export class EmployeeDataService {
  static async getCurrentUserCompanyId(): Promise<string | null> {
    console.log('🔍 Getting current user company ID...');
    
    try {
      // Obtener el usuario autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ Error getting user:', userError);
        throw new Error('Error al obtener usuario autenticado');
      }

      if (!user) {
        console.error('❌ No authenticated user found');
        throw new Error('Usuario no autenticado');
      }

      console.log('👤 Current user ID:', user.id);

      // Obtener el perfil del usuario con su company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Error getting user profile:', profileError);
        throw new Error('Error al obtener perfil del usuario');
      }

      if (!profile?.company_id) {
        console.error('❌ No company assigned to user profile');
        throw new Error('Usuario no tiene empresa asignada');
      }

      console.log('🏢 User company ID:', profile.company_id);
      return profile.company_id;

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
