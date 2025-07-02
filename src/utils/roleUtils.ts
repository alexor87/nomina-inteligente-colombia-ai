
import { supabase } from '@/integrations/supabase/client';

// Cache for role checks to prevent excessive calls
const roleCheckCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

function getCachedResult(key: string): boolean | null {
  const cached = roleCheckCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.result;
  }
  return null;
}

function setCachedResult(key: string, result: boolean): void {
  roleCheckCache.set(key, { result, timestamp: Date.now() });
}

export async function ensureUserHasCompanyRole(userId: string, companyId: string): Promise<boolean> {
  const cacheKey = `ensure-${userId}-${companyId}`;
  const cached = getCachedResult(cacheKey);
  if (cached !== null) {
    return cached;
  }

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
      setCachedResult(cacheKey, false);
      return false;
    }

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
        setCachedResult(cacheKey, false);
        return false;
      }

      console.log('✅ Admin role assigned successfully');
      setCachedResult(cacheKey, true);
      return true;
    }

    console.log('✅ User already has roles in company');
    setCachedResult(cacheKey, true);
    return true;
  } catch (error) {
    console.error('❌ Error in ensureUserHasCompanyRole:', error);
    setCachedResult(cacheKey, false);
    return false;
  }
}

export async function hasRoleInCompany(userId: string, role: 'administrador' | 'rrhh' | 'contador' | 'visualizador' | 'soporte', companyId: string): Promise<boolean> {
  const cacheKey = `hasRole-${userId}-${role}-${companyId}`;
  const cached = getCachedResult(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role)
      .eq('company_id', companyId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking role:', error);
      setCachedResult(cacheKey, false);
      return false;
    }

    const result = !!data;
    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error in hasRoleInCompany:', error);
    setCachedResult(cacheKey, false);
    return false;
  }
}

export async function getUserCompanies(userId: string): Promise<Array<{company_id: string, role_name: string}>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('company_id, role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting user companies:', error);
      return [];
    }

    return data.map(row => ({
      company_id: row.company_id,
      role_name: row.role
    }));
  } catch (error) {
    console.error('Error in getUserCompanies:', error);
    return [];
  }
}

export async function isUserSupport(userId: string): Promise<boolean> {
  const cacheKey = `isSupport-${userId}`;
  const cached = getCachedResult(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'soporte')
      .limit(1);

    if (error) {
      console.error('Error checking support role:', error);
      setCachedResult(cacheKey, false);
      return false;
    }

    const result = data && data.length > 0;
    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error in isUserSupport:', error);
    setCachedResult(cacheKey, false);
    return false;
  }
}

export async function getSupportCompanies(userId: string): Promise<Array<{id: string, razon_social: string}>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        company_id,
        companies:company_id (
          id,
          razon_social,
          nit,
          email,
          estado
        )
      `)
      .eq('user_id', userId)
      .eq('role', 'soporte');

    if (error) {
      console.error('Error getting support companies:', error);
      return [];
    }

    return data
      .filter(row => row.companies)
      .map(row => ({
        id: row.companies.id,
        razon_social: row.companies.razon_social,
        nit: row.companies.nit,
        email: row.companies.email,
        estado: row.companies.estado
      }));
  } catch (error) {
    console.error('Error in getSupportCompanies:', error);
    return [];
  }
}

export async function checkAndAssignMissingRoles(userId: string): Promise<boolean> {
  const cacheKey = `checkAssign-${userId}`;
  const cached = getCachedResult(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    console.log('🔍 Checking for missing roles for user:', userId);
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.company_id) {
      console.log('ℹ️ User has no company assigned, skipping role assignment');
      setCachedResult(cacheKey, true);
      return true;
    }

    console.log('🏢 User company found:', profile.company_id);

    // Check if user has roles in their company
    const { data: existingRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', profile.company_id);

    if (rolesError) {
      console.error('❌ Error checking roles:', rolesError);
      setCachedResult(cacheKey, false);
      return false;
    }

    console.log('📋 Current user roles:', existingRoles);

    // If no roles, assign admin
    if (!existingRoles || existingRoles.length === 0) {
      console.log('🔧 Assigning missing admin role...');
      const result = await ensureUserHasCompanyRole(userId, profile.company_id);
      setCachedResult(cacheKey, result);
      return result;
    }

    console.log('✅ User already has roles');
    setCachedResult(cacheKey, true);
    return true;
  } catch (error) {
    console.error('❌ Error in checkAndAssignMissingRoles:', error);
    setCachedResult(cacheKey, false);
    return false;
  }
}

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
      if (error.code === '23505') {
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

// Optimized version with reduced delay and better error handling
export async function performCompleteRoleCheck(userId: string): Promise<boolean> {
  const cacheKey = `completeCheck-${userId}`;
  const cached = getCachedResult(cacheKey);
  if (cached !== null) {
    console.log('✅ Using cached role check result');
    return cached;
  }

  try {
    console.log('🔄 Starting complete role check for user:', userId);
    
    // Reduced delay - only wait if absolutely necessary
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const roleCheckResult = await checkAndAssignMissingRoles(userId);
    
    if (!roleCheckResult) {
      console.error('❌ Role check failed, trying direct assignment...');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userId)
        .single();
      
      if (profile?.company_id) {
        const result = await forceAssignAdminRole(userId, profile.company_id);
        setCachedResult(cacheKey, result);
        return result;
      }
    }
    
    console.log('✅ Complete role check finished');
    setCachedResult(cacheKey, roleCheckResult);
    return roleCheckResult;
  } catch (error) {
    console.error('❌ Error in performCompleteRoleCheck:', error);
    setCachedResult(cacheKey, false);
    return false;
  }
}

// Function to clear cache when needed
export function clearRoleCache(): void {
  roleCheckCache.clear();
  console.log('🗑️ Role cache cleared');
}
