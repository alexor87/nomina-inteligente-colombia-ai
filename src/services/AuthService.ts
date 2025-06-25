import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Company, Profile, UserCompany } from '@/types/auth';

export class AuthService {
  static async checkSuperAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_superadmin', {
        _user_id: userId
      });
      
      if (error) {
        console.error('Error checking superadmin status:', error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error('Error in checkSuperAdmin:', error);
      return false;
    }
  }

  static async loadUserProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      return null;
    }
  }

  static async loadUserCompanies(userId: string): Promise<UserCompany[]> {
    try {
      // First check if user is superadmin
      const isSuperAdmin = await this.checkSuperAdmin(userId);
      
      if (isSuperAdmin) {
        console.log('👑 User is superadmin, loading all companies');
        // For superadmin, return all companies
        const { data: companies, error } = await supabase
          .from('companies')
          .select('id')
          .eq('estado', 'activa');
        
        if (error) {
          console.error('Error loading companies for superadmin:', error);
          return [];
        }
        
        return companies?.map(company => ({
          company_id: company.id,
          rol: 'superadmin'
        })) || [];
      }

      // For regular users, check user_roles table first
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('company_id, role')
        .eq('user_id', userId);

      if (!rolesError && userRoles && userRoles.length > 0) {
        console.log('✅ Found user roles:', userRoles);
        return userRoles.map(role => ({
          company_id: role.company_id,
          rol: role.role
        }));
      }

      // Fallback: check usuarios_empresa table
      const { data: usuariosEmpresa, error: empresaError } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id, rol')
        .eq('usuario_id', userId)
        .eq('activo', true);

      if (!empresaError && usuariosEmpresa && usuariosEmpresa.length > 0) {
        console.log('✅ Found usuarios_empresa:', usuariosEmpresa);
        return usuariosEmpresa.map(ue => ({
          company_id: ue.empresa_id,
          rol: ue.rol
        }));
      }

      // If no roles found, check if user has a company_id in their profile
      const profile = await this.loadUserProfile(userId);
      if (profile && profile.company_id) {
        console.log('✅ Using company from profile:', profile.company_id);
        return [{
          company_id: profile.company_id,
          rol: 'admin' // Default role
        }];
      }

      console.warn('⚠️ No companies found for user');
      return [];
    } catch (error) {
      console.error('Error in loadUserCompanies:', error);
      return [];
    }
  }

  static async loadCurrentCompany(companyId: string): Promise<Company | null> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, razon_social, nit')
        .eq('id', companyId)
        .single();

      if (error) {
        console.error('Error loading company:', error);
        return null;
      }

      return {
        id: data.id,
        name: data.razon_social,
        nit: data.nit
      };
    } catch (error) {
      console.error('Error in loadCurrentCompany:', error);
      return null;
    }
  }

  static async loadFirstAvailableCompany(): Promise<Company | null> {
    try {
      const { data: firstCompany, error } = await supabase
        .from('companies')
        .select('id, razon_social, nit')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading first company:', error);
        return null;
      }

      if (!firstCompany) {
        console.warn('No companies available in the system');
        return null;
      }

      return {
        id: firstCompany.id,
        name: firstCompany.razon_social,
        nit: firstCompany.nit,
        rol: 'superadmin'
      };
    } catch (error) {
      console.error('Error fetching first company:', error);
      return null;
    }
  }

  static async signInUser(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  static async signOutUser(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async signUpUser(email: string, password: string, firstName: string, lastName: string): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    if (error) throw error;
  }
}
