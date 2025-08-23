
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, X, AlertCircle } from 'lucide-react';
import { useElevenLabsAgent } from '@/hooks/useElevenLabsAgent';
import { useVoiceAgent } from '@/contexts/VoiceAgentContext';
import { cn } from '@/lib/utils';

export const FloatingVoiceAgent: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { state, startConversation, endConversation } = useElevenLabsAgent();
  const { isSupported, isLoaded, error: contextError } = useVoiceAgent();

  const handleToggleConversation = () => {
    if (state.isConnected) {
      endConversation();
    } else {
      startConversation();
    }
  };

  const getStatusColor = () => {
    if (state.error || contextError) return 'bg-destructive';
    if (!isSupported || !isLoaded) return 'bg-muted';
    if (state.isLoading) return 'bg-yellow-500';
    if (state.isConnected && state.isSpeaking) return 'bg-blue-500 animate-pulse';
    if (state.isConnected && state.isListening) return 'bg-green-500 animate-pulse';
    if (state.isConnected) return 'bg-green-500';
    return 'bg-muted';
  };

  const getStatusText = () => {
    if (contextError) return contextError;
    if (state.error) return 'Error';
    if (!isSupported) return 'No compatible';
    if (!isLoaded) return 'Cargando SDK...';
    if (state.isLoading) return 'Conectando...';
    if (state.isConnected && state.isSpeaking) return 'Ana hablando...';
    if (state.isConnected && state.isListening) return 'Escuchando...';
    if (state.isConnected) return 'Ana conectada';
    return 'Desconectado';
  };

  const getMainIcon = () => {
    if (!isSupported || contextError) return <AlertCircle className="w-5 h-5" />;
    if (!isLoaded || state.isLoading) return <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />;
    if (state.isConnected && state.isSpeaking) return <Volume2 className="w-5 h-5" />;
    if (state.isConnected && state.isListening) return <Mic className="w-5 h-5 animate-pulse" />;
    if (state.isConnected) return <Mic className="w-5 h-5" />;
    return <MicOff className="w-5 h-5" />;
  };

  const isDisabled = !isSupported || !isLoaded || state.isLoading;

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
            
            {(state.error || contextError) && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                {state.error || contextError}
              </div>
            )}
            
            {!isSupported && (
              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                Tu navegador no es compatible con las funciones de voz. Necesitas un navegador moderno con soporte para micrófono.
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              {state.isConnected ? (
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
                </div>
              )}
            </div>

            <Button
              onClick={handleToggleConversation}
              disabled={isDisabled}
              className={cn(
                "w-full",
                state.isConnected 
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              {state.isConnected ? 'Desactivar Ana' : 'Activar Ana'}
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
          disabled={state.isLoading}
        >
          {getMainIcon()}
        </Button>
        
        {/* Status indicator */}
        {(state.isListening || state.isSpeaking) && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              state.isSpeaking ? "bg-blue-500" : "bg-green-500"
            )} />
          </div>
        )}
        
        {/* Quick access button */}
        {!isExpanded && state.isConnected && !isDisabled && (
          <Button
            onClick={handleToggleConversation}
            className="absolute -top-2 -left-12 w-8 h-8 rounded-full bg-background border border-border shadow-md hover:scale-110 transition-transform"
            variant="outline"
            size="sm"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
