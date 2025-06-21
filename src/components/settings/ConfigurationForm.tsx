
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ConfigurationService } from '@/services/ConfigurationService';

export const ConfigurationForm = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState(() => ConfigurationService.getConfiguration());
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      ConfigurationService.updateConfiguration(config);
      toast({
        title: "Configuración guardada",
        description: "Los valores han sido actualizados correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setConfig(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Valores Anuales 2025</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="salarioMinimo">Salario Mínimo</Label>
            <Input
              id="salarioMinimo"
              type="number"
              value={config.salarioMinimo}
              onChange={(e) => handleInputChange('salarioMinimo', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="auxilioTransporte">Auxilio de Transporte</Label>
            <Input
              id="auxilioTransporte"
              type="number"
              value={config.auxilioTransporte}
              onChange={(e) => handleInputChange('auxilioTransporte', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="uvt">UVT (Unidad de Valor Tributario)</Label>
            <Input
              id="uvt"
              type="number"
              value={config.uvt}
              onChange={(e) => handleInputChange('uvt', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Porcentajes de Nómina</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="saludEmpleado">Salud Empleado (%)</Label>
              <Input
                id="saludEmpleado"
                type="number"
                step="0.01"
                value={(config.porcentajes.saludEmpleado * 100).toFixed(2)}
                onChange={(e) => handleInputChange('porcentajes.saludEmpleado', (parseFloat(e.target.value) / 100).toString())}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="pensionEmpleado">Pensión Empleado (%)</Label>
              <Input
                id="pensionEmpleado"
                type="number"
                step="0.01"
                value={(config.porcentajes.pensionEmpleado * 100).toFixed(2)}
                onChange={(e) => handleInputChange('porcentajes.pensionEmpleado', (parseFloat(e.target.value) / 100).toString())}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cesantias">Cesantías (%)</Label>
              <Input
                id="cesantias"
                type="number"
                step="0.01"
                value={(config.porcentajes.cesantias * 100).toFixed(2)}
                onChange={(e) => handleInputChange('porcentajes.cesantias', (parseFloat(e.target.value) / 100).toString())}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="prima">Prima (%)</Label>
              <Input
                id="prima"
                type="number"
                step="0.01"
                value={(config.porcentajes.prima * 100).toFixed(2)}
                onChange={(e) => handleInputChange('porcentajes.prima', (parseFloat(e.target.value) / 100).toString())}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="vacaciones">Vacaciones (%)</Label>
            <Input
              id="vacaciones"
              type="number"
              step="0.01"
              value={(config.porcentajes.vacaciones * 100).toFixed(2)}
              onChange={(e) => handleInputChange('porcentajes.vacaciones', (parseFloat(e.target.value) / 100).toString())}
              className="mt-1"
            />
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isLoading}
          className="w-full mt-6"
        >
          {isLoading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </Card>
    </div>
  );
};
