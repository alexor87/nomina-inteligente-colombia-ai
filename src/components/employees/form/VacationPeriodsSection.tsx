import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, CheckCircle2, Clock, Award, UserX } from 'lucide-react';
import { VacationPeriodsService, VacationPeriod } from '@/services/VacationPeriodsService';
import { VacationPeriodModal } from './VacationPeriodModal';
import { AbsenceModal } from './AbsenceModal';
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
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
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

  const handleVacationSaved = () => {
    loadPeriods();
  };

  const handleAbsenceSaved = () => {
    toast({
      title: "Ausencia registrada ✅",
      description: "La ausencia se registró correctamente para el período de nómina",
      className: "border-green-200 bg-green-50"
    });
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
      case 'confirmado':
        return (
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
            <Award className="w-3 h-3 mr-1" />
            Confirmado
          </Badge>
        );
      case 'liquidado':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Liquidado
          </Badge>
        );
      case 'cancelado':
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-300">
            Cancelado
          </Badge>
        );
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
            Vacaciones y Ausencias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Guarda el empleado primero para gestionar períodos de vacaciones y ausencias
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
            Vacaciones y Ausencias
            <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
              Registro Directo
            </Badge>
          </CardTitle>
          {!isReadOnly && (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAbsenceModal(true)}
                size="sm"
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <UserX className="w-4 h-4 mr-1" />
                Ausencia
              </Button>
              <Button
                onClick={() => setShowVacationModal(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Vacaciones
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Cargando períodos...</p>
            </div>
          ) : periods.length === 0 ? (
            <div className="text-center py-6">
              <Award className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">
                No hay períodos registrados
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Registra vacaciones y ausencias desde aquí
              </p>
            </div>
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
                  {!isReadOnly && period.status === 'confirmado' && (
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
        isOpen={showVacationModal}
        onClose={() => setShowVacationModal(false)}
        onSave={handleVacationSaved}
        employeeId={employeeId}
      />

      <AbsenceModal
        isOpen={showAbsenceModal}
        onClose={() => setShowAbsenceModal(false)}
        onSave={handleAbsenceSaved}
        employeeId={employeeId}
        companyId={companyId}
      />
    </>
  );
};
