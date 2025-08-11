
import { supabase } from '@/integrations/supabase/client';

/**
 * Servicio para auto-asignación de roles de administrador
 * Implementa el principio KISS para resolver "Sin acceso a módulos"
 */
export class AutoRoleAssignmentService {
  
  /**
   * Intenta auto-asignar rol de administrador si el usuario no tiene roles
   */
  static async attemptAutoAdminAssignment(): Promise<boolean> {
    try {
      console.log('🔧 Intentando auto-asignación de rol administrador...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No hay usuario autenticado');
        return false;
      }

      // Verificar si ya tiene roles
      const { data: existingRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (rolesError) {
        console.error('❌ Error verificando roles existentes:', rolesError);
        return false;
      }

      if (existingRoles && existingRoles.length > 0) {
        console.log('✅ Usuario ya tiene roles asignados');
        return true;
      }

      // Obtener company_id del perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        console.log('⚠️ Usuario sin empresa asignada, no se puede auto-asignar rol');
        return false;
      }

      console.log('🏢 Company ID encontrada:', profile.company_id);

      // Auto-asignar rol de administrador
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'administrador',
          company_id: profile.company_id,
          assigned_by: user.id
        });

      if (insertError) {
        console.error('❌ Error auto-asignando rol:', insertError);
        return false;
      }

      console.log('✅ Rol de administrador auto-asignado exitosamente');
      return true;
      
    } catch (error) {
      console.error('❌ Error en auto-asignación de rol:', error);
      return false;
    }
  }
}
