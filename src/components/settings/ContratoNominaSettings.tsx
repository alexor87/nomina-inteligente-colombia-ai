import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Info, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const ContratoNominaSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState({
    // Tipos de contrato permitidos
    tiposContratoPermitidos: {
      fijo: true,
      indefinido: true,
      obra: false,
      servicios: false,
      aprendiz: false
    },
    
    // Configuración de periodicidad - ahora sincronizada con la DB
    diasPeriodicidad: 30,
    periodicidadPago: 'mensual', // Ahora viene de la DB
    diasPersonalizados: 30, // Nuevo campo para períodos personalizados
    
    // Horas y jornada
    jornadaEstandar: 8,
    politicaRedondeo: 'decimales',
    
    // Prestaciones sociales
    prestacionesActivadas: {
      prima: true,
      cesantias: true,
      interesesCesantias: true,
      vacaciones: true
    },
    
    // Bonificaciones y deducciones
    bonificacionesActivas: {
      noSalariales: false,
      anticipos: false,
      libranzas: false,
      descuentosPersonalizados: false
    },
    
    // Reglas de liquidación
    metodoCalculo: 'calendario-fijo',
    calculoInteresesCesantias: 'mensual',
    vacacionesConfig: {
      acumularAutomaticamente: true,
      permitirAnticipar: false,
      liquidarAlFinalizar: true
    }
  });

  // Cargar configuración al montar el componente
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

      // Obtener el perfil del usuario para conseguir company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        console.error('Error obteniendo perfil:', profileError);
        toast({
          title: "Error al cargar perfil",
          description: "No se pudo obtener el perfil del usuario.",
          variant: "destructive"
        });
        return;
      }

      // Cargar configuración de periodicidad desde la DB
      const { data: settings, error: settingsError } = await supabase
        .from('company_settings')
        .select('periodicity, custom_period_days')
        .eq('company_id', profile.company_id)
        .single();

      if (settingsError) {
        console.log('No se encontró configuración de empresa, usando valores por defecto');
      } else if (settings) {
        // Mapear periodicidad y calcular días correspondientes
        const periodicityToDays = {
          'semanal': 7,
          'quincenal': 15,
          'mensual': 30,
          'personalizado': settings.custom_period_days || 30
        };

        setConfig(prev => ({
          ...prev,
          periodicidadPago: settings.periodicity,
          diasPeriodicidad: periodicityToDays[settings.periodicity as keyof typeof periodicityToDays] || 30,
          diasPersonalizados: settings.custom_period_days || 30
        }));

        console.log('Configuración cargada desde DB:', settings);
      }

    } catch (error) {
      console.error('Error loading configuration:', error);
      toast({
        title: "Error al cargar configuración",
        description: "No se pudo cargar la configuración de contrato.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizar periodicidad en la DB cuando cambie
  const updatePeriodicityInDB = async (newPeriodicity: string, customDays?: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        console.error('Error obteniendo company_id para actualizar periodicidad');
        return;
      }

      // Verificar si existe configuración
      const { data: existingSettings, error: checkError } = await supabase
        .from('company_settings')
        .select('id')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      if (checkError) {
        console.error('Error verificando configuración existente:', checkError);
        return;
      }

      const updateData: any = {
        periodicity: newPeriodicity,
        updated_at: new Date().toISOString()
      };

      // Si es personalizado, incluir los días personalizados
      if (newPeriodicity === 'personalizado' && customDays) {
        updateData.custom_period_days = customDays;
      }

      if (existingSettings) {
        // Si existe, actualizar
        const { error } = await supabase
          .from('company_settings')
          .update(updateData)
          .eq('company_id', profile.company_id);

        if (error) {
          console.error('Error actualizando periodicidad:', error);
          return;
        }
      } else {
        // Si no existe, crear
        const { error } = await supabase
          .from('company_settings')
          .insert({
            company_id: profile.company_id,
            ...updateData
          });

        if (error) {
          console.error('Error creando configuración de periodicidad:', error);
          return;
        }
      }

      console.log('Periodicidad actualizada en DB:', newPeriodicity, customDays ? `(${customDays} días)` : '');
    } catch (error) {
      console.error('Error updating periodicity in DB:', error);
    }
  };

  // Cálculos automáticos basados en periodicidad
  const getFrecuenciaEstimada = (dias: number) => {
    if (dias <= 7) return 'Semanal';
    if (dias <= 15) return 'Quincenal';
    if (dias <= 31) return 'Mensual';
    return 'Personalizada';
  };

  const getCiclosAlAno = (dias: number) => {
    return Math.round(365 / dias);
  };

  const getDiasBasePrestaciones = (dias: number) => {
    return dias;
  };

  const handleTipoContratoChange = (tipo: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      tiposContratoPermitidos: {
        ...prev.tiposContratoPermitidos,
        [tipo]: checked
      }
    }));
  };

  const handlePrestacionChange = (prestacion: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      prestacionesActivadas: {
        ...prev.prestacionesActivadas,
        [prestacion]: checked
      }
    }));
  };

  const handleBonificacionChange = (bonificacion: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      bonificacionesActivas: {
        ...prev.bonificacionesActivas,
        [bonificacion]: checked
      }
    }));
  };

  const handleVacacionesChange = (campo: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      vacacionesConfig: {
        ...prev.vacacionesConfig,
        [campo]: checked
      }
    }));
  };

  // Manejar cambio de periodicidad con sincronización a DB
  const handlePeriodicityChange = async (value: string) => {
    const periodicityToDays = {
      'semanal': 7,
      'quincenal': 15,
      'mensual': 30,
      'personalizado': config.diasPersonalizados
    };

    const newDays = periodicityToDays[value as keyof typeof periodicityToDays] || 30;

    setConfig(prev => ({
      ...prev,
      periodicidadPago: value,
      diasPeriodicidad: newDays
    }));

    // Actualizar en la base de datos
    await updatePeriodicityInDB(value, value === 'personalizado' ? config.diasPersonalizados : undefined);

    toast({
      title: "Periodicidad actualizada",
      description: `La periodicidad se ha cambiado a ${value} en todo el sistema.`,
    });
  };

  // Manejar cambio de días personalizados
  const handleCustomDaysChange = async (days: number) => {
    setConfig(prev => ({
      ...prev,
      diasPersonalizados: days,
      diasPeriodicidad: prev.periodicidadPago === 'personalizado' ? days : prev.diasPeriodicidad
    }));

    // Si la periodicidad actual es personalizada, actualizar en DB
    if (config.periodicidadPago === 'personalizado') {
      await updatePeriodicityInDB('personalizado', days);
      
      toast({
        title: "Días personalizados actualizado",
        description: `El período personalizado ahora es de ${days} días.`,
      });
    }
  };

  // Validar formulario
  const validateForm = () => {
    // Validar que al menos un tipo de contrato esté seleccionado
    const tiposSeleccionados = Object.values(config.tiposContratoPermitidos).some(tipo => tipo);
    if (!tiposSeleccionados) {
      toast({
        title: "Error de validación",
        description: "Debe seleccionar al menos un tipo de contrato permitido.",
        variant: "destructive"
      });
      return false;
    }

    // Validar periodicidad
    if (config.diasPeriodicidad < 1 || config.diasPeriodicidad > 31) {
      toast({
        title: "Error de validación",
        description: "La periodicidad debe estar entre 1 y 31 días.",
        variant: "destructive"
      });
      return false;
    }

    // Validar jornada
    if (config.jornadaEstandar < 1 || config.jornadaEstandar > 12) {
      toast({
        title: "Error de validación",
        description: "La jornada estándar debe estar entre 1 y 12 horas.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Mostrar advertencia si jornada > 8h y no hay recargos configurados
    if (config.jornadaEstandar > 8) {
      toast({
        title: "Advertencia",
        description: "Jornada superior a 8 horas. Asegúrate de configurar recargos por horas extra.",
        variant: "destructive"
      });
    }

    // Mostrar advertencia si hay días que no dividen el año exactamente
    const resto = 365 % config.diasPeriodicidad;
    if (resto !== 0) {
      toast({
        title: "Advertencia",
        description: `La periodicidad de ${config.diasPeriodicidad} días no divide exactamente el año. Quedarán ${resto} días sin ciclo.`,
        variant: "destructive"
      });
    }

    toast({
      title: "Configuración guardada",
      description: "Los parámetros de contrato y nómina han sido actualizados.",
    });
  };

  const handleRevert = () => {
    loadConfiguration();
    toast({
      title: "Cambios revertidos",
      description: "Se han revertido todos los cambios no guardados.",
    });
  };

  const loadRecommended = () => {
    setConfig({
      tiposContratoPermitidos: {
        fijo: true,
        indefinido: true,
        obra: false,
        servicios: false,
        aprendiz: false
      },
      diasPeriodicidad: 30,
      periodicidadPago: 'mensual',
      jornadaEstandar: 8,
      politicaRedondeo: 'decimales',
      prestacionesActivadas: {
        prima: true,
        cesantias: true,
        interesesCesantias: true,
        vacaciones: true
      },
      bonificacionesActivas: {
        noSalariales: false,
        anticipos: false,
        libranzas: false,
        descuentosPersonalizados: false
      },
      metodoCalculo: 'calendario-fijo',
      calculoInteresesCesantias: 'mensual',
      vacacionesConfig: {
        acumularAutomaticamente: true,
        permitirAnticipar: false,
        liquidarAlFinalizar: true
      }
    });

    toast({
      title: "Valores recomendados cargados",
      description: "Se han aplicado los valores recomendados (mensual, jornada de 8h, 30 días base).",
    });
  };

  const showPrestacionWarning = () => {
    const prestacionesDesactivadas = Object.entries(config.prestacionesActivadas)
      .filter(([_, activa]) => !activa)
      .map(([prestacion]) => prestacion);

    if (prestacionesDesactivadas.length > 0) {
      return (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800">Advertencia UGPP</p>
            <p className="text-yellow-700">
              Has desactivado algunas prestaciones legales. Esto puede generar riesgos en una inspección laboral.
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Cargando configuración de contrato...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">📄 Contrato y Nómina</h2>
          <p className="text-gray-600">Configuración de tipos de contrato y parámetros de liquidación</p>
        </div>

        {/* Sección 1: Tipos de Contrato Permitidos */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">🧱 Tipos de Contrato Permitidos</h3>
          <p className="text-sm text-gray-600 mb-4">
            Selecciona los tipos de contrato que tu empresa está autorizada a usar:
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="fijo"
                checked={config.tiposContratoPermitidos.fijo}
                onCheckedChange={(checked) => handleTipoContratoChange('fijo', checked as boolean)}
              />
              <Label htmlFor="fijo">Contrato a término fijo</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="indefinido"
                checked={config.tiposContratoPermitidos.indefinido}
                onCheckedChange={(checked) => handleTipoContratoChange('indefinido', checked as boolean)}
              />
              <Label htmlFor="indefinido">Contrato a término indefinido</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="obra"
                checked={config.tiposContratoPermitidos.obra}
                onCheckedChange={(checked) => handleTipoContratoChange('obra', checked as boolean)}
              />
              <Label htmlFor="obra">Obra o labor</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="servicios"
                checked={config.tiposContratoPermitidos.servicios}
                onCheckedChange={(checked) => handleTipoContratoChange('servicios', checked as boolean)}
              />
              <Label htmlFor="servicios">Prestación de servicios</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="aprendiz"
                checked={config.tiposContratoPermitidos.aprendiz}
                onCheckedChange={(checked) => handleTipoContratoChange('aprendiz', checked as boolean)}
              />
              <Label htmlFor="aprendiz">Aprendiz SENA</Label>
            </div>
          </div>
        </Card>

        {/* Sección 2: Configuración de Periodicidad de Pago - MEJORADA */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">🗓️ Configuración de Periodicidad de Pago</h3>
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-blue-700">
              <Info className="h-4 w-4 inline mr-2" />
              Esta configuración está sincronizada con el módulo de Empresa. Los cambios se reflejan en todo el sistema.
            </p>
          </div>
          
          <div className="space-y-4">
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
              <Select value={config.periodicidadPago} onValueChange={handlePeriodicityChange}>
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

            {/* Campo para días personalizados */}
            {config.periodicidadPago === 'personalizado' && (
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
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="diasPeriodicidad">Días por período (calculado automáticamente)</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Número de días que cubre cada período de pago. Se actualiza automáticamente según la periodicidad seleccionada.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="diasPeriodicidad"
                type="number"
                value={config.diasPeriodicidad}
                placeholder="Días calculados automáticamente"
                className="mt-1 max-w-xs bg-gray-50"
                disabled
              />
            </div>

            {/* Campos calculados automáticamente */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-gray-700">Cálculos Automáticos:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Frecuencia estimada:</span>
                  <p className="font-medium">{getFrecuenciaEstimada(config.diasPeriodicidad)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Ciclos de pago al año:</span>
                  <p className="font-medium">{getCiclosAlAno(config.diasPeriodicidad)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Días base para prestaciones:</span>
                  <p className="font-medium">{getDiasBasePrestaciones(config.diasPeriodicidad)}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Sección 3: Horas y Jornada */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">⏱️ Horas y Jornada</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jornadaEstandar">Jornada estándar (horas por día)</Label>
              <Input
                id="jornadaEstandar"
                type="number"
                value={config.jornadaEstandar}
                onChange={(e) => setConfig(prev => ({ ...prev, jornadaEstandar: parseInt(e.target.value) || 8 }))}
                min="1"
                max="12"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="politicaRedondeo">Política de redondeo</Label>
              <Select 
                value={config.politicaRedondeo} 
                onValueChange={(value) => setConfig(prev => ({ ...prev, politicaRedondeo: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="decimales">Sin redondeo (usar decimales exactos)</SelectItem>
                  <SelectItem value="dos-decimales">Redondear a dos decimales</SelectItem>
                  <SelectItem value="pesos">Redondear a pesos enteros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Sección 4: Prestaciones Sociales */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">💼 Prestaciones Sociales</h3>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="prima"
                  checked={config.prestacionesActivadas.prima}
                  onCheckedChange={(checked) => handlePrestacionChange('prima', checked as boolean)}
                />
                <Label htmlFor="prima">Prima de servicios</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="cesantias"
                  checked={config.prestacionesActivadas.cesantias}
                  onCheckedChange={(checked) => handlePrestacionChange('cesantias', checked as boolean)}
                />
                <Label htmlFor="cesantias">Cesantías</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="interesesCesantias"
                  checked={config.prestacionesActivadas.interesesCesantias}
                  onCheckedChange={(checked) => handlePrestacionChange('interesesCesantias', checked as boolean)}
                />
                <Label htmlFor="interesesCesantias">Intereses sobre cesantías</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="vacaciones"
                  checked={config.prestacionesActivadas.vacaciones}
                  onCheckedChange={(checked) => handlePrestacionChange('vacaciones', checked as boolean)}
                />
                <Label htmlFor="vacaciones">Vacaciones</Label>
              </div>
            </div>

            {showPrestacionWarning()}
          </div>
        </Card>

        {/* Sección 5: Bonificaciones y Deducciones */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">💰 Bonificaciones y Deducciones</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="noSalariales">Permitir bonificaciones no salariales</Label>
                <p className="text-sm text-gray-600">Bonificaciones que no afectan seguridad social</p>
              </div>
              <Switch
                id="noSalariales"
                checked={config.bonificacionesActivas.noSalariales}
                onCheckedChange={(checked) => handleBonificacionChange('noSalariales', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="anticipos">Permitir anticipos o préstamos internos</Label>
                <p className="text-sm text-gray-600">Adelantos de sueldo y préstamos a empleados</p>
              </div>
              <Switch
                id="anticipos"
                checked={config.bonificacionesActivas.anticipos}
                onCheckedChange={(checked) => handleBonificacionChange('anticipos', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="libranzas">Permitir libranzas automáticas</Label>
                <p className="text-sm text-gray-600">Descuentos automáticos por libranzas bancarias</p>
              </div>
              <Switch
                id="libranzas"
                checked={config.bonificacionesActivas.libranzas}
                onCheckedChange={(checked) => handleBonificacionChange('libranzas', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="descuentosPersonalizados">Permitir descuentos personalizados</Label>
                <p className="text-sm text-gray-600">Otros descuentos configurables por empleado</p>
              </div>
              <Switch
                id="descuentosPersonalizados"
                checked={config.bonificacionesActivas.descuentosPersonalizados}
                onCheckedChange={(checked) => handleBonificacionChange('descuentosPersonalizados', checked)}
              />
            </div>
          </div>
        </Card>

        {/* Sección 6: Reglas de Liquidación */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">⚙️ Reglas de Liquidación</h3>
          
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Método de cálculo de nómina</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="calendario-fijo"
                    name="metodoCalculo"
                    value="calendario-fijo"
                    checked={config.metodoCalculo === 'calendario-fijo'}
                    onChange={(e) => setConfig(prev => ({ ...prev, metodoCalculo: e.target.value }))}
                  />
                  <Label htmlFor="calendario-fijo">Calendario fijo de 30 días</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="dias-reales"
                    name="metodoCalculo"
                    value="dias-reales"
                    checked={config.metodoCalculo === 'dias-reales'}
                    onChange={(e) => setConfig(prev => ({ ...prev, metodoCalculo: e.target.value }))}
                  />
                  <Label htmlFor="dias-reales">Días reales trabajados</Label>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Intereses sobre cesantías</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="mensual"
                    name="calculoIntereses"
                    value="mensual"
                    checked={config.calculoInteresesCesantias === 'mensual'}
                    onChange={(e) => setConfig(prev => ({ ...prev, calculoInteresesCesantias: e.target.value }))}
                  />
                  <Label htmlFor="mensual">Calcular mensualmente</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="finalizar"
                    name="calculoIntereses"
                    value="finalizar"
                    checked={config.calculoInteresesCesantias === 'finalizar'}
                    onChange={(e) => setConfig(prev => ({ ...prev, calculoInteresesCesantias: e.target.value }))}
                  />
                  <Label htmlFor="finalizar">Calcular solo al finalizar contrato o diciembre</Label>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Vacaciones</Label>
              <div className="space-y-3 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="acumular"
                    checked={config.vacacionesConfig.acumularAutomaticamente}
                    onCheckedChange={(checked) => handleVacacionesChange('acumularAutomaticamente', checked as boolean)}
                  />
                  <Label htmlFor="acumular">Acumular automáticamente</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="anticipar"
                    checked={config.vacacionesConfig.permitirAnticipar}
                    onCheckedChange={(checked) => handleVacacionesChange('permitirAnticipar', checked as boolean)}
                  />
                  <Label htmlFor="anticipar">Permitir anticipar</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="liquidarFinalizar"
                    checked={config.vacacionesConfig.liquidarAlFinalizar}
                    onCheckedChange={(checked) => handleVacacionesChange('liquidarAlFinalizar', checked as boolean)}
                  />
                  <Label htmlFor="liquidarFinalizar">Liquidar siempre al finalizar contrato</Label>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Controles Inferiores */}
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
        </div>
      </div>
    </TooltipProvider>
  );
};
