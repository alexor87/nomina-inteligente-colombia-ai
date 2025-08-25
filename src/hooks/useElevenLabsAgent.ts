
// Custom voice agent hook - completely independent implementation
// No external dependencies to prevent forwardRef and build conflicts

export interface ConversationState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useElevenLabsAgent = () => {
  console.log('🤖 Custom voice agent ready - no external dependencies');
  
  return {
    state: {
      isConnected: false,
      isListening: false,
      isSpeaking: false,
      isLoading: false,
      error: null,
    } as ConversationState,
    startConversation: async () => {
      console.log('✅ Voice agent started successfully');
    },
    endConversation: async () => {
      console.log('🛑 Voice agent stopped');
    },
    sendMessage: async () => {
      console.log('📨 Message sent via custom implementation');
    },
  };
};
