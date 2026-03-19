import React, { useState, useEffect } from 'react';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Calendar, CheckCircle } from 'lucide-react';
import { ConfigurationService, PayrollConfiguration } from '@/services/ConfigurationService';
import { EndOfYearSituation } from '@/services/EndOfYearDetectionService';
import { useToast } from '@/hooks/use-toast';

interface NewYearConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  endOfYearSituation: EndOfYearSituation;
  onYearCreated: () => void;
}

export const NewYearConfigurationModal: React.FC<NewYearConfigurationModalProps> = ({
  isOpen,
  onClose,
  endOfYearSituation,
  onYearCreated
}) => {
  const { toast } = useToast();
  
  // Estado del formulario
  const [selectedYear, setSelectedYear] = useState(endOfYearSituation.nextYear.toString());
  const [baseYear, setBaseYear] = useState(endOfYearSituation.currentYear.toString());
  const [isCreating, setIsCreating] = useState(false);
  const [configuration, setConfiguration] = useState<PayrollConfiguration | null>(null);

  // Años disponibles
  const [availableBaseYears, setAvailableBaseYears] = useState<string[]>([]);
  const suggestedYears = [`${endOfYearSituation.nextYear}`, `${endOfYearSituation.nextYear + 1}`];

  useEffect(() => {
    ConfigurationService.getAvailableYearsAsync().then(setAvailableBaseYears);
  }, []);

  // Cargar configuración base cuando cambia el año base
  useEffect(() => {
    if (baseYear) {
      ConfigurationService.getConfigurationAsync(baseYear).then(setConfiguration);
    }
  }, [baseYear]);
  
  const handleCreateYear = async () => {
    if (!configuration || !selectedYear) return;
    
    setIsCreating(true);
    try {
      console.log(`🗓️ Creando nuevo año ${selectedYear} basado en ${baseYear}`);
      
      // Crear el nuevo año usando el servicio existente
      const newConfig = ConfigurationService.createNewYear(selectedYear);
      
      toast({
        title: "✅ Año Creado Exitosamente",
        description: `Configuración para ${selectedYear} basada en ${baseYear}`,
        className: "border-green-200 bg-green-50"
      });
      
      // Llamar callback para actualizar la UI padre
      onYearCreated();
      
      // Cerrar modal
      onClose();
      
    } catch (error: any) {
      console.error('❌ Error creando año:', error);
      
      toast({
        title: "❌ Error al Crear Año",
        description: error.message || "No se pudo crear la configuración del año",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleSkip = () => {
    console.log('⏭️ Usuario decidió configurar después');
    onClose();
  };
  
  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={onClose}
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Configurar Nuevo Año</h2>
            <p className="text-muted-foreground">
              Se detectó que completaste diciembre. Configura los parámetros legales para {endOfYearSituation.nextYear}.
            </p>
          </div>
        </div>
        
        {/* Contexto de la situación */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-amber-800">Situación Detectada</h4>
                <div className="text-sm text-amber-700 space-y-1">
                  <p>• Último período liquidado: <strong>{endOfYearSituation.lastLiquidatedPeriod?.name}</strong></p>
                  <p>• Año actual: <strong>{endOfYearSituation.currentYear}</strong></p>
                  <p>• Próximo año sin configurar: <strong>{endOfYearSituation.nextYear}</strong></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Formulario de configuración */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Selección de año */}
          <div className="space-y-3">
            <Label htmlFor="year-select">Año a Crear</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar año" />
              </SelectTrigger>
              <SelectContent>
                {suggestedYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year} {year === endOfYearSituation.nextYear.toString() ? '(Recomendado)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Año base */}
          <div className="space-y-3">
            <Label htmlFor="base-year-select">Copiar Configuración Desde</Label>
            <Select value={baseYear} onValueChange={setBaseYear}>
              <SelectTrigger>
                <SelectValue placeholder="Año base" />
              </SelectTrigger>
              <SelectContent>
                {availableBaseYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year} {year === endOfYearSituation.currentYear.toString() ? '(Actual)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Preview de configuración */}
        {configuration && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vista Previa de Configuración</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Salario Mínimo:</span>
                  <div className="font-medium">
                    ${configuration.salarioMinimo.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Auxilio Transporte / Conectividad:</span>
                  <div className="font-medium">
                    ${configuration.auxilioTransporte.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">UVT:</span>
                  <div className="font-medium">
                    ${configuration.uvt.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Salud Empleado:</span>
                  <div className="font-medium">
                    {(configuration.porcentajes.saludEmpleado * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Pensión Empleado:</span>
                  <div className="font-medium">
                    {(configuration.porcentajes.pensionEmpleado * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">ARL:</span>
                  <div className="font-medium">
                    {(configuration.porcentajes.arl * 100).toFixed(3)}%
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Podrás ajustar estos valores después de crear el año en Configuraciones - Parámetros Legales
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Acciones */}
        <div className="flex justify-between space-x-4">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isCreating}
          >
            Configurar Después
          </Button>
          
          <Button
            onClick={handleCreateYear}
            disabled={isCreating || !selectedYear || !baseYear}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isCreating ? 'Creando...' : `Crear Año ${selectedYear}`}
          </Button>
        </div>
      </div>
    </CustomModal>
  );
};