
import { supabase } from '@/integrations/supabase/client';

// Cache simple para evitar llamadas excesivas
const roleCheckCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_DURATION = 15000; // 15 segundos

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
    console.log('🔧 Verificando roles para usuario:', userId);
    
    // Verificar roles existentes
    const { data: existingRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (rolesError) {
      console.error('❌ Error verificando roles:', rolesError);
      setCachedResult(cacheKey, false);
      return false;
    }

    // Si no tiene roles, asignar administrador
    if (!existingRoles || existingRoles.length === 0) {
      console.log('🔧 Asignando rol de administrador...');
      
      const { error: assignError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'administrador',
          company_id: companyId,
          assigned_by: userId
        });

      if (assignError) {
        console.error('❌ Error asignando rol:', assignError);
        setCachedResult(cacheKey, false);
        return false;
      }

      console.log('✅ Rol de administrador asignado');
      setCachedResult(cacheKey, true);
      return true;
    }

    console.log('✅ Usuario ya tiene roles');
    setCachedResult(cacheKey, true);
    return true;
  } catch (error) {
    console.error('❌ Error en ensureUserHasCompanyRole:', error);
    setCachedResult(cacheKey, false);
    return false;
  }
}

export async function performCompleteRoleCheck(userId: string): Promise<boolean> {
  const cacheKey = `complete-${userId}`;
  const cached = getCachedResult(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    console.log('🔄 Verificación completa de roles para:', userId);
    
    // Obtener perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', userId)
      .single();

    if (!profile?.company_id) {
      console.log('ℹ️ Usuario sin empresa asignada');
      setCachedResult(cacheKey, true);
      return true;
    }

    // Verificar y asignar roles
    const result = await ensureUserHasCompanyRole(userId, profile.company_id);
    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('❌ Error en verificación completa:', error);
    setCachedResult(cacheKey, false);
    return false;
  }
}

// Función para forzar asignación de rol de administrador
export async function forceAssignAdminRole(userId: string, companyId: string): Promise<boolean> {
  try {
    console.log('🔧 Forzando asignación de rol administrador:', userId, companyId);
    
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'administrador',
        company_id: companyId,
        assigned_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error forzando rol:', error);
      return false;
    }

    console.log('✅ Rol administrador forzado exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error en forceAssignAdminRole:', error);
    return false;
  }
}

// Función para verificar si un usuario es de soporte
export async function isUserSupport(userId: string): Promise<boolean> {
  const cacheKey = `support-${userId}`;
  const cached = getCachedResult(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'soporte')
      .limit(1);

    if (error) {
      console.error('❌ Error verificando rol de soporte:', error);
      setCachedResult(cacheKey, false);
      return false;
    }

    const isSupport = data && data.length > 0;
    setCachedResult(cacheKey, isSupport);
    return isSupport;
  } catch (error) {
    console.error('❌ Error en isUserSupport:', error);
    setCachedResult(cacheKey, false);
    return false;
  }
}

// Función para obtener empresas de soporte
export async function getSupportCompanies(userId: string): Promise<any[]> {
  try {
    console.log('🔍 Obteniendo empresas de soporte para:', userId);
    
    // Verificar si es usuario de soporte
    const isSupport = await isUserSupport(userId);
    if (!isSupport) {
      console.log('❌ Usuario no tiene rol de soporte');
      return [];
    }

    // Obtener todas las empresas donde tiene rol de soporte
    const { data: supportRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('company_id')
      .eq('user_id', userId)
      .eq('role', 'soporte');

    if (rolesError) {
      console.error('❌ Error obteniendo roles de soporte:', rolesError);
      return [];
    }

    if (!supportRoles || supportRoles.length === 0) {
      console.log('ℹ️ No se encontraron empresas de soporte');
      return [];
    }

    const companyIds = supportRoles.map(role => role.company_id);

    // Obtener información de las empresas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .in('id', companyIds);

    if (companiesError) {
      console.error('❌ Error obteniendo empresas:', companiesError);
      return [];
    }

    console.log('✅ Empresas de soporte obtenidas:', companies?.length || 0);
    return companies || [];
  } catch (error) {
    console.error('❌ Error en getSupportCompanies:', error);
    return [];
  }
}

// Limpiar cache cuando sea necesario
export function clearRoleCache(): void {
  roleCheckCache.clear();
  console.log('🗑️ Cache de roles limpiado');
}
