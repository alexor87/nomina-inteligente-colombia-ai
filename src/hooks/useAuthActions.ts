
import { AuthService } from '@/services/AuthService';
import { useToast } from '@/hooks/use-toast';
import { Company, UserCompany } from '@/types/auth';

interface UseAuthActionsProps {
  userCompanies: UserCompany[];
  isSuperAdmin: boolean;
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
}

export const useAuthActions = ({
  userCompanies,
  isSuperAdmin,
  currentCompany,
  setCurrentCompany
}: UseAuthActionsProps) => {
  const { toast } = useToast();

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      await AuthService.signInUser(email, password);
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido de vuelta",
      });
    } catch (error: any) {
      console.error('SignIn error:', error);
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await AuthService.signOutUser();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
    } catch (error: any) {
      console.error('SignOut error:', error);
      throw new Error(error.message || 'Error al cerrar sesión');
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string): Promise<void> => {
    try {
      await AuthService.signUpUser(email, password, firstName, lastName);
      toast({
        title: "Registro exitoso",
        description: "Revisa tu email para confirmar tu cuenta",
      });
    } catch (error: any) {
      console.error('SignUp error:', error);
      throw new Error(error.message || 'Error al registrarse');
    }
  };

  const hasRole = (role: 'admin' | 'editor' | 'lector'): boolean => {
    if (isSuperAdmin) return true;
    
    if (!currentCompany || userCompanies.length === 0) return false;
    
    const currentCompanyRelation = userCompanies.find(
      uc => uc.company_id === currentCompany.id
    );
    
    if (!currentCompanyRelation) return false;
    
    const userRole = currentCompanyRelation.rol;
    
    switch (role) {
      case 'admin':
        return userRole === 'admin';
      case 'editor':
        return userRole === 'admin' || userRole === 'editor';
      case 'lector':
        return ['admin', 'editor', 'lector'].includes(userRole);
      default:
        return false;
    }
  };

  const canAccessModule = (module: string): boolean => {
    console.log('🔍 Checking module access:', {
      module,
      isSuperAdmin,
      currentCompany: !!currentCompany,
      userCompanies: userCompanies.length
    });

    // SuperAdmin can access everything
    if (isSuperAdmin) {
      console.log('✅ SuperAdmin access granted for module:', module);
      return true;
    }
    
    // For non-superadmin users, check basic requirements
    if (!currentCompany) {
      console.log('❌ No current company assigned');
      return false;
    }

    if (userCompanies.length === 0) {
      console.log('❌ No user companies found');
      return false;
    }

    // Check if user has any role in current company
    const hasRoleInCompany = userCompanies.some(uc => uc.company_id === currentCompany.id);
    
    if (!hasRoleInCompany) {
      console.log('❌ User has no role in current company');
      return false;
    }

    // At this point, user has access
    console.log('✅ Module access granted:', module);
    return true;
  };

  const switchCompany = async (companyId: string) => {
    try {
      const companyData = await AuthService.loadCurrentCompany(companyId);
      if (companyData) {
        const companyRelation = userCompanies.find(uc => uc.company_id === companyId);
        setCurrentCompany({
          ...companyData,
          rol: companyRelation?.rol
        });
        toast({
          title: "Empresa cambiada",
          description: `Ahora estás trabajando en ${companyData.name}`,
        });
      }
    } catch (error) {
      console.error('Error switching company:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar de empresa",
        variant: "destructive"
      });
    }
  };

  return {
    signIn,
    signOut,
    signUp,
    hasRole,
    canAccessModule,
    switchCompany
  };
};
