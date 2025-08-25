
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ConversationState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
  detailedError: any | null;
  microphonePermission: 'granted' | 'denied' | 'prompt' | 'checking' | null;
  healthStatus: {
    hasApiKey: boolean;
    agentIdReceived: boolean;
    lastCheck?: string;
  } | null;
  lastToolExecution?: {
    toolName: string;
    result: string;
    timestamp: string;
  } | null;
}

const ELEVENLABS_AGENT_ID = 'agent_3701k3bzfyn5f4ws09536v7bk5wf';

export const useOptimizedVoiceChat = () => {
  const [state, setState] = useState<ConversationState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    isLoading: false,
    error: null,
    detailedError: null,
    microphonePermission: null,
    healthStatus: null,
  });

  const conversationRef = useRef<any>(null);

  const updateState = useCallback((updates: Partial<ConversationState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const logToolExecution = useCallback((toolName: string, result: string) => {
    console.log(`🛠️ Tool executed: ${toolName} -> ${result}`);
    updateState({
      lastToolExecution: {
        toolName,
        result,
        timestamp: new Date().toISOString()
      }
    });
  }, [updateState]);

  const checkMicrophonePermission = useCallback(async () => {
    try {
      updateState({ microphonePermission: 'checking' });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      updateState({ microphonePermission: 'granted' });
      return true;
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      updateState({ microphonePermission: 'denied' });
      return false;
    }
  }, [updateState]);

  const checkHealth = useCallback(async () => {
    try {
      console.log('🏥 Running health check...');
      
      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation', {
        body: { action: 'health_check' },
      });

      if (error) {
        console.error('❌ Health check failed:', error);
        updateState({
          healthStatus: {
            hasApiKey: false,
            agentIdReceived: false,
            lastCheck: new Date().toISOString(),
          }
        });
        return false;
      }

      updateState({
        healthStatus: {
          hasApiKey: data?.has_api_key || false,
          agentIdReceived: data?.agent_id_received || false,
          lastCheck: data?.timestamp || new Date().toISOString(),
        }
      });

      return data?.has_api_key || false;
    } catch (error) {
      console.error('❌ Health check error:', error);
      updateState({
        healthStatus: {
          hasApiKey: false,
          agentIdReceived: false,
          lastCheck: new Date().toISOString(),
        }
      });
      return false;
    }
  }, [updateState]);

  const startConversation = useCallback(async () => {
    try {
      updateState({ 
        isLoading: true, 
        error: null, 
        detailedError: null 
      });

      console.log('🚀 Starting optimized voice conversation...');

      // Check microphone first
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) {
        updateState({
          error: 'Micrófono requerido para el asistente de voz',
          isLoading: false,
        });
        return;
      }

      // Start session
      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation', {
        body: { 
          action: 'start_session',
          agent_id: ELEVENLABS_AGENT_ID
        },
      });

      if (error || !data?.ok) {
        throw new Error(data?.message || error?.message || 'Failed to start session');
      }

      // Mock connection for development
      updateState({ 
        isConnected: true, 
        isLoading: false,
        error: null,
        detailedError: null
      });
      
      toast({
        title: 'Ana está lista',
        description: 'Asistente de voz activada. Puedes comenzar a hablar.',
      });

      console.log('✅ Voice conversation started successfully');

    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      updateState({
        error: errorMessage,
        detailedError: error,
        isLoading: false,
      });
      
      toast({
        title: 'Error al activar Ana',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [updateState, checkMicrophonePermission]);

  const endConversation = useCallback(async () => {
    try {
      console.log('🛑 Ending conversation...');

      if (conversationRef.current) {
        conversationRef.current = null;
      }

      updateState({
        isConnected: false,
        isListening: false,
        isSpeaking: false,
        error: null,
        detailedError: null,
      });

      toast({
        title: 'Ana desactivada',
        description: '¡Hasta luego! Siempre puedes reactivarme cuando me necesites.',
      });

      console.log('✅ Conversation ended successfully');
    } catch (error) {
      console.error('❌ Error ending conversation:', error);
    }
  }, [updateState]);

  return {
    state,
    startConversation,
    endConversation,
    checkMicrophonePermission,
    checkHealth,
    isSpeaking: state.isSpeaking,
    status: state.isConnected ? 'connected' : 'disconnected',
  };
};
