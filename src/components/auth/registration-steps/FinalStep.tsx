
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, X } from 'lucide-react';
import { useCompanyRegistrationStore } from '../hooks/useCompanyRegistrationStore';
import { CompanyRegistrationService } from '@/services/CompanyRegistrationService';
import { CompanyConfigurationService } from '@/services/CompanyConfigurationService';
import { useToast } from '@/hooks/use-toast';
import { calculateVerificationDigit } from '../utils/digitVerification';

interface FinalStepProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export const FinalStep = ({ onComplete, onCancel }: FinalStepProps) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { data, clearStore } = useCompanyRegistrationStore();
  const { toast } = useToast();

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Validación estricta de campos obligatorios
  const validateRequiredFields = () => {
    const errors: string[] = [];

    if (!data.companyName?.trim()) {
      errors.push('Nombre de la empresa');
    }

    if (!data.companyEmail?.trim()) {
      errors.push('Email de la empresa');
    }

    if (!data.identificationNumber?.trim()) {
      errors.push('Número de identificación');
    }

    if (errors.length > 0) {
      toast({
        title: "Campos obligatorios faltantes",
        description: `Por favor complete: ${errors.join(', ')}`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleComplete = async () => {
    if (isRegistering) return;
    
    // Validación estricta antes de proceder
    if (!validateRequiredFields()) {
      return;
    }
    
    setIsRegistering(true);
    
    try {
      // Construir NIT correctamente con dígito de verificación
      let nitCompleto = data.identificationNumber || '';
      
      if (data.identificationType === 'NIT') {
        const dv = data.verificationDigit || calculateVerificationDigit(data.identificationNumber || '');
        nitCompleto = `${data.identificationNumber}-${dv}`;
      }

      // Map wizard data to CompanyRegistrationService format
      const registrationData = {
        nit: nitCompleto,
        razon_social: data.companyName || '',
        email: data.companyEmail || '',
        telefono: data.companyPhone,
        direccion: data.companyAddress,
        ciudad: data.companyCity,
        departamento: data.companyDepartment,
        plan: 'profesional' as const,
      };

      console.log('🏢 Registrando empresa con datos:', registrationData);

      const result = await CompanyRegistrationService.registerCompany(registrationData);

      if (result.success && result.company) {
        console.log('✅ Empresa registrada exitosamente');

        // Guardar la frecuencia de nómina en company_settings
        if (data.payrollFrequency) {
          try {
            await CompanyConfigurationService.saveCompanyConfiguration(
              result.company.id, 
              data.payrollFrequency
            );
            console.log('✅ Frecuencia de nómina guardada:', data.payrollFrequency);
          } catch (configError) {
            console.warn('⚠️ Error guardando configuración de nómina:', configError);
          }
        }

        toast({
          title: "¡Empresa registrada exitosamente!",
          description: "Tu empresa ha sido configurada y ya puedes comenzar a gestionar empleados.",
        });
        
        // Clear the store after successful registration
        clearStore();
        onComplete();
      } else {
        console.error('❌ Error registrando empresa:', result.error);
        toast({
          title: "Error al registrar empresa",
          description: result.message || "Hubo un problema al registrar tu empresa. Intenta nuevamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error inesperado registrando empresa:', error);
      toast({
        title: "Error inesperado",
        description: "Hubo un problema inesperado. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-4 animate-scale-in relative overflow-hidden">
      {onCancel && (
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors z-20"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      )}

      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="confetti-animation">
            {Array.from({ length: 50 }, (_, i) => (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][Math.floor(Math.random() * 5)],
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-yellow-500 mr-2 animate-pulse" />
          <CardTitle className="text-2xl text-blue-600">¡Bienvenido a NóminaFácil!</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-center space-y-6">
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🎉 ¡Todo está listo!</h3>
            <p className="text-gray-600">
              Tu empresa <strong>{data.companyName}</strong> será registrada con NIT{' '}
              <strong>{data.identificationNumber}-{data.verificationDigit}</strong>
            </p>
            <p className="text-gray-600 mt-2">
              Tendrás <strong>15 días de prueba gratuita</strong> para explorar 
              todas las funcionalidades del plan de Nómina para empresas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl mb-2">✨</div>
              <p className="font-medium">Cálculo automático</p>
              <p className="text-gray-600">de nómina y prestaciones</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl mb-2">📊</div>
              <p className="font-medium">Reportes detallados</p>
              <p className="text-gray-600">y análisis completos</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <Button 
              onClick={onCancel}
              variant="outline"
              className="flex-1"
              disabled={isRegistering}
            >
              Cancelar
            </Button>
          )}
          <Button 
            onClick={handleComplete}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3"
            size="lg"
            disabled={isRegistering}
          >
            {isRegistering ? 'Registrando empresa...' : 'Comencemos 🚀'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
