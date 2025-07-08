
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, AlertCircle, Plus, CheckCircle, Lock, History, ExternalLink } from 'lucide-react';
import { PeriodGenerationService, UnifiedPeriod } from '@/services/payroll/PeriodGenerationService';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface PeriodSelectorProps {
  companyId: string;
  onPeriodSelect: (period: UnifiedPeriod) => void;
  onManualEntry: () => void;
  disabled?: boolean;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  companyId,
  onPeriodSelect,
  onManualEntry,
  disabled = false
}) => {
  const [allPeriods, setAllPeriods] = useState<UnifiedPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (companyId) {
      console.log('🎯 PeriodSelector HÍBRIDO: Cargando períodos para company:', companyId);
      loadAllPeriods();
    }
  }, [companyId]);

  const loadAllPeriods = async () => {
    if (!companyId) {
      console.error('❌ No company ID provided to PeriodSelector');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('📋 Cargando TODOS los períodos del año...');
      
      // Asegurar que existan todos los períodos del año
      const ensureResult = await PeriodGenerationService.ensureCompleteYearPeriods(companyId);
      console.log('🔧 Períodos asegurados:', ensureResult);
      
      // Obtener todos los períodos unificados
      const periods = await PeriodGenerationService.getAllPeriodsForYear(companyId);
      
      console.log(`✅ Períodos híbridos cargados:`, periods);
      setAllPeriods(periods);
      
      // Auto-seleccionar el primer período disponible
      const nextAvailable = periods.find(p => p.can_select && p.status_type === 'available');
      if (nextAvailable?.id) {
        setSelectedPeriodId(nextAvailable.id);
        console.log('🎯 Auto-seleccionado período:', nextAvailable.etiqueta_visible);
      }
      
      if (periods.length === 0) {
        console.warn('⚠️ No se encontraron períodos');
        toast({
          title: "Sin períodos",
          description: "No se pudieron cargar los períodos del año",
          variant: "destructive"
        });
      } else {
        const availableCount = periods.filter(p => p.can_select).length;
        const closedCount = periods.filter(p => p.status_type === 'closed').length;
        const toCreateCount = periods.filter(p => p.status_type === 'to_create').length;
        
        console.log(`📊 Total períodos: ${periods.length}, Disponibles: ${availableCount}, Cerrados: ${closedCount}, Por crear: ${toCreateCount}`);
        
        if (ensureResult.generated > 0) {
          toast({
            title: "Períodos generados",
            description: `Se crearon ${ensureResult.generated} períodos automáticamente`,
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error cargando períodos híbridos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los períodos disponibles",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodSelection = async () => {
    const selectedPeriod = allPeriods.find(p => p.id === selectedPeriodId || p.numero_periodo_anual.toString() === selectedPeriodId);
    
    if (!selectedPeriod) {
      toast({
        title: "Selección requerida",
        description: "Por favor selecciona un período para continuar",
        variant: "destructive"
      });
      return;
    }
    
    // Manejar período cerrado
    if (selectedPeriod.status_type === 'closed') {
      toast({
        title: "Período cerrado",
        description: "Este período ya fue liquidado. Puedes editarlo desde el historial.",
        variant: "destructive"
      });
      return;
    }
    
    // Manejar período que necesita creación
    if (selectedPeriod.status_type === 'to_create') {
      setIsCreating(true);
      try {
        console.log(`🎯 Creando período automáticamente: ${selectedPeriod.etiqueta_visible}`);
        
        const createdPeriod = await PeriodGenerationService.createPeriodFromUnified(companyId, selectedPeriod);
        
        if (createdPeriod) {
          toast({
            title: "Período creado",
            description: `${selectedPeriod.etiqueta_visible} ha sido creado exitosamente`,
          });
          
          // Recargar períodos
          await loadAllPeriods();
          
          // Seleccionar el período recién creado
          console.log('✅ Período creado y seleccionado automáticamente');
          onPeriodSelect(createdPeriod);
        } else {
          toast({
            title: "Error",
            description: "No se pudo crear el período automáticamente",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('❌ Error creando período automáticamente:', error);
        toast({
          title: "Error",
          description: "Error interno al crear el período",
          variant: "destructive"
        });
      } finally {
        setIsCreating(false);
      }
      return;
    }
    
    // Período disponible normal
    console.log('✅ Período seleccionado para liquidación:', selectedPeriod.etiqueta_visible);
    onPeriodSelect(selectedPeriod);
  };

  const handleManualEntry = () => {
    setShowManualEntry(true);
    onManualEntry();
  };

  const handleViewInHistory = () => {
    navigate('/app/payroll-history');
  };

  const getStatusBadge = (period: UnifiedPeriod) => {
    switch (period.status_type) {
      case 'available':
        return <Badge variant="default" className="text-xs bg-green-100 text-green-800">Disponible</Badge>;
      case 'closed':
        return <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">Liquidado</Badge>;
      case 'to_create':
        return <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">Crear</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">-</Badge>;
    }
  };

  const getStatusIcon = (period: UnifiedPeriod) => {
    switch (period.status_type) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'closed':
        return <Lock className="h-4 w-4 text-red-600" />;
      case 'to_create':
        return <Plus className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-blue-700">Cargando períodos del año...</p>
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

  const availablePeriods = allPeriods.filter(p => p.status_type === 'available');
  const closedPeriods = allPeriods.filter(p => p.status_type === 'closed');
  const toCreatePeriods = allPeriods.filter(p => p.status_type === 'to_create');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <span>Seleccionar Período de Liquidación</span>
          <Badge variant="outline" className="text-xs">
            {allPeriods.length} períodos del año
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="font-bold text-green-800">{availablePeriods.length}</div>
            <div className="text-xs text-green-600">Disponibles</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="font-bold text-red-800">{closedPeriods.length}</div>
            <div className="text-xs text-red-600">Liquidados</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="font-bold text-blue-800">{toCreatePeriods.length}</div>
            <div className="text-xs text-blue-600">Por crear</div>
          </div>
        </div>

        {/* Selector unificado */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Todos los Períodos del Año ({allPeriods.length})
            </label>
            <Select 
              value={selectedPeriodId} 
              onValueChange={setSelectedPeriodId}
              disabled={disabled || isCreating}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un período para liquidar" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {allPeriods.map((period) => (
                  <SelectItem 
                    key={period.id || period.numero_periodo_anual} 
                    value={period.id || period.numero_periodo_anual.toString()}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(period)}
                        <span className="font-medium">{period.etiqueta_visible}</span>
                      </div>
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

          {/* Información del período seleccionado */}
          {selectedPeriodId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              {(() => {
                const selected = allPeriods.find(p => p.id === selectedPeriodId || p.numero_periodo_anual.toString() === selectedPeriodId);
                return selected ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(selected)}
                      <span className="font-medium text-blue-800">Período Seleccionado</span>
                      {getStatusBadge(selected)}
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
                    
                    {/* Mensaje específico por estado */}
                    {selected.reason && (
                      <Alert className={
                        selected.status_type === 'closed' ? 'border-red-200 bg-red-50' :
                        selected.status_type === 'to_create' ? 'border-blue-200 bg-blue-50' :
                        'border-green-200 bg-green-50'
                      }>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className={
                          selected.status_type === 'closed' ? 'text-red-700' :
                          selected.status_type === 'to_create' ? 'text-blue-700' :
                          'text-green-700'
                        }>
                          {selected.reason}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Botón especial para períodos cerrados */}
                    {selected.status_type === 'closed' && (
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleViewInHistory}
                          className="flex items-center space-x-1"
                        >
                          <History className="h-3 w-3" />
                          <span>Ver en Historial</span>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleManualEntry}
            className="flex items-center space-x-2"
            disabled={disabled || isCreating}
          >
            <Plus className="h-4 w-4" />
            <span>Crear Período Manual</span>
          </Button>
          
          <Button
            onClick={handlePeriodSelection}
            disabled={!selectedPeriodId || disabled || isCreating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isCreating ? 'Creando...' : 'Continuar con Período Seleccionado'}
          </Button>
        </div>

        {/* Resumen de estados */}
        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
          <strong>Estados:</strong> ✅ Disponible = Listo para liquidar | 🔒 Liquidado = Ver en historial | ➕ Crear = Se crea automáticamente
        </div>
      </CardContent>
    </Card>
  );
};
