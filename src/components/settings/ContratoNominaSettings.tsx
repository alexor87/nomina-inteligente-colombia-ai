
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

export const ContratoNominaSettings = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    tiposContrato: ['indefinido', 'fijo', 'obra', 'aprendizaje'],
    diasLaborablesPeriodo: 30,
    jornadaEstandar: 8,
    politicaRedondeo: 'centavos',
    decimales: 0,
    prestacionesActivadas: {
      prima: true,
      cesantias: true,
      vacaciones: true,
      interesesCesantias: true
    },
    reglasRetencion: 'oficial',
    bonificacionesPersonalizadas: ''
  });

  const handleSave = () => {
    toast({
      title: "Configuración guardada",
      description: "Los parámetros de contrato y nómina han sido actualizados.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">📄 Contrato y Nómina</h2>
        <p className="text-gray-600">Configuración de tipos de contrato y parámetros de liquidación</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Configuración Básica</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="diasLaborables">Días Laborables por Período</Label>
              <Input
                id="diasLaborables"
                type="number"
                value={config.diasLaborablesPeriodo}
                onChange={(e) => setConfig(prev => ({ ...prev, diasLaborablesPeriodo: parseInt(e.target.value) || 30 }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="jornadaEstandar">Jornada Estándar (horas/día)</Label>
              <Input
                id="jornadaEstandar"
                type="number"
                value={config.jornadaEstandar}
                onChange={(e) => setConfig(prev => ({ ...prev, jornadaEstandar: parseInt(e.target.value) || 8 }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="politicaRedondeo">Política de Redondeo</Label>
              <Select 
                value={config.politicaRedondeo} 
                onValueChange={(value) => setConfig(prev => ({ ...prev, politicaRedondeo: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="centavos">Sin redondeo (centavos)</SelectItem>
                  <SelectItem value="pesos">Redondear a pesos</SelectItem>
                  <SelectItem value="decenas">Redondear a decenas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Prestaciones Sociales</h3>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="prima"
                checked={config.prestacionesActivadas.prima}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({ 
                    ...prev, 
                    prestacionesActivadas: { ...prev.prestacionesActivadas, prima: checked === true }
                  }))
                }
              />
              <Label htmlFor="prima">Prima de Servicios</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="cesantias"
                checked={config.prestacionesActivadas.cesantias}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({ 
                    ...prev, 
                    prestacionesActivadas: { ...prev.prestacionesActivadas, cesantias: checked === true }
                  }))
                }
              />
              <Label htmlFor="cesantias">Cesantías</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="interesesCesantias"
                checked={config.prestacionesActivadas.interesesCesantias}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({ 
                    ...prev, 
                    prestacionesActivadas: { ...prev.prestacionesActivadas, interesesCesantias: checked === true }
                  }))
                }
              />
              <Label htmlFor="interesesCesantias">Intereses sobre Cesantías</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="vacaciones"
                checked={config.prestacionesActivadas.vacaciones}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({ 
                    ...prev, 
                    prestacionesActivadas: { ...prev.prestacionesActivadas, vacaciones: checked === true }
                  }))
                }
              />
              <Label htmlFor="vacaciones">Vacaciones</Label>
            </div>
          </div>
        </Card>
      </div>

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
