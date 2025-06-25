
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
      const { data, error } = await supabase.rpc('get_user_companies', {
        _user_id: userId
      });

      if (error) {
        console.error('Error loading user companies:', error);
        return [];
      }

      return data || [];
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
