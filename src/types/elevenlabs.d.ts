
declare global {
  interface Window {
    ElevenLabs: {
      Conversation: (config: {
        onConnect?: () => void;
        onDisconnect?: () => void;
        onMessage?: (message: any) => void;
        onModeChange?: (mode: any) => void;
        onError?: (error: any) => void;
        clientTools?: Record<string, (...args: any[]) => any>;
      }) => {
        startSession: (config: { signedUrl: string }) => Promise<void>;
        endSession: () => Promise<void>;
        sendMessage: (message: string) => Promise<void>;
      };
    };
  }
}

export {};
