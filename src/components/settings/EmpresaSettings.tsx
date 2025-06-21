
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Trash2, Info } from 'lucide-react';

export const EmpresaSettings = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    // Información Básica
    razonSocial: '',
    nit: '',
    direccion: '',
    ciudad: '',
    tipoEmpresa: '',
    representanteLegal: '',
    actividadEconomica: '',
    periodicidadPago: '',
    centrosCosto: '',
    
    // Información Legal
    fechaConstitucion: '',
    regimenTributario: '',
    responsableSeguridad: {
      nombre: '',
      email: ''
    },
    
    // Configuración Operativa
    cicloContable: {
      inicio: '',
      fin: ''
    },
    sucursales: [
      { nombre: '', direccion: '', ciudad: '' }
    ]
  });

  const [lastModified, setLastModified] = useState({
    user: 'Admin Usuario',
    date: '2025-01-15 14:30'
  });

  const handleInputChange = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof typeof prev] as object),
        [field]: value
      }
    }));
  };

  const handleSucursalChange = (index: number, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      sucursales: prev.sucursales.map((sucursal, i) => 
        i === index ? { ...sucursal, [field]: value } : sucursal
      )
    }));
  };

  const addSucursal = () => {
    setConfig(prev => ({
      ...prev,
      sucursales: [...prev.sucursales, { nombre: '', direccion: '', ciudad: '' }]
    }));
  };

  const removeSucursal = (index: number) => {
    if (config.sucursales.length > 1) {
      setConfig(prev => ({
        ...prev,
        sucursales: prev.sucursales.filter((_, i) => i !== index)
      }));
    }
  };

  const validateNIT = (nit: string) => {
    const nitRegex = /^\d{8,10}-\d$/;
    return nitRegex.test(nit);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = () => {
    // Validaciones
    const requiredFields = ['razonSocial', 'nit', 'tipoEmpresa', 'ciudad', 'periodicidadPago'];
    const emptyFields = requiredFields.filter(field => !config[field as keyof typeof config]);
    
    if (emptyFields.length > 0) {
      toast({
        title: "Campos obligatorios",
        description: "Por favor completa todos los campos obligatorios.",
        variant: "destructive"
      });
      return;
    }

    if (!validateNIT(config.nit)) {
      toast({
        title: "NIT inválido",
        description: "El NIT debe tener el formato XXXXXXXXX-X con dígito verificador.",
        variant: "destructive"
      });
      return;
    }

    if (config.responsableSeguridad.email && !validateEmail(config.responsableSeguridad.email)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un correo electrónico válido para el responsable de seguridad social.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Configuración guardada",
      description: "Los datos de la empresa han sido actualizados correctamente.",
    });
  };

  const handleRevert = () => {
    // Revertir cambios
    toast({
      title: "Cambios revertidos",
      description: "Se han revertido todos los cambios no guardados.",
    });
  };

  const loadRecommended = () => {
    setConfig(prev => ({
      ...prev,
      periodicidadPago: 'mensual',
      regimenTributario: 'Responsable de IVA'
    }));
    toast({
      title: "Valores recomendados cargados",
      description: "Se han aplicado los valores recomendados por Aleluya.",
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">🧾 Empresa</h2>
          <p className="text-gray-600">Configuración general de la empresa y datos legales</p>
        </div>

        {/* Información Básica */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Información Básica</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="razonSocial">Razón Social *</Label>
              <Input
                id="razonSocial"
                value={config.razonSocial}
                onChange={(e) => handleInputChange('razonSocial', e.target.value)}
                placeholder="Ej: Empresa ABC S.A.S."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="nit">NIT *</Label>
              <Input
                id="nit"
                value={config.nit}
                onChange={(e) => handleInputChange('nit', e.target.value)}
                placeholder="Ej: 900123456-7"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="tipoEmpresa">Tipo de Empresa *</Label>
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
              <Label htmlFor="ciudad">Ciudad *</Label>
              <Input
                id="ciudad"
                value={config.ciudad}
                onChange={(e) => handleInputChange('ciudad', e.target.value)}
                placeholder="Ej: Bogotá D.C."
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={config.direccion}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
                placeholder="Ej: Calle 123 # 45-67, Oficina 890"
                className="mt-1"
              />
            </div>

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
              <div className="flex items-center gap-2">
                <Label htmlFor="actividadEconomica">Código CIIU</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Código de clasificación de actividad económica según DIAN</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="actividadEconomica"
                value={config.actividadEconomica}
                onChange={(e) => handleInputChange('actividadEconomica', e.target.value)}
                placeholder="Ej: 6201"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="periodicidadPago">Periodicidad de Pago *</Label>
              <Select value={config.periodicidadPago} onValueChange={(value) => handleInputChange('periodicidadPago', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar periodicidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="centrosCosto">Centros de Costo</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ej: Administración, Ventas, Producción</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                id="centrosCosto"
                value={config.centrosCosto}
                onChange={(e) => handleInputChange('centrosCosto', e.target.value)}
                placeholder="Administración, Ventas, Producción..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* Información Legal */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Información Legal</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fechaConstitucion">Fecha de Constitución</Label>
              <Input
                id="fechaConstitucion"
                type="date"
                value={config.fechaConstitucion}
                onChange={(e) => handleInputChange('fechaConstitucion', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="regimenTributario">Régimen Tributario</Label>
              <Select value={config.regimenTributario} onValueChange={(value) => handleInputChange('regimenTributario', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar régimen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-responsable-iva">No responsable de IVA</SelectItem>
                  <SelectItem value="responsable-iva">Responsable de IVA</SelectItem>
                  <SelectItem value="regimen-simple">Régimen simple</SelectItem>
                  <SelectItem value="gran-contribuyente">Gran contribuyente</SelectItem>
                  <SelectItem value="regimen-especial">Régimen especial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="responsableNombre">Responsable Seguridad Social - Nombre</Label>
              <Input
                id="responsableNombre"
                value={config.responsableSeguridad.nombre}
                onChange={(e) => handleNestedInputChange('responsableSeguridad', 'nombre', e.target.value)}
                placeholder="Nombre completo"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="responsableEmail">Responsable Seguridad Social - Email</Label>
              <Input
                id="responsableEmail"
                type="email"
                value={config.responsableSeguridad.email}
                onChange={(e) => handleNestedInputChange('responsableSeguridad', 'email', e.target.value)}
                placeholder="correo@empresa.com"
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* Configuración Operativa */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Configuración Operativa</h3>
          
          <div className="space-y-4">
            <div>
              <Label>Ciclo Contable</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="cicloInicio" className="text-sm text-gray-600">Inicio del año fiscal</Label>
                  <Input
                    id="cicloInicio"
                    type="date"
                    value={config.cicloContable.inicio}
                    onChange={(e) => handleNestedInputChange('cicloContable', 'inicio', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cicloFin" className="text-sm text-gray-600">Fin del año fiscal</Label>
                  <Input
                    id="cicloFin"
                    type="date"
                    value={config.cicloContable.fin}
                    onChange={(e) => handleNestedInputChange('cicloContable', 'fin', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Sedes */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Sucursales o Sedes</h3>
            <Button onClick={addSucursal} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Sede
            </Button>
          </div>
          
          <div className="space-y-4">
            {config.sucursales.map((sucursal, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Sede {index + 1}</h4>
                  {config.sucursales.length > 1 && (
                    <Button onClick={() => removeSucursal(index)} variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Nombre de la sede</Label>
                    <Input
                      value={sucursal.nombre}
                      onChange={(e) => handleSucursalChange(index, 'nombre', e.target.value)}
                      placeholder="Ej: Sede Principal"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Dirección</Label>
                    <Input
                      value={sucursal.direccion}
                      onChange={(e) => handleSucursalChange(index, 'direccion', e.target.value)}
                      placeholder="Dirección completa"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Ciudad</Label>
                    <Input
                      value={sucursal.ciudad}
                      onChange={(e) => handleSucursalChange(index, 'ciudad', e.target.value)}
                      placeholder="Ciudad"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Control y Trazabilidad */}
        <div className="border-t pt-4">
          <p className="text-sm text-gray-500 mb-4">
            Última modificación realizada por {lastModified.user} el {lastModified.date}
          </p>
          
          <div className="flex gap-4">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              Guardar Configuración
            </Button>
            <Button variant="outline" onClick={handleRevert}>
              Revertir Cambios
            </Button>
            <Button variant="outline" onClick={loadRecommended}>
              Cargar Valores Recomendados
            </Button>
            <Button variant="ghost" className="text-blue-600">
              Ver historial de cambios
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
