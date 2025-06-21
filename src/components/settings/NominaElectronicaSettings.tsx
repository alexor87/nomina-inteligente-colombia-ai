
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

export const NominaElectronicaSettings = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    ambiente: 'pruebas',
    proveedorTecnologico: '',
    codigoSoftware: '',
    certificadoDigital: '',
    validacionesAutomaticas: true,
    reenvioAutomatico: true
  });

  const handleSave = () => {
    toast({
      title: "Configuración guardada",
      description: "Los parámetros de nómina electrónica han sido actualizados.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">💻 Nómina Electrónica (DIAN)</h2>
        <p className="text-gray-600">Configuración para facturación electrónica y DIAN</p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Configuración DIAN</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ambiente">Ambiente</Label>
            <Select value={config.ambiente} onValueChange={(value) => setConfig(prev => ({ ...prev, ambiente: value }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pruebas">Pruebas</SelectItem>
                <SelectItem value="produccion">Producción</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="proveedor">Proveedor Tecnológico</Label>
            <Input
              id="proveedor"
              value={config.proveedorTecnologico}
              onChange={(e) => setConfig(prev => ({ ...prev, proveedorTecnologico: e.target.value }))}
              placeholder="Nombre del proveedor"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="codigoSoftware">Código de Software Autorizado</Label>
            <Input
              id="codigoSoftware"
              value={config.codigoSoftware}
              onChange={(e) => setConfig(prev => ({ ...prev, codigoSoftware: e.target.value }))}
              placeholder="Código autorizado por DIAN"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="certificado">Certificado Digital</Label>
            <Input
              id="certificado"
              value={config.certificadoDigital}
              onChange={(e) => setConfig(prev => ({ ...prev, certificadoDigital: e.target.value }))}
              placeholder="Ruta del certificado"
              className="mt-1"
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="validaciones"
              checked={config.validacionesAutomaticas}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, validacionesAutomaticas: checked === true }))}
            />
            <Label htmlFor="validaciones">Validaciones Automáticas</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="reenvio"
              checked={config.reenvioAutomatico}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, reenvioAutomatico: checked === true }))}
            />
            <Label htmlFor="reenvio">Reenvío Automático de Documentos Rechazados</Label>
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
