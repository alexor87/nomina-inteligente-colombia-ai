import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSettings } from '@/hooks/useRealtimeSettings';
import { CompanyConfigurationService } from '@/services/CompanyConfigurationService';
import { CostCenterManagement } from './CostCenterManagement';
import { BranchManagement } from './BranchManagement';
import { Info, Upload } from 'lucide-react';

interface CompanyData {
  // Información General
  razon_social: string;
  tipo_sociedad: string;
  nit: string;
  dv: string;
  email: string;
  telefono: string;
  logo_url: string;
  
  // Dirección y Ubicación
  direccion: string;
  ciudad: string;
  departamento: string;
  codigo_postal: string;
  pais: string;
  
  // Representante Legal
  representante_legal: string;
  representante_tipo_doc: string;
  representante_documento: string;
  representante_email: string;
  
  // Configuraciones de Nómina
  periodicidad: string;
  fecha_inicio_operacion: string;
  ultima_liquidacion: string;
  nomina_prueba: boolean;
  calculo_horas_extra: string;
  
  // Identificación Económica
  codigo_ciiu: string;
  nombre_ciiu: string;
  clase_riesgo_arl: string;
  tamano_empresa: string;
}

export const EmpresaSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData>({
    // Información General
    razon_social: '',
    tipo_sociedad: '',
    nit: '',
    dv: '',
    email: '',
    telefono: '',
    logo_url: '',
    
    // Dirección y Ubicación
    direccion: '',
    ciudad: '',
    departamento: '',
    codigo_postal: '',
    pais: 'Colombia',
    
    // Representante Legal
    representante_legal: '',
    representante_tipo_doc: '',
    representante_documento: '',
    representante_email: '',
    
    // Configuraciones de Nómina
    periodicidad: 'mensual',
    fecha_inicio_operacion: '',
    ultima_liquidacion: '',
    nomina_prueba: false,
    calculo_horas_extra: 'manual',
    
    // Identificación Económica
    codigo_ciiu: '',
    nombre_ciiu: '',
    clase_riesgo_arl: '',
    tamano_empresa: ''
  });

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
          setCompanyData(prev => ({
            ...prev,
            razon_social: company.razon_social || '',
            nit: company.nit || '',
            email: company.email || '',
            telefono: company.telefono || '',
            direccion: company.direccion || '',
            ciudad: company.ciudad || ''
          }));
        }

        const config = await CompanyConfigurationService.getCompanyConfiguration(companyId);
        if (config) {
          setCompanyData(prev => ({
            ...prev,
            periodicidad: config.periodicity
          }));
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, []);

  const handleInputChange = (field: keyof CompanyData, value: string | boolean) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const requiredFields = ['razon_social', 'nit', 'email', 'direccion', 'ciudad', 'departamento', 'periodicidad'];
    const missingFields = requiredFields.filter(field => !companyData[field as keyof CompanyData]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Campos obligatorios",
        description: `Por favor complete: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
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

      await CompanyConfigurationService.saveCompanyConfiguration(companyId, companyData.periodicidad);

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
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">🧾 Configuración de la Empresa</h2>
          <p className="text-gray-600">Configuración completa de la información empresarial y parámetros de nómina</p>
        </div>

        {/* 🧩 Información General de la Empresa */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            🧩 Información General de la Empresa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="razon_social">Nombre Legal de la Empresa *</Label>
              <Input
                id="razon_social"
                value={companyData.razon_social}
                onChange={(e) => handleInputChange('razon_social', e.target.value)}
                placeholder="Razón social de la empresa"
                required
              />
            </div>

            <div>
              <Label htmlFor="tipo_sociedad">Tipo de Sociedad</Label>
              <Select value={companyData.tipo_sociedad} onValueChange={(value) => handleInputChange('tipo_sociedad', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAS">S.A.S - Sociedad por Acciones Simplificada</SelectItem>
                  <SelectItem value="SA">S.A. - Sociedad Anónima</SelectItem>
                  <SelectItem value="LTDA">Ltda. - Sociedad Limitada</SelectItem>
                  <SelectItem value="EU">E.U. - Empresa Unipersonal</SelectItem>
                  <SelectItem value="COOPERATIVA">Cooperativa</SelectItem>
                  <SelectItem value="FUNDACION">Fundación</SelectItem>
                  <SelectItem value="CORPORACION">Corporación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="nit">NIT / Número de Identificación *</Label>
              <Input
                id="nit"
                value={companyData.nit}
                onChange={(e) => handleInputChange('nit', e.target.value)}
                placeholder="123456789"
                required
              />
            </div>

            <div>
              <Label htmlFor="dv">DV (Dígito de Verificación)</Label>
              <Input
                id="dv"
                value={companyData.dv}
                onChange={(e) => handleInputChange('dv', e.target.value)}
                placeholder="1"
                maxLength={1}
              />
            </div>

            <div>
              <Label htmlFor="email">Correo de contacto principal *</Label>
              <Input
                id="email"
                type="email"
                value={companyData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contacto@empresa.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="telefono">Teléfono de contacto</Label>
              <Input
                id="telefono"
                value={companyData.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                placeholder="+57 300 123 4567"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="logo_url">Logo de la empresa</Label>
              <div className="flex gap-2">
                <Input
                  id="logo_url"
                  value={companyData.logo_url}
                  onChange={(e) => handleInputChange('logo_url', e.target.value)}
                  placeholder="URL del logo o subir archivo"
                />
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 📍 Dirección y Ubicación */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            📍 Dirección y Ubicación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="direccion">Dirección principal *</Label>
              <Input
                id="direccion"
                value={companyData.direccion}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
                placeholder="Calle 123 # 45-67"
                required
              />
            </div>

            <div>
              <Label htmlFor="ciudad">Ciudad / Municipio *</Label>
              <Input
                id="ciudad"
                value={companyData.ciudad}
                onChange={(e) => handleInputChange('ciudad', e.target.value)}
                placeholder="Bogotá"
                required
              />
            </div>

            <div>
              <Label htmlFor="departamento">Departamento *</Label>
              <Select value={companyData.departamento} onValueChange={(value) => handleInputChange('departamento', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cundinamarca">Cundinamarca</SelectItem>
                  <SelectItem value="Antioquia">Antioquia</SelectItem>
                  <SelectItem value="Valle del Cauca">Valle del Cauca</SelectItem>
                  <SelectItem value="Atlántico">Atlántico</SelectItem>
                  <SelectItem value="Santander">Santander</SelectItem>
                  <SelectItem value="Bolívar">Bolívar</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="codigo_postal">Código Postal</Label>
              <Input
                id="codigo_postal"
                value={companyData.codigo_postal}
                onChange={(e) => handleInputChange('codigo_postal', e.target.value)}
                placeholder="110111"
              />
            </div>

            <div>
              <Label htmlFor="pais">País</Label>
              <Input
                id="pais"
                value={companyData.pais}
                onChange={(e) => handleInputChange('pais', e.target.value)}
                placeholder="Colombia"
                disabled
              />
            </div>
          </div>
        </Card>

        {/* 👤 Representante Legal */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            👤 Representante Legal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="representante_legal">Nombre completo</Label>
              <Input
                id="representante_legal"
                value={companyData.representante_legal}
                onChange={(e) => handleInputChange('representante_legal', e.target.value)}
                placeholder="Nombre del representante legal"
              />
            </div>

            <div>
              <Label htmlFor="representante_tipo_doc">Tipo de documento</Label>
              <Select value={companyData.representante_tipo_doc} onValueChange={(value) => handleInputChange('representante_tipo_doc', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                  <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                  <SelectItem value="PA">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="representante_documento">Número de documento</Label>
              <Input
                id="representante_documento"
                value={companyData.representante_documento}
                onChange={(e) => handleInputChange('representante_documento', e.target.value)}
                placeholder="12345678"
              />
            </div>

            <div>
              <Label htmlFor="representante_email">Correo del representante legal</Label>
              <Input
                id="representante_email"
                type="email"
                value={companyData.representante_email}
                onChange={(e) => handleInputChange('representante_email', e.target.value)}
                placeholder="representante@empresa.com"
              />
            </div>
          </div>
        </Card>

        {/* ⚙️ Configuraciones de Nómina */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            ⚙️ Configuraciones de Nómina
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="periodicidad">Periodicidad de nómina *</Label>
              <Select value={companyData.periodicidad} onValueChange={(value) => handleInputChange('periodicidad', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione periodicidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fecha_inicio_operacion">Fecha de inicio de operación</Label>
              <Input
                id="fecha_inicio_operacion"
                type="date"
                value={companyData.fecha_inicio_operacion}
                onChange={(e) => handleInputChange('fecha_inicio_operacion', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="ultima_liquidacion">Última fecha de liquidación</Label>
              <Input
                id="ultima_liquidacion"
                type="date"
                value={companyData.ultima_liquidacion}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Solo lectura - Se actualiza automáticamente</p>
            </div>

            <div>
              <Label htmlFor="calculo_horas_extra">Tipo de cálculo de horas extras</Label>
              <Select value={companyData.calculo_horas_extra} onValueChange={(value) => handleInputChange('calculo_horas_extra', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatico">Automático</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="nomina_prueba"
                  checked={companyData.nomina_prueba}
                  onCheckedChange={(checked) => handleInputChange('nomina_prueba', checked as boolean)}
                />
                <Label htmlFor="nomina_prueba">¿Habilitar nómina de prueba?</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Permite realizar liquidaciones de prueba sin afectar los datos reales</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </Card>

        {/* 🏢 Identificación Económica */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            🏢 Identificación Económica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="codigo_ciiu">Código CIIU</Label>
              <div className="flex gap-2">
                <Input
                  id="codigo_ciiu"
                  value={companyData.codigo_ciiu}
                  onChange={(e) => handleInputChange('codigo_ciiu', e.target.value)}
                  placeholder="1234"
                />
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400 mt-2" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clasificación Industrial Internacional Uniforme</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div>
              <Label htmlFor="nombre_ciiu">Actividad económica (CIIU)</Label>
              <Input
                id="nombre_ciiu"
                value={companyData.nombre_ciiu}
                onChange={(e) => handleInputChange('nombre_ciiu', e.target.value)}
                placeholder="Descripción de la actividad"
              />
            </div>

            <div>
              <Label htmlFor="clase_riesgo_arl">Clase de riesgo ARL</Label>
              <Select value={companyData.clase_riesgo_arl} onValueChange={(value) => handleInputChange('clase_riesgo_arl', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione clase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="I">Clase I - Riesgo Mínimo</SelectItem>
                  <SelectItem value="II">Clase II - Riesgo Bajo</SelectItem>
                  <SelectItem value="III">Clase III - Riesgo Medio</SelectItem>
                  <SelectItem value="IV">Clase IV - Riesgo Alto</SelectItem>
                  <SelectItem value="V">Clase V - Riesgo Máximo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tamano_empresa">Tamaño de empresa</Label>
              <Select value={companyData.tamano_empresa} onValueChange={(value) => handleInputChange('tamano_empresa', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione tamaño" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="micro">Microempresa (1-10 empleados)</SelectItem>
                  <SelectItem value="pequena">Pequeña empresa (11-50 empleados)</SelectItem>
                  <SelectItem value="mediana">Mediana empresa (51-200 empleados)</SelectItem>
                  <SelectItem value="grande">Gran empresa (200+ empleados)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Nueva sección: Centros de Costo */}
        <CostCenterManagement />

        {/* Nueva sección: Sucursales */}
        <BranchManagement />

        {/* Controles inferiores */}
        <Card className="p-6">
          <div className="flex gap-4 justify-between">
            <div className="flex gap-4">
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
              <Button 
                onClick={loadCompanyData} 
                variant="outline"
              >
                Recargar Datos
              </Button>
            </div>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              ℹ️ Los campos marcados con * son obligatorios. La configuración se aplica inmediatamente a todos los procesos de nómina.
            </p>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
};
