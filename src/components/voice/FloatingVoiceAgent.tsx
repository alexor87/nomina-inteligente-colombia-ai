import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, X, AlertCircle, RefreshCw, Activity } from 'lucide-react';
import { useElevenLabsConversation } from '@/hooks/useElevenLabsConversation';
import { useVoiceAgent } from '@/contexts/VoiceAgentContext';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export const FloatingVoiceAgent: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetailedError, setShowDetailedError] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { 
    state, 
    startConversation, 
    endConversation, 
    checkMicrophonePermission,
    checkHealth,
    status, 
    isSpeaking 
  } = useElevenLabsConversation();
  const { isSupported, error: contextError } = useVoiceAgent();

  const handleToggleConversation = () => {
    if (state.isConnected || status === 'connected') {
      endConversation();
    } else {
      startConversation();
    }
  };

  const handleRetryConnection = () => {
    if (!state.isLoading) {
      startConversation();
    }
  };

  const handleCheckMicrophone = async () => {
    await checkMicrophonePermission();
  };

  const handleDiagnostics = async () => {
    setShowDiagnostics(true);
    
    try {
      toast({
        title: "Ejecutando diagnóstico...",
        description: "Verificando estado del sistema",
      });
      
      const isHealthy = await checkHealth();
      
      toast({
        title: "Diagnóstico completado",
        description: isHealthy 
          ? "✅ Sistema operativo - API Key configurada" 
          : "❌ Sistema con problemas - revisar configuración",
        variant: isHealthy ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Error en diagnóstico",
        description: "No se pudo completar la verificación",
        variant: "destructive",
      });
    }
  };

  const isConnected = state.isConnected || status === 'connected';
  const isCurrentlySpeaking = state.isSpeaking || isSpeaking;

  const getStatusColor = () => {
    if (state.error || contextError) return 'bg-destructive';
    if (!isSupported) return 'bg-muted';
    if (state.microphonePermission === 'denied') return 'bg-orange-500';
    if (state.microphonePermission === 'checking') return 'bg-yellow-500 animate-pulse';
    if (state.isLoading) return 'bg-yellow-500 animate-pulse';
    if (isConnected && isCurrentlySpeaking) return 'bg-blue-500 animate-pulse';
    if (isConnected && state.isListening) return 'bg-green-500 animate-pulse';
    if (isConnected) return 'bg-green-500';
    return 'bg-muted';
  };

  const getStatusText = () => {
    if (contextError) return contextError;
    if (state.error) return 'Error de conexión';
    if (!isSupported) return 'No compatible';
    if (state.microphonePermission === 'denied') return 'Micrófono denegado';
    if (state.microphonePermission === 'checking') return 'Verificando micrófono...';
    if (state.isLoading) return 'Conectando...';
    if (isConnected && isCurrentlySpeaking) return 'Ana hablando...';
    if (isConnected && state.isListening) return 'Escuchando...';
    if (isConnected) return 'Ana conectada';
    return 'Desconectado';
  };

  const getMainIcon = () => {
    if (!isSupported || contextError) return <AlertCircle className="w-5 h-5" />;
    if (state.microphonePermission === 'denied') return <VolumeX className="w-5 h-5" />;
    if (state.microphonePermission === 'checking' || state.isLoading) {
      return <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />;
    }
    if (isConnected && isCurrentlySpeaking) return <Volume2 className="w-5 h-5" />;
    if (isConnected && state.isListening) return <Mic className="w-5 h-5 animate-pulse" />;
    if (isConnected) return <Mic className="w-5 h-5" />;
    return <MicOff className="w-5 h-5" />;
  };

  const isDisabled = !isSupported || state.isLoading || state.microphonePermission === 'checking';

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded Card */}
      {isExpanded && (
        <Card className="mb-4 p-4 w-80 shadow-lg border-border/50 bg-background">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", getStatusColor())} />
              <span className="font-semibold text-sm text-foreground">Ana - Asistente de Nómina</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Estado: <span className="font-medium text-foreground">{getStatusText()}</span>
            </div>
            
            {/* Health Status Display */}
            {state.healthStatus && (
              <div className="text-xs bg-muted/50 p-2 rounded border">
                <div className="font-medium mb-1">Estado del Sistema:</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>API Key:</span>
                    <span className={state.healthStatus.hasApiKey ? "text-green-600" : "text-red-600"}>
                      {state.healthStatus.hasApiKey ? "✓ Configurada" : "✗ Faltante"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Agente:</span>
                    <span className={state.healthStatus.agentIdReceived ? "text-green-600" : "text-red-600"}>
                      {state.healthStatus.agentIdReceived ? "✓ Activo" : "✗ Error"}
                    </span>
                  </div>
                  {state.healthStatus.lastCheck && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Última verificación: {new Date(state.healthStatus.lastCheck).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Error Display */}
            {(state.error || contextError) && (
              <div className="space-y-2">
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                  {state.error || contextError}
                </div>
                
                {state.detailedError && (
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetailedError(!showDetailedError)}
                      className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showDetailedError ? 'Ocultar' : 'Ver'} detalles técnicos
                    </Button>
                    
                    {showDetailedError && (
                      <div className="text-xs bg-muted p-2 rounded border font-mono max-h-20 overflow-y-auto">
                        {JSON.stringify(state.detailedError, null, 2)}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryConnection}
                    disabled={state.isLoading}
                    className="text-xs h-7"
                  >
                    <RefreshCw className={cn("w-3 h-3 mr-1", { "animate-spin": state.isLoading })} />
                    Reintentar
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDiagnostics}
                    className="text-xs h-7"
                  >
                    <Activity className="w-3 h-3 mr-1" />
                    Diagnóstico
                  </Button>
                  
                  {state.microphonePermission === 'denied' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCheckMicrophone}
                      className="text-xs h-7"
                    >
                      <Mic className="w-3 h-3 mr-1" />
                      Verificar Mic
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Microphone Permission Warning */}
            {state.microphonePermission === 'denied' && (
              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                Se requiere acceso al micrófono. Haz clic en "Verificar Mic" o permite el acceso manualmente en tu navegador.
              </div>
            )}
            
            {/* Browser Compatibility Warning */}
            {!isSupported && (
              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                Tu navegador no es compatible con las funciones de voz. Necesitas un navegador moderno con soporte para micrófono.
              </div>
            )}
            
            {/* Success State - Ana Ready */}
            <div className="text-xs text-muted-foreground">
              {isConnected ? (
                <>
                  <p className="mb-2 text-green-600 font-medium">✅ Ana está lista para ayudarte</p>
                  <p className="text-xs mb-1 text-foreground">Puedes preguntarme sobre:</p>
                  <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                    <li>Empleados activos y su información</li>
                    <li>Estados de períodos de nómina</li>
                    <li>Información general de tu empresa</li>
                    <li>Navegación: "llévame a empleados"</li>
                  </ul>
                  <p className="text-xs mt-2 italic text-muted-foreground">
                    Solo habla naturalmente, yo entiendo español colombiano perfectamente.
                  </p>
                </>
              ) : (
                <div>
                  <p className="mb-2">Haz clic en "Activar Ana" para comenzar</p>
                  <p className="text-xs text-muted-foreground">
                    Ana es tu asistente de voz especializada en nómina. 
                    Te ayudará con consultas y navegación en el sistema.
                  </p>
                  
                  {!isDisabled && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDiagnostics}
                        className="text-xs h-7 w-full"
                      >
                        <Activity className="w-3 h-3 mr-1" />
                        Ejecutar Diagnóstico
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleToggleConversation}
              disabled={isDisabled}
              className={cn(
                "w-full",
                isConnected 
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              {isConnected ? 'Desactivar Ana' : 'Activar Ana'}
            </Button>

            {!isSupported && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Funcionalidad no disponible en este navegador
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Floating Button */}
      <div className="relative">
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "w-14 h-14 rounded-full shadow-lg transition-all duration-200",
            "hover:scale-110 active:scale-95",
            getStatusColor(),
            "text-white border-2 border-white/20"
          )}
          disabled={state.isLoading || state.microphonePermission === 'checking'}
        >
          {getMainIcon()}
        </Button>
        
        {/* Status indicator */}
        {(state.isListening || isCurrentlySpeaking) && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isCurrentlySpeaking ? "bg-blue-500" : "bg-green-500"
            )} />
          </div>
        )}
        
        {/* Quick access button */}
        {!isExpanded && isConnected && !isDisabled && (
          <Button
            onClick={handleToggleConversation}
            className="absolute -top-2 -left-12 w-8 h-8 rounded-full bg-background border border-border shadow-md hover:scale-110 transition-transform"
            variant="outline"
            size="sm"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        )}
        
        {/* Error indicator */}
        {(state.error || state.microphonePermission === 'denied') && !isExpanded && (
          <div className="absolute -top-1 -left-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
            <AlertCircle className="w-2 h-2 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};
