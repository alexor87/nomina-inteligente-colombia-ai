import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Settings, Save, Loader2 } from 'lucide-react';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
  updated_at: string;
}

const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings' as any)
        .select('*')
        .order('setting_key');
      if (error) throw error;
      return (data as unknown as SystemSetting[]) || [];
    },
  });

  useEffect(() => {
    if (settings) {
      const vals: Record<string, any> = {};
      settings.forEach(s => { vals[s.setting_key] = s.setting_value; });
      setFormValues(vals);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (entries: { key: string; value: any }[]) => {
      for (const entry of entries) {
        const { error } = await (supabase as any)
          .from('system_settings')
          .update({
            setting_value: entry.value,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', entry.key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({ title: 'Configuración guardada' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    const entries = Object.entries(formValues).map(([key, value]) => ({ key, value }));
    saveMutation.mutate(entries);
  };

  const updateValue = (key: string, value: any) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const trialDays = typeof formValues.default_trial_days === 'number'
    ? formValues.default_trial_days
    : Number(formValues.default_trial_days) || 14;

  const platformName = typeof formValues.platform_name === 'string'
    ? formValues.platform_name
    : String(formValues.platform_name || '');

  const supportEmail = typeof formValues.support_email === 'string'
    ? formValues.support_email
    : String(formValues.support_email || '');

  const featureFlags = typeof formValues.feature_flags === 'object' && formValues.feature_flags !== null
    ? formValues.feature_flags as Record<string, boolean>
    : {};

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6" /> Configuración Global
          </h1>
          <p className="text-muted-foreground text-sm">Parámetros globales del sistema</p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trial Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Configuración de Trial</CardTitle>
            <CardDescription>Periodo de prueba para nuevas empresas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Duración del trial (días)</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={trialDays}
                onChange={e => updateValue('default_trial_days', Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">Aplica a nuevas empresas registradas</p>
            </div>
          </CardContent>
        </Card>

        {/* Platform Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Información de Plataforma</CardTitle>
            <CardDescription>Datos generales del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nombre de la plataforma</Label>
              <Input
                value={platformName}
                onChange={e => updateValue('platform_name', e.target.value)}
              />
            </div>
            <div>
              <Label>Email de soporte</Label>
              <Input
                type="email"
                value={supportEmail}
                onChange={e => updateValue('support_email', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Feature Flags</CardTitle>
            <CardDescription>Activar/desactivar funcionalidades globales. Agrega nuevos flags escribiendo la clave abajo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(featureFlags).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <Label className="font-mono text-sm">{key}</Label>
                <Switch
                  checked={!!val}
                  onCheckedChange={checked => {
                    updateValue('feature_flags', { ...featureFlags, [key]: checked });
                  }}
                />
              </div>
            ))}
            {Object.keys(featureFlags).length === 0 && (
              <p className="text-sm text-muted-foreground">No hay feature flags configurados.</p>
            )}
            <div className="pt-2">
              <AddFlagForm onAdd={(key) => {
                updateValue('feature_flags', { ...featureFlags, [key]: false });
              }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const AddFlagForm: React.FC<{ onAdd: (key: string) => void }> = ({ onAdd }) => {
  const [newKey, setNewKey] = useState('');
  return (
    <div className="flex gap-2">
      <Input
        placeholder="nuevo_feature_flag"
        value={newKey}
        onChange={e => setNewKey(e.target.value.replace(/[^a-z0-9_]/g, ''))}
        className="max-w-xs font-mono text-sm"
      />
      <Button
        variant="outline"
        size="sm"
        disabled={!newKey}
        onClick={() => { onAdd(newKey); setNewKey(''); }}
      >
        Agregar
      </Button>
    </div>
  );
};

export default AdminSettingsPage;
