
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, Clock, CheckCircle } from 'lucide-react';
import { VacationPeriodsService, VacationPeriod } from '@/services/VacationPeriodsService';
import { VacationPeriodModal } from './VacationPeriodModal';
import { useToast } from '@/hooks/use-toast';

interface VacationPeriodsSectionProps {
  employeeId?: string;
  companyId: string;
  isReadOnly?: boolean;
}

export const VacationPeriodsSection = ({ 
  employeeId, 
  companyId, 
  isReadOnly = false 
}: VacationPeriodsSectionProps) => {
  const [periods, setPeriods] = useState<VacationPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (employeeId) {
      loadPeriods();
    }
  }, [employeeId]);

  const loadPeriods = async () => {
    if (!employeeId) return;
    
    setIsLoading(true);
    try {
      const result = await VacationPeriodsService.getPeriodsByEmployee(employeeId);
      if (result.success) {
        setPeriods(result.data || []);
      } else {
        console.error('Error loading vacation periods:', result.error);
      }
    } catch (error) {
      console.error('Error loading vacation periods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPeriod = async (periodData: { 
    start_date: string; 
    end_date: string; 
    observations?: string; 
  }) => {
    if (!employeeId) return;

    try {
      const result = await VacationPeriodsService.createPeriod({
        employee_id: employeeId,
        company_id: companyId,
        ...periodData
      });

      if (result.success) {
        toast({
          title: "Período agregado",
          description: "El período de vacaciones se agregó correctamente",
          className: "border-green-200 bg-green-50"
        });
        loadPeriods();
        setShowModal(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo agregar el período",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error inesperado al agregar el período",
        variant: "destructive"
      });
    }
  };

  const handleDeletePeriod = async (periodId: string) => {
    try {
      const result = await VacationPeriodsService.deletePeriod(periodId);
      
      if (result.success) {
        toast({
          title: "Período eliminado",
          description: "El período de vacaciones se eliminó correctamente"
        });
        loadPeriods();
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo eliminar el período",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error inesperado al eliminar el período",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Badge variant="outline" className="text-orange-600 border-orange-300"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
      case 'liquidado':
        return <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Liquidado</Badge>;
      case 'cancelado':
        return <Badge variant="outline" className="text-gray-600 border-gray-300">Cancelado</Badge>;
      default:
        return null;
    }
  };

  if (!employeeId) {
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Vacaciones Aprobadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Guarda el empleado primero para gestionar períodos de vacaciones
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Vacaciones Aprobadas
          </CardTitle>
          {!isReadOnly && (
            <Button
              onClick={() => setShowModal(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Cargando períodos...</p>
            </div>
          ) : periods.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay períodos de vacaciones registrados
            </p>
          ) : (
            <div className="space-y-3">
              {periods.map((period) => (
                <div
                  key={period.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-gray-900">
                        {formatDate(period.start_date)} - {formatDate(period.end_date)}
                      </span>
                      <span className="text-sm text-gray-600">
                        ({period.days_count} días)
                      </span>
                      {getStatusBadge(period.status)}
                    </div>
                    {period.observations && (
                      <p className="text-sm text-gray-600">{period.observations}</p>
                    )}
                  </div>
                  {!isReadOnly && period.status === 'pendiente' && (
                    <Button
                      onClick={() => handleDeletePeriod(period.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <VacationPeriodModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleAddPeriod}
        employeeId={employeeId}
      />
    </>
  );
};
