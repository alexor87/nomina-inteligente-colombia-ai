
import React, { createContext, useContext, useEffect } from 'react';

interface VoiceAgentContextType {
  isSupported: boolean;
  isLoaded: boolean;
}

const VoiceAgentContext = createContext<VoiceAgentContextType | undefined>(undefined);

export const useVoiceAgent = () => {
  const context = useContext(VoiceAgentContext);
  if (!context) {
    throw new Error('useVoiceAgent must be used within VoiceAgentProvider');
  }
  return context;
};

interface VoiceAgentProviderProps {
  children: React.ReactNode;
}

export const VoiceAgentProvider: React.FC<VoiceAgentProviderProps> = ({ children }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(false);

  useEffect(() => {
    // Check if browser supports required APIs
    const checkSupport = () => {
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasWebAudio = !!(window.AudioContext || (window as any).webkitAudioContext);
      const hasWebSocket = !!window.WebSocket;
      
      return hasMediaDevices && hasWebAudio && hasWebSocket;
    };
    
    setIsSupported(checkSupport());

    // Load ElevenLabs SDK
    const loadElevenLabsSDK = () => {
      if (window.ElevenLabs) {
        setIsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@11labs/react@latest/dist/index.umd.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ ElevenLabs SDK loaded');
        setIsLoaded(true);
      };
      script.onerror = () => {
        console.error('❌ Failed to load ElevenLabs SDK');
        setIsLoaded(false);
      };
      
      document.head.appendChild(script);
    };

    if (isSupported) {
      loadElevenLabsSDK();
    }

    return () => {
      // Cleanup if needed
    };
  }, [isSupported]);

  const value = {
    isSupported,
    isLoaded,
  };

  return (
    <VoiceAgentContext.Provider value={value}>
      {children}
    </VoiceAgentContext.Provider>
  );
};

// Extend window interface for ElevenLabs
declare global {
  interface Window {
    ElevenLabs: any;
  }
}
