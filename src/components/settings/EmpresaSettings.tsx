
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSettings } from '@/hooks/useRealtimeSettings';
import { CompanyConfigurationService } from '@/services/CompanyConfigurationService';

export const EmpresaSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [companyData, setCompanyData] = useState({
    razon_social: '',
    nit: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: ''
  });
  const [periodicity, setPeriodicity] = useState('mensual');

  // Usar realtime para configuraciones
  useRealtimeSettings({
    onSettingsChange: () => {
      console.log('⚙️ Configuración actualizada desde realtime');
      loadCompanyData();
    }
  });

  const loadCompanyData = async () => {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (companyId) {
        const company = await CompanyConfigurationService.getCompanyData(companyId);
        if (company) {
          setCompanyData({
            razon_social: company.razon_social || '',
            nit: company.nit || '',
            email: company.email || '',
            telefono: company.telefono || '',
            direccion: company.direccion || '',
            ciudad: company.ciudad || ''
          });
        }

        const config = await CompanyConfigurationService.getCompanyConfiguration(companyId);
        if (config) {
          setPeriodicity(config.periodicity);
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        toast({
          title: "❌ Error",
          description: "No se pudo identificar la empresa del usuario",
          variant: "destructive"
        });
        return;
      }

      await CompanyConfigurationService.saveCompanyConfiguration(companyId, periodicity);

      // El toast de éxito se mostrará automáticamente via realtime
      console.log('✅ Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "❌ Error al guardar",
        description: "No se pudo guardar la configuración. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">🧾 Información de la Empresa</h2>
        <p className="text-gray-600">Configuración básica de la empresa y periodicidad de nómina</p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="razon_social">Razón Social</Label>
            <Input
              id="razon_social"
              value={companyData.razon_social}
              onChange={(e) => setCompanyData(prev => ({ ...prev, razon_social: e.target.value }))}
              placeholder="Nombre de la empresa"
            />
          </div>

          <div>
            <Label htmlFor="nit">NIT</Label>
            <Input
              id="nit"
              value={companyData.nit}
              onChange={(e) => setCompanyData(prev => ({ ...prev, nit: e.target.value }))}
              placeholder="Número de identificación tributaria"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={companyData.email}
              onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="correo@empresa.com"
            />
          </div>

          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              value={companyData.telefono}
              onChange={(e) => setCompanyData(prev => ({ ...prev, telefono: e.target.value }))}
              placeholder="Número de teléfono"
            />
          </div>

          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={companyData.direccion}
              onChange={(e) => setCompanyData(prev => ({ ...prev, direccion: e.target.value }))}
              placeholder="Dirección de la empresa"
            />
          </div>

          <div>
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input
              id="ciudad"
              value={companyData.ciudad}
              onChange={(e) => setCompanyData(prev => ({ ...prev, ciudad: e.target.value }))}
              placeholder="Ciudad"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Periodicidad de Nómina</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="periodicity">Tipo de Período</Label>
            <Select value={periodicity} onValueChange={setPeriodicity}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la periodicidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensual">Mensual</SelectItem>
                <SelectItem value="quincenal">Quincenal</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="flex gap-4">
        <Button 
          onClick={handleSave} 
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  );
};
