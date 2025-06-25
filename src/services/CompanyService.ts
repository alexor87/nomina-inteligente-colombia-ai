
import { supabase } from '@/integrations/supabase/client';

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

export interface CompanyRegistrationData {
  nit: string;
  razon_social: string;
  email: string;
  telefono?: string;
  ciudad?: string;
  plan: 'basico' | 'profesional' | 'empresarial';
}

export interface CompanyRegistrationWithUser extends CompanyRegistrationData {
  user_email: string;
  user_password: string;
  first_name: string;
  last_name: string;
}

export class CompanyService {
  // Crear nueva empresa con usuario (para registro completo)
  static async createCompanyWithUser(data: CompanyRegistrationWithUser): Promise<string> {
    try {
      // Primero registrar el usuario
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.user_email,
        password: data.user_password,
        options: {
          data: {
            first_name: data.first_name,
            last_name: data.last_name
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Error al crear usuario');

      // Ahora crear la empresa usando la función actualizada
      const { data: result, error } = await supabase.rpc('create_company_with_setup', {
        p_nit: data.nit,
        p_razon_social: data.razon_social,
        p_email: data.email,
        p_telefono: data.telefono,
        p_ciudad: data.ciudad || 'Bogotá',
        p_plan: data.plan,
        p_first_name: data.first_name,
        p_last_name: data.last_name
      });

      if (error) throw error;

      return result;
    } catch (error) {
      console.error('Error creating company with user:', error);
      throw new Error(error instanceof Error ? error.message : 'Error al crear la empresa');
    }
  }

  // Crear nueva empresa (para registro)
  static async createCompany(data: CompanyRegistrationData): Promise<string> {
    try {
      const { data: result, error } = await supabase.rpc('create_company_with_setup', {
        p_nit: data.nit,
        p_razon_social: data.razon_social,
        p_email: data.email,
        p_telefono: data.telefono,
        p_ciudad: data.ciudad || 'Bogotá',
        p_plan: data.plan
      });

      if (error) throw error;

      return result;
    } catch (error) {
      console.error('Error creating company:', error);
      throw new Error('Error al crear la empresa');
    }
  }

  // Verificar si el usuario es súper admin
  static async isSaasAdmin(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_saas_admin');
      
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      
      return data || false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Listar todas las empresas (solo para súper admin)
  static async getAllCompanies(): Promise<Company[]> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cast the data to our Company interface
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
      console.error('Error loading companies:', error);
      return [];
    }
  }

  // Obtener empresa actual del usuario
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

      // Cast the data to our Company interface
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
      console.error('Error loading current company:', error);
      return null;
    }
  }

  // Actualizar empresa
  static async updateCompany(companyId: string, updates: Partial<Company>): Promise<void> {
    try {
      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', companyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating company:', error);
      throw new Error('Error al actualizar la empresa');
    }
  }

  // Suspender empresa (solo súper admin)
  static async suspendCompany(companyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ estado: 'suspendida' })
        .eq('id', companyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error suspending company:', error);
      throw new Error('Error al suspender la empresa');
    }
  }

  // Activar empresa (solo súper admin)
  static async activateCompany(companyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ estado: 'activa' })
        .eq('id', companyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error activating company:', error);
      throw new Error('Error al activar la empresa');
    }
  }
}
