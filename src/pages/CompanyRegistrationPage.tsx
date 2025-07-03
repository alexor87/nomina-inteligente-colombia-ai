
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyRegistrationWizard } from '@/components/auth/CompanyRegistrationWizard';
import { CompanyRegistrationService } from '@/services/CompanyRegistrationService';
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
      
      // Validar que tenemos todos los datos necesarios
      if (!data.userEmail || !data.userPassword || !data.firstName || !data.lastName) {
        throw new Error('Faltan datos del usuario');
      }

      if (!data.identificationNumber || !data.razonSocial) {
        throw new Error('Faltan datos de la empresa');
      }

      // Convertir wizard data a formato de registro completo
      const registrationData = {
        // Datos de la empresa
        nit: `${data.identificationNumber}-${data.verificationDigit || ''}`,
        razon_social: data.razonSocial,
        email: data.userEmail, // Email del usuario será el email de contacto de la empresa
        telefono: data.telefono || '',
        ciudad: 'Bogotá',
        plan: 'profesional' as const,
        
        // Datos del usuario
        user_email: data.userEmail,
        user_password: data.userPassword,
        first_name: data.firstName,
        last_name: data.lastName,
      };

      console.log('Registering company with user:', {
        nit: registrationData.nit,
        razon_social: registrationData.razon_social,
        user_email: registrationData.user_email,
        first_name: registrationData.first_name,
        last_name: registrationData.last_name,
      });

      // Usar createCompanyWithUser para registro completo
      const companyId = await CompanyRegistrationService.createCompanyWithUser(registrationData);
      
      console.log('Company and user created successfully:', companyId);
      
      // Refresh user data to ensure roles and profile are loaded
      await refreshUserData();
      
      toast({
        title: "¡Bienvenido a NóminaFácil!",
        description: "Tu cuenta y empresa han sido creadas exitosamente. ¡Comienza tu prueba gratuita!",
      });

      // Navigate to dashboard
      setTimeout(() => {
        navigate('/app/dashboard');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error creating company with user:', error);
      
      let errorMessage = "Ha ocurrido un error inesperado";
      
      if (error.message?.includes('already registered')) {
        errorMessage = "Este email ya está registrado. Intenta iniciar sesión en su lugar.";
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = "El formato del email no es válido";
      } else if (error.message?.includes('Password')) {
        errorMessage = "La contraseña debe tener al menos 6 caracteres";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error al registrar",
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
          <p className="text-gray-600">Creando tu cuenta y empresa...</p>
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
