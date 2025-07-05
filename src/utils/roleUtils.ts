
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

// Limpiar cache cuando sea necesario
export function clearRoleCache(): void {
  roleCheckCache.clear();
  console.log('🗑️ Cache de roles limpiado');
}
