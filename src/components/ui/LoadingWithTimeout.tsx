
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

interface LoadingWithTimeoutProps {
  message?: string;
  timeout?: number; // in seconds
  redirectTo?: string;
}

const motivationalMessages = [
  "Preparando tu experiencia...",
  "Cargando datos importantes...",
  "Casi listo, un momento más...",
  "Configurando tu sesión...",
  "Verificando permisos...",
  "Optimizando la plataforma...",
  "Sincronizando información...",
  "¡Ya casi terminamos!",
  "Preparando el dashboard...",
  "Validando credenciales..."
];

export const LoadingWithTimeout = ({ 
  message, 
  timeout = 7,
  redirectTo = "/error"
}: LoadingWithTimeoutProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [timeLeft, setTimeLeft] = useState(timeout);
  const [currentMessage, setCurrentMessage] = useState(
    message || motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
  );

  useEffect(() => {
    // Change motivational message every 2 seconds if no custom message provided
    let messageInterval: NodeJS.Timeout;
    if (!message) {
      messageInterval = setInterval(() => {
        setCurrentMessage(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]);
      }, 2000);
    }

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          if (messageInterval) clearInterval(messageInterval);
          
          // Force logout before redirecting (silent)
          signOut().then(() => {
            navigate(redirectTo, { replace: true });
          }).catch(() => {
            // Even if logout fails, still redirect
            navigate(redirectTo, { replace: true });
          });
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
      if (messageInterval) clearInterval(messageInterval);
    };
  }, [timeout, redirectTo, navigate, signOut, message]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600 animate-pulse">{currentMessage}</p>
      </div>
    </div>
  );
};
