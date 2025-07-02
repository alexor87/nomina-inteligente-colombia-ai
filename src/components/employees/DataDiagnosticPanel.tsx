
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  RefreshCw, 
  Database, 
  Users, 
  FileText, 
  Calendar,
  Receipt,
  Bell,
  Activity,
  Upload,
  MessageSquare,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useDataCleanup } from '@/hooks/useDataCleanup';
import { DiagnosticData } from '@/services/payroll-intelligent/DataCleanupService';

interface DataDiagnosticPanelProps {
  companyIdentifier: string;
  onDataChange?: () => void;
}

export const DataDiagnosticPanel: React.FC<DataDiagnosticPanelProps> = ({
  companyIdentifier,
  onDataChange
}) => {
  const { runDiagnostic, isDiagnosing, diagnosticData } = useDataCleanup();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const handleDiagnostic = async () => {
    try {
      await runDiagnostic(companyIdentifier);
      setLastRefresh(new Date());
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error('Error en diagnóstico:', error);
    }
  };

  useEffect(() => {
    if (companyIdentifier) {
      handleDiagnostic();
    }
  }, [companyIdentifier]);

  const getIconForTable = (tableName: string) => {
    switch (tableName) {
      case 'employees': return <Users className="h-4 w-4" />;
      case 'payrolls': return <FileText className="h-4 w-4" />;
      case 'periods': return <Calendar className="h-4 w-4" />;
      case 'vouchers': return <Receipt className="h-4 w-4" />;
      case 'novedades': return <AlertTriangle className="h-4 w-4" />;
      case 'notes': return <MessageSquare className="h-4 w-4" />;
      case 'imports': return <Upload className="h-4 w-4" />;
      case 'activity': return <Activity className="h-4 w-4" />;
      case 'notifications': return <Bell className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getTableDisplayName = (tableName: string) => {
    const names: Record<string, string> = {
      employees: 'Empleados',
      payrolls: 'Nóminas',
      periods: 'Períodos',
      vouchers: 'Comprobantes',
      novedades: 'Novedades',
      notes: 'Notas',
      imports: 'Importaciones',
      activity: 'Actividad',
      notifications: 'Notificaciones'
    };
    return names[tableName] || tableName;
  };

  const totalRecords = diagnosticData ? 
    Object.values(diagnosticData).reduce((sum, count) => sum + count, 0) : 0;

  const isEmpty = totalRecords === 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Diagnóstico de Datos en Tiempo Real
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="text-xs text-gray-500">
                Actualizado: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiagnostic}
              disabled={isDiagnosing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isDiagnosing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEmpty ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>✨ ¡Cuenta completamente limpia! ✨</strong>
              <br />
              No se encontraron datos de empleados, nóminas o registros relacionados. 
              La cuenta está como nueva y lista para usar.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Se encontraron {totalRecords} registros</strong>
              <br />
              La cuenta aún contiene datos que deben ser eliminados para dejarla completamente limpia.
            </AlertDescription>
          </Alert>
        )}

        {diagnosticData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(diagnosticData).map(([tableName, count]) => (
              <div
                key={tableName}
                className={`p-4 rounded-lg border ${
                  count > 0 
                    ? 'border-red-200 bg-red-50' 
                    : 'border-green-200 bg-green-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getIconForTable(tableName)}
                    <span className="font-medium text-sm">
                      {getTableDisplayName(tableName)}
                    </span>
                  </div>
                  <Badge 
                    variant={count > 0 ? "destructive" : "secondary"}
                    className={count > 0 ? "bg-red-100 text-red-800 border-red-300" : "bg-green-100 text-green-800 border-green-300"}
                  >
                    {count}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center pt-4">
          <div className="text-sm text-gray-600">
            Empresa: <strong>{companyIdentifier}</strong>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Este diagnóstico muestra todos los datos existentes en la base de datos
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
