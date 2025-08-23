
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, X } from 'lucide-react';
import { useElevenLabsAgent } from '@/hooks/useElevenLabsAgent';
import { cn } from '@/lib/utils';

export const FloatingVoiceAgent: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { state, startConversation, endConversation } = useElevenLabsAgent();

  const handleToggleConversation = () => {
    if (state.isConnected) {
      endConversation();
    } else {
      startConversation();
    }
  };

  const getStatusColor = () => {
    if (state.error) return 'bg-destructive';
    if (state.isLoading) return 'bg-yellow-500';
    if (state.isConnected && state.isSpeaking) return 'bg-blue-500 animate-pulse';
    if (state.isConnected && state.isListening) return 'bg-green-500 animate-pulse';
    if (state.isConnected) return 'bg-green-500';
    return 'bg-muted';
  };

  const getStatusText = () => {
    if (state.error) return 'Error';
    if (state.isLoading) return 'Conectando...';
    if (state.isConnected && state.isSpeaking) return 'Hablando...';
    if (state.isConnected && state.isListening) return 'Escuchando...';
    if (state.isConnected) return 'Conectado';
    return 'Desconectado';
  };

  const getMainIcon = () => {
    if (state.isLoading) return <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />;
    if (state.isConnected && state.isSpeaking) return <Volume2 className="w-5 h-5" />;
    if (state.isConnected && state.isListening) return <Mic className="w-5 h-5 animate-pulse" />;
    if (state.isConnected) return <Mic className="w-5 h-5" />;
    return <MicOff className="w-5 h-5" />;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded Card */}
      {isExpanded && (
        <Card className="mb-4 p-4 w-80 shadow-lg border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", getStatusColor())} />
              <span className="font-semibold text-sm">Asistente de Nómina</span>
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
              Estado: <span className="font-medium">{getStatusText()}</span>
            </div>
            
            {state.error && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                {state.error}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              {state.isConnected ? (
                <>
                  <p className="mb-2">✅ Listo para ayudarte</p>
                  <p className="text-xs">Puedes preguntarme sobre:</p>
                  <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                    <li>Empleados activos</li>
                    <li>Períodos de nómina</li>
                    <li>Información de la empresa</li>
                    <li>Navegación ("llévame a empleados")</li>
                  </ul>
                </>
              ) : (
                <p>Haz clic en el micrófono para activar el asistente de voz</p>
              )}
            </div>

            <Button
              onClick={handleToggleConversation}
              disabled={state.isLoading}
              className={cn(
                "w-full",
                state.isConnected 
                  ? "bg-destructive hover:bg-destructive/90" 
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {state.isConnected ? 'Desactivar Asistente' : 'Activar Asistente'}
            </Button>
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
        {!isExpanded && state.isConnected && (
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
