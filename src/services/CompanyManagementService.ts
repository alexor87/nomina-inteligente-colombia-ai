import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface Company {
  id: string;
  nit: string;
  razon_social: string;
  email: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  estado: 'activa' | 'suspendida' | 'inactiva';
  plan: 'basico' | 'profesional' | 'empresarial';
  created_at: string;
  updated_at: string;
}

export class CompanyManagementService {
  static async isSaasAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'soporte')
        .limit(1);

      if (error) {
        logger.error('Error checking support role:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }
  }

  static async getAllCompanies(): Promise<Company[]> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(company => ({
        id: company.id,
        nit: company.nit,
        razon_social: company.razon_social,
        email: company.email,
        telefono: company.telefono,
        direccion: company.direccion,
        ciudad: company.ciudad,
        estado: company.estado as 'activa' | 'suspendida' | 'inactiva',
        plan: company.plan as 'basico' | 'profesional' | 'empresarial',
        created_at: company.created_at,
        updated_at: company.updated_at
      }));
    } catch (error) {
      logger.error('Error loading companies:', error);
      return [];
    }
  }

  static async getCurrentCompany(): Promise<Company | null> {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError || !profile?.company_id) return null;

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        nit: data.nit,
        razon_social: data.razon_social,
        email: data.email,
        telefono: data.telefono,
        direccion: data.direccion,
        ciudad: data.ciudad,
        estado: data.estado as 'activa' | 'suspendida' | 'inactiva',
        plan: data.plan as 'basico' | 'profesional' | 'empresarial',
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      logger.error('Error loading current company:', error);
      return null;
    }
  }

  static async updateCompany(companyId: string, updates: Partial<Company>): Promise<void> {
    const { error } = await supabase.from('companies').update(updates).eq('id', companyId);
    if (error) throw new Error('Error al actualizar la empresa');
  }

  static async suspendCompany(companyId: string): Promise<void> {
    const { error } = await supabase.from('companies').update({ estado: 'suspendida' }).eq('id', companyId);
    if (error) throw new Error('Error al suspender la empresa');
  }

  static async activateCompany(companyId: string): Promise<void> {
    const { error } = await supabase.from('companies').update({ estado: 'activa' }).eq('id', companyId);
    if (error) throw new Error('Error al activar la empresa');
  }
}
