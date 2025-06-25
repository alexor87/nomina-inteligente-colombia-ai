
import { User } from '@supabase/supabase-js';

export interface Company {
  id: string;
  name: string;
  nit: string;
  rol?: string;
}

export interface UserCompany {
  company_id: string;
  rol: string;
}

export interface Profile {
  user_id: string;
  first_name?: string;
  last_name?: string;
  company_id?: string;
  avatar_url?: string;
  phone?: string;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  currentCompany: Company | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  hasRole: (role: 'admin' | 'editor' | 'lector') => boolean;
  canAccessModule: (module: string) => boolean;
  switchCompany: (companyId: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  userCompanies: UserCompany[];
}
