
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, RefreshCw, Activity, Navigation, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversationState } from '@/hooks/useOptimizedVoiceChat';

interface VoiceAgentExpandedProps {
  state: ConversationState;
  onClose: () => void;
  onToggleConversation: () => void;
  onDiagnostics: () => void;
  isConnected: boolean;
  isSupported: boolean;
  isDisabled: boolean;
}

const VoiceAgentExpanded: React.FC<VoiceAgentExpandedProps> = ({
  state,
  onClose,
  onToggleConversation,
  onDiagnostics,
  isConnected,
  isSupported,
  isDisabled
}) => {
  const getStatusColor = () => {
    if (state.error) return 'bg-destructive';
    if (!isSupported) return 'bg-muted';
    if (state.isLoading) return 'bg-yellow-500 animate-pulse';
    if (isConnected) return 'bg-green-500';
    return 'bg-muted';
  };

  const getStatusText = () => {
    if (state.error) return 'Error de conexión';
    if (!isSupported) return 'No compatible';
    if (state.isLoading) return 'Conectando...';
    if (isConnected) return 'Ana conectada';
    return 'Desconectado';
  };

  return (
    <Card className="mb-4 p-4 w-80 shadow-lg border-border/50 bg-background">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded-full", getStatusColor())} />
          <span className="font-semibold text-sm text-foreground">Ana - Asistente de Nómina</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
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
        {state.error && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
            {state.error}
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleConversation}
                disabled={state.isLoading}
                className="text-xs h-7"
              >
                <RefreshCw className={cn("w-3 h-3 mr-1", { "animate-spin": state.isLoading })} />
                Reintentar
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onDiagnostics}
                className="text-xs h-7"
              >
                <Activity className="w-3 h-3 mr-1" />
                Diagnóstico
              </Button>
            </div>
          </div>
        )}
        
        {/* Success State */}
        {isConnected && !state.error && (
          <div className="text-xs">
            <p className="mb-2 text-green-600 font-medium">✅ Ana está lista para ayudarte</p>
            <p className="text-xs mb-1 text-foreground">Puedes preguntarme sobre:</p>
            <ul className="list-disc list-inside text-xs mt-1 space-y-1">
              <li>Empleados activos y su información</li>
              <li>Estados de períodos de nómina</li>
              <li>Información general de tu empresa</li>
              <li>Navegación: "llévame a empleados"</li>
            </ul>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={onToggleConversation}
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
  );
};

export default VoiceAgentExpanded;
