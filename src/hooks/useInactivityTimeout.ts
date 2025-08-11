
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
export const useInactivityTimeout = (timeoutMinutes = 10) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (user) {
      timeoutRef.current = setTimeout(() => {
        console.log('🔐 Auto logout due to inactivity');
        navigate('/logout');
      }, timeoutMinutes * 60 * 1000);
    }
  };

  const handleActivity = () => {
    const now = Date.now();
    // Only reset if more than 30 seconds have passed to avoid excessive resets
    if (now - lastActivityRef.current > 30000) {
      lastActivityRef.current = now;
      resetTimeout();
    }
  };

  useEffect(() => {
    if (!user) return;

    // Start the timeout when user is logged in
    resetTimeout();

    // Activity events to monitor
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [user, timeoutMinutes, navigate]);

  return { resetTimeout };
};
