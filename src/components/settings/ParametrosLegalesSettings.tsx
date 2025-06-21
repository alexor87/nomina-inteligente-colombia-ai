
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ConfigurationService } from '@/services/ConfigurationService';

export const ParametrosLegalesSettings = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState(() => ConfigurationService.getConfiguration());
  const [selectedYear, setSelectedYear] = useState('2025');

  const handleSave = () => {
    try {
      ConfigurationService.updateConfiguration(config);
      toast({
        title: "Parámetros legales guardados",
        description: `Los valores para el año ${selectedYear} han sido actualizados correctamente.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los parámetros legales.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setConfig(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const handlePercentageChange = (field: string, value: string) => {
    const numericValue = parseFloat(value) / 100 || 0;
    setConfig(prev => ({
      ...prev,
      porcentajes: {
        ...prev.porcentajes,
        [field]: numericValue
      }
    }));
  };

  const loadRecommendedValues = () => {
    const recommendedConfig = {
      ...config,
      salarioMinimo: 1300000,
      auxilioTransporte: 200000,
      uvt: 47065
    };
    setConfig(recommendedConfig);
    toast({
      title: "Valores recomendados cargados",
      description: "Se han cargado los valores oficiales para 2025.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">📅 Parámetros Legales del Año</h2>
          <p className="text-gray-600">Mantén actualizado el sistema con la legislación vigente</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Label htmlFor="year">Año:</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Valores Base {selectedYear}</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="salarioMinimo">SMMLV (Salario Mínimo Mensual Legal Vigente)</Label>
              <Input
                id="salarioMinimo"
                type="number"
                value={config.salarioMinimo}
                onChange={(e) => handleInputChange('salarioMinimo', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">Valor oficial para {selectedYear}</p>
            </div>

            <div>
              <Label htmlFor="auxilioTransporte">Subsidio de Transporte</Label>
              <Input
                id="auxilioTransporte"
                type="number"
                value={config.auxilioTransporte}
                onChange={(e) => handleInputChange('auxilioTransporte', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">Para empleados con salario ≤ 2 SMMLV</p>
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
              <p className="text-sm text-gray-500 mt-1">Base para cálculos tributarios</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Topes de Cotización</h3>
          
          <div className="space-y-4">
            <div>
              <Label>Tope Mínimo</Label>
              <Input
                type="number"
                value={config.salarioMinimo * 0.4}
                readOnly
                className="mt-1 bg-gray-50"
              />
              <p className="text-sm text-gray-500 mt-1">40% del SMMLV</p>
            </div>

            <div>
              <Label>Tope Máximo</Label>
              <Input
                type="number"
                value={config.salarioMinimo * 25}
                readOnly
                className="mt-1 bg-gray-50"
              />
              <p className="text-sm text-gray-500 mt-1">25 SMMLV</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Información</h4>
              <p className="text-sm text-blue-700">
                Los topes se calculan automáticamente basados en el SMMLV configurado.
                Estos valores son utilizados para las cotizaciones de seguridad social.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Porcentajes de Aportes y Prestaciones</h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="saludEmpleado">Salud Empleado (%)</Label>
            <Input
              id="saludEmpleado"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.saludEmpleado * 100).toFixed(2)}
              onChange={(e) => handlePercentageChange('saludEmpleado', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="pensionEmpleado">Pensión Empleado (%)</Label>
            <Input
              id="pensionEmpleado"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.pensionEmpleado * 100).toFixed(2)}
              onChange={(e) => handlePercentageChange('pensionEmpleado', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="cesantias">Cesantías (%)</Label>
            <Input
              id="cesantias"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.cesantias * 100).toFixed(4)}
              onChange={(e) => handlePercentageChange('cesantias', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="prima">Prima (%)</Label>
            <Input
              id="prima"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.prima * 100).toFixed(4)}
              onChange={(e) => handlePercentageChange('prima', e.target.value)}
              className="mt1"
            />
          </div>

          <div>
            <Label htmlFor="vacaciones">Vacaciones (%)</Label>
            <Input
              id="vacaciones"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.vacaciones * 100).toFixed(4)}
              onChange={(e) => handlePercentageChange('vacaciones', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="arl">ARL (%)</Label>
            <Input
              id="arl"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.arl * 100).toFixed(3)}
              onChange={(e) => handlePercentageChange('arl', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="cajaCompensacion">Caja Compensación (%)</Label>
            <Input
              id="cajaCompensacion"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.cajaCompensacion * 100).toFixed(2)}
              onChange={(e) => handlePercentageChange('cajaCompensacion', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="icbf">ICBF (%)</Label>
            <Input
              id="icbf"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.icbf * 100).toFixed(2)}
              onChange={(e) => handlePercentageChange('icbf', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          Guardar Parámetros {selectedYear}
        </Button>
        <Button variant="outline">
          Revertir Cambios
        </Button>
        <Button variant="secondary" onClick={loadRecommendedValues}>
          Cargar Valores Oficiales {selectedYear}
        </Button>
      </div>
    </div>
  );
};
