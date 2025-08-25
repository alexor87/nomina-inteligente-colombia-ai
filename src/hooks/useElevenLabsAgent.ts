
// Temporarily disabled to fix forwardRef error
// This file will be re-enabled once the app loads correctly

export interface ConversationState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useElevenLabsAgent = () => {
  console.log('⚠️ useElevenLabsAgent temporarily disabled');
  
  return {
    state: {
      isConnected: false,
      isListening: false,
      isSpeaking: false,
      isLoading: false,
      error: 'Temporarily disabled',
    } as ConversationState,
    startConversation: async () => {
      console.log('⚠️ startConversation temporarily disabled');
    },
    endConversation: async () => {
      console.log('⚠️ endConversation temporarily disabled');
    },
    sendMessage: async () => {
      console.log('⚠️ sendMessage temporarily disabled');
    },
  };
};
