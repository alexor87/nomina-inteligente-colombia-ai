
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Info } from 'lucide-react';
import { TimeOffService, TimeOffRecord } from '@/services/TimeOffService';

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
          <div className="text-center py-6">
            <Info className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">
              Guarda el empleado primero para ver los registros de tiempo libre
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-blue-600" />
          Tiempo Libre
          <Badge variant="outline" className="ml-2 text-xs bg-gray-50 text-gray-600 border-gray-300">
            Solo lectura
          </Badge>
        </CardTitle>
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
              Los registros de vacaciones, licencias y ausencias aparecerán aquí
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
