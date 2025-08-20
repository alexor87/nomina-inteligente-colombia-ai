
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { CompanySettingsService } from '@/services/CompanySettingsService';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { CompanySettings, CompanySettingsFormData } from '@/types/company-settings';
import { PayrollPoliciesSettings } from '@/components/settings/PayrollPoliciesSettings';
import { Loader2, Settings, Calculator, Clock, Building, CheckCircle } from 'lucide-react';

export const ParametrosLegalesSettings = () => {
  const { companyId } = useCurrentCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettingsFormData>(
    CompanySettingsService.getDefaultSettings()
  );

  useEffect(() => {
    if (companyId) {
      loadSettings();
    }
  }, [companyId]);

  const loadSettings = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      console.log('🔄 Loading company settings for:', companyId);
      const data = await CompanySettingsService.getCompanySettings(companyId);
      
      if (data) {
        console.log('✅ Loaded settings:', data);
        setSettings({
          periodicity: data.periodicity,
          custom_period_days: data.custom_period_days,
          provision_mode: data.provision_mode
        });
      } else {
        console.log('ℹ️ No settings found, using defaults');
        setSettings(CompanySettingsService.getDefaultSettings());
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones. Se usarán valores por defecto.",
        variant: "destructive"
      });
      setSettings(CompanySettingsService.getDefaultSettings());
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
      console.log('💾 Saving settings:', settings);
      
      const result = await CompanySettingsService.upsertCompanySettings(companyId, settings);
      console.log('✅ Settings saved successfully:', result);
      
      toast({
        title: "Configuración guardada",
        description: "Las configuraciones legales se han actualizado exitosamente",
        variant: "default"
      });
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las configuraciones",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Parámetros Legales</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2 py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-lg">Cargando configuraciones legales...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parámetros Legales</h1>
          <p className="text-muted-foreground mt-2">
            Configura los parámetros legales y políticas de cálculo para la nómina de tu empresa
          </p>
        </div>
      </div>

      {/* Payroll Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Configuración de Nómina</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="periodicity">Periodicidad de Nómina</Label>
              <Select
                value={settings.periodicity}
                onValueChange={(value: 'semanal' | 'quincenal' | 'mensual') =>
                  setSettings(prev => ({ ...prev, periodicity: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Define la frecuencia con la que se procesará la nómina
              </p>
            </div>

            {settings.periodicity === 'mensual' && (
              <div className="space-y-2">
                <Label htmlFor="custom_period_days">Días por Período Personalizado</Label>
                <Input
                  id="custom_period_days"
                  type="number"
                  min="1"
                  max="31"
                  value={settings.custom_period_days || 30}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      custom_period_days: parseInt(e.target.value) || 30
                    }))
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Número de días que comprende cada período mensual
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="provision_mode">Modo de Cálculo de Provisiones</Label>
            <Select
              value={settings.provision_mode}
              onValueChange={(value: 'on_liquidation' | 'monthly_consolidation') =>
                setSettings(prev => ({ ...prev, provision_mode: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_liquidation">
                  <div className="flex flex-col">
                    <span>Al liquidar cada período</span>
                    <span className="text-sm text-muted-foreground">Recomendado</span>
                  </div>
                </SelectItem>
                <SelectItem value="monthly_consolidation">
                  <div className="flex flex-col">
                    <span>Consolidado mensual únicamente</span>
                    <span className="text-sm text-muted-foreground">Manual</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                {settings.provision_mode === 'on_liquidation'
                  ? '✅ Las provisiones (cesantías, intereses, prima, vacaciones) se calculan automáticamente al liquidar cada período de nómina'
                  : '⚠️ Las provisiones solo se calculan mediante consolidado mensual manual. Requiere procesamiento adicional.'
                }
              </p>
            </div>
          </div>

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
                  Guardar Configuración General
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Policies Section - Now manages its own state */}
      <PayrollPoliciesSettings />
    </div>
  );
};
