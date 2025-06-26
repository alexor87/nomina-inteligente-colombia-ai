import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Trash2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyData {
  id?: string;
  razon_social: string;
  nit: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  email: string;
  representante_legal: string;
  actividad_economica: string;
  estado: string;
  plan: string;
}

export const EmpresaSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [companyData, setCompanyData] = useState<CompanyData>({
    razon_social: '',
    nit: '',
    direccion: '',
    ciudad: '',
    telefono: '',
    email: '',
    representante_legal: '',
    actividad_economica: '',
    estado: 'activa',
    plan: 'basico'
  });
  
  const [config, setConfig] = useState({
    // Información Básica - ahora mapeada a companyData
    periodicidadPago: '',
    diasPersonalizados: 30, // Nuevo campo para días personalizados
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

  // Cargar datos de la empresa al montar el componente
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setIsLoading(true);
      
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "No se pudo obtener información del usuario.",
          variant: "destructive"
        });
        return;
      }

      console.log('Usuario autenticado:', user.id, user.email);

      // Obtener el perfil del usuario para conseguir company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error obteniendo perfil:', profileError);
        toast({
          title: "Error al cargar perfil",
          description: "No se pudo obtener el perfil del usuario.",
          variant: "destructive"
        });
        return;
      }

      console.log('Perfil encontrado:', profile);

      if (!profile?.company_id) {
        // Si no hay company_id, crear una empresa específica para este usuario
        console.log('No se encontró company_id, creando empresa específica para este usuario...');
        await createCompanyForUser(user);
        return;
      }

      // Cargar datos de la empresa (las políticas RLS aseguran que solo vea su empresa)
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (companyError) {
        console.error('Error cargando empresa:', companyError);
        if (companyError.code === 'PGRST116') {
          // No se encontró la empresa, crear una específica para este usuario
          await createCompanyForUser(user);
          return;
        }
        throw companyError;
      }

      console.log('Empresa del usuario encontrada:', company);

      if (company) {
        setCompanyData({
          id: company.id,
          razon_social: company.razon_social || '',
          nit: company.nit || '',
          direccion: company.direccion || '',
          ciudad: company.ciudad || '',
          telefono: company.telefono || '',
          email: company.email || user.email || '', // Usar el email de la empresa o del usuario
          representante_legal: company.representante_legal || '',
          actividad_economica: company.actividad_economica || '',
          estado: company.estado || 'activa',
          plan: company.plan || 'basico'
        });
      }

      // Cargar configuración de periodicidad y días personalizados
      const { data: settings } = await supabase
        .from('company_settings')
        .select('periodicity, custom_period_days')
        .eq('company_id', profile.company_id)
        .single();

      if (settings) {
        setConfig(prev => ({
          ...prev,
          periodicidadPago: settings.periodicity,
          diasPersonalizados: settings.custom_period_days || 30
        }));
      }

    } catch (error) {
      console.error('Error loading company data:', error);
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron cargar los datos de tu empresa.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createCompanyForUser = async (user: any) => {
    try {
      console.log('Creando empresa específica para usuario:', user.email);
      
      // Crear empresa específica para este usuario
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          razon_social: `Empresa de ${user.email}`,
          nit: '000000000-0',
          email: user.email,
          ciudad: 'Bogotá',
          estado: 'activa',
          plan: 'basico'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creando empresa:', createError);
        throw createError;
      }

      console.log('Empresa creada:', newCompany);

      // Actualizar el perfil del usuario con la nueva empresa
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ company_id: newCompany.id })
        .eq('user_id', user.id);

      if (updateProfileError) {
        console.error('Error actualizando perfil:', updateProfileError);
        throw updateProfileError;
      }

      // Crear configuración por defecto de la empresa
      const { error: settingsError } = await supabase
        .from('company_settings')
        .insert({
          company_id: newCompany.id,
          periodicity: 'mensual',
          custom_period_days: 30
        });

      if (settingsError) {
        console.error('Error creando configuración:', settingsError);
        // No lanzar error aquí, la configuración se puede crear después
      }

      // Recargar datos
      await loadConfiguration();

      toast({
        title: "Empresa creada",
        description: "Se ha creado tu empresa. Puedes personalizar la información ahora.",
      });

    } catch (error) {
      console.error('Error creating company for user:', error);
      toast({
        title: "Error al crear empresa",
        description: "No se pudo crear tu empresa.",
        variant: "destructive"
      });
    }
  };

  const handleCompanyDataChange = (field: keyof CompanyData, value: string) => {
    setCompanyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCustomDaysChange = (days: number) => {
    setConfig(prev => ({
      ...prev,
      diasPersonalizados: days
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

  const handleSave = async () => {
    try {
      // Validaciones existentes
      const requiredFields = ['razon_social', 'nit', 'ciudad', 'email'];
      const emptyFields = requiredFields.filter(field => !companyData[field as keyof CompanyData]);
      
      if (emptyFields.length > 0) {
        toast({
          title: "Campos obligatorios",
          description: "Por favor completa todos los campos obligatorios: Razón Social, NIT, Ciudad y Email.",
          variant: "destructive"
        });
        return;
      }

      if (!validateNIT(companyData.nit)) {
        toast({
          title: "NIT inválido",
          description: "El NIT debe tener el formato XXXXXXXXX-X con dígito verificador.",
          variant: "destructive"
        });
        return;
      }

      if (!validateEmail(companyData.email)) {
        toast({
          title: "Email inválido",
          description: "Por favor ingresa un correo electrónico válido.",
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

      // Validación específica para días personalizados
      if (config.periodicidadPago === 'personalizado') {
        if (config.diasPersonalizados < 1 || config.diasPersonalizados > 365) {
          toast({
            title: "Días inválidos",
            description: "Los días del período personalizado deben estar entre 1 y 365.",
            variant: "destructive"
          });
          return;
        }
      }

      setIsLoading(true);

      // Obtener company_id del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('No se encontró tu empresa');
      }

      console.log('Guardando datos para tu empresa:', profile.company_id);

      // Actualizar datos de la empresa (las políticas RLS aseguran que solo actualice su empresa)
      const { error: companyError } = await supabase
        .from('companies')
        .update({
          razon_social: companyData.razon_social,
          nit: companyData.nit,
          direccion: companyData.direccion,
          ciudad: companyData.ciudad,
          telefono: companyData.telefono,
          email: companyData.email,
          representante_legal: companyData.representante_legal,
          actividad_economica: companyData.actividad_economica,
          estado: companyData.estado,
          plan: companyData.plan
        })
        .eq('id', profile.company_id);

      if (companyError) {
        console.error('Error actualizando empresa:', companyError);
        throw companyError;
      }

      // Actualizar configuración de periodicidad si se especificó
      if (config.periodicidadPago) {
        console.log('Actualizando periodicidad a:', config.periodicidadPago);
        
        // Primero verificar si existe configuración
        const { data: existingSettings, error: checkError } = await supabase
          .from('company_settings')
          .select('id')
          .eq('company_id', profile.company_id)
          .maybeSingle();

        if (checkError) {
          console.error('Error verificando configuración existente:', checkError);
          throw checkError;
        }

        let settingsResult;
        
        const updateData: any = {
          periodicity: config.periodicidadPago,
          updated_at: new Date().toISOString()
        };

        // Si es personalizado, incluir los días personalizados
        if (config.periodicidadPago === 'personalizado') {
          updateData.custom_period_days = config.diasPersonalizados;
        }
        
        if (existingSettings) {
          // Si existe, actualizar
          const { data, error } = await supabase
            .from('company_settings')
            .update(updateData)
            .eq('company_id', profile.company_id)
            .select()
            .single();

          if (error) {
            console.error('Error actualizando configuración:', error);
            throw error;
          }
          settingsResult = data;
        } else {
          // Si no existe, crear
          const { data, error } = await supabase
            .from('company_settings')
            .insert({
              company_id: profile.company_id,
              ...updateData
            })
            .select()
            .single();

          if (error) {
            console.error('Error creando configuración:', error);
            throw error;
          }
          settingsResult = data;
        }

        console.log('Configuración de periodicidad guardada:', settingsResult);
      }

      toast({
        title: "Configuración guardada",
        description: "Los datos de tu empresa han sido actualizados correctamente.",
      });

      // Actualizar timestamp de última modificación
      setLastModified({
        user: user.email || 'Usuario',
        date: new Date().toLocaleString('es-CO')
      });

    } catch (error) {
      console.error('Error saving company data:', error);
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "No se pudieron guardar los datos de tu empresa.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevert = () => {
    loadConfiguration();
    toast({
      title: "Cambios revertidos",
      description: "Se han revertido todos los cambios no guardados.",
    });
  };

  const loadRecommended = () => {
    setConfig(prev => ({
      ...prev,
      periodicidadPago: 'mensual',
      diasPersonalizados: 30,
      regimenTributario: 'Responsable de IVA'
    }));
    toast({
      title: "Valores recomendados cargados",
      description: "Se han aplicado los valores recomendados por Aleluya.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Cargando configuración de tu empresa...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">🧾 Mi Empresa</h2>
          <p className="text-gray-600">Configuración general de tu empresa y datos legales</p>
        </div>

        {/* Información Básica */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Información Básica</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="razonSocial">Razón Social *</Label>
              <Input
                id="razonSocial"
                value={companyData.razon_social}
                onChange={(e) => handleCompanyDataChange('razon_social', e.target.value)}
                placeholder="Ej: Empresa ABC S.A.S."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="nit">NIT *</Label>
              <Input
                id="nit"
                value={companyData.nit}
                onChange={(e) => handleCompanyDataChange('nit', e.target.value)}
                placeholder="Ej: 900123456-7"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={companyData.email}
                onChange={(e) => handleCompanyDataChange('email', e.target.value)}
                placeholder="Ej: contacto@empresa.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="ciudad">Ciudad *</Label>
              <Input
                id="ciudad"
                value={companyData.ciudad}
                onChange={(e) => handleCompanyDataChange('ciudad', e.target.value)}
                placeholder="Ej: Bogotá D.C."
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={companyData.direccion}
                onChange={(e) => handleCompanyDataChange('direccion', e.target.value)}
                placeholder="Ej: Calle 123 # 45-67, Oficina 890"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={companyData.telefono}
                onChange={(e) => handleCompanyDataChange('telefono', e.target.value)}
                placeholder="Ej: +57 1 234 5678"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="representanteLegal">Representante Legal</Label>
              <Input
                id="representanteLegal"
                value={companyData.representante_legal}
                onChange={(e) => handleCompanyDataChange('representante_legal', e.target.value)}
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
                value={companyData.actividad_economica}
                onChange={(e) => handleCompanyDataChange('actividad_economica', e.target.value)}
                placeholder="Ej: 6201"
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="periodicidadPago">Periodicidad de Pago</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Selecciona la frecuencia con la que tu empresa paga la nómina. Esta configuración afecta todos los cálculos del sistema.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select value={config.periodicidadPago} onValueChange={(value) => handleInputChange('periodicidadPago', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar periodicidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal (7 días)</SelectItem>
                  <SelectItem value="quincenal">Quincenal (15 días)</SelectItem>
                  <SelectItem value="mensual">Mensual (30 días)</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo para días personalizados - NUEVO */}
            {config.periodicidadPago === 'personalizado' && (
              <div className="md:col-span-2">
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="diasPersonalizados">Días del período personalizado</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-orange-600" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Define cuántos días abarca cada período de pago en tu empresa. Puede ser cualquier número entre 1 y 365 días.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="diasPersonalizados"
                    type="number"
                    value={config.diasPersonalizados}
                    onChange={(e) => handleCustomDaysChange(parseInt(e.target.value) || 30)}
                    placeholder="Ej: 45"
                    min="1"
                    max="365"
                    className="max-w-xs"
                  />
                  <p className="text-sm text-orange-700 mt-2">
                    📅 Tu período personalizado será de <strong>{config.diasPersonalizados} días</strong>
                  </p>
                  {config.diasPersonalizados > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      ℹ️ Esto equivale a aproximadamente {Math.round(365 / config.diasPersonalizados)} períodos de pago al año
                    </p>
                  )}
                </div>
              </div>
            )}

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
            <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
            <Button variant="outline" onClick={handleRevert} disabled={isLoading}>
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
