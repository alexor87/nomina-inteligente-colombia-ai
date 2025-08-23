
import React, { createContext, useContext, useEffect } from 'react';

interface VoiceAgentContextType {
  isSupported: boolean;
  isLoaded: boolean;
  error: string | null;
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
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    // Check if browser supports required APIs
    const checkSupport = () => {
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasWebAudio = !!(window.AudioContext || (window as any).webkitAudioContext);
      const hasWebSocket = !!window.WebSocket;
      const isSecureContext = window.isSecureContext || window.location.protocol === 'https:';
      
      console.log('🔍 Checking browser support:', {
        hasMediaDevices,
        hasWebAudio,
        hasWebSocket,
        isSecureContext
      });
      
      if (!isSecureContext) {
        setError('Se requiere HTTPS para el micrófono');
        return false;
      }
      
      return hasMediaDevices && hasWebAudio && hasWebSocket;
    };
    
    const supported = checkSupport();
    setIsSupported(supported);

    // Load ElevenLabs SDK
    const loadElevenLabsSDK = () => {
      if (window.ElevenLabs) {
        console.log('✅ ElevenLabs SDK already loaded');
        setIsLoaded(true);
        return;
      }

      console.log('🔄 Loading ElevenLabs SDK...');
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@11labs/client/dist/index.umd.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log('✅ ElevenLabs SDK loaded successfully');
        setIsLoaded(true);
        setError(null);
      };
      
      script.onerror = (event) => {
        console.error('❌ Failed to load ElevenLabs SDK:', event);
        setIsLoaded(false);
        setError('Error cargando el SDK de ElevenLabs');
      };
      
      document.head.appendChild(script);

      // Cleanup function to remove script if component unmounts
      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    };

    if (supported) {
      const cleanup = loadElevenLabsSDK();
      return cleanup;
    } else {
      setError('Navegador no compatible con funciones de voz');
    }
  }, []);

  const value = {
    isSupported,
    isLoaded,
    error,
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
