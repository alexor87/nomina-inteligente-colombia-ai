
import { supabase } from '@/integrations/supabase/client';
import { AutoRoleAssignmentService } from './AutoRoleAssignmentService';

export interface CompanyRegistrationData {
  nit: string;
  razon_social: string;
  email: string;
  telefono?: string;
  direccion?: string;
  plan: 'basico' | 'profesional' | 'empresarial';
}

/**
 * Servicio mejorado para registro de empresas con auto-asignación de roles
 */
export class CompanyRegistrationService {
  
  static async registerCompany(data: CompanyRegistrationData) {
    try {
      console.log('🏢 Iniciando registro de empresa:', data.razon_social);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // 1. Crear empresa
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          nit: data.nit,
          razon_social: data.razon_social,
          email: data.email,
          telefono: data.telefono,
          direccion: data.direccion,
          estado: 'activa',
          plan: data.plan
        })
        .select()
        .single();

      if (companyError) {
        console.error('❌ Error creando empresa:', companyError);
        throw companyError;
      }

      console.log('✅ Empresa creada:', company.id);

      // 2. Actualizar perfil del usuario con la empresa
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          company_id: company.id,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('❌ Error actualizando perfil:', profileError);
        throw profileError;
      }

      console.log('✅ Perfil actualizado con company_id:', company.id);

      // 3. Crear configuración inicial de la empresa
      const { error: settingsError } = await supabase
        .from('company_settings')
        .insert({
          company_id: company.id,
          periodicity: 'mensual',
          created_at: new Date().toISOString()
        });

      if (settingsError) {
        console.error('⚠️ Error creando configuración empresa:', settingsError);
        // No es crítico, continuamos
      }

      // 4. Crear suscripción inicial
      const { error: subscriptionError } = await supabase
        .from('company_subscriptions')
        .insert({
          company_id: company.id,
          plan_type: data.plan,
          status: 'trial',
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
          max_employees: data.plan === 'basico' ? 10 : data.plan === 'profesional' ? 25 : 100,
          max_payrolls_per_month: 12,
          created_at: new Date().toISOString()
        });

      if (subscriptionError) {
        console.error('⚠️ Error creando suscripción:', subscriptionError);
        // No es crítico, continuamos
      }

      // 5. AUTO-ASIGNACIÓN CRÍTICA: Asignar rol de administrador
      console.log('🔧 Intentando auto-asignación de rol administrador...');
      
      // Esperar un poco para que se propague la actualización del perfil
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const roleAssigned = await AutoRoleAssignmentService.attemptAutoAdminAssignment();
      
      if (!roleAssigned) {
        console.warn('⚠️ Auto-asignación de rol falló, intentando método directo...');
        
        // Fallback: asignación directa
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'administrador',
            company_id: company.id,
            assigned_by: user.id
          });

        if (roleError && roleError.code !== '23505') { // Ignorar duplicados
          console.error('❌ Error asignando rol directo:', roleError);
          // No lanzar error, el usuario puede intentar más tarde
        } else {
          console.log('✅ Rol administrador asignado por método directo');
        }
      } else {
        console.log('✅ Rol administrador auto-asignado exitosamente');
      }

      return {
        success: true,
        company,
        message: 'Empresa registrada exitosamente'
      };

    } catch (error) {
      console.error('❌ Error en registro de empresa:', error);
      return {
        success: false,
        error,
        message: 'Error registrando empresa'
      };
    }
  }
}
