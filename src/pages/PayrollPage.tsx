
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PayrollLiquidationNew } from '@/components/payroll/PayrollLiquidationNew';
import { EmptyPayrollHistoryState } from '@/components/payroll-history/EmptyPayrollHistoryState';
import { useSmartPeriodDetection } from '@/hooks/useSmartPeriodDetection';
import { useCompanyState } from '@/hooks/useCompanyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle } from 'lucide-react';

const PayrollPage = () => {
  const { periodId: urlPeriodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  
  const { isNewCompany, isLoading: companyLoading } = useCompanyState();
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

        // Si periodId en URL es inválido o no existe, usar detección inteligente
        if (!periodLoading && periodStatus) {
          if (periodStatus.hasActivePeriod && periodStatus.currentPeriod) {
            console.log('📅 Using detected active period:', periodStatus.currentPeriod.id);
            setActivePeriodId(periodStatus.currentPeriod.id);
          } else {
            console.log('📅 No active period found');
            setActivePeriodId(null);
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
  }, [urlPeriodId, periodLoading, periodStatus]);

  // Loading states
  if (companyLoading || periodLoading || isValidating) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando información de nómina...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si es empresa nueva, mostrar estado vacío
  if (isNewCompany) {
    return <EmptyPayrollHistoryState />;
  }

  // Si no hay período activo, mostrar opciones
  if (!activePeriodId && periodStatus) {
    return (
      <div className="container mx-auto py-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">No hay período activo</CardTitle>
            <p className="text-gray-600 mt-2">
              Para procesar nómina necesitas crear un período primero.
            </p>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {periodStatus.action === 'suggest_next' && periodStatus.nextPeriod && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Período Sugerido</h3>
                <p className="text-sm text-blue-700">
                  {periodStatus.nextPeriod.startDate} - {periodStatus.nextPeriod.endDate}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Tipo: {periodStatus.nextPeriod.type}
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={createNewPeriod}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {isProcessing ? 'Creando...' : 'Crear Período'}
              </Button>
              
              <Button 
                onClick={() => navigate('/app/payroll-history')}
                variant="outline"
              >
                Ver Historial
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si hay error o no se puede determinar período
  if (!activePeriodId) {
    return (
      <div className="container mx-auto py-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Error al cargar período</CardTitle>
            <p className="text-gray-600 mt-2">
              No se pudo determinar el período de nómina activo.
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => navigate('/app/payroll-history')}
              variant="outline"
            >
              Ir al Historial de Nómina
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar componente de liquidación con período válido
  return (
    <div className="container mx-auto py-6">
      <PayrollLiquidationNew 
        periodId={activePeriodId}
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
