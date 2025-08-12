
import { useState, useEffect } from 'react';
import { WelcomeModal } from './registration-steps/WelcomeModal';
import { CompanyDataStep } from './registration-steps/CompanyDataStep';
import { FunctionalAreaStep } from './registration-steps/FunctionalAreaStep';
import { TeamInvitationStep } from './registration-steps/TeamInvitationStep';
import { FinalStep } from './registration-steps/FinalStep';
import { useCompanyRegistrationStore } from './hooks/useCompanyRegistrationStore';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CompanyRegistrationWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export type WizardStep = 'welcome' | 'company-data' | 'functional-area' | 'team-invitation' | 'final';

export const CompanyRegistrationWizard = ({ onComplete, onCancel }: CompanyRegistrationWizardProps) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const { clearStore, data } = useCompanyRegistrationStore();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Verificar que el usuario esté autenticado
  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: "Acceso denegado",
        description: "Debes crear una cuenta primero para configurar tu empresa.",
        variant: "destructive"
      });
      navigate('/register');
    }
  }, [user, loading, navigate, toast]);

  useEffect(() => {
    // Load saved progress on mount
    const savedStep = localStorage.getItem('company-registration-step');
    if (savedStep && ['welcome', 'company-data', 'functional-area', 'team-invitation', 'final'].includes(savedStep)) {
      setCurrentStep(savedStep as WizardStep);
    }
  }, []);

  useEffect(() => {
    // Save progress on step change
    localStorage.setItem('company-registration-step', currentStep);
  }, [currentStep]);

  const handleStepComplete = (nextStep: WizardStep) => {
    setCurrentStep(nextStep);
  };

  const persistRegistrationData = async () => {
    try {
      if (!user) throw new Error('Usuario no autenticado');

      // Get current profile to find company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No se encontró la empresa del usuario');
      }

      // Update company with the registration data
      const updateData: any = {};
      
      if (data.identificationNumber) {
        // Format NIT properly (add verification digit if provided)
        const nit = data.verificationDigit 
          ? `${data.identificationNumber}-${data.verificationDigit}`
          : data.identificationNumber;
        updateData.nit = nit;
      }

      if (data.industry) {
        updateData.actividad_economica = data.industry;
      }

      if (data.ciiuCode) {
        updateData.codigo_ciiu = data.ciiuCode;
      }

      // Only update if we have data to update
      if (Object.keys(updateData).length > 0) {
        const { error: companyError } = await supabase
          .from('companies')
          .update(updateData)
          .eq('id', profile.company_id);

        if (companyError) {
          console.error('Error updating company:', companyError);
          throw companyError;
        }

        console.log('✅ Company data updated successfully:', updateData);
      }

      // Update company settings with payroll frequency
      if (data.payrollFrequency) {
        const { error: settingsError } = await supabase
          .from('company_settings')
          .update({ 
            periodicity: data.payrollFrequency,
            updated_at: new Date().toISOString()
          })
          .eq('company_id', profile.company_id);

        if (settingsError) {
          console.error('Error updating company settings:', settingsError);
          // Don't throw here, as this is not critical
        } else {
          console.log('✅ Company settings updated successfully');
        }
      }

      toast({
        title: "Configuración guardada",
        description: "Los datos de tu empresa han sido actualizados correctamente.",
      });

    } catch (error) {
      console.error('❌ Error persisting registration data:', error);
      toast({
        title: "Error al guardar",
        description: "Hubo un problema al guardar la configuración de tu empresa.",
        variant: "destructive"
      });
    }
  };

  const handleFinalComplete = async () => {
    // Persist registration data before completing
    await persistRegistrationData();
    
    // Clear saved progress
    localStorage.removeItem('company-registration-step');
    clearStore();
    onComplete();
  };

  const handleCancel = () => {
    // Clear saved progress
    localStorage.removeItem('company-registration-step');
    clearStore();
    if (onCancel) {
      onCancel();
    }
  };

  // No renderizar nada si el usuario no está autenticado o aún está cargando
  if (loading || !user) {
    return null;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeModal onNext={() => handleStepComplete('company-data')} onCancel={handleCancel} />;
      case 'company-data':
        return <CompanyDataStep onNext={() => handleStepComplete('functional-area')} onCancel={handleCancel} />;
      case 'functional-area':
        return <FunctionalAreaStep onNext={() => handleStepComplete('team-invitation')} onCancel={handleCancel} />;
      case 'team-invitation':
        return <TeamInvitationStep onNext={() => handleStepComplete('final')} onCancel={handleCancel} />;
      case 'final':
        return <FinalStep onComplete={handleFinalComplete} onCancel={handleCancel} />;
      default:
        return <WelcomeModal onNext={() => handleStepComplete('company-data')} onCancel={handleCancel} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {renderStep()}
    </div>
  );
};
