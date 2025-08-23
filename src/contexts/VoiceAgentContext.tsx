
import React, { createContext, useContext, useEffect } from 'react';

interface VoiceAgentContextType {
  isSupported: boolean;
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
  const [isSupported, setIsSupported] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
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
    
    if (!supported) {
      setError('Navegador no compatible con funciones de voz');
    }
  }, []);

  const value = {
    isSupported,
    error,
  };

  return (
    <VoiceAgentContext.Provider value={value}>
      {children}
    </VoiceAgentContext.Provider>
  );
};
