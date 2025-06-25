
import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { AuthService } from '@/services/AuthService';
import { Company, Profile, UserCompany } from '@/types/auth';

export const useAuthData = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [userCompanies, setUserCompanies] = useState<UserCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const initializeUserData = async (user: User) => {
    console.log('🔄 Initializing user data for:', user.email);

    try {
      // Check if user is superadmin first
      const superAdminStatus = await AuthService.checkSuperAdmin(user.id);
      setIsSuperAdmin(superAdminStatus);
      console.log('👑 SuperAdmin status:', superAdminStatus);

      // Load user profile
      const profileData = await AuthService.loadUserProfile(user.id);
      setProfile(profileData);
      console.log('👤 Profile loaded:', profileData);

      // Load user companies with better error handling
      const companies = await AuthService.loadUserCompanies(user.id);
      setUserCompanies(companies);
      console.log('🏢 User companies loaded:', companies);

      // Set current company with improved logic
      if (superAdminStatus) {
        // For superadmin, try to load first available company
        console.log('🔄 Loading first available company for superadmin...');
        const firstCompany = await AuthService.loadFirstAvailableCompany();
        if (firstCompany) {
          setCurrentCompany(firstCompany);
          console.log('✅ SuperAdmin using first company:', firstCompany.name);
        } else {
          console.warn('⚠️ No companies available, creating default superadmin company');
          setCurrentCompany({ 
            id: 'superadmin-default', 
            name: 'SuperAdmin Panel', 
            nit: '000000000-0',
            rol: 'superadmin' 
          });
        }
      } else if (companies.length > 0) {
        // For regular users, use their first assigned company
        const firstCompany = companies[0];
        console.log('🔄 Loading company data for:', firstCompany.company_id);
        
        const companyData = await AuthService.loadCurrentCompany(firstCompany.company_id);
        
        if (companyData) {
          setCurrentCompany({
            ...companyData,
            rol: firstCompany.rol
          });
          console.log('✅ Current company set:', companyData.name, 'with role:', firstCompany.rol);
        } else {
          console.error('❌ Failed to load company data for:', firstCompany.company_id);
          // Create a fallback company entry
          setCurrentCompany({
            id: firstCompany.company_id,
            name: 'Mi Empresa',
            nit: 'N/A',
            rol: firstCompany.rol
          });
        }
      } else {
        console.warn('⚠️ User has no companies assigned and is not superadmin');
        // For users without companies, create a minimal company setup
        if (profileData?.company_id) {
          const companyData = await AuthService.loadCurrentCompany(profileData.company_id);
          if (companyData) {
            setCurrentCompany({
              ...companyData,
              rol: 'admin'
            });
            console.log('✅ Using company from profile');
          }
        }
      }

      console.log('✅ User data initialization completed successfully');
    } catch (error) {
      console.error('❌ Error initializing user data:', error);
      
      // Even on error, ensure basic access for authenticated users
      if (user) {
        console.log('🔄 Setting minimal access due to initialization error');
        setCurrentCompany({
          id: 'fallback-company',
          name: 'Mi Empresa',
          nit: 'N/A',
          rol: 'admin'
        });
        setUserCompanies([{
          company_id: 'fallback-company',
          rol: 'admin'
        }]);
      }
    } finally {
      // CRITICAL: Always set loading to false
      console.log('🔄 Setting loading to false - initialization complete');
      setLoading(false);
    }
  };

  const clearAuthState = () => {
    console.log('🔄 Clearing auth state');
    setUser(null);
    setProfile(null);
    setCurrentCompany(null);
    setUserCompanies([]);
    setIsSuperAdmin(false);
    setLoading(false);
  };

  const refreshUserData = async () => {
    if (user) {
      setLoading(true);
      await initializeUserData(user);
    }
  };

  return {
    // State
    user,
    profile,
    currentCompany,
    userCompanies,
    loading,
    isSuperAdmin,
    
    // Setters
    setUser,
    setProfile,
    setCurrentCompany,
    setUserCompanies,
    setLoading,
    setIsSuperAdmin,
    
    // Actions
    initializeUserData,
    clearAuthState,
    refreshUserData
  };
};
