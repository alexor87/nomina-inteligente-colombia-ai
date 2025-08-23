import { useCallback, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
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
}

const ELEVENLABS_AGENT_ID = 'agent_8701k3by6j9ef8ka0wqzm6xtj3d9';

export const useElevenLabsConversation = () => {
  const [state, setState] = useState<ConversationState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    isLoading: false,
    error: null,
    detailedError: null,
    microphonePermission: null,
  });

  const updateState = useCallback((updates: Partial<ConversationState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const checkMicrophonePermission = useCallback(async () => {
    try {
      updateState({ microphonePermission: 'checking' });
      
      // Check current permission state
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permissionStatus.state === 'granted') {
        updateState({ microphonePermission: 'granted' });
        return true;
      } else if (permissionStatus.state === 'denied') {
        updateState({ microphonePermission: 'denied' });
        return false;
      } else {
        // Permission is 'prompt' - we need to request it
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop()); // Stop immediately
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

  const parseElevenLabsError = useCallback((errorData: any) => {
    console.log('🔍 Parsing ElevenLabs error:', errorData);
    
    let userMessage = 'Error desconocido del servicio';
    let details = errorData;
    
    // Handle different error formats from our edge function
    if (errorData.error_code) {
      switch (errorData.error_code) {
        case 'MISSING_API_KEY':
          userMessage = 'Clave de API no configurada. Contacta al administrador.';
          break;
        case 'MISSING_AGENT_ID':
          userMessage = 'ID del agente no especificado. Error de configuración.';
          break;
        case 'ELEVENLABS_API_ERROR':
          // Parse specific ElevenLabs API errors
          const status = errorData.status;
          const elevenLabsError = errorData.elevenlabs_error;
          
          if (status === 401) {
            if (elevenLabsError?.detail?.status === 'invalid_api_key') {
              userMessage = 'Clave de API inválida. Verifica la configuración en ElevenLabs.';
            } else {
              userMessage = 'No autorizado. Verifica la clave de API.';
            }
          } else if (status === 404) {
            userMessage = `Agente no encontrado (${errorData.agent_id}). Verifica el ID del agente.`;
          } else if (status === 429) {
            userMessage = 'Límite de uso alcanzado. Intenta más tarde.';
          } else if (status >= 400 && status < 500) {
            userMessage = `Error del cliente (${status}): ${elevenLabsError?.detail?.message || 'Solicitud inválida'}`;
          } else if (status >= 500) {
            userMessage = 'Error del servidor de ElevenLabs. Intenta más tarde.';
          }
          break;
        case 'NETWORK_ERROR':
          userMessage = 'Error de red. Verifica tu conexión a internet.';
          break;
        case 'INTERNAL_ERROR':
          userMessage = 'Error interno del servidor. Intenta más tarde.';
          break;
        default:
          userMessage = `Error: ${errorData.error || 'Desconocido'}`;
      }
    } else if (errorData.message) {
      // Handle other error formats
      if (errorData.message.includes('microphone') || errorData.message.includes('permission')) {
        userMessage = 'No se pudo acceder al micrófono. Verifica los permisos.';
      } else if (errorData.message.includes('network') || errorData.message.includes('websocket')) {
        userMessage = 'Error de red. Verifica tu conexión a internet.';
      } else {
        userMessage = errorData.message;
      }
    }
    
    return { userMessage, details };
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Connected to ElevenLabs');
      updateState({ 
        isConnected: true, 
        isLoading: false,
        error: null,
        detailedError: null
      });
      toast({
        title: 'Asistente activado',
        description: '¡Hola! Soy Ana, tu asistente de nómina. ¿En qué puedo ayudarte?',
      });
    },
    onDisconnect: () => {
      console.log('❌ Disconnected from ElevenLabs');
      updateState({
        isConnected: false,
        isListening: false,
        isSpeaking: false,
      });
    },
    onMessage: (message: any) => {
      console.log('📩 Message received:', message);

      if (message.source === 'ai') {
        updateState({ isSpeaking: true, isListening: false });
      } else if (message.source === 'user') {
        updateState({ isSpeaking: false, isListening: true });
      }
    },
    onModeChange: (mode: any) => {
      console.log('🎯 Mode changed:', mode);
      updateState({
        isListening: mode.mode === 'listening',
        isSpeaking: mode.mode === 'speaking',
      });
    },
    onError: (error: any) => {
      console.error('❌ Conversation error:', error);
      const { userMessage, details } = parseElevenLabsError(error);
      
      updateState({
        error: userMessage,
        detailedError: details,
        isLoading: false,
      });
      
      toast({
        title: 'Error del asistente',
        description: userMessage,
        variant: 'destructive',
      });
    },
    clientTools: {
      getActiveEmployees: async () => {
        console.log('🛠️ Tool call: getActiveEmployees');
        try {
          const { data, error } = await supabase.functions.invoke('elevenlabs-conversation', {
            body: { action: 'tool_call', tool_name: 'getActiveEmployees' },
          });
          
          if (error) {
            console.error('❌ Supabase function error:', error);
            return `Error al consultar empleados: ${error.message}`;
          }
          
          return data?.result || 'Error al obtener empleados';
        } catch (error) {
          console.error('❌ Error in getActiveEmployees:', error);
          return 'Error al consultar empleados';
        }
      },
      getPayrollPeriods: async () => {
        console.log('🛠️ Tool call: getPayrollPeriods');
        try {
          const { data, error } = await supabase.functions.invoke('elevenlabs-conversation', {
            body: { action: 'tool_call', tool_name: 'getPayrollPeriods' },
          });
          
          if (error) {
            console.error('❌ Supabase function error:', error);
            return `Error al consultar períodos: ${error.message}`;
          }
          
          return data?.result || 'Error al obtener períodos';
        } catch (error) {
          console.error('❌ Error in getPayrollPeriods:', error);
          return 'Error al consultar períodos de nómina';
        }
      },
      getCompanyInfo: async () => {
        console.log('🛠️ Tool call: getCompanyInfo');
        try {
          const { data, error } = await supabase.functions.invoke('elevenlabs-conversation', {
            body: { action: 'tool_call', tool_name: 'getCompanyInfo' },
          });
          
          if (error) {
            console.error('❌ Supabase function error:', error);
            return `Error al obtener información: ${error.message}`;
          }
          
          return data?.result || 'Error al obtener información';
        } catch (error) {
          console.error('❌ Error in getCompanyInfo:', error);
          return 'Error al obtener información de la empresa';
        }
      },
      navigateToSection: async (parameters: { section: string }) => {
        console.log('🛠️ Tool call: navigateToSection', parameters);
        try {
          const { data, error } = await supabase.functions.invoke('elevenlabs-conversation', {
            body: {
              action: 'tool_call',
              tool_name: 'navigateToSection',
              parameters,
            },
          });

          if (error) {
            console.error('❌ Supabase function error:', error);
            return `Error en navegación: ${error.message}`;
          }

          if (data?.result && !data.result.includes('Error')) {
            const sectionMap: Record<string, string> = {
              empleados: '/app/employees',
              employees: '/app/employees',
              nomina: '/app/payroll',
              payroll: '/app/payroll',
              reportes: '/app/reports',
              reports: '/app/reports',
              prestaciones: '/app/prestaciones-sociales',
              configuracion: '/app/settings',
              settings: '/app/settings',
              dashboard: '/app/dashboard',
            };

            const route = sectionMap[parameters.section.toLowerCase()];
            if (route) {
              setTimeout(() => {
                window.location.href = route;
              }, 1000);
            }
          }

          return data?.result || 'Error en navegación';
        } catch (error) {
          console.error('❌ Error in navigateToSection:', error);
          return 'Error al navegar a la sección solicitada';
        }
      },
    },
  });

  const startConversation = useCallback(async () => {
    try {
      updateState({ 
        isLoading: true, 
        error: null, 
        detailedError: null 
      });

      console.log('🎤 Checking microphone permission...');
      const hasPermission = await checkMicrophonePermission();
      
      if (!hasPermission) {
        throw new Error('Se requieren permisos de micrófono para usar el asistente de voz');
      }

      console.log('🚀 Starting ElevenLabs conversation...');

      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation', {
        body: {
          action: 'start_session',
          agent_id: ELEVENLABS_AGENT_ID,
        },
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        // Parse the error response which should now contain structured error info
        const { userMessage, details } = parseElevenLabsError(error);
        throw new Error(userMessage);
      }

      // Check if the response itself contains an error (from our edge function)
      if (data?.error) {
        console.error('❌ Backend error response:', data);
        const { userMessage, details } = parseElevenLabsError(data);
        
        updateState({
          error: userMessage,
          detailedError: details,
          isLoading: false,
        });
        
        throw new Error(userMessage);
      }

      const signedUrl = data.signed_url;
      if (!signedUrl) {
        throw new Error('No se recibió URL de sesión del servidor');
      }

      console.log('✅ Signed URL received, starting session with agent:', ELEVENLABS_AGENT_ID);

      // Use the signed URL directly as the parameter
      await conversation.startSession(signedUrl);

      console.log('✅ Conversation session started successfully');
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
  }, [conversation, updateState, checkMicrophonePermission, parseElevenLabsError]);

  const endConversation = useCallback(async () => {
    try {
      console.log('🛑 Ending conversation...');

      await conversation.endSession();

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
  }, [conversation, updateState]);

  return {
    state,
    startConversation,
    endConversation,
    checkMicrophonePermission,
    isSpeaking: conversation.isSpeaking,
    status: conversation.status,
  };
};
