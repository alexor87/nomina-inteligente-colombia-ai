
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, Clock } from 'lucide-react';
import { TimeOffService, TimeOffRecord } from '@/services/TimeOffService';
import { TimeOffModal } from './TimeOffModal';
import { useToast } from '@/hooks/use-toast';

interface TimeOffSectionProps {
  employeeId?: string;
  isReadOnly?: boolean;
}

export const TimeOffSection = ({ 
  employeeId, 
  isReadOnly = false
}: TimeOffSectionProps) => {
  const [records, setRecords] = useState<TimeOffRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (employeeId) {
      loadRecords();
    }
  }, [employeeId]);

  const loadRecords = async () => {
    if (!employeeId) return;
    
    setIsLoading(true);
    try {
      const result = await TimeOffService.getEmployeeTimeOff(employeeId);
      if (result.success) {
        setRecords(result.data || []);
      } else {
        console.error('Error loading time off records:', result.error);
      }
    } catch (error) {
      console.error('Error loading time off records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordSaved = () => {
    // ✅ KISS: Refresh inmediato, sin delays artificiales
    loadRecords();
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const result = await TimeOffService.deleteTimeOff(recordId);
      
      if (result.success) {
        toast({
          title: "Registro eliminado",
          description: "El registro se eliminó correctamente"
        });
        loadRecords();
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo eliminar el registro",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error inesperado al eliminar el registro",
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

  if (!employeeId) {
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Tiempo Libre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Guarda el empleado primero para gestionar registros de tiempo libre
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
            Tiempo Libre
            <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
              KISS Simple
            </Badge>
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
              <p className="text-gray-500 mt-2">Cargando registros...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">
                No hay registros de tiempo libre
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Registra vacaciones, licencias y ausencias desde aquí
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${TimeOffService.getTypeColor(record.type)}`}
                      >
                        {TimeOffService.getTypeLabel(record.type)}
                      </Badge>
                      <span className="font-medium text-gray-900">
                        {formatDate(record.start_date)} - {formatDate(record.end_date)}
                      </span>
                      <span className="text-sm text-gray-600">
                        ({record.days} días)
                      </span>
                    </div>
                    {record.observations && (
                      <p className="text-sm text-gray-600">{record.observations}</p>
                    )}
                  </div>
                  {!isReadOnly && (
                    <Button
                      onClick={() => handleDeleteRecord(record.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TimeOffModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleRecordSaved}
        employeeId={employeeId}
      />
    </>
  );
};
