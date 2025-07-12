
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, RefreshCw } from 'lucide-react';
import { useVacationBalance } from '@/hooks/useVacationBalance';
import { EmployeeWithStatus } from '@/types/employee-extended';

interface VacationBalanceCardProps {
  employee: EmployeeWithStatus;
  onUpdate?: () => void;
}

export const VacationBalanceCard = ({ employee, onUpdate }: VacationBalanceCardProps) => {
  const { vacationBalance, isLoading, createOrUpdate, isUpdating } = useVacationBalance(employee.id);

  const handleUpdateBalance = () => {
    createOrUpdate({
      employee_id: employee.id,
      company_id: employee.company_id,
      initial_balance: vacationBalance?.initial_balance || 15, // Default 15 días
      accumulated_days: vacationBalance?.accumulated_days || 15
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Balance de Vacaciones</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span>Balance de Vacaciones</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {vacationBalance ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {vacationBalance.initial_balance}
                  </div>
                  <div className="text-sm text-gray-600">Balance Inicial</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {vacationBalance.accumulated_days}
                  </div>
                  <div className="text-sm text-gray-600">Días Acumulados</div>
                </div>
              </div>

              {vacationBalance.last_calculated && (
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-2" />
                  Último cálculo: {new Date(vacationBalance.last_calculated).toLocaleDateString('es-CO')}
                </div>
              )}

              <Button 
                onClick={handleUpdateBalance}
                disabled={isUpdating}
                variant="outline"
                className="w-full"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar Balance
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">No hay balance de vacaciones registrado</p>
              <Button 
                onClick={() => createOrUpdate({
                  employee_id: employee.id,
                  company_id: employee.company_id,
                  initial_balance: 15,
                  accumulated_days: 15
                })}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Balance Inicial'
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
