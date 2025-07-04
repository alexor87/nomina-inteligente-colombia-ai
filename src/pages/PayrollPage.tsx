
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PayrollLiquidationNew } from '@/components/payroll/PayrollLiquidationNew';
import { useSmartPeriodDetection } from '@/hooks/useSmartPeriodDetection';
import { Card, CardContent } from '@/components/ui/card';

const PayrollPage = () => {
  const { periodId: urlPeriodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  
  const {
    isLoading: periodLoading,
    periodStatus,
    createNewPeriod,
    isProcessing
  } = useSmartPeriodDetection();

  // Validar UUID
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  useEffect(() => {
    const validateAndSetPeriod = async () => {
      setIsValidating(true);
      
      try {
        // Si hay periodId en URL y es válido, usarlo
        if (urlPeriodId && isValidUUID(urlPeriodId)) {
          console.log('📅 Using period from URL:', urlPeriodId);
          setActivePeriodId(urlPeriodId);
          setIsValidating(false);
          return;
        }

        // Si no hay periodId en URL, usar detección inteligente
        if (!periodLoading && periodStatus) {
          if (periodStatus.hasActivePeriod && periodStatus.currentPeriod) {
            console.log('📅 Using detected active period:', periodStatus.currentPeriod.id);
            setActivePeriodId(periodStatus.currentPeriod.id);
          } else {
            // Si no hay período activo pero hay sugerencia de próximo período,
            // crear automáticamente el período
            if (periodStatus.action === 'suggest_next' && periodStatus.nextPeriod) {
              console.log('📅 No active period found, creating automatically...');
              try {
                await createNewPeriod();
                // El período se establecerá automáticamente cuando createNewPeriod actualice el estado
              } catch (error) {
                console.error('❌ Error creating automatic period:', error);
                setActivePeriodId(null);
              }
            } else {
              console.log('📅 No period available');
              setActivePeriodId(null);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error validating period:', error);
        setActivePeriodId(null);
      } finally {
        setIsValidating(false);
      }
    };

    validateAndSetPeriod();
  }, [urlPeriodId, periodLoading, periodStatus, createNewPeriod]);

  // Escuchar cambios en periodStatus para actualizar activePeriodId después de crear período
  useEffect(() => {
    if (periodStatus?.hasActivePeriod && periodStatus.currentPeriod && !activePeriodId) {
      console.log('📅 Setting active period after creation:', periodStatus.currentPeriod.id);
      setActivePeriodId(periodStatus.currentPeriod.id);
    }
  }, [periodStatus, activePeriodId]);

  // Loading states - mostrar loading mientras se valida o procesa
  if (periodLoading || isValidating || isProcessing) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                {isProcessing 
                  ? 'Configurando período de nómina...' 
                  : 'Cargando información de nómina...'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar componente de liquidación - el componente PayrollLiquidationNew
  // ya maneja internamente el caso de empresas sin empleados
  return (
    <div className="container mx-auto py-6">
      <PayrollLiquidationNew 
        periodId={activePeriodId || 'temp'} // Usar ID temporal si aún no está disponible
        onCalculationComplete={() => {
          console.log('Calculation completed for period:', activePeriodId);
        }}
        onEmployeeSelect={(employeeId) => {
          console.log('Employee selected:', employeeId, 'in period:', activePeriodId);
        }}
      />
    </div>
  );
};

export default PayrollPage;
