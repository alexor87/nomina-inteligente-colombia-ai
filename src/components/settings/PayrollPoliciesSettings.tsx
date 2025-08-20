
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { PayrollPoliciesService, PayrollPoliciesFormData } from '@/services/PayrollPoliciesService';

export const PayrollPoliciesSettings = () => {
  const { companyId } = useCurrentCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState<PayrollPoliciesFormData>(
    PayrollPoliciesService.getDefaultPolicies()
  );

  useEffect(() => {
    if (companyId) {
      loadPolicies();
    }
  }, [companyId]);

  const loadPolicies = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      console.log('🔄 Loading payroll policies for:', companyId);
      const data = await PayrollPoliciesService.getPayrollPolicies(companyId);
      
      if (data) {
        console.log('✅ Loaded policies:', data);
        setPolicies({
          ibc_mode: data.ibc_mode,
          incapacity_policy: data.incapacity_policy,
          notes: data.notes || ''
        });
      } else {
        console.log('ℹ️ No policies found, using defaults');
        setPolicies(PayrollPoliciesService.getDefaultPolicies());
      }
    } catch (error) {
      console.error('❌ Error loading policies:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las políticas de nómina. Se usarán valores por defecto.",
        variant: "destructive"
      });
      setPolicies(PayrollPoliciesService.getDefaultPolicies());
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "No se pudo identificar la empresa",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      console.log('💾 Saving policies:', policies);
      
      const result = await PayrollPoliciesService.upsertPayrollPolicies(companyId, policies);
      console.log('✅ Policies saved successfully:', result);
      
      toast({
        title: "Políticas guardadas",
        description: "Las políticas de nómina se han actualizado exitosamente",
        variant: "default"
      });
    } catch (error) {
      console.error('❌ Error saving policies:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las políticas de nómina",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-lg">Cargando políticas de nómina...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⚙️ Políticas de Cálculo de Nómina
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Automatic IBC Explanation */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">🤖 Cálculo Automático de IBC</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Con incapacidades:</strong> IBC = Valor total de incapacidades del período</p>
            <p><strong>Sin incapacidades:</strong> IBC = (Salario Base ÷ 30) × Días Trabajados</p>
            <p className="text-xs text-blue-600 mt-2">
              El sistema determina automáticamente el método más apropiado según las circunstancias de cada empleado.
            </p>
          </div>
        </div>

        {/* Incapacity Policy Configuration */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium">Política de Incapacidades</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Define cómo se calculan las incapacidades generales:</p>
                <ul className="mt-2 list-disc list-inside text-sm">
                  <li><strong>Estándar:</strong> Primeros 2 días al 100%, resto al 66.67% con piso SMLDV</li>
                  <li><strong>Desde día 1:</strong> Todos los días al 66.67% con piso SMLDV</li>
                </ul>
                <p className="mt-2 text-xs">Las incapacidades laborales siempre se pagan al 100% desde el día 1.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <RadioGroup 
            value={policies.incapacity_policy} 
            onValueChange={(value: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor') =>
              setPolicies(prev => ({ ...prev, incapacity_policy: value }))
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="standard_2d_100_rest_66" id="policy-standard" />
              <Label htmlFor="policy-standard" className="cursor-pointer">
                <div>
                  <div className="font-medium">Estándar (2 días 100% + resto 66.67%)</div>
                  <div className="text-sm text-gray-600">
                    Primeros 2 días pagados por el empleador al 100%, resto por EPS al 66.67% con piso SMLDV
                  </div>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="from_day1_66_with_floor" id="policy-from-day1" />
              <Label htmlFor="policy-from-day1" className="cursor-pointer">
                <div>
                  <div className="font-medium">Desde día 1 al 66.67% con piso SMLDV</div>
                  <div className="text-sm text-gray-600">
                    Todos los días al 66.67% del salario con piso de SMLDV (compatible con otro software)
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Preview/Example */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">Ejemplo con configuración actual:</h4>
          <div className="text-sm text-green-800 space-y-1">
            <p><strong>IBC:</strong> Se calcula automáticamente según las circunstancias del empleado</p>
            <p><strong>Incapacidad general:</strong> {policies.incapacity_policy === 'standard_2d_100_rest_66' 
              ? 'Primeros 2 días 100%, resto 66.67% con piso SMLDV' 
              : 'Todos los días 66.67% con piso SMLDV'}</p>
            <p><strong>Incapacidad laboral:</strong> 100% desde el día 1 (automático)</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Guardar Políticas
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
