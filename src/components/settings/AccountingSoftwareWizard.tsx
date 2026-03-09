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
  AccountingProvider,
  AccountingIntegration,
  AccountingSyncLog
} from '@/services/AccountingIntegrationService';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Plug, 
  Info,
  ExternalLink,
  Clock
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
  
  // Form states
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load existing integration
  useEffect(() => {
    if (companyId) {
      loadIntegration();
    }
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
        
        // Load sync history
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
    setUsername('');
    setApiKey('');
    setStep('credentials');
  };

  const handleTestConnection = async () => {
    if (!selectedProvider || !username || !apiKey) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await AccountingIntegrationService.testConnection(
        selectedProvider,
        { api_key: apiKey, username }
      );
      setTestResult(result);
      
      if (result.success) {
        toast({
          title: '✅ Conexión exitosa',
          description: result.message
        });
      } else {
        toast({
          title: '❌ Error de conexión',
          description: result.message,
          variant: 'destructive'
        });
      }
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
    if (!companyId || !selectedProvider || !testResult?.success) return;
    
    setLoading(true);
    try {
      // Save integration config
      const saveResult = await AccountingIntegrationService.saveIntegration(
        companyId,
        selectedProvider,
        autoSync
      );
      
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }
      
      // Activate integration
      const activateResult = await AccountingIntegrationService.activateIntegration(companyId);
      if (!activateResult.success) {
        throw new Error(activateResult.error);
      }
      
      toast({
        title: '✅ Integración guardada',
        description: `Conexión con ${selectedProvider === 'siigo' ? 'Siigo' : 'Alegra'} configurada correctamente`
      });
      
      // Reload and show connected state
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
      toast({
        title: 'Integración desconectada',
        description: 'La conexión ha sido removida'
      });
      
      setIntegration(null);
      setSelectedProvider(null);
      setStep('select');
      setSyncHistory([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo desconectar la integración',
        variant: 'destructive'
      });
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
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración',
        variant: 'destructive'
      });
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

  // Step: Select Provider
  if (step === 'select') {
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
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleSelectProvider('siigo')}
              className="p-6 border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left group"
            >
              <div className="font-semibold text-lg mb-2 group-hover:text-primary">Siigo</div>
              <p className="text-sm text-muted-foreground">
                Software contable líder en Colombia. Conecta tu cuenta empresarial para enviar asientos de nómina.
              </p>
            </button>
            
            <button
              onClick={() => handleSelectProvider('alegra')}
              className="p-6 border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left group"
            >
              <div className="font-semibold text-lg mb-2 group-hover:text-primary">Alegra</div>
              <p className="text-sm text-muted-foreground">
                Sistema de facturación y contabilidad en la nube. Sincroniza tus comprobantes de nómina.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step: Enter Credentials
  if (step === 'credentials') {
    const providerName = selectedProvider === 'siigo' ? 'Siigo' : 'Alegra';
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conectar con {providerName}</CardTitle>
          <CardDescription>
            Ingresa tus credenciales de API para establecer la conexión
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                {selectedProvider === 'siigo' ? 'Usuario Siigo' : 'Email de Alegra'}
              </Label>
              <Input
                id="username"
                type="text"
                placeholder={selectedProvider === 'siigo' ? 'usuario@empresa.com' : 'email@empresa.com'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apiKey">Token API</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="••••••••••••••••"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 flex gap-3">
              <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                {selectedProvider === 'siigo' ? (
                  <>
                    <p className="font-medium mb-1">¿Dónde encontrar el Token API?</p>
                    <p>Siigo → Configuración → Integraciones → API → Generar Token</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium mb-1">¿Dónde encontrar el Token API?</p>
                    <p>Alegra → Configuración → Integraciones → Tokens de API → Crear Token</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep('select')}
            >
              Volver
            </Button>
            
            <Button
              onClick={handleTestConnection}
              disabled={!username || !apiKey || testing}
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Probando...
                </>
              ) : (
                'Probar conexión'
              )}
            </Button>
            
            {testResult?.success && (
              <Button
                onClick={() => setStep('configure')}
                className="ml-auto"
              >
                Continuar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step: Configure Options
  if (step === 'configure') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuración de sincronización</CardTitle>
          <CardDescription>
            Configura cómo quieres sincronizar los asientos de nómina
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="font-medium">Sincronización automática</div>
              <div className="text-sm text-muted-foreground">
                Enviar asientos automáticamente al liquidar cada período de nómina
              </div>
            </div>
            <Switch
              checked={autoSync}
              onCheckedChange={setAutoSync}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep('credentials')}
            >
              Volver
            </Button>
            
            <Button
              onClick={handleSaveIntegration}
              disabled={loading}
              className="ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar configuración'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step: Connected State
  if (step === 'connected' && integration) {
    const providerName = integration.provider === 'siigo' ? 'Siigo' : 'Alegra';
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Conectado a {providerName}
                </CardTitle>
                <CardDescription>
                  Tu cuenta está vinculada y lista para sincronizar asientos
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Activo
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Switch
                checked={autoSync}
                onCheckedChange={handleToggleAutoSync}
              />
            </div>

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
              Desconectar {providerName}
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
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
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
                        <Button variant="ghost" size="sm" asChild>
                          <a 
                            href={`https://${integration.provider === 'siigo' ? 'app.siigo.com' : 'app.alegra.com'}/journals/${log.external_reference}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
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
