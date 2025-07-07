
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, AlertCircle, Plus, CheckCircle } from 'lucide-react';
import { PeriodGenerationService, AvailablePeriod } from '@/services/payroll/PeriodGenerationService';
import { useToast } from '@/hooks/use-toast';

interface PeriodSelectorProps {
  companyId: string;
  onPeriodSelect: (period: AvailablePeriod) => void;
  onManualEntry: () => void;
  disabled?: boolean;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  companyId,
  onPeriodSelect,
  onManualEntry,
  disabled = false
}) => {
  const [periods, setPeriods] = useState<AvailablePeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (companyId) {
      console.log('🎯 PeriodSelector: Cargando períodos para company:', companyId);
      loadAvailablePeriods();
    }
  }, [companyId]);

  const loadAvailablePeriods = async () => {
    if (!companyId) {
      console.error('❌ No company ID provided to PeriodSelector');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('📋 Cargando períodos disponibles...');
      const availablePeriods = await PeriodGenerationService.getAvailablePeriods(companyId);
      
      console.log(`✅ Períodos cargados:`, availablePeriods);
      setPeriods(availablePeriods);
      
      // Auto-seleccionar el primer período disponible
      const nextPeriod = availablePeriods.find(p => p.can_select);
      if (nextPeriod?.id) {
        setSelectedPeriodId(nextPeriod.id);
        console.log('🎯 Auto-seleccionado período:', nextPeriod.etiqueta_visible);
      }
      
      if (availablePeriods.length === 0) {
        console.warn('⚠️ No se encontraron períodos disponibles');
        toast({
          title: "Sin períodos",
          description: "No se encontraron períodos disponibles para esta empresa",
          variant: "destructive"
        });
      } else {
        console.log(`📊 Total períodos: ${availablePeriods.length}, Disponibles: ${availablePeriods.filter(p => p.can_select).length}`);
      }
      
    } catch (error) {
      console.error('❌ Error cargando períodos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los períodos disponibles",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodSelection = () => {
    const selectedPeriod = periods.find(p => p.id === selectedPeriodId);
    if (!selectedPeriod) {
      toast({
        title: "Selección requerida",
        description: "Por favor selecciona un período para continuar",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedPeriod.can_select) {
      toast({
        title: "Período no disponible",
        description: selectedPeriod.reason || "Este período no está disponible",
        variant: "destructive"
      });
      return;
    }
    
    console.log('✅ Período seleccionado para liquidación:', selectedPeriod.etiqueta_visible);
    onPeriodSelect(selectedPeriod);
  };

  const handleManualEntry = () => {
    setShowManualEntry(true);
    onManualEntry();
  };

  const getStatusBadge = (period: AvailablePeriod) => {
    if (period.estado === 'cerrado') {
      return <Badge variant="secondary" className="text-xs">Liquidado</Badge>;
    }
    if (period.estado === 'en_proceso') {
      return <Badge variant="default" className="text-xs">En Proceso</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Disponible</Badge>;
  };

  const availablePeriods = periods.filter(p => p.can_select);
  const unavailablePeriods = periods.filter(p => !p.can_select);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-blue-700">Cargando períodos disponibles...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showManualEntry) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-800">
            <Calendar className="h-5 w-5" />
            <span>Creación Manual de Período</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Estas creando un período fuera de la secuencia normal. Asegúrate de que las fechas no se solapen con períodos existentes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <span>Seleccionar Período de Liquidación</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {availablePeriods.length > 0 ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Períodos Disponibles ({availablePeriods.length})
                </label>
                <Select 
                  value={selectedPeriodId} 
                  onValueChange={setSelectedPeriodId}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un período para liquidar" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {availablePeriods.map((period) => (
                      <SelectItem key={period.id} value={period.id || ''}>
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{period.etiqueta_visible}</span>
                          <div className="flex items-center space-x-2 ml-4">
                            <Badge variant="outline" className="text-xs">
                              #{period.numero_periodo_anual}
                            </Badge>
                            {getStatusBadge(period)}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPeriodId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  {(() => {
                    const selected = periods.find(p => p.id === selectedPeriodId);
                    return selected ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-800">Período Seleccionado</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Período:</span>
                            <p className="font-medium">{selected.etiqueta_visible}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Fechas:</span>
                            <p className="font-mono text-xs">{selected.fecha_inicio} - {selected.fecha_fin}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Tipo:</span>
                            <p className="capitalize">{selected.tipo_periodo}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Número:</span>
                            <p>#{selected.numero_periodo_anual}</p>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleManualEntry}
                className="flex items-center space-x-2"
                disabled={disabled}
              >
                <Plus className="h-4 w-4" />
                <span>Crear Período Manual</span>
              </Button>
              
              <Button
                onClick={handlePeriodSelection}
                disabled={!selectedPeriodId || disabled}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continuar con Período Seleccionado
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No hay períodos disponibles</h3>
            <p className="text-gray-600 mb-4">
              Todos los períodos del año actual han sido liquidados o no se han generado aún.
            </p>
            <Button
              onClick={handleManualEntry}
              className="flex items-center space-x-2"
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
              <span>Crear Período Manual</span>
            </Button>
          </div>
        )}

        {unavailablePeriods.length > 0 && (
          <div className="pt-4 border-t">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                Ver períodos no disponibles ({unavailablePeriods.length})
              </summary>
              <div className="mt-2 space-y-2">
                {unavailablePeriods.slice(0, 5).map((period) => (
                  <div key={period.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm">
                    <span className="text-gray-700">{period.etiqueta_visible}</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        #{period.numero_periodo_anual}
                      </Badge>
                      {getStatusBadge(period)}
                    </div>
                  </div>
                ))}
                {unavailablePeriods.length > 5 && (
                  <p className="text-xs text-gray-500 text-center">
                    ... y {unavailablePeriods.length - 5} más
                  </p>
                )}
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
