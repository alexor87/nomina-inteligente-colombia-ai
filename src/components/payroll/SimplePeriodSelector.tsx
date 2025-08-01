import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2, Settings } from 'lucide-react';
import { SimplePeriodService, SelectablePeriod } from '@/services/payroll/SimplePeriodService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ConfigurationService } from '@/services/ConfigurationService';
import { MissingConfigurationModal } from './modals/MissingConfigurationModal';
import { useYear } from '@/contexts/YearContext';

interface SimplePeriodSelectorProps {
  companyId: string;
  onPeriodSelected: (period: SelectablePeriod & { year?: string }) => void;
  disabled?: boolean;
}

export const SimplePeriodSelector: React.FC<SimplePeriodSelectorProps> = ({
  companyId,
  onPeriodSelected,
  disabled = false
}) => {
  const [periods, setPeriods] = useState<SelectablePeriod[]>([]);
  const [selectedPeriodNumber, setSelectedPeriodNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [periodicity, setPeriodicity] = useState<string>('mensual');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [hasValidConfiguration, setHasValidConfiguration] = useState(true);
  const { toast } = useToast();
  
  // ✅ NUEVO: Usar contexto de año
  const { selectedYear, setSelectedYear, availableYears } = useYear();

  useEffect(() => {
    if (companyId) {
      loadPeriods();
    }
  }, [companyId, selectedYear]);

  const validateConfigurationAndLoadPeriods = async () => {
    setIsLoading(true);
    try {
      // Verificar si existe configuración legal para el año seleccionado
      const availableConfigYears = ConfigurationService.getAvailableYears();
      const hasConfiguration = availableConfigYears.includes(selectedYear);
      
      if (!hasConfiguration) {
        setHasValidConfiguration(false);
        setPeriods([]);
        setSelectedPeriodNumber('');
        
        setShowConfigModal(true);
        
        toast({
          title: "Configuración requerida",
          description: `No existe configuración legal para el año ${selectedYear}. Se abrirá el modal de configuración.`,
          variant: "destructive"
        });
        return;
      }

      setHasValidConfiguration(true);

      // Obtener configuración de periodicidad
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      const currentPeriodicity = companySettings?.periodicity || 'mensual';
      setPeriodicity(currentPeriodicity);

      const loadedPeriods = await SimplePeriodService.getSelectablePeriods(companyId, parseInt(selectedYear));
      setPeriods(loadedPeriods);
      
      // Auto-seleccionar el primer período disponible
      const firstAvailable = loadedPeriods.find(p => p.canSelect);
      if (firstAvailable) {
        setSelectedPeriodNumber(firstAvailable.periodNumber.toString());
      }
      
    } catch (error) {
      console.error('Error cargando períodos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los períodos disponibles",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPeriods = validateConfigurationAndLoadPeriods;

  const handleCloseConfigModal = () => {
    setShowConfigModal(false);
  };

  const handleContinue = async () => {
    const selectedPeriod = periods.find(p => p.periodNumber.toString() === selectedPeriodNumber);
    
    if (!selectedPeriod) {
      toast({
        title: "Selección requerida",
        description: "Por favor selecciona un período para continuar",
        variant: "destructive"
      });
      return;
    }

    if (!selectedPeriod.canSelect) {
      toast({
        title: "Período no disponible",
        description: "Este período ya fue liquidado",
        variant: "destructive"
      });
      return;
    }

    setIsSelecting(true);
    try {
      const finalPeriod = await SimplePeriodService.selectPeriod(companyId, selectedPeriod);
      
      if (finalPeriod) {
        // ✅ NUEVO: Pasar el año seleccionado junto con el período
        onPeriodSelected({ ...finalPeriod, year: selectedYear });
      } else {
        toast({
          title: "Error",
          description: "No se pudo seleccionar el período",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error seleccionando período:', error);
      toast({
        title: "Error",
        description: "Error interno al seleccionar período",
        variant: "destructive"
      });
    } finally {
      setIsSelecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <p className="text-blue-700">Cargando períodos {selectedYear}...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availablePeriods = periods.filter(p => p.canSelect);
  const selectedPeriod = periods.find(p => p.periodNumber.toString() === selectedPeriodNumber);

  const getPeriodTypeLabel = (type: string) => {
    const labels = {
      'mensual': 'Mensual',
      'quincenal': 'Quincenal', 
      'semanal': 'Semanal'
    };
    return labels[type] || type;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Seleccionar Período de Nómina</span>
            <Badge variant="outline" className="text-xs bg-blue-50">
              {selectedYear}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {getPeriodTypeLabel(periodicity)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de Año - Siempre visible */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Seleccionar Año
              </label>
              <Select 
                value={selectedYear} 
                onValueChange={(value) => {
                  setSelectedYear(value);
                  setSelectedPeriodNumber(''); // Reset period selection when year changes
                }}
                disabled={disabled || isSelecting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un año" />
                </SelectTrigger>
                <SelectContent className="max-h-64 bg-white">
                  {availableYears.map((year) => (
                    <SelectItem 
                      key={year} 
                      value={year}
                      className="hover:bg-gray-50"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!hasValidConfiguration ? (
            <div className="text-center py-12 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Settings className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-yellow-800 font-medium mb-2">Configuración Legal Requerida</p>
              <p className="text-yellow-700 text-sm mb-4">
                No existe configuración legal para el año {selectedYear}.
              </p>
              <p className="text-yellow-600 text-xs">
                Debes configurar los parámetros legales (salario mínimo, UVT, porcentajes, etc.) antes de crear períodos de nómina.
              </p>
            </div>
          ) : availablePeriods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No hay períodos disponibles para liquidar en {selectedYear}</p>
              <p className="text-sm text-gray-500 mt-2">Prueba seleccionando otro año</p>
            </div>
          ) : (
            <>

              <div>
                <Select 
                  value={selectedPeriodNumber} 
                  onValueChange={setSelectedPeriodNumber}
                  disabled={disabled || isSelecting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un período" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 bg-white">
                    {availablePeriods.map((period) => (
                      <SelectItem 
                        key={period.periodNumber} 
                        value={period.periodNumber.toString()}
                        className="hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{period.label}</span>
                          {period.needsCreation && (
                            <Badge variant="outline" className="text-xs ml-2 bg-green-50 text-green-700">
                              Nuevo
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPeriod && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Período Seleccionado</span>
                    </div>
                    <p className="text-blue-700">del 16 - 28 o 29 si es año bisiesto</p>
                    <p className="text-sm text-blue-600">
                      {selectedPeriod.startDate} al {selectedPeriod.endDate}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleContinue}
                  disabled={!selectedPeriodNumber || disabled || isSelecting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSelecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Procesando...
                    </>
                  ) : (
                    'Continuar con Período'
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de configuración requerida */}
      <MissingConfigurationModal 
        isOpen={showConfigModal}
        onClose={handleCloseConfigModal}
        year={selectedYear}
      />
    </>
  );
};
