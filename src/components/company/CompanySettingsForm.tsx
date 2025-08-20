
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CompanySettingsService } from '@/services/CompanySettingsService';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { CompanySettingsFormData } from '@/types/company-settings';
import { PayrollPoliciesSettings } from '@/components/settings/PayrollPoliciesSettings';
import { Loader2, Settings } from 'lucide-react';

export const CompanySettingsForm = () => {
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
      const data = await CompanySettingsService.getCompanySettings(companyId);
      
      if (data) {
        setSettings({
          periodicity: data.periodicity,
          custom_period_days: data.custom_period_days,
          provision_mode: data.provision_mode
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) return;

    try {
      setSaving(true);
      await CompanySettingsService.upsertCompanySettings(companyId, settings);
      
      toast({
        title: "Configuración guardada",
        description: "Las configuraciones se han actualizado exitosamente"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
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
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Cargando configuraciones...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Configuración General de Empresa</CardTitle>
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
              </div>
            )}
          </div>

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
                  Al liquidar cada período
                </SelectItem>
                <SelectItem value="monthly_consolidation">
                  Consolidado mensual únicamente
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {settings.provision_mode === 'on_liquidation'
                ? 'Las provisiones se calculan automáticamente al liquidar cada período de nómina'
                : 'Las provisiones solo se calculan mediante consolidado mensual manual'
              }
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Configuración'
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
