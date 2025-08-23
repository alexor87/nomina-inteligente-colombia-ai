
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

    // Load ElevenLabs SDK with improved error handling
    const loadElevenLabsSDK = () => {
      if (window.ElevenLabs) {
        console.log('✅ ElevenLabs SDK already loaded');
        setIsLoaded(true);
        return;
      }

      console.log('🔄 Loading ElevenLabs SDK...');
      
      // Try loading from CDN first
      const loadFromCDN = () => {
        return new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          // Fixed: Correct CDN URL using @elevenlabs/client instead of @11labs/client
          script.src = 'https://cdn.jsdelivr.net/npm/@elevenlabs/client/dist/index.umd.js';
          script.async = true;
          script.crossOrigin = 'anonymous';
          
          script.onload = () => {
            console.log('✅ ElevenLabs SDK loaded successfully from CDN');
            if (window.ElevenLabs) {
              resolve();
            } else {
              reject(new Error('SDK loaded but ElevenLabs object not found'));
            }
          };
          
          script.onerror = (event) => {
            console.error('❌ Failed to load ElevenLabs SDK from CDN:', event);
            reject(new Error('Failed to load from CDN'));
          };
          
          document.head.appendChild(script);
        });
      };

      // Try alternative CDN if first one fails
      const loadFromAlternativeCDN = () => {
        return new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          // Alternative CDN source
          script.src = 'https://unpkg.com/@elevenlabs/client@latest/dist/index.umd.js';
          script.async = true;
          script.crossOrigin = 'anonymous';
          
          script.onload = () => {
            console.log('✅ ElevenLabs SDK loaded successfully from alternative CDN');
            if (window.ElevenLabs) {
              resolve();
            } else {
              reject(new Error('SDK loaded but ElevenLabs object not found'));
            }
          };
          
          script.onerror = (event) => {
            console.error('❌ Failed to load ElevenLabs SDK from alternative CDN:', event);
            reject(new Error('Failed to load from alternative CDN'));
          };
          
          document.head.appendChild(script);
        });
      };

      // Try primary CDN first, then fallback to alternative
      loadFromCDN()
        .then(() => {
          setIsLoaded(true);
          setError(null);
        })
        .catch((primaryError) => {
          console.warn('⚠️ Primary CDN failed, trying alternative...', primaryError);
          
          return loadFromAlternativeCDN()
            .then(() => {
              setIsLoaded(true);
              setError(null);
            })
            .catch((fallbackError) => {
              console.error('❌ All CDN sources failed:', { primaryError, fallbackError });
              setIsLoaded(false);
              setError('Error cargando el SDK de ElevenLabs. Verifica tu conexión a internet.');
            });
        });

      // Cleanup function
      return () => {
        const scripts = document.querySelectorAll('script[src*="elevenlabs"]');
        scripts.forEach(script => {
          if (document.head.contains(script)) {
            document.head.removeChild(script);
          }
        });
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
