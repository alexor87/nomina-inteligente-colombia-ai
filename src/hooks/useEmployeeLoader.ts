
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeDataService } from '@/services/EmployeeDataService';

/**
 * ✅ HOOK SEGURO PARA CARGA DE EMPLEADOS
 * Con validación de acceso para modo soporte y mejor manejo de errores
 */
export const useEmployeeLoader = (supportCompanyId?: string) => {
  return useQuery({
    queryKey: ['employees', supportCompanyId],
    queryFn: async () => {
      console.log('📋 useEmployeeLoader - Iniciando carga de empleados...');
      
      let targetCompanyId: string;
      
      if (supportCompanyId) {
        console.log('🔍 Modo soporte solicitado para empresa:', supportCompanyId);
        
        // SEGURIDAD: Validar que el usuario tiene acceso a la empresa
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('❌ Usuario no autenticado');
          throw new Error('Usuario no autenticado');
        }
        
        // Usar la función RPC para validar acceso
        const { data: hasAccess, error } = await supabase
          .rpc('user_has_access_to_company', {
            p_user_id: user.id,
            p_company_id: supportCompanyId
          });
        
        if (error) {
          console.error('❌ Error validando acceso:', error);
          throw new Error('Error validando acceso a la empresa');
        }
        
        if (!hasAccess) {
          // Log del intento de acceso no autorizado
          await supabase
            .from('security_audit_log')
            .insert({
              user_id: user.id,
              table_name: 'employees',
              action: 'BLOCKED',
              violation_type: 'unauthorized_company_access',
              query_attempted: `Attempted to access company ${supportCompanyId}`,
              additional_data: {
                requested_company_id: supportCompanyId,
                user_email: user.email
              }
            });
          
          throw new Error('Acceso no autorizado a esta empresa');
        }
        
        targetCompanyId = supportCompanyId;
        console.log('✅ Acceso autorizado a empresa:', targetCompanyId);
      } else {
        // Obtener empresa del usuario actual
        try {
          targetCompanyId = await EmployeeDataService.getCurrentUserCompanyId();
          if (!targetCompanyId) {
            console.error('❌ No se pudo obtener company_id del usuario');
            throw new Error('Tu perfil de usuario no está asociado a ninguna empresa. Contacta al administrador del sistema.');
          }
          console.log('🏢 Company ID del usuario actual:', targetCompanyId);
        } catch (error) {
          console.error('❌ Error obteniendo company_id:', error);
          throw new Error('No se pudo obtener la empresa del usuario. Verifica que tu perfil esté correctamente configurado.');
        }
      }
      
      // Cargar empleados de la empresa validada
      try {
        const employees = await EmployeeDataService.getEmployees(targetCompanyId);
        
        console.log('✅ Empleados cargados exitosamente:', {
          count: employees.length,
          companyId: targetCompanyId
        });
        
        return employees;
      } catch (error) {
        console.error('❌ Error cargando empleados:', error);
        throw new Error('Error al cargar los empleados de la empresa');
      }
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: (failureCount, error) => {
      console.log(`🔄 Retry attempt ${failureCount} for employees query:`, error.message);
      
      // No reintentar para errores de configuración/permisos
      if (error.message.includes('empresa') || 
          error.message.includes('perfil') || 
          error.message.includes('autorizado')) {
        return false;
      }
      
      // Reintentar hasta 2 veces para otros errores
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};
