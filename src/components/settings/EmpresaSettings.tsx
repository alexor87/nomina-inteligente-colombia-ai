
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, InfoIcon, PlusIcon, TrashIcon, HistoryIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
}

export const EmpresaSettings = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    // Información Básica
    razonSocial: '',
    nit: '',
    direccion: '',
    ciudad: '',
    
    // Información Legal
    representanteLegal: '',
    tipoEmpresa: '',
    actividadEconomica: '',
    codigoCIIU: '',
    fechaConstitucion: null as Date | null,
    regimenTributario: '',
    responsableSegSocial: {
      nombre: '',
      email: ''
    },
    
    // Configuración Operativa
    periodicidadPago: '',
    centrosCosto: '',
    cicloContable: {
      inicio: null as Date | null,
      fin: null as Date | null
    },
    
    // Sedes
    sucursales: [] as Sucursal[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateNIT = (nit: string): boolean => {
    const nitRegex = /^\d{9}-\d$/;
    return nitRegex.test(nit);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Campos obligatorios
    if (!config.razonSocial.trim()) {
      newErrors.razonSocial = 'La razón social es obligatoria';
    }
    
    if (!config.nit.trim()) {
      newErrors.nit = 'El NIT es obligatorio';
    } else if (!validateNIT(config.nit)) {
      newErrors.nit = 'El NIT debe tener el formato XXXXXXXXX-X';
    }
    
    if (!config.tipoEmpresa) {
      newErrors.tipoEmpresa = 'El tipo de empresa es obligatorio';
    }
    
    if (!config.ciudad.trim()) {
      newErrors.ciudad = 'La ciudad es obligatoria';
    }
    
    if (!config.periodicidadPago) {
      newErrors.periodicidadPago = 'La periodicidad de pago es obligatoria';
    }

    // Validación del email del responsable
    if (config.responsableSegSocial.email && !validateEmail(config.responsableSegSocial.email)) {
      newErrors.responsableEmail = 'El correo electrónico no es válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      toast({
        title: "Configuración guardada",
        description: "Los datos de la empresa han sido actualizados correctamente.",
      });
    } else {
      toast({
        title: "Error de validación",
        description: "Por favor corrige los errores en el formulario.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    // Limpiar error cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const addSucursal = () => {
    const newSucursal: Sucursal = {
      id: Date.now().toString(),
      nombre: '',
      direccion: '',
      ciudad: ''
    };
    setConfig(prev => ({
      ...prev,
      sucursales: [...prev.sucursales, newSucursal]
    }));
  };

  const removeSucursal = (id: string) => {
    setConfig(prev => ({
      ...prev,
      sucursales: prev.sucursales.filter(s => s.id !== id)
    }));
  };

  const updateSucursal = (id: string, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      sucursales: prev.sucursales.map(s => 
        s.id === id ? { ...s, [field]: value } : s
      )
    }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">🧾 Configuración de Empresa</h2>
          <p className="text-gray-600">Información básica y legal de la empresa</p>
        </div>

        {/* Información Básica */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Información Básica</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="razonSocial">Razón Social *</Label>
              <Input
                id="razonSocial"
                value={config.razonSocial}
                onChange={(e) => handleInputChange('razonSocial', e.target.value)}
                placeholder="Nombre completo de la empresa"
                className={cn("mt-1", errors.razonSocial && "border-red-500")}
              />
              {errors.razonSocial && <p className="text-sm text-red-500 mt-1">{errors.razonSocial}</p>}
            </div>

            <div>
              <Label htmlFor="nit">NIT *</Label>
              <Input
                id="nit"
                value={config.nit}
                onChange={(e) => handleInputChange('nit', e.target.value)}
                placeholder="123456789-0"
                className={cn("mt-1", errors.nit && "border-red-500")}
              />
              {errors.nit && <p className="text-sm text-red-500 mt-1">{errors.nit}</p>}
            </div>

            <div>
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={config.direccion}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
                placeholder="Ej: Calle 123 # 45-67, Barrio Centro"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="ciudad">Ciudad *</Label>
              <Input
                id="ciudad"
                value={config.ciudad}
                onChange={(e) => handleInputChange('ciudad', e.target.value)}
                placeholder="Ciudad principal"
                className={cn("mt-1", errors.ciudad && "border-red-500")}
              />
              {errors.ciudad && <p className="text-sm text-red-500 mt-1">{errors.ciudad}</p>}
            </div>
          </div>
        </Card>

        {/* Información Legal */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Información Legal</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <Label htmlFor="tipoEmpresa">Tipo de Empresa *</Label>
              <Select value={config.tipoEmpresa} onValueChange={(value) => handleInputChange('tipoEmpresa', value)}>
                <SelectTrigger className={cn("mt-1", errors.tipoEmpresa && "border-red-500")}>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Persona Natural</SelectItem>
                  <SelectItem value="juridica">Persona Jurídica</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipoEmpresa && <p className="text-sm text-red-500 mt-1">{errors.tipoEmpresa}</p>}
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
              <div className="flex items-center gap-2">
                <Label htmlFor="codigoCIIU">Código CIIU</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Código de clasificación de actividad económica según DIAN</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="codigoCIIU"
                value={config.codigoCIIU}
                onChange={(e) => handleInputChange('codigoCIIU', e.target.value)}
                placeholder="0000"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="fechaConstitucion">Fecha de Constitución</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full mt-1 justify-start text-left font-normal",
                      !config.fechaConstitucion && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {config.fechaConstitucion ? format(config.fechaConstitucion, "dd/MM/yyyy") : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={config.fechaConstitucion || undefined}
                    onSelect={(date) => handleInputChange('fechaConstitucion', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="regimenTributario">Régimen Tributario</Label>
              <Select value={config.regimenTributario} onValueChange={(value) => handleInputChange('regimenTributario', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar régimen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-responsable">No responsable de IVA</SelectItem>
                  <SelectItem value="responsable">Responsable de IVA</SelectItem>
                  <SelectItem value="simple">Régimen simple</SelectItem>
                  <SelectItem value="gran-contribuyente">Gran contribuyente</SelectItem>
                  <SelectItem value="especial">Régimen especial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label className="text-base font-medium">Responsable de Seguridad Social</Label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="responsableNombre">Nombre Completo</Label>
                <Input
                  id="responsableNombre"
                  value={config.responsableSegSocial.nombre}
                  onChange={(e) => handleNestedInputChange('responsableSegSocial', 'nombre', e.target.value)}
                  placeholder="Nombre completo del responsable"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="responsableEmail">Correo Electrónico</Label>
                <Input
                  id="responsableEmail"
                  type="email"
                  value={config.responsableSegSocial.email}
                  onChange={(e) => handleNestedInputChange('responsableSegSocial', 'email', e.target.value)}
                  placeholder="correo@empresa.com"
                  className={cn("mt-1", errors.responsableEmail && "border-red-500")}
                />
                {errors.responsableEmail && <p className="text-sm text-red-500 mt-1">{errors.responsableEmail}</p>}
              </div>
            </div>
          </div>
        </Card>

        {/* Configuración Operativa */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Configuración Operativa</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="periodicidadPago">Periodicidad de Pago *</Label>
              <Select value={config.periodicidadPago} onValueChange={(value) => handleInputChange('periodicidadPago', value)}>
                <SelectTrigger className={cn("mt-1", errors.periodicidadPago && "border-red-500")}>
                  <SelectValue placeholder="Seleccionar periodicidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
              {errors.periodicidadPago && <p className="text-sm text-red-500 mt-1">{errors.periodicidadPago}</p>}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="centrosCosto">Centros de Costo</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-4 w-4 text-gray-400 cursor-help" />
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
                placeholder="Administración, Ventas, Producción (separados por comas)"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <div className="mt-4">
            <Label className="text-base font-medium">Ciclo Contable (Año Fiscal)</Label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="cicloInicio">Fecha de Inicio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full mt-1 justify-start text-left font-normal",
                        !config.cicloContable.inicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {config.cicloContable.inicio ? format(config.cicloContable.inicio, "dd/MM/yyyy") : "Fecha de inicio"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={config.cicloContable.inicio || undefined}
                      onSelect={(date) => handleNestedInputChange('cicloContable', 'inicio', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="cicloFin">Fecha de Fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full mt-1 justify-start text-left font-normal",
                        !config.cicloContable.fin && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {config.cicloContable.fin ? format(config.cicloContable.fin, "dd/MM/yyyy") : "Fecha de fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={config.cicloContable.fin || undefined}
                      onSelect={(date) => handleNestedInputChange('cicloContable', 'fin', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </Card>

        {/* Sedes */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Sucursales o Sedes</h3>
            <Button onClick={addSucursal} variant="outline" size="sm">
              <PlusIcon className="h-4 w-4 mr-2" />
              Agregar Sede
            </Button>
          </div>
          
          {config.sucursales.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay sedes configuradas</p>
          ) : (
            <div className="space-y-4">
              {config.sucursales.map((sucursal, index) => (
                <div key={sucursal.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Sede {index + 1}</h4>
                    <Button
                      onClick={() => removeSucursal(sucursal.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`sede-nombre-${sucursal.id}`}>Nombre de la Sede</Label>
                      <Input
                        id={`sede-nombre-${sucursal.id}`}
                        value={sucursal.nombre}
                        onChange={(e) => updateSucursal(sucursal.id, 'nombre', e.target.value)}
                        placeholder="Ej: Sede Principal"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`sede-direccion-${sucursal.id}`}>Dirección</Label>
                      <Input
                        id={`sede-direccion-${sucursal.id}`}
                        value={sucursal.direccion}
                        onChange={(e) => updateSucursal(sucursal.id, 'direccion', e.target.value)}
                        placeholder="Ej: Calle 123 # 45-67"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`sede-ciudad-${sucursal.id}`}>Ciudad</Label>
                      <Input
                        id={`sede-ciudad-${sucursal.id}`}
                        value={sucursal.ciudad}
                        onChange={(e) => updateSucursal(sucursal.id, 'ciudad', e.target.value)}
                        placeholder="Ciudad"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Botones de acción */}
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

        {/* Control y trazabilidad */}
        <Card className="p-4 bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Última modificación realizada por <strong>Admin Usuario</strong> el <strong>21/06/2025 - 14:30</strong></span>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
              <HistoryIcon className="h-4 w-4 mr-2" />
              Ver historial de cambios
            </Button>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
};
