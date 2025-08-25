
// Temporarily disabled to fix forwardRef error
// This file will be re-enabled once the app loads correctly

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

export const useElevenLabsConversation = () => {
  console.log('⚠️ useElevenLabsConversation temporarily disabled');
  
  return {
    state: {
      isConnected: false,
      isListening: false,
      isSpeaking: false,
      isLoading: false,
      error: 'Temporarily disabled',
      detailedError: null,
      microphonePermission: null,
      healthStatus: null,
    } as ConversationState,
    startConversation: async () => {
      console.log('⚠️ startConversation temporarily disabled');
    },
    endConversation: async () => {
      console.log('⚠️ endConversation temporarily disabled');
    },
    checkMicrophonePermission: async () => {
      console.log('⚠️ checkMicrophonePermission temporarily disabled');
      return false;
    },
    checkHealth: async () => {
      console.log('⚠️ checkHealth temporarily disabled');
      return false;
    },
    isSpeaking: false,
    status: 'disconnected' as const,
  };
};
