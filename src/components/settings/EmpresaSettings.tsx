
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export const EmpresaSettings = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    razonSocial: '',
    nit: '',
    direccion: '',
    ciudad: '',
    representanteLegal: '',
    tipoEmpresa: '',
    actividadEconomica: '',
    codigoCIIU: '',
    periodicidadPago: '',
    centrosCosto: ''
  });

  const handleSave = () => {
    toast({
      title: "Configuración guardada",
      description: "Los datos de la empresa han sido actualizados correctamente.",
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">🧾 Configuración de Empresa</h2>
        <p className="text-gray-600">Información básica y legal de la empresa</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Información Básica</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="razonSocial">Razón Social *</Label>
              <Input
                id="razonSocial"
                value={config.razonSocial}
                onChange={(e) => handleInputChange('razonSocial', e.target.value)}
                placeholder="Nombre completo de la empresa"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="nit">NIT *</Label>
              <Input
                id="nit"
                value={config.nit}
                onChange={(e) => handleInputChange('nit', e.target.value)}
                placeholder="123456789-0"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={config.direccion}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
                placeholder="Dirección completa"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                value={config.ciudad}
                onChange={(e) => handleInputChange('ciudad', e.target.value)}
                placeholder="Ciudad principal"
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Información Legal</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="representanteLegal">Representante Legal</Label>
              <Input
                id="representanteLegal"
                value={config.representanteLegal}
                onChange={(e) => handleInputChange('representanteLegal', e.target.value)}
                placeholder="Nombre completo"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="tipoEmpresa">Tipo de Empresa</Label>
              <Select value={config.tipoEmpresa} onValueChange={(value) => handleInputChange('tipoEmpresa', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Persona Natural</SelectItem>
                  <SelectItem value="juridica">Persona Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="actividadEconomica">Actividad Económica</Label>
              <Input
                id="actividadEconomica"
                value={config.actividadEconomica}
                onChange={(e) => handleInputChange('actividadEconomica', e.target.value)}
                placeholder="Descripción de la actividad"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="codigoCIIU">Código CIIU</Label>
              <Input
                id="codigoCIIU"
                value={config.codigoCIIU}
                onChange={(e) => handleInputChange('codigoCIIU', e.target.value)}
                placeholder="0000"
                className="mt-1"
              />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Configuración Operativa</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="periodicidadPago">Periodicidad de Pago</Label>
            <Select value={config.periodicidadPago} onValueChange={(value) => handleInputChange('periodicidadPago', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleccionar periodicidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quincenal">Quincenal</SelectItem>
                <SelectItem value="mensual">Mensual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="centrosCosto">Centros de Costo</Label>
            <Textarea
              id="centrosCosto"
              value={config.centrosCosto}
              onChange={(e) => handleInputChange('centrosCosto', e.target.value)}
              placeholder="Administración, Ventas, Producción (separados por comas)"
              className="mt-1"
              rows={3}
            />
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
        <Button variant="secondary">
          Cargar Valores Recomendados
        </Button>
      </div>
    </div>
  );
};
