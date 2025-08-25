
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

  const encodeAudioForAPI = (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  };

  const createWavFromPCM = (pcmData: Uint8Array) => {
    const int16Data = new Int16Array(pcmData.length / 2);
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
    }
    
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + int16Data.byteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, int16Data.byteLength, true);

    const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
    
    return wavArray;
  };

  const playAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    
    try {
      const audioData = audioQueueRef.current.shift()!;
      const wavData = createWavFromPCM(audioData);
      const audioBuffer = await audioContextRef.current!.decodeAudioData(wavData.buffer.slice(0));
      
      const source = audioContextRef.current!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current!.destination);
      
      source.onended = () => {
        isPlayingRef.current = false;
        playAudioQueue();
      };
      
      source.start(0);
      updateState({ isSpeaking: true });
    } catch (error) {
      console.error('Error playing audio:', error);
      isPlayingRef.current = false;
      updateState({ isSpeaking: false });
      playAudioQueue();
    }
  };

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
          hasApiKey: data.has_api_key,
          agentIdReceived: data.agent_id_received,
          lastCheck: data.timestamp,
        }
      });

      return data.has_api_key;
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

      console.log('🏥 Running pre-flight health check...');
      const isHealthy = await checkHealth();
      
      if (!isHealthy) {
        if (!state.healthStatus?.hasApiKey) {
          throw new Error('Clave de API no configurada. Contacta al administrador.');
        }
      }

      console.log('🎤 Checking microphone permission...');
      const hasPermission = await checkMicrophonePermission();
      
      if (!hasPermission) {
        throw new Error('Se requieren permisos de micrófono para usar el asistente de voz');
      }

      console.log('🚀 Starting custom voice conversation...');

      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // Start audio recorder
      recorderRef.current = new AudioRecorder((audioData) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const encodedAudio = encodeAudioForAPI(audioData);
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          }));
        }
      });
      
      await recorderRef.current.start();

      // Create WebSocket connection to our edge function
      const wsUrl = 'wss://xrmorlkakwujyozgmilf.functions.supabase.co/elevenlabs-conversation';
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected');
        updateState({ 
          isConnected: true, 
          isLoading: false,
          error: null,
          detailedError: null
        });
        
        // Send session configuration
        wsRef.current?.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'Eres Ana, asistente especializada en nómina colombiana. Habla en español colombiano natural.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            tools: [
              {
                type: 'function',
                name: 'getActiveEmployees',
                description: 'Obtiene información de empleados activos'
              },
              {
                type: 'function',
                name: 'getPayrollPeriods',
                description: 'Obtiene períodos de nómina'
              },
              {
                type: 'function',
                name: 'getCompanyInfo',
                description: 'Obtiene información de la empresa'
              },
              {
                type: 'function',
                name: 'navigateToSection',
                description: 'Navega a una sección específica',
                parameters: {
                  type: 'object',
                  properties: {
                    section: { type: 'string' }
                  },
                  required: ['section']
                }
              }
            ]
          }
        }));

        toast({
          title: 'Asistente activado',
          description: '¡Hola! Soy Ana, tu asistente de nómina. ¿En qué puedo ayudarte?',
        });
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📩 WebSocket message received:', data);

        if (data.type === 'response.audio.delta') {
          const binaryString = atob(data.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          audioQueueRef.current.push(bytes);
          playAudioQueue();
        } else if (data.type === 'response.audio.done') {
          updateState({ isSpeaking: false });
        } else if (data.type === 'input_audio_buffer.speech_started') {
          updateState({ isListening: true });
        } else if (data.type === 'input_audio_buffer.speech_stopped') {
          updateState({ isListening: false });
        } else if (data.type === 'response.function_call_arguments.done') {
          handleToolCall(data.name, JSON.parse(data.arguments || '{}'));
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        updateState({
          error: 'Error de conexión WebSocket',
          isLoading: false,
        });
      };

      wsRef.current.onclose = () => {
        console.log('❌ WebSocket disconnected');
        updateState({
          isConnected: false,
          isListening: false,
          isSpeaking: false,
        });
      };

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
  }, [updateState, checkMicrophonePermission, checkHealth, state.healthStatus]);

  const handleToolCall = async (toolName: string, parameters: any) => {
    console.log(`🛠️ Handling tool call: ${toolName}`, parameters);
    
    try {
      let result: string;
      
      if (toolName === 'navigateToSection') {
        const { section } = parameters;
        const route = getRouteForSection(section);
        const displayName = getSectionDisplayName(section);
        
        if (route) {
          result = `Te estoy dirigiendo a la sección de ${displayName}`;
          setTimeout(() => {
            navigate(route);
            toast({
              title: '🧭 Navegación exitosa',
              description: `Te he dirigido a la sección de ${displayName}`,
              duration: 2000,
            });
          }, 1500);
        } else {
          result = `No reconozco la sección "${section}". Las secciones disponibles son: empleados, nómina, reportes, prestaciones sociales, configuración, dashboard.`;
        }
      } else {
        const { data } = await supabase.functions.invoke('elevenlabs-conversation', {
          body: { 
            action: 'tool_call', 
            tool_name: toolName,
            parameters 
          }
        });
        result = data?.result || `Error ejecutando ${toolName}`;
      }
      
      logToolExecution(toolName, result);
      
      // Send result back to WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: 'call_' + Date.now(),
            output: result
          }
        }));
      }
      
    } catch (error) {
      console.error(`❌ Error in tool call ${toolName}:`, error);
      const errorResult = `Error ejecutando ${toolName}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      logToolExecution(toolName, errorResult);
    }
  };

  const endConversation = useCallback(async () => {
    try {
      console.log('🛑 Ending conversation...');

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      audioQueueRef.current = [];
      isPlayingRef.current = false;

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
