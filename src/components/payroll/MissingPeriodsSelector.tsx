
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Plus, AlertTriangle, Clock } from 'lucide-react';
import { PeriodGenerationService, MissingPeriod, AvailablePeriod } from '@/services/payroll/PeriodGenerationService';
import { useToast } from '@/hooks/use-toast';

interface MissingPeriodsSelectorProps {
  companyId: string;
  onPeriodCreated: (period: AvailablePeriod) => void;
  disabled?: boolean;
}

export const MissingPeriodsSelector: React.FC<MissingPeriodsSelectorProps> = ({
  companyId,
  onPeriodCreated,
  disabled = false
}) => {
  const [missingPeriods, setMissingPeriods] = useState<MissingPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (companyId) {
      loadMissingPeriods();
    }
  }, [companyId]);

  const loadMissingPeriods = async () => {
    setIsLoading(true);
    try {
      console.log('📋 Cargando períodos faltantes...');
      const missing = await PeriodGenerationService.getMissingPeriods(companyId);
      setMissingPeriods(missing);
      console.log(`✅ Períodos faltantes cargados: ${missing.length}`);
    } catch (error) {
      console.error('❌ Error cargando períodos faltantes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los períodos faltantes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePeriod = async (missingPeriod: MissingPeriod) => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      console.log(`🎯 Creando período: ${missingPeriod.etiqueta_visible}`);
      
      const createdPeriod = await PeriodGenerationService.createPeriodOnDemand(companyId, missingPeriod);
      
      if (createdPeriod) {
        toast({
          title: "Período creado",
          description: `${missingPeriod.etiqueta_visible} ha sido creado exitosamente`,
        });
        
        // Recargar períodos faltantes
        await loadMissingPeriods();
        
        // Notificar al componente padre
        onPeriodCreated(createdPeriod);
        
        console.log('✅ Período creado y seleccionado');
      } else {
        toast({
          title: "Error",
          description: "No se pudo crear el período",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error creando período:', error);
      toast({
        title: "Error",
        description: "Error interno al crear el período",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-blue-700 text-sm">Buscando períodos anteriores...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (missingPeriods.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <Clock className="h-4 w-4 text-green-600" />
            <p className="text-green-700 text-sm">
              Todos los períodos del año están disponibles
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-orange-800">
          <Calendar className="h-5 w-5" />
          <span>Períodos Anteriores Disponibles</span>
          <Badge variant="outline" className="text-xs">
            {missingPeriods.length} disponibles
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-orange-700">
          Selecciona un período anterior para crear y liquidar
        </p>
        
        <div className="grid gap-2 max-h-48 overflow-y-auto">
          {missingPeriods.slice(0, 10).map((period) => (
            <div
              key={period.numero_periodo_anual}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-300 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {period.etiqueta_visible}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    #{period.numero_periodo_anual}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {period.fecha_inicio} - {period.fecha_fin}
                </div>
                {period.warning && (
                  <div className="flex items-center space-x-1 mt-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    <span className="text-xs text-amber-600">{period.warning}</span>
                  </div>
                )}
              </div>
              
              <Button
                size="sm"
                onClick={() => handleCreatePeriod(period)}
                disabled={disabled || isCreating || !period.can_create}
                className="flex items-center space-x-1 bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="h-3 w-3" />
                <span>Crear y Usar</span>
              </Button>
            </div>
          ))}
        </div>
        
        {missingPeriods.length > 10 && (
          <p className="text-xs text-orange-600 text-center">
            ... y {missingPeriods.length - 10} períodos más disponibles
          </p>
        )}
        
        <Alert className="border-orange-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-orange-700">
            Los períodos se crean automáticamente cuando los seleccionas. 
            Puedes liquidar cualquier período anterior del año 2025.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
