
import { supabase } from '@/integrations/supabase/client';

export async function ensureUserHasCompanyRole(userId: string, companyId: string): Promise<boolean> {
  try {
    console.log('🔧 Checking roles for user:', userId, 'company:', companyId);
    
    // Verificar si el usuario ya tiene un rol en esta empresa
    const { data: existingRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (rolesError) {
      console.error('❌ Error checking existing roles:', rolesError);
      return false;
    }

    console.log('📋 Existing roles:', existingRoles);

    // Si no tiene roles, asignar rol de administrador
    if (!existingRoles || existingRoles.length === 0) {
      console.log('🔧 No roles found, assigning admin role...');
      
      const { error: assignError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'administrador',
          company_id: companyId,
          assigned_by: userId
        });

      if (assignError) {
        console.error('❌ Error assigning admin role:', assignError);
        return false;
      }

      console.log('✅ Admin role assigned successfully');
      return true;
    }

    console.log('✅ User already has roles in company');
    return true;
  } catch (error) {
    console.error('❌ Error in ensureUserHasCompanyRole:', error);
    return false;
  }
}

// Función para verificar si un usuario necesita roles y asignarlos automáticamente
export async function checkAndAssignMissingRoles(userId: string): Promise<boolean> {
  try {
    console.log('🔍 Checking for missing roles for user:', userId);
    
    // Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.company_id) {
      console.log('ℹ️ User has no company assigned, skipping role assignment');
      return true;
    }

    console.log('🏢 User company found:', profile.company_id);

    // Verificar si tiene roles en su empresa
    const { data: existingRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', profile.company_id);

    if (rolesError) {
      console.error('❌ Error checking roles:', rolesError);
      return false;
    }

    console.log('📋 Current user roles:', existingRoles);

    // Si no tiene roles, asignar administrador
    if (!existingRoles || existingRoles.length === 0) {
      console.log('🔧 Assigning missing admin role...');
      return await ensureUserHasCompanyRole(userId, profile.company_id);
    }

    console.log('✅ User already has roles');
    return true;
  } catch (error) {
    console.error('❌ Error in checkAndAssignMissingRoles:', error);
    return false;
  }
}

// Función para forzar la asignación de rol después del registro de empresa
export async function forceAssignAdminRole(userId: string, companyId: string): Promise<boolean> {
  try {
    console.log('🚀 Force assigning admin role for user:', userId, 'company:', companyId);
    
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'administrador',
        company_id: companyId,
        assigned_by: userId
      });

    if (error) {
      // Si ya existe, no es un error crítico
      if (error.code === '23505') { // unique constraint violation
        console.log('ℹ️ Role already exists, continuing...');
        return true;
      }
      console.error('❌ Error force assigning role:', error);
      return false;
    }

    console.log('✅ Admin role force assigned successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in forceAssignAdminRole:', error);
    return false;
  }
}

// Función para ejecutar verificación completa de roles
export async function performCompleteRoleCheck(userId: string): Promise<boolean> {
  try {
    console.log('🔄 Starting complete role check for user:', userId);
    
    // Esperar un momento para que se procesen los triggers de la base de datos
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar y asignar roles si es necesario
    const roleCheckResult = await checkAndAssignMissingRoles(userId);
    
    if (!roleCheckResult) {
      console.error('❌ Role check failed, trying direct assignment...');
      
      // Obtener el perfil del usuario para forzar asignación
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userId)
        .single();
      
      if (profile?.company_id) {
        return await forceAssignAdminRole(userId, profile.company_id);
      }
    }
    
    console.log('✅ Complete role check finished');
    return roleCheckResult;
  } catch (error) {
    console.error('❌ Error in performCompleteRoleCheck:', error);
    return false;
  }
}
