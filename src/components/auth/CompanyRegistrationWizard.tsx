
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

interface CompanyRegistrationWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export type WizardStep = 'welcome' | 'company-data' | 'functional-area' | 'team-invitation' | 'final';

export const CompanyRegistrationWizard = ({ onComplete, onCancel }: CompanyRegistrationWizardProps) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const { clearStore } = useCompanyRegistrationStore();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Generar clave específica del usuario para localStorage
  const getUserSpecificKey = (key: string) => {
    return user ? `${key}-${user.id}` : key;
  };

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
    if (user) {
      // Load saved progress on mount - específico del usuario
      const savedStep = localStorage.getItem(getUserSpecificKey('company-registration-step'));
      if (savedStep && ['welcome', 'company-data', 'functional-area', 'team-invitation', 'final'].includes(savedStep)) {
        setCurrentStep(savedStep as WizardStep);
      } else {
        // Si no hay progreso guardado, empezar desde welcome
        setCurrentStep('welcome');
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Save progress on step change - específico del usuario
      localStorage.setItem(getUserSpecificKey('company-registration-step'), currentStep);
    }
  }, [currentStep, user]);

  const handleStepComplete = (nextStep: WizardStep) => {
    setCurrentStep(nextStep);
  };

  const handleFinalComplete = () => {
    if (user) {
      // Clear saved progress - específico del usuario
      localStorage.removeItem(getUserSpecificKey('company-registration-step'));
    }
    clearStore();
    onComplete();
  };

  const handleCancel = () => {
    if (user) {
      // Clear saved progress - específico del usuario
      localStorage.removeItem(getUserSpecificKey('company-registration-step'));
    }
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
