import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { 
  AccountingIntegrationService, 
  AccountingIntegration,
  AccountingSyncLog
} from '@/services/AccountingIntegrationService';
import { 
  ACCOUNTING_PROVIDERS,
  getProviderName,
  getProvidersByCategory,
  type AccountingProvider,
  type ProviderConfig
} from '@/config/accountingProviders';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Plug, 
  Info,
  ExternalLink,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type WizardStep = 'select' | 'credentials' | 'configure' | 'connected';

export const AccountingSoftwareWizard = () => {
  const { toast } = useToast();
  const { companyId, loading: companyLoading } = useCurrentCompany();
  
  const [step, setStep] = useState<WizardStep>('select');
  const [selectedProvider, setSelectedProvider] = useState<AccountingProvider | null>(null);
  const [integration, setIntegration] = useState<AccountingIntegration | null>(null);
  const [syncHistory, setSyncHistory] = useState<AccountingSyncLog[]>([]);
  
  // Dynamic form state
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [autoSync, setAutoSync] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const providerConfig = selectedProvider ? ACCOUNTING_PROVIDERS[selectedProvider] : null;

  useEffect(() => {
    if (companyId) loadIntegration();
  }, [companyId]);

  const loadIntegration = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const int = await AccountingIntegrationService.getIntegration(companyId);
      setIntegration(int);
      
      if (int?.is_active) {
        setStep('connected');
        setSelectedProvider(int.provider as AccountingProvider);
        setAutoSync(int.auto_sync);
        const history = await AccountingIntegrationService.getSyncHistory(companyId);
        setSyncHistory(history);
      }
    } catch (error) {
      console.error('Error loading integration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProvider = (provider: AccountingProvider) => {
    setSelectedProvider(provider);
    setTestResult(null);
    setFormValues({});
    
    // CSV export doesn't need credentials
    if (provider === 'csv_export') {
      setStep('configure');
    } else {
      setStep('credentials');
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const isFormValid = () => {
    if (!providerConfig) return false;
    return providerConfig.fields
      .filter(f => f.required)
      .every(f => formValues[f.key]?.trim());
  };

  const handleTestConnection = async () => {
    if (!selectedProvider || !providerConfig || !isFormValid()) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const credentials: Record<string, string> = {};
      const provConfig: Record<string, any> = {};

      for (const field of providerConfig.fields) {
        if (field.key === 'base_url' || field.key === 'header_name') {
          provConfig[field.key] = formValues[field.key] || '';
        } else {
          credentials[field.key] = formValues[field.key] || '';
        }
      }

      // Pass base URL and auth type in provider_config
      if (providerConfig.baseUrl) {
        provConfig.base_url = providerConfig.baseUrl;
      }
      provConfig.auth_type = providerConfig.authType;
      provConfig.test_endpoint = providerConfig.testEndpoint;

      const result = await AccountingIntegrationService.testConnection(
        selectedProvider,
        credentials,
        provConfig
      );
      setTestResult(result);
      
      toast({
        title: result.success ? '✅ Conexión exitosa' : '❌ Error de conexión',
        description: result.message,
        variant: result.success ? 'default' : 'destructive'
      });
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
      toast({
        title: 'Error',
        description: 'No se pudo probar la conexión',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveIntegration = async () => {
    if (!companyId || !selectedProvider) return;
    // For non-csv providers, require successful test
    if (selectedProvider !== 'csv_export' && !testResult?.success) return;
    
    setLoading(true);
    try {
      const provConfig: Record<string, any> = {};
      if (providerConfig) {
        if (providerConfig.baseUrl) provConfig.base_url = providerConfig.baseUrl;
        else if (formValues.base_url) provConfig.base_url = formValues.base_url;
        provConfig.auth_type = providerConfig.authType;
        if (formValues.header_name) provConfig.header_name = formValues.header_name;
        if (selectedProvider === 'custom' && formValues.custom_name) {
          provConfig.custom_name = formValues.custom_name;
        }
      }

      const saveResult = await AccountingIntegrationService.saveIntegration(
        companyId,
        selectedProvider,
        autoSync,
        provConfig
      );
      
      if (!saveResult.success) throw new Error(saveResult.error);
      
      const activateResult = await AccountingIntegrationService.activateIntegration(companyId);
      if (!activateResult.success) throw new Error(activateResult.error);
      
      toast({
        title: '✅ Integración guardada',
        description: `Conexión con ${getProviderName(selectedProvider)} configurada correctamente`
      });
      
      await loadIntegration();
      setStep('connected');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la integración',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      await AccountingIntegrationService.deactivateIntegration(companyId);
      toast({ title: 'Integración desconectada', description: 'La conexión ha sido removida' });
      setIntegration(null);
      setSelectedProvider(null);
      setStep('select');
      setSyncHistory([]);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo desconectar la integración', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    if (!companyId) return;
    try {
      await AccountingIntegrationService.updateAutoSync(companyId, enabled);
      setAutoSync(enabled);
      toast({
        title: enabled ? 'Sincronización automática activada' : 'Sincronización automática desactivada',
        description: enabled 
          ? 'Los asientos se enviarán automáticamente al liquidar nómina' 
          : 'Deberás sincronizar manualmente cada período'
      });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar la configuración', variant: 'destructive' });
    }
  };

  if (companyLoading || loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  // ========== STEP: SELECT PROVIDER ==========
  if (step === 'select') {
    const { popular, other, generic } = getProvidersByCategory();

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Conectar Software Contable
          </CardTitle>
          <CardDescription>
            Selecciona el software contable que utilizas para sincronizar automáticamente los asientos de nómina
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Popular */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Populares</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {popular.map(p => (
                <ProviderCard key={p.id} provider={p} onSelect={handleSelectProvider} />
              ))}
            </div>
          </div>

          {/* Other providers */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Otros proveedores</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {other.map(p => (
                <ProviderCard key={p.id} provider={p} onSelect={handleSelectProvider} compact />
              ))}
            </div>
          </div>

          {/* Generic options */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Opciones genéricas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {generic.map(p => (
                <ProviderCard key={p.id} provider={p} onSelect={handleSelectProvider} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ========== STEP: CREDENTIALS ==========
  if (step === 'credentials' && providerConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conectar con {providerConfig.name}</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para establecer la conexión
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {providerConfig.fields.map(field => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>
                  {field.label}
                  {!field.required && <span className="text-muted-foreground ml-1">(opcional)</span>}
                </Label>
                <Input
                  id={field.key}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formValues[field.key] || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                />
              </div>
            ))}
            
            <div className="bg-muted/50 rounded-lg p-4 flex gap-3">
              <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">¿Dónde encontrar las credenciales?</p>
                <p>{providerConfig.helpText}</p>
              </div>
            </div>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              testResult.success 
                ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' 
                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
            }`}>
              {testResult.success ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setStep('select'); setTestResult(null); }}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            
            <Button onClick={handleTestConnection} disabled={!isFormValid() || testing}>
              {testing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Probando...</>
              ) : (
                'Probar conexión'
              )}
            </Button>
            
            {testResult?.success && (
              <Button onClick={() => setStep('configure')} className="ml-auto">
                Continuar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ========== STEP: CONFIGURE ==========
  if (step === 'configure') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuración de sincronización</CardTitle>
          <CardDescription>
            Configura cómo quieres sincronizar los asientos de nómina
            {selectedProvider === 'csv_export' && ' — se generará un archivo descargable por período'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedProvider !== 'csv_export' && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="font-medium">Sincronización automática</div>
                <div className="text-sm text-muted-foreground">
                  Enviar asientos automáticamente al liquidar cada período de nómina
                </div>
              </div>
              <Switch checked={autoSync} onCheckedChange={setAutoSync} />
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(selectedProvider === 'csv_export' ? 'select' : 'credentials')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            
            <Button onClick={handleSaveIntegration} disabled={loading} className="ml-auto">
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
              ) : (
                'Guardar configuración'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ========== STEP: CONNECTED ==========
  if (step === 'connected' && integration) {
    const name = getProviderName(integration.provider);
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Conectado a {name}
                </CardTitle>
                <CardDescription>
                  Tu cuenta está vinculada y lista para sincronizar asientos
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Activo
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {integration.provider !== 'csv_export' && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">Sincronización automática</div>
                  <div className="text-sm text-muted-foreground">
                    {autoSync 
                      ? 'Los asientos se envían automáticamente al liquidar' 
                      : 'Sincronización manual desde cada período'
                    }
                  </div>
                </div>
                <Switch checked={autoSync} onCheckedChange={handleToggleAutoSync} />
              </div>
            )}

            {integration.last_sync_at && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Última sincronización: {format(new Date(integration.last_sync_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                {integration.last_sync_status === 'success' && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 ml-2">Exitosa</Badge>
                )}
                {integration.last_sync_status === 'error' && (
                  <Badge variant="destructive" className="ml-2">Error</Badge>
                )}
              </div>
            )}

            <Separator />

            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={loading}
              className="text-destructive hover:text-destructive"
            >
              Desconectar {name}
            </Button>
          </CardContent>
        </Card>

        {/* Sync History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial de sincronizaciones</CardTitle>
          </CardHeader>
          <CardContent>
            {syncHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay sincronizaciones registradas
              </div>
            ) : (
              <div className="space-y-3">
                {syncHistory.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : log.status === 'error' ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />
                      )}
                      <div>
                        <div className="text-sm font-medium">
                          {log.entries_sent} asientos enviados
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {log.external_reference && (
                        <Badge variant="outline" className="text-xs">
                          Ref: {log.external_reference}
                        </Badge>
                      )}
                      {log.status === 'error' && log.error_message && (
                        <span className="text-xs text-red-500 max-w-[200px] truncate">
                          {log.error_message}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

// ========== Provider Card Component ==========
interface ProviderCardProps {
  provider: ProviderConfig;
  onSelect: (id: AccountingProvider) => void;
  compact?: boolean;
}

const ProviderCard = ({ provider, onSelect, compact }: ProviderCardProps) => {
  const Icon = provider.icon;

  if (compact) {
    return (
      <button
        onClick={() => onSelect(provider.id)}
        className="p-4 border rounded-lg hover:border-primary hover:bg-accent transition-colors text-center group"
      >
        <Icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary" />
        <div className="font-medium text-sm group-hover:text-primary">{provider.name}</div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onSelect(provider.id)}
      className="p-6 border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left group"
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
        <div className="font-semibold text-lg group-hover:text-primary">{provider.name}</div>
      </div>
      <p className="text-sm text-muted-foreground">{provider.description}</p>
    </button>
  );
};
