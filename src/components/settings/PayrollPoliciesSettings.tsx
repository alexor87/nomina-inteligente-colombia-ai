
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { CompanyPayrollPoliciesService, CompanyPayrollPolicies } from '@/services/CompanyPayrollPoliciesService';
import { NovedadPolicyManager } from './NovedadPolicyManager';
import { IncapacityPolicyTester } from './IncapacityPolicyTester';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const PayrollPoliciesSettings = () => {
  const [policies, setPolicies] = useState<CompanyPayrollPolicies | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');
  const { toast } = useToast();

  // Load company ID and policies
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.company_id) {
          setCompanyId(profile.company_id);
          
          const existingPolicies = await CompanyPayrollPoliciesService.getPayrollPolicies(profile.company_id);
          setPolicies(existingPolicies || {
            company_id: profile.company_id,
            ...CompanyPayrollPoliciesService.getDefaultPolicies()
          });
        }
      } catch (error) {
        console.error('Error loading policies:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las políticas",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const handleSave = async () => {
    if (!policies || !companyId) return;

    setIsSaving(true);
    try {
      await CompanyPayrollPoliciesService.upsertPayrollPolicies(companyId, {
        ibc_mode: policies.ibc_mode,
        incapacity_policy: policies.incapacity_policy,
        notes: policies.notes
      });

      toast({
        title: "✅ Políticas Guardadas",
        description: "Las políticas de nómina se han actualizado correctamente",
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('Error saving policies:', error);
      toast({
        title: "❌ Error",
        description: "No se pudieron guardar las políticas",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePolicies = (updates: Partial<CompanyPayrollPolicies>) => {
    if (policies) {
      setPolicies({ ...policies, ...updates });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            ⚙️ Políticas de Nómina
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Estas políticas definen cómo se calculan automáticamente las incapacidades y el IBC (Ingreso Base de Cotización) en su empresa.
            </AlertDescription>
          </Alert>

          {/* IBC Calculation Mode */}
          <div className="space-y-3">
            <Label htmlFor="ibc_mode">Modo de Cálculo del IBC</Label>
            <Select 
              value={policies?.ibc_mode || 'proportional'} 
              onValueChange={(value: 'proportional' | 'full_salary') => 
                updatePolicies({ ibc_mode: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proportional">
                  <div className="space-y-1">
                    <div>Proporcional a días trabajados</div>
                    <div className="text-xs text-gray-500">IBC = (Salario ÷ 30) × días trabajados + novedades constitutivas</div>
                  </div>
                </SelectItem>
                <SelectItem value="full_salary">
                  <div className="space-y-1">
                    <div>Salario completo</div>
                    <div className="text-xs text-gray-500">IBC = Salario mensual completo + novedades constitutivas</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Actual: {policies?.ibc_mode === 'proportional' ? 'Proporcional' : 'Salario Completo'}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Incapacity Policy */}
          <div className="space-y-3">
            <Label htmlFor="incapacity_policy">Política de Incapacidades</Label>
            <Select 
              value={policies?.incapacity_policy || 'standard_2d_100_rest_66'} 
              onValueChange={(value: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor') => 
                updatePolicies({ incapacity_policy: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard_2d_100_rest_66">
                  <div className="space-y-1">
                    <div>Estándar: 2 días 100% + resto 66.67%</div>
                    <div className="text-xs text-gray-500">Primeros 2 días al 100%, demás días al 66.67% con piso SMLDV</div>
                  </div>
                </SelectItem>
                <SelectItem value="from_day1_66_with_floor">
                  <div className="space-y-1">
                    <div>Desde día 1 al 66.67% con piso</div>
                    <div className="text-xs text-gray-500">Todos los días al 66.67% con piso SMLDV desde el primer día</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Actual: {policies?.incapacity_policy === 'standard_2d_100_rest_66' ? 'Estándar' : 'Día 1 al 66.67%'}
              </Badge>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              placeholder="Notas sobre las políticas de la empresa..."
              value={policies?.notes || ''}
              onChange={(e) => updatePolicies({ notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Políticas
          </Button>
        </CardContent>
      </Card>

      {/* Policy Manager */}
      {companyId && (
        <NovedadPolicyManager companyId={companyId} />
      )}

      {/* Policy Tester */}
      {policies && (
        <IncapacityPolicyTester currentPolicy={policies.incapacity_policy} />
      )}
    </div>
  );
};
