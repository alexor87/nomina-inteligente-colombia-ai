
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

interface LoadingWithTimeoutProps {
  message?: string;
  timeout?: number; // in seconds
  redirectTo?: string;
}

export const LoadingWithTimeout = ({ 
  message = "Cargando...", 
  timeout = 7,
  redirectTo = "/error"
}: LoadingWithTimeoutProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [timeLeft, setTimeLeft] = useState(timeout);

  useEffect(() => {
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          console.warn(`Loading timeout reached after ${timeout} seconds, forcing logout and redirecting to ${redirectTo}`);
          
          // Force logout before redirecting
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

    return () => clearInterval(countdownInterval);
  }, [timeout, redirectTo, navigate, signOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">{message}</p>
        <p className="mt-2 text-sm text-gray-400">
          Si esto toma más tiempo del esperado, serás redirigido automáticamente...
        </p>
        <p className="mt-1 text-xs text-gray-400">
          ({timeLeft}s restantes)
        </p>
      </div>
    </div>
  );
};
