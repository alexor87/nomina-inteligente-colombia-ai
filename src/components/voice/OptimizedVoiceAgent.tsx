
import React, { useState, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, AlertCircle, Activity } from 'lucide-react';
import { useOptimizedVoiceChat } from '@/hooks/useOptimizedVoiceChat';
import { useVoiceAgent } from '@/contexts/VoiceAgentContext';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Lazy load the expanded interface to reduce initial bundle size
const VoiceAgentExpanded = lazy(() => import('./VoiceAgentExpanded'));

export const OptimizedVoiceAgent: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { 
    state, 
    startConversation, 
    endConversation, 
    checkHealth,
    status, 
    isSpeaking 
  } = useOptimizedVoiceChat();
  const { isSupported, error: contextError } = useVoiceAgent();

  const handleToggleConversation = () => {
    if (state.isConnected || status === 'connected') {
      endConversation();
    } else {
      startConversation();
    }
  };

  const handleDiagnostics = async () => {
    try {
      toast({
        title: "Ejecutando diagnóstico...",
        description: "Verificando estado del sistema",
      });
      
      const isHealthy = await checkHealth();
      
      toast({
        title: "Diagnóstico completado",
        description: isHealthy 
          ? "✅ Sistema operativo - API configurada" 
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
    if (state.isLoading) return 'bg-yellow-500 animate-pulse';
    if (isConnected && isCurrentlySpeaking) return 'bg-blue-500 animate-pulse';
    if (isConnected && state.isListening) return 'bg-green-500 animate-pulse';
    if (isConnected) return 'bg-green-500';
    return 'bg-muted';
  };

  const getMainIcon = () => {
    if (!isSupported || contextError) return <AlertCircle className="w-5 h-5" />;
    if (state.isLoading) {
      return <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />;
    }
    if (isConnected && isCurrentlySpeaking) return <Mic className="w-5 h-5 animate-pulse" />;
    if (isConnected) return <Mic className="w-5 h-5" />;
    return <MicOff className="w-5 h-5" />;
  };

  const isDisabled = !isSupported || state.isLoading;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded Interface - Lazy Loaded */}
      {isExpanded && (
        <Suspense fallback={
          <Card className="mb-4 p-4 w-80 shadow-lg border-border/50 bg-background">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded"></div>
            </div>
          </Card>
        }>
          <VoiceAgentExpanded 
            state={state}
            onClose={() => setIsExpanded(false)}
            onToggleConversation={handleToggleConversation}
            onDiagnostics={handleDiagnostics}
            isConnected={isConnected}
            isSupported={isSupported}
            isDisabled={isDisabled}
          />
        </Suspense>
      )}

      {/* Compact Floating Button */}
      <div className="relative">
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "w-14 h-14 rounded-full shadow-lg transition-all duration-200",
            "hover:scale-110 active:scale-95",
            getStatusColor(),
            "text-white border-2 border-white/20"
          )}
          disabled={isDisabled}
        >
          {getMainIcon()}
        </Button>
        
        {/* Status indicators */}
        {(state.isListening || isCurrentlySpeaking) && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isCurrentlySpeaking ? "bg-blue-500" : "bg-green-500"
            )} />
          </div>
        )}
        
        {/* Error indicator */}
        {(state.error || contextError) && !isExpanded && (
          <div className="absolute -top-1 -left-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
            <AlertCircle className="w-2 h-2 text-white" />
          </div>
        )}

        {/* Quick actions when not expanded */}
        {!isExpanded && isSupported && !isDisabled && (
          <div className="absolute -top-12 -left-8 flex gap-2">
            {!isConnected && (
              <Button
                onClick={handleDiagnostics}
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 rounded-full bg-background/90 backdrop-blur-sm"
              >
                <Activity className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
