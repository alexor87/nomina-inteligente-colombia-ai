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
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
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

      console.log('Usuario actual:', user.id, user.email);

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
        // Si no hay company_id, crear una empresa por defecto para el usuario
        console.log('No se encontró company_id, creando empresa...');
        await createDefaultCompany(user);
        return;
      }

      // Cargar datos de la empresa
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (companyError) {
        console.error('Error cargando empresa:', companyError);
        if (companyError.code === 'PGRST116') {
          // No se encontró la empresa, crear una por defecto
          await createDefaultCompany(user);
          return;
        }
        throw companyError;
      }

      console.log('Empresa encontrada:', company);

      if (company) {
        // Actualizar automáticamente el email si no coincide con el usuario actual
        const needsEmailUpdate = company.email !== user.email;
        
        setCompanyData({
          id: company.id,
          razon_social: company.razon_social || '',
          nit: company.nit || '',
          direccion: company.direccion || '',
          ciudad: company.ciudad || '',
          telefono: company.telefono || '',
          email: user.email || company.email || '', // Usar el email del usuario actual
          representante_legal: company.representante_legal || '',
          actividad_economica: company.actividad_economica || '',
          estado: company.estado || 'activa',
          plan: company.plan || 'basico'
        });

        // Si el email no coincide, actualizarlo automáticamente
        if (needsEmailUpdate) {
          console.log('Actualizando email de la empresa de', company.email, 'a', user.email);
          await supabase
            .from('companies')
            .update({ email: user.email })
            .eq('id', company.id);
        }
      }

      // Cargar configuración de periodicidad
      const { data: settings } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (settings) {
        setConfig(prev => ({
          ...prev,
          periodicidadPago: settings.periodicity
        }));
      }

    } catch (error) {
      console.error('Error loading company data:', error);
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron cargar los datos de la empresa.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultCompany = async (user: any) => {
    try {
      console.log('Creando empresa por defecto para usuario:', user.email);
      
      // Crear empresa por defecto
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          razon_social: 'Mi Empresa',
          nit: '000000000-0',
          email: user.email, // Usar el email del usuario actual
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
          periodicity: 'mensual'
        });

      if (settingsError) {
        console.error('Error creando configuración:', settingsError);
        // No lanzar error aquí, la configuración se puede crear después
      }

      // Recargar datos
      await loadCompanyData();

      toast({
        title: "Empresa creada",
        description: "Se ha creado una empresa por defecto. Puedes editarla ahora.",
      });

    } catch (error) {
      console.error('Error creating default company:', error);
      toast({
        title: "Error al crear empresa",
        description: "No se pudo crear la empresa por defecto.",
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
      // Validaciones
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
        throw new Error('No se encontró la empresa del usuario');
      }

      console.log('Guardando datos para empresa:', profile.company_id);

      // Actualizar datos de la empresa
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
        const { error: settingsError } = await supabase
          .from('company_settings')
          .upsert({
            company_id: profile.company_id,
            periodicity: config.periodicidadPago
          });

        if (settingsError) {
          console.error('Error actualizando configuración:', settingsError);
          throw settingsError;
        }
      }

      toast({
        title: "Configuración guardada",
        description: "Los datos de la empresa han sido actualizados correctamente.",
      });

      // Actualizar timestamp de última modificación
      setLastModified({
        user: 'Admin Usuario',
        date: new Date().toLocaleString('es-CO')
      });

    } catch (error) {
      console.error('Error saving company data:', error);
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "No se pudieron guardar los datos de la empresa.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevert = () => {
    loadCompanyData();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Cargando configuración...</div>
      </div>
    );
  }

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
              <Label htmlFor="periodicidadPago">Periodicidad de Pago</Label>
              <Select value={config.periodicidadPago} onValueChange={(value) => handleInputChange('periodicidadPago', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar periodicidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
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
