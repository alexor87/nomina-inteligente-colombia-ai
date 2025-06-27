import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyRegistrationWizard } from '@/components/auth/CompanyRegistrationWizard';
import { CompanyService } from '@/services/CompanyService';
import { useCompanyRegistrationStore } from '@/components/auth/hooks/useCompanyRegistrationStore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const CompanyRegistrationPage = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUserData } = useAuth();
  const { data } = useCompanyRegistrationStore();

  const handleWizardComplete = async () => {
    setIsProcessing(true);
    
    try {
      console.log('Processing company registration:', data);
      
      // Convert wizard data to company registration format
      const registrationData = {
        nit: `${data.identificationNumber}-${data.verificationDigit}`,
        razon_social: data.identificationNumber || 'Mi Empresa',
        email: data.invitedMember?.email || 'contacto@empresa.com',
        telefono: '',
        ciudad: 'Bogotá',
        plan: 'profesional' as const,
        // Additional data that we'll store in company settings
        actividad_economica: data.industry,
        codigo_ciiu: data.ciiuCode,
        numero_empleados: data.employeeCount,
        frecuencia_nomina: data.payrollFrequency,
        area_funcional: data.functionalArea,
      };

      // For now, we'll create a basic company
      // In the future, we can extend CompanyService to handle the additional data
      const companyId = await CompanyService.createCompany({
        nit: registrationData.nit,
        razon_social: registrationData.razon_social,
        email: registrationData.email,
        telefono: registrationData.telefono,
        ciudad: registrationData.ciudad,
        plan: registrationData.plan,
      });
      
      console.log('Company created successfully:', companyId);
      
      // Refresh user data to ensure roles and profile are loaded
      await refreshUserData();
      
      toast({
        title: "¡Bienvenido a NóminaFácil!",
        description: "Tu empresa ha sido registrada exitosamente. ¡Comienza tu prueba gratuita!",
      });

      // Navigate to dashboard
      setTimeout(() => {
        navigate('/app/dashboard');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error creating company:', error);
      
      let errorMessage = "Ha ocurrido un error inesperado";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error al registrar empresa",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Configurando tu empresa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <CompanyRegistrationWizard onComplete={handleWizardComplete} />
    </div>
  );
};
