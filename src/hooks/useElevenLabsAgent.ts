import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ConversationState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
}

// UPDATED: Use the correct Agent ID provided by the user
const ELEVENLABS_AGENT_ID = 'agent_3701k3bzfyn5f4ws09536v7bk5wf';

export const useElevenLabsAgent = () => {
  const [state, setState] = useState<ConversationState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    isLoading: false,
    error: null,
  });

  const conversationRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);

  const updateState = useCallback((updates: Partial<ConversationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const startConversation = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: null });
      
      console.log('🚀 Starting ElevenLabs conversation...');

      // Check if ElevenLabs SDK is available
      if (!window.ElevenLabs) {
        throw new Error('ElevenLabs SDK not loaded. Please refresh the page.');
      }

      // Get signed URL through our edge function, passing agent_id
      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation', {
        body: { 
          action: 'start_session',
          agent_id: ELEVENLABS_AGENT_ID
        }
      });

      if (error) throw error;

      const signedUrl = data.signed_url;
      if (!signedUrl) throw new Error('No signed URL received');

      console.log('✅ Signed URL received, initializing conversation with agent:', ELEVENLABS_AGENT_ID);

      // Initialize conversation with client tools
      const conversation = window.ElevenLabs.Conversation({
        onConnect: () => {
          console.log('✅ Connected to ElevenLabs');
          updateState({ isConnected: true, isLoading: false });
          toast({
            title: "Asistente activado",
            description: "¡Hola! Soy Ana, tu asistente de nómina. ¿En qué puedo ayudarte?",
          });
        },
        onDisconnect: () => {
          console.log('❌ Disconnected from ElevenLabs');
          updateState({ 
            isConnected: false, 
            isListening: false, 
            isSpeaking: false 
          });
        },
        onMessage: (message: any) => {
          console.log('📩 Message received:', message);
          
          // Update speaking/listening states based on message source
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
            isSpeaking: mode.mode === 'speaking'
          });
        },
        onError: (error: any) => {
          console.error('❌ Conversation error:', error);
          updateState({ 
            error: error.message || 'Error de conexión',
            isLoading: false 
          });
          toast({
            title: "Error del asistente",
            description: error.message || 'Hubo un problema con la conexión',
            variant: "destructive",
          });
        },
        clientTools: {
          getActiveEmployees: async () => {
            console.log('🛠️ Tool call: getActiveEmployees');
            try {
              const { data } = await supabase.functions.invoke('elevenlabs-conversation', {
                body: { action: 'tool_call', tool_name: 'getActiveEmployees' }
              });
              return data?.result || "Error al obtener empleados";
            } catch (error) {
              console.error('❌ Error in getActiveEmployees:', error);
              return "Error al consultar empleados";
            }
          },
          getPayrollPeriods: async () => {
            console.log('🛠️ Tool call: getPayrollPeriods');
            try {
              const { data } = await supabase.functions.invoke('elevenlabs-conversation', {
                body: { action: 'tool_call', tool_name: 'getPayrollPeriods' }
              });
              return data?.result || "Error al obtener períodos";
            } catch (error) {
              console.error('❌ Error in getPayrollPeriods:', error);
              return "Error al consultar períodos de nómina";
            }
          },
          getCompanyInfo: async () => {
            console.log('🛠️ Tool call: getCompanyInfo');
            try {
              const { data } = await supabase.functions.invoke('elevenlabs-conversation', {
                body: { action: 'tool_call', tool_name: 'getCompanyInfo' }
              });
              return data?.result || "Error al obtener información";
            } catch (error) {
              console.error('❌ Error in getCompanyInfo:', error);
              return "Error al obtener información de la empresa";
            }
          },
          navigateToSection: async (parameters: { section: string }) => {
            console.log('🛠️ Tool call: navigateToSection', parameters);
            try {
              const { data } = await supabase.functions.invoke('elevenlabs-conversation', {
                body: { 
                  action: 'tool_call', 
                  tool_name: 'navigateToSection',
                  parameters 
                }
              });
              
              // Actually navigate if successful
              if (data?.result && !data.result.includes('Error')) {
                const sectionMap: Record<string, string> = {
                  'empleados': '/app/employees',
                  'employees': '/app/employees',
                  'nomina': '/app/payroll',
                  'payroll': '/app/payroll',
                  'reportes': '/app/reports',
                  'reports': '/app/reports',
                  'prestaciones': '/app/prestaciones-sociales',
                  'configuracion': '/app/settings',
                  'settings': '/app/settings',
                  'dashboard': '/app/dashboard'
                };
                
                const route = sectionMap[parameters.section.toLowerCase()];
                if (route) {
                  setTimeout(() => {
                    window.location.href = route;
                  }, 1000); // Small delay to let user hear confirmation
                }
              }
              
              return data?.result || "Error en navegación";
            } catch (error) {
              console.error('❌ Error in navigateToSection:', error);
              return "Error al navegar a la sección solicitada";
            }
          }
        }
      });

      await conversation.startSession({ signedUrl });
      conversationRef.current = conversation;
      sessionIdRef.current = data.session_id || null;

      console.log('✅ Conversation session started successfully');

    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        isLoading: false 
      });
      toast({
        title: "Error al iniciar",
        description: "No se pudo conectar con el asistente. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  }, [updateState]);

  const endConversation = useCallback(async () => {
    try {
      console.log('🛑 Ending conversation...');
      
      if (conversationRef.current) {
        await conversationRef.current.endSession();
        conversationRef.current = null;
        sessionIdRef.current = null;
      }
      
      updateState({
        isConnected: false,
        isListening: false,
        isSpeaking: false,
        error: null
      });

      toast({
        title: "Asistente desactivado",
        description: "¡Hasta luego! Siempre puedes reactivarme cuando me necesites.",
      });
      
      console.log('✅ Conversation ended successfully');
    } catch (error) {
      console.error('❌ Error ending conversation:', error);
    }
  }, [updateState]);

  const sendMessage = useCallback(async (message: string) => {
    if (!conversationRef.current || !state.isConnected) {
      throw new Error('No hay conversación activa');
    }

    try {
      console.log('📤 Sending message:', message);
      await conversationRef.current.sendMessage(message);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }, [state.isConnected]);

  return {
    state,
    startConversation,
    endConversation,
    sendMessage,
  };
};
