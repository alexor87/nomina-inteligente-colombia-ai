import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ConfigurationService, PayrollConfiguration } from '@/services/ConfigurationService';
import { CompanyPayrollPoliciesService } from '@/services/CompanyPayrollPoliciesService';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { PayrollPoliciesSettings } from '@/components/settings/PayrollPoliciesSettings';
import { Plus, Trash2, Copy } from 'lucide-react';

export const ParametrosLegalesSettings = () => {
  const { toast } = useToast();
  const { companyId } = useCurrentCompany();

  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('2025');
  const [config, setConfig] = useState<PayrollConfiguration>({
    salarioMinimo: 1423500,
    auxilioTransporte: 200000,
    uvt: 49799,
    porcentajes: {
      saludEmpleado: 0.04,
      pensionEmpleado: 0.04,
      saludEmpleador: 0.085,
      pensionEmpleador: 0.12,
      arl: 0.00522,
      cajaCompensacion: 0.04,
      icbf: 0.03,
      sena: 0.02,
      cesantias: 0.0833,
      interesesCesantias: 0.12,
      prima: 0.0833,
      vacaciones: 0.0417,
    },
    fondoSolidaridad: {
      ranges: [
        { minSMMLV: 4, maxSMMLV: 16, percentage: 1 },
        { minSMMLV: 16, maxSMMLV: 17, percentage: 1.2 },
        { minSMMLV: 17, maxSMMLV: 18, percentage: 1.4 },
        { minSMMLV: 18, maxSMMLV: 19, percentage: 1.6 },
        { minSMMLV: 19, maxSMMLV: 20, percentage: 1.8 },
        { minSMMLV: 20, maxSMMLV: null, percentage: 2 }
      ]
    },
    arlRiskLevels: {
      I: 0.348,
      II: 0.435,
      III: 0.783,
      IV: 1.740,
      V: 3.219,
    }
  });
  const [newYear, setNewYear] = useState('');
  const [showNewYearForm, setShowNewYearForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Company policies state
  const [incapacityPolicy, setIncapacityPolicy] = useState<'standard_2d_100_rest_66' | 'from_day1_66_with_floor'>('standard_2d_100_rest_66');

  useEffect(() => {
    loadAvailableYears();
    loadCompanyPolicies();
  }, []);

  useEffect(() => {
    loadYearConfiguration();
  }, [selectedYear]);

  const loadCompanyPolicies = async () => {
    if (!companyId) {
      console.log('⚠️ No companyId available for loading policies');
      return;
    }
    
    try {
      console.log('🔄 Loading company payroll policies for companyId:', companyId);
      const policies = await CompanyPayrollPoliciesService.getPayrollPolicies(companyId);
      if (policies) {
        console.log('✅ Loaded payroll policies:', policies);
        setIncapacityPolicy(policies.incapacity_policy || 'standard_2d_100_rest_66');
        
        // 🆕 DEBUG: Log policy loading for UI verification
        toast({
          title: "📋 Políticas Cargadas",
          description: `Política de incapacidades: ${policies.incapacity_policy === 'standard_2d_100_rest_66' ? 'Estándar (2 días 100%)' : 'Desde día 1 (66.67%)'}`,
          className: "border-blue-200 bg-blue-50"
        });
      } else {
        console.log('⚠️ No existing payroll policies found, using defaults');
        setIncapacityPolicy('standard_2d_100_rest_66');
        
        toast({
          title: "⚙️ Políticas por Defecto",
          description: "No se encontraron políticas guardadas. Usando configuración estándar.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('❌ Error loading payroll policies:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las políticas de la empresa",
        variant: "destructive"
      });
    }
  };

  const loadAvailableYears = async () => {
    try {
      const years = await ConfigurationService.getAvailableYears();
      setAvailableYears(years);
      if (years.length > 0 && !years.includes(selectedYear)) {
        setSelectedYear(years[0]);
      }
    } catch (error) {
      console.error('Error loading available years:', error);
      setAvailableYears(['2025', '2024']);
    }
  };

  const loadYearConfiguration = async () => {
    setIsLoading(true);
    try {
      const yearConfig = await ConfigurationService.getConfiguration(selectedYear);
      setConfig(yearConfig);
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await ConfigurationService.updateYearConfiguration(selectedYear, config);
      toast({
        title: "Parámetros legales guardados",
        description: `Los valores para el año ${selectedYear} han sido actualizados correctamente.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los parámetros legales.",
        variant: "destructive",
      });
    }
  };

  const handleCreateNewYear = async () => {
    if (!newYear || newYear.length !== 4 || isNaN(parseInt(newYear))) {
      toast({
        title: "Error",
        description: "Por favor ingresa un año válido (4 dígitos).",
        variant: "destructive",
      });
      return;
    }

    try {
      await ConfigurationService.createNewYear(newYear);
      await loadAvailableYears();
      setSelectedYear(newYear);
      setNewYear('');
      setShowNewYearForm(false);
      toast({
        title: "Año creado",
        description: `El año ${newYear} ha sido creado exitosamente.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteYear = async (year: string) => {
    if (availableYears.length <= 1) {
      toast({
        title: "Error",
        description: "No se puede eliminar el último año configurado.",
        variant: "destructive",
      });
      return;
    }

    try {
      await ConfigurationService.deleteYear(year);
      await loadAvailableYears();
      const remainingYears = await ConfigurationService.getAvailableYears();
      if (remainingYears.length > 0) {
        setSelectedYear(remainingYears[0]);
      }
      toast({
        title: "Año eliminado",
        description: `El año ${year} ha sido eliminado.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setConfig(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const handlePercentageChange = (field: string, value: string) => {
    const numericValue = parseFloat(value) / 100 || 0;
    setConfig(prev => ({
      ...prev,
      porcentajes: {
        ...prev.porcentajes,
        [field]: numericValue
      }
    }));
  };

  const handleARLRiskLevelChange = (level: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setConfig(prev => ({
      ...prev,
      arlRiskLevels: {
        ...prev.arlRiskLevels,
        [level]: numericValue
      }
    }));
  };

  const loadRecommendedValues = () => {
    const recommendedConfig = {
      ...config,
      salarioMinimo: 1300000,
      auxilioTransporte: 200000,
      uvt: 47065
    };
    setConfig(recommendedConfig);
    toast({
      title: "Valores recomendados cargados",
      description: `Se han cargado los valores oficiales para ${selectedYear}.`,
    });
  };

  const handleSavePolicies = async () => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "No se pudo identificar la empresa.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('💾 Saving incapacity policy:', incapacityPolicy);
      
      const existingPolicies = await CompanyPayrollPoliciesService.getPayrollPolicies(companyId);
      
      const policiesToSave = {
        ibc_mode: existingPolicies?.ibc_mode || 'proportional',
        incapacity_policy: incapacityPolicy,
        notes: existingPolicies?.notes || null
      };

      console.log('📋 Policies to save:', policiesToSave);

      await CompanyPayrollPoliciesService.upsertPayrollPolicies(companyId, policiesToSave);

      console.log('✅ Company payroll policies saved successfully');
      
      toast({
        title: "✅ Políticas Guardadas",
        description: `Política de incapacidades actualizada: ${incapacityPolicy === 'standard_2d_100_rest_66' ? 'Estándar (2 días 100% + resto 66.67%)' : 'Desde día 1 al 66.67% con piso SMLDV'}`,
        className: "border-green-200 bg-green-50"
      });

      setTimeout(() => {
        loadCompanyPolicies();
      }, 1000);

    } catch (error) {
      console.error('❌ Error saving payroll policies:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las políticas de nómina.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">📅 Parámetros Legales del Año</h2>
          <p className="text-gray-600">Mantén actualizado el sistema con la legislación vigente</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Años Configurados</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowNewYearForm(!showNewYearForm)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Año
          </Button>
        </div>

        {showNewYearForm && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 border-2 border-dashed border-gray-300">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="newYear">Año</Label>
                <Input
                  id="newYear"
                  type="number"
                  placeholder="2026"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleCreateNewYear} size="sm">
                  Crear
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowNewYearForm(false);
                    setNewYear('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Se copiarán los valores del año {selectedYear} como base
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {availableYears.map((year) => (
            <div 
              key={year} 
              className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                selectedYear === year 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedYear(year)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-lg">{year}</span>
                {availableYears.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteYear(year);
                    }}
                    className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {selectedYear === year && (
                <div className="text-xs text-blue-600 mt-1">Seleccionado</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Valores Base {selectedYear}</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="salarioMinimo">SMMLV (Salario Mínimo Mensual Legal Vigente)</Label>
              <Input
                id="salarioMinimo"
                type="number"
                value={config.salarioMinimo}
                onChange={(e) => handleInputChange('salarioMinimo', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">Valor oficial para {selectedYear}</p>
            </div>

            <div>
              <Label htmlFor="auxilioTransporte">Subsidio de Transporte</Label>
              <Input
                id="auxilioTransporte"
                type="number"
                value={config.auxilioTransporte}
                onChange={(e) => handleInputChange('auxilioTransporte', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">Para empleados con salario ≤ 2 SMMLV</p>
            </div>

            <div>
              <Label htmlFor="uvt">UVT (Unidad de Valor Tributario)</Label>
              <Input
                id="uvt"
                type="number"
                value={config.uvt}
                onChange={(e) => handleInputChange('uvt', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">Base para cálculos tributarios</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Topes de Cotización</h3>
          
          <div className="space-y-4">
            <div>
              <Label>Tope Mínimo</Label>
              <Input
                type="number"
                value={config.salarioMinimo * 0.4}
                readOnly
                className="mt-1 bg-gray-50"
              />
              <p className="text-sm text-gray-500 mt-1">40% del SMMLV</p>
            </div>

            <div>
              <Label>Tope Máximo</Label>
              <Input
                type="number"
                value={config.salarioMinimo * 25}
                readOnly
                className="mt-1 bg-gray-50"
              />
              <p className="text-sm text-gray-500 mt-1">25 SMMLV</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Información</h4>
              <p className="text-sm text-blue-700">
                Los topes se calculan automáticamente basados en el SMMLV configurado.
                Estos valores son utilizados para las cotizaciones de seguridad social.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Porcentajes de Aportes y Prestaciones</h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="saludEmpleado">Salud Empleado (%)</Label>
            <Input
              id="saludEmpleado"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.saludEmpleado * 100).toFixed(2)}
              onChange={(e) => handlePercentageChange('saludEmpleado', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="pensionEmpleado">Pensión Empleado (%)</Label>
            <Input
              id="pensionEmpleado"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.pensionEmpleado * 100).toFixed(2)}
              onChange={(e) => handlePercentageChange('pensionEmpleado', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="cesantias">Cesantías (%)</Label>
            <Input
              id="cesantias"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.cesantias * 100).toFixed(4)}
              onChange={(e) => handlePercentageChange('cesantias', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="prima">Prima (%)</Label>
            <Input
              id="prima"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.prima * 100).toFixed(4)}
              onChange={(e) => handlePercentageChange('prima', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="vacaciones">Vacaciones (%)</Label>
            <Input
              id="vacaciones"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.vacaciones * 100).toFixed(4)}
              onChange={(e) => handlePercentageChange('vacaciones', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="arl">ARL (%)</Label>
            <Input
              id="arl"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.arl * 100).toFixed(3)}
              onChange={(e) => handlePercentageChange('arl', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="cajaCompensacion">Caja Compensación (%)</Label>
            <Input
              id="cajaCompensacion"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.cajaCompensacion * 100).toFixed(2)}
              onChange={(e) => handlePercentageChange('cajaCompensacion', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="icbf">ICBF (%)</Label>
            <Input
              id="icbf"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={(config.porcentajes.icbf * 100).toFixed(2)}
              onChange={(e) => handlePercentageChange('icbf', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Porcentajes de Riesgo ARL</h3>
        <p className="text-sm text-gray-600 mb-4">
          Estos porcentajes se aplican según el nivel de riesgo del cargo del empleado
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="arlNivelI">Nivel I (%)</Label>
            <Input
              id="arlNivelI"
              type="number"
              step="0.001"
              min="0"
              max="100"
              value={config.arlRiskLevels.I.toFixed(3)}
              onChange={(e) => handleARLRiskLevelChange('I', e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Riesgo Mínimo</p>
          </div>

          <div>
            <Label htmlFor="arlNivelII">Nivel II (%)</Label>
            <Input
              id="arlNivelII"
              type="number"
              step="0.001"
              min="0"
              max="100"
              value={config.arlRiskLevels.II.toFixed(3)}
              onChange={(e) => handleARLRiskLevelChange('II', e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Riesgo Bajo</p>
          </div>

          <div>
            <Label htmlFor="arlNivelIII">Nivel III (%)</Label>
            <Input
              id="arlNivelIII"
              type="number"
              step="0.001"
              min="0"
              max="100"
              value={config.arlRiskLevels.III.toFixed(3)}
              onChange={(e) => handleARLRiskLevelChange('III', e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Riesgo Medio</p>
          </div>

          <div>
            <Label htmlFor="arlNivelIV">Nivel IV (%)</Label>
            <Input
              id="arlNivelIV"
              type="number"
              step="0.001"
              min="0"
              max="100"
              value={config.arlRiskLevels.IV.toFixed(3)}
              onChange={(e) => handleARLRiskLevelChange('IV', e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Riesgo Alto</p>
          </div>

          <div>
            <Label htmlFor="arlNivelV">Nivel V (%)</Label>
            <Input
              id="arlNivelV"
              type="number"
              step="0.001"
              min="0"
              max="100"
              value={config.arlRiskLevels.V.toFixed(3)}
              onChange={(e) => handleARLRiskLevelChange('V', e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Riesgo Máximo</p>
          </div>
        </div>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          Guardar Parámetros {selectedYear}
        </Button>
      </div>

      <Separator className="my-8" />

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Políticas de Nómina de la Empresa</h2>
          <p className="text-gray-600">
            Configura cómo se calculan los IBC y las incapacidades específicamente para tu empresa
          </p>
        </div>

        <PayrollPoliciesSettings
          incapacityPolicy={incapacityPolicy}
          onIncapacityPolicyChange={setIncapacityPolicy}
        />

        <div className="flex gap-4">
          <Button onClick={handleSavePolicies} className="bg-green-600 hover:bg-green-700">
            💾 Guardar Políticas de Nómina
          </Button>
        </div>
      </div>
    </div>
  );
};
