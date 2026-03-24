import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Settings, Save, Loader2, Plus, Pencil, CheckCircle2 } from 'lucide-react';

interface GlobalPayrollDefault {
  id: string;
  year: string;
  salary_min: number;
  transport_allowance: number;
  uvt: number;
  is_current_default: boolean;
  updated_at: string;
}

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
  updated_at: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  // ── Parámetros legales globales ──────────────────────────────────────────
  const [editingDefault, setEditingDefault] = useState<GlobalPayrollDefault | null>(null);
  const [newDefaultOpen, setNewDefaultOpen] = useState(false);
  const [newDefaultForm, setNewDefaultForm] = useState({ year: '', salary_min: '', transport_allowance: '', uvt: '' });

  const { data: legalDefaults } = useQuery({
    queryKey: ['global-payroll-defaults'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('global_payroll_defaults')
        .select('*')
        .order('year', { ascending: false });
      if (error) throw error;
      return (data as GlobalPayrollDefault[]) || [];
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('global_payroll_defaults')
        .update({ is_current_default: true, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-payroll-defaults'] });
      toast({ title: 'Año predeterminado actualizado' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateDefaultMutation = useMutation({
    mutationFn: async (row: GlobalPayrollDefault) => {
      const { error } = await (supabase as any)
        .from('global_payroll_defaults')
        .update({
          salary_min: row.salary_min,
          transport_allowance: row.transport_allowance,
          uvt: row.uvt,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-payroll-defaults'] });
      setEditingDefault(null);
      toast({ title: 'Parámetros actualizados' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const createDefaultMutation = useMutation({
    mutationFn: async (activate: boolean) => {
      const { error } = await (supabase as any)
        .from('global_payroll_defaults')
        .insert({
          year: newDefaultForm.year,
          salary_min: Number(newDefaultForm.salary_min),
          transport_allowance: Number(newDefaultForm.transport_allowance),
          uvt: Number(newDefaultForm.uvt),
          is_current_default: activate,
          updated_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-payroll-defaults'] });
      setNewDefaultOpen(false);
      setNewDefaultForm({ year: '', salary_min: '', transport_allowance: '', uvt: '' });
      toast({ title: 'Año creado exitosamente' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

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

        {/* Parámetros Legales por Defecto */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Parámetros Legales por Defecto</CardTitle>
                <CardDescription>Valores asignados automáticamente a nuevas empresas al registrarse</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setNewDefaultOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nuevo año
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Año</th>
                  <th className="pb-2 font-medium">Salario mínimo</th>
                  <th className="pb-2 font-medium">Aux. transporte</th>
                  <th className="pb-2 font-medium">UVT</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {(legalDefaults || []).map(row => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="py-3 font-medium flex items-center gap-2">
                      {row.year}
                      {row.is_current_default && (
                        <Badge variant="default" className="text-xs">Activo</Badge>
                      )}
                    </td>
                    <td className="py-3">{fmt(row.salary_min)}</td>
                    <td className="py-3">{fmt(row.transport_allowance)}</td>
                    <td className="py-3">{fmt(row.uvt)}</td>
                    <td className="py-3 text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditingDefault({ ...row })}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                      {!row.is_current_default && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => activateMutation.mutate(row.id)}
                          disabled={activateMutation.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Activar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!legalDefaults || legalDefaults.length === 0) && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Sin datos</td></tr>
                )}
              </tbody>
            </table>
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
      {/* Dialog: Editar año existente */}
      {editingDefault && (
        <Dialog open onOpenChange={() => setEditingDefault(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar parámetros {editingDefault.year}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {(['salary_min', 'transport_allowance', 'uvt'] as const).map(field => (
                <div key={field}>
                  <Label>{field === 'salary_min' ? 'Salario mínimo' : field === 'transport_allowance' ? 'Auxilio de transporte' : 'UVT'}</Label>
                  <Input
                    type="number"
                    value={editingDefault[field]}
                    onChange={e => setEditingDefault(prev => prev ? { ...prev, [field]: Number(e.target.value) } : prev)}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDefault(null)}>Cancelar</Button>
              <Button onClick={() => updateDefaultMutation.mutate(editingDefault)} disabled={updateDefaultMutation.isPending}>
                {updateDefaultMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Nuevo año */}
      <Dialog open={newDefaultOpen} onOpenChange={setNewDefaultOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar nuevo año</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Año</Label>
              <Input
                placeholder="2027"
                value={newDefaultForm.year}
                onChange={e => setNewDefaultForm(prev => ({ ...prev, year: e.target.value }))}
              />
            </div>
            <div>
              <Label>Salario mínimo</Label>
              <Input
                type="number"
                placeholder="1750905"
                value={newDefaultForm.salary_min}
                onChange={e => setNewDefaultForm(prev => ({ ...prev, salary_min: e.target.value }))}
              />
            </div>
            <div>
              <Label>Auxilio de transporte</Label>
              <Input
                type="number"
                placeholder="249095"
                value={newDefaultForm.transport_allowance}
                onChange={e => setNewDefaultForm(prev => ({ ...prev, transport_allowance: e.target.value }))}
              />
            </div>
            <div>
              <Label>UVT</Label>
              <Input
                type="number"
                placeholder="52374"
                value={newDefaultForm.uvt}
                onChange={e => setNewDefaultForm(prev => ({ ...prev, uvt: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setNewDefaultOpen(false)}>Cancelar</Button>
            <Button
              variant="outline"
              onClick={() => createDefaultMutation.mutate(false)}
              disabled={createDefaultMutation.isPending || !newDefaultForm.year}
            >
              Guardar sin activar
            </Button>
            <Button
              onClick={() => createDefaultMutation.mutate(true)}
              disabled={createDefaultMutation.isPending || !newDefaultForm.year}
            >
              {createDefaultMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar y activar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
