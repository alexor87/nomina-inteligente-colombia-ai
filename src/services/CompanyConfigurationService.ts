
import { supabase } from '@/integrations/supabase/client';

export interface CompanyConfiguration {
  id: string;
  company_id: string;
  periodicity: 'mensual' | 'quincenal' | 'semanal' | 'personalizado';
  created_at: string;
  updated_at: string;
}

export class CompanyConfigurationService {
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }

      console.log('Usuario actual:', user.id, user.email);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error getting user profile:', error);
        return null;
      }

      if (!profile?.company_id) {
        console.warn('User profile found but no company_id assigned');
        return null;
      }

      console.log('Perfil encontrado:', profile);
      return profile.company_id;
    } catch (error) {
      console.error('Error getting user company ID:', error);
      return null;
    }
  }

  static async getCompanyData(companyId: string) {
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .select(`
          id,
          nit,
          razon_social,
          email,
          telefono,
          direccion,
          ciudad,
          departamento,
          representante_legal,
          actividad_economica,
          plan,
          estado,
          logo_url,
          created_at,
          updated_at
        `)
        .eq('id', companyId)
        .single();

      if (error) throw error;

      console.log('Empresa encontrada:', company);
      return company;
    } catch (error) {
      console.error('Error loading company data:', error);
      return null;
    }
  }

  static async updateCompanyData(companyId: string, data: any) {
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', companyId)
        .select()
        .single();

      if (error) throw error;

      console.log('Empresa actualizada:', company);
      return company;
    } catch (error) {
      console.error('Error updating company data:', error);
      throw error;
    }
  }

  static async saveCompanyConfiguration(companyId: string, periodicity: string) {
    try {
      console.log('Guardando datos para empresa:', companyId);

      // Primero verificar si existe una configuración
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .eq('company_id', companyId)
        .single();

      let result;

      if (existing) {
        // Si existe, actualizar
        const { data, error } = await supabase
          .from('company_settings')
          .update({ 
            periodicity: periodicity,
            updated_at: new Date().toISOString()
          })
          .eq('company_id', companyId)
          .select()
          .single();

        if (error) {
          console.error('Error actualizando configuración:', error);
          throw error;
        }
        result = data;
      } else {
        // Si no existe, crear
        const { data, error } = await supabase
          .from('company_settings')
          .insert({
            company_id: companyId,
            periodicity: periodicity
          })
          .select()
          .single();

        if (error) {
          console.error('Error creando configuración:', error);
          throw error;
        }
        result = data;
      }

      console.log('Configuración guardada exitosamente:', result);
      return result;
    } catch (error) {
      console.error('Error saving company data:', error);
      throw error;
    }
  }

  static async getCompanyConfiguration(companyId: string): Promise<CompanyConfiguration | null> {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.log('No company settings found, will create defaults');
        return null;
      }
      
      return data as CompanyConfiguration;
    } catch (error) {
      console.error('Error getting company configuration:', error);
      return null;
    }
  }
}
