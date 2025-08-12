
import { supabase } from '@/integrations/supabase/client';

export interface CompanyRegistrationData {
  nit: string;
  razon_social: string;
  email: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  plan: 'basico' | 'profesional' | 'empresarial';
}

/**
 * Enhanced service for company registration with guaranteed role assignment
 */
export class CompanyRegistrationService {
  
  static async registerCompany(data: CompanyRegistrationData) {
    try {
      console.log('🏢 Iniciando registro de empresa:', data.razon_social);

      // Validación defensiva de campos obligatorios
      if (!data.razon_social?.trim()) {
        throw new Error('El nombre de la empresa es obligatorio');
      }

      if (!data.email?.trim()) {
        throw new Error('El email de la empresa es obligatorio');
      }

      if (!data.nit?.trim()) {
        throw new Error('El NIT es obligatorio');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // 1. Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          nit: data.nit,
          razon_social: data.razon_social,
          email: data.email,
          telefono: data.telefono,
          direccion: data.direccion,
          ciudad: data.ciudad,
          departamento: data.departamento,
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

      // 2. Update profile with company (this will trigger the role assignment)
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

      // 3. Wait for role assignment with polling
      console.log('⏳ Esperando asignación de rol...');
      await this.waitForRoleAssignment(user.id, company.id);

      // 4. Create company settings
      const { error: settingsError } = await supabase
        .from('company_settings')
        .insert({
          company_id: company.id,
          periodicity: 'mensual',
          created_at: new Date().toISOString()
        });

      if (settingsError) {
        console.error('⚠️ Error creando configuración empresa:', settingsError);
      }

      // 5. Create subscription
      const { error: subscriptionError } = await supabase
        .from('company_subscriptions')
        .insert({
          company_id: company.id,
          plan_type: data.plan,
          status: 'trial',
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          max_employees: data.plan === 'basico' ? 10 : data.plan === 'profesional' ? 25 : 100,
          max_payrolls_per_month: 12,
          created_at: new Date().toISOString()
        });

      if (subscriptionError) {
        console.error('⚠️ Error creando suscripción:', subscriptionError);
      }

      return {
        success: true,
        company,
        message: 'Empresa registrada exitosamente con acceso completo'
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

  /**
   * Wait for admin role assignment with polling
   */
  private static async waitForRoleAssignment(userId: string, companyId: string): Promise<void> {
    const maxAttempts = 10;
    const delayMs = 500;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔍 Verificando roles (intento ${attempt}/${maxAttempts})...`);
      
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('role', 'administrador');

      if (error) {
        console.error('❌ Error verificando roles:', error);
        throw error;
      }

      if (roles && roles.length > 0) {
        console.log('✅ Rol de administrador confirmado');
        return;
      }

      if (attempt < maxAttempts) {
        console.log(`⏳ Rol no encontrado, esperando ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // If we get here, role assignment failed - try manual assignment
    console.warn('⚠️ Asignación automática falló, intentando asignación manual...');
    
    const { error: manualAssignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'administrador',
        company_id: companyId,
        assigned_by: userId
      });

    if (manualAssignError && manualAssignError.code !== '23505') {
      console.error('❌ Error en asignación manual:', manualAssignError);
      throw new Error('No se pudo asignar el rol de administrador');
    }

    console.log('✅ Rol de administrador asignado manualmente');
  }
}
