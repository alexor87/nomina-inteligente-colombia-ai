
import { supabase } from '@/integrations/supabase/client';

export async function ensureUserHasCompanyRole(userId: string, companyId: string) {
  try {
    // Verificar si el usuario ya tiene un rol en esta empresa
    const { data: existingRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (rolesError) {
      console.error('Error checking existing roles:', rolesError);
      return false;
    }

    // Si no tiene roles, asignar rol de administrador
    if (!existingRoles || existingRoles.length === 0) {
      console.log('🔧 Assigning admin role to user for company...');
      
      const { error: assignError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'administrador',
          company_id: companyId,
          assigned_by: userId
        });

      if (assignError) {
        console.error('Error assigning admin role:', assignError);
        return false;
      }

      console.log('✅ Admin role assigned successfully');
      return true;
    }

    return true;
  } catch (error) {
    console.error('Error in ensureUserHasCompanyRole:', error);
    return false;
  }
}
