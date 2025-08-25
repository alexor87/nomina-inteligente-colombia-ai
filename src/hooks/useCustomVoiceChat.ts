
import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getRouteForSection, getSectionDisplayName } from '@/utils/voiceNavigationUtils';

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

class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

const ELEVENLABS_AGENT_ID = 'agent_3701k3bzfyn5f4ws09536v7bk5wf';

export const useCustomVoiceChat = () => {
  const navigate = useNavigate();
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

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingRef = useRef(false);

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
    
    toast({
      title: `🛠️ Herramienta ejecutada: ${toolName}`,
      description: result.length > 100 ? result.substring(0, 100) + '...' : result,
      duration: 3000,
    });
  }, [updateState]);

  const checkMicrophonePermission = useCallback(async () => {
    try {
      updateState({ microphonePermission: 'checking' });
      
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permissionStatus.state === 'granted') {
        updateState({ microphonePermission: 'granted' });
        return true;
      } else if (permissionStatus.state === 'denied') {
        updateState({ microphonePermission: 'denied' });
        return false;
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          updateState({ microphonePermission: 'granted' });
          return true;
        } catch (error) {
          updateState({ microphonePermission: 'denied' });
          return false;
        }
      }
    } catch (error) {
      console.error('❌ Error checking microphone permission:', error);
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

      console.log('✅ Health check result:', data);
      
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

      console.log('🚀 Starting custom voice conversation (mock version)...');

      // Simulate connection for now
      setTimeout(() => {
        updateState({ 
          isConnected: true, 
          isLoading: false,
          error: null,
          detailedError: null
        });
        
        toast({
          title: 'Asistente activado (versión de prueba)',
          description: 'Sistema de voz en desarrollo. La aplicación ya funciona correctamente.',
        });
      }, 1000);

    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      updateState({
        error: errorMessage,
        detailedError: error,
        isLoading: false,
      });
      
      toast({
        title: 'Error al iniciar asistente',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [updateState, checkMicrophonePermission, checkHealth]);

  const endConversation = useCallback(async () => {
    try {
      console.log('🛑 Ending conversation...');

      updateState({
        isConnected: false,
        isListening: false,
        isSpeaking: false,
        error: null,
        detailedError: null,
      });

      toast({
        title: 'Asistente desactivado',
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
