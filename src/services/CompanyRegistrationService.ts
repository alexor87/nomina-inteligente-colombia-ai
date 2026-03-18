
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { TeamInvitationService } from './TeamInvitationService';

export interface CompanyRegistrationData {
  nit: string;
  razon_social: string;
  email: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  plan: 'basico' | 'profesional' | 'empresarial';
  periodicity?: 'quincenal' | 'mensual';
  invitedMember?: {
    email: string;
    name: string;
    role: string;
  };
}

export class CompanyRegistrationService {
  
  static async registerCompany(data: CompanyRegistrationData) {
    try {
      if (!data.razon_social?.trim()) throw new Error('El nombre de la empresa es obligatorio');
      if (!data.email?.trim()) throw new Error('El email de la empresa es obligatorio');
      if (!data.nit?.trim()) throw new Error('El NIT es obligatorio');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          nit: data.nit,
          razon_social: data.razon_social,
          email: data.email,
          telefono: data.telefono,
          direccion: data.direccion,
          ciudad: data.ciudad,
          estado: 'activa',
          plan: data.plan
        })
        .select()
        .single();

      if (companyError) {
        logger.error('❌ Error creando empresa:', companyError);
        throw companyError;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_id: company.id, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (profileError) {
        logger.error('❌ Error actualizando perfil:', profileError);
        throw profileError;
      }

      await this.waitForRoleAssignment(user.id, company.id);

      await supabase.from('company_settings').insert({
        company_id: company.id,
        periodicity: data.periodicity || 'mensual',
        created_at: new Date().toISOString()
      });

      await supabase.from('company_subscriptions').insert({
        company_id: company.id,
        plan_type: data.plan,
        status: 'trial',
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        max_employees: data.plan === 'basico' ? 10 : data.plan === 'profesional' ? 25 : 100,
        max_payrolls_per_month: 12,
        created_at: new Date().toISOString()
      });

      // Send team invitation if provided (non-blocking)
      if (data.invitedMember?.email && data.invitedMember?.role) {
        try {
          await TeamInvitationService.createInvitation(
            company.id,
            data.razon_social,
            user.id,
            {
              email: data.invitedMember.email,
              name: data.invitedMember.name || '',
              role: data.invitedMember.role,
            }
          );
        } catch (inviteError) {
          logger.warn('⚠️ Invitación fallida (registro continúa):', inviteError);
        }
      }

      return { success: true, company, message: 'Empresa registrada exitosamente con acceso completo' };
    } catch (error) {
      logger.error('❌ Error en registro de empresa:', error);
      return { success: false, error, message: 'Error registrando empresa' };
    }
  }

  private static async waitForRoleAssignment(userId: string, companyId: string): Promise<void> {
    const maxAttempts = 10;
    const delayMs = 500;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('role', 'administrador');

      if (error) throw error;
      if (roles && roles.length > 0) return;

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    logger.warn('⚠️ Asignación automática falló, intentando asignación manual...');
    
    const { error: manualAssignError } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: 'administrador', company_id: companyId, assigned_by: userId });

    if (manualAssignError && manualAssignError.code !== '23505') {
      throw new Error('No se pudo asignar el rol de administrador');
    }
  }
}
