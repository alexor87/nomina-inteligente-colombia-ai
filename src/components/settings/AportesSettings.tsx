
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export const AportesSettings = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    operadorPILA: 'SOI',
    nivelRiesgoARL: 1,
    topeMinimoCotizacion: 40,
    topeMaximoCotizacion: 25
  });

  const handleSave = () => {
    toast({
      title: "Configuración guardada",
      description: "Los parámetros de aportes y seguridad social han sido actualizados.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">💰 Aportes y Seguridad Social</h2>
        <p className="text-gray-600">Configuración de operadores PILA y niveles de riesgo</p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Operador PILA y ARL</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="operadorPILA">Operador PILA por Defecto</Label>
            <Select value={config.operadorPILA} onValueChange={(value) => setConfig(prev => ({ ...prev, operadorPILA: value }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SOI">SOI</SelectItem>
                <SelectItem value="MiPlanilla">MiPlanilla</SelectItem>
                <SelectItem value="Aportes en Línea">Aportes en Línea</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="nivelRiesgo">Nivel de Riesgo ARL</Label>
            <Select 
              value={config.nivelRiesgoARL.toString()} 
              onValueChange={(value) => setConfig(prev => ({ ...prev, nivelRiesgoARL: parseInt(value) }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Nivel I - Riesgo Mínimo</SelectItem>
                <SelectItem value="2">Nivel II - Riesgo Bajo</SelectItem>
                <SelectItem value="3">Nivel III - Riesgo Medio</SelectItem>
                <SelectItem value="4">Nivel IV - Riesgo Alto</SelectItem>
                <SelectItem value="5">Nivel V - Riesgo Máximo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Porcentaje ARL Actual</Label>
            <Input
              value="0.522%"
              readOnly
              className="mt-1 bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Basado en nivel de riesgo seleccionado</p>
          </div>
        </div>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          Guardar Configuración
        </Button>
        <Button variant="outline">
          Revertir Cambios
        </Button>
      </div>
    </div>
  );
};
