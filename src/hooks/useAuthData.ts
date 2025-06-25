
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
      setLoading(true);

      // Check if user is superadmin first
      const superAdminStatus = await AuthService.checkSuperAdmin(user.id);
      setIsSuperAdmin(superAdminStatus);
      console.log('👑 SuperAdmin status:', superAdminStatus);

      // Load user profile
      const profileData = await AuthService.loadUserProfile(user.id);
      setProfile(profileData);
      console.log('👤 Profile loaded:', profileData);

      // For superadmin, set up access to all modules immediately
      if (superAdminStatus) {
        console.log('🔄 Setting up superadmin access...');
        
        // Set default superadmin company
        const superadminCompany: Company = {
          id: 'superadmin-company',
          name: 'SuperAdmin Panel',
          nit: '000000000-0',
          rol: 'superadmin'
        };
        
        setCurrentCompany(superadminCompany);
        setUserCompanies([{
          company_id: 'superadmin-company',
          rol: 'superadmin'
        }]);
        
        console.log('✅ SuperAdmin setup completed');
      } else {
        // For regular users, load their companies
        console.log('🔄 Loading user companies...');
        const companies = await AuthService.loadUserCompanies(user.id);
        console.log('🏢 User companies loaded:', companies);
        setUserCompanies(companies);

        if (companies.length > 0) {
          // Use the first company
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
            // Create a fallback company entry
            setCurrentCompany({
              id: firstCompany.company_id,
              name: 'Mi Empresa',
              nit: 'N/A',
              rol: firstCompany.rol
            });
            console.log('✅ Fallback company set');
          }
        } else {
          console.warn('⚠️ User has no companies assigned');
          // For users without companies, create a basic setup
          const fallbackCompany: Company = {
            id: 'user-company',
            name: 'Mi Empresa',
            nit: 'N/A',
            rol: 'admin'
          };
          
          setCurrentCompany(fallbackCompany);
          setUserCompanies([{
            company_id: 'user-company',
            rol: 'admin'
          }]);
          console.log('✅ Fallback setup completed for user without companies');
        }
      }

      console.log('✅ User data initialization completed successfully');
    } catch (error) {
      console.error('❌ Error initializing user data:', error);
      
      // Even on error, ensure basic access for authenticated users
      const fallbackCompany: Company = {
        id: 'fallback-company',
        name: 'Mi Empresa',
        nit: 'N/A',
        rol: 'admin'
      };
      
      setCurrentCompany(fallbackCompany);
      setUserCompanies([{
        company_id: 'fallback-company',
        rol: 'admin'
      }]);
      
      console.log('✅ Fallback setup applied due to initialization error');
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
