
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionError {
  code?: string;
  message: string;
  details?: any;
  hint?: string;
}

export const useSubscriptionErrorHandler = () => {
  const { toast } = useToast();

  const handleSubscriptionError = useCallback((error: SubscriptionError, context: string = 'subscription') => {
    console.error(`❌ Subscription Error [${context}]:`, error);

    // Handle specific Supabase error codes
    let errorMessage = 'Error en el sistema de suscripciones';
    let shouldShowToast = true;

    switch (error.code) {
      case 'PGRST116':
        errorMessage = 'Configurando suscripción por primera vez...';
        shouldShowToast = false; // Don't show toast for this as it's expected
        console.log('ℹ️ PGRST116 handled gracefully - creating default subscription');
        break;
        
      case 'PGRST301':
        errorMessage = 'Error de permisos en suscripción';
        break;
        
      case 'PGRST204':
        errorMessage = 'Suscripción no encontrada, creando nueva';
        shouldShowToast = false;
        break;
        
      case '23505':
        errorMessage = 'La suscripción ya existe';
        shouldShowToast = false;
        break;
        
      default:
        if (error.message?.includes('JWT')) {
          errorMessage = 'Sesión expirada, por favor inicia sesión nuevamente';
        } else if (error.message?.includes('network')) {
          errorMessage = 'Error de conexión, reintentando automáticamente';
        } else if (error.message?.includes('timeout')) {
          errorMessage = 'Tiempo de espera agotado, reintentando';
        } else {
          errorMessage = error.message || errorMessage;
        }
    }

    // Log detailed error information
    console.log('🔍 Error Details:', {
      context,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      timestamp: new Date().toISOString()
    });

    if (shouldShowToast) {
      toast({
        title: 'Sistema de Suscripción',
        description: errorMessage,
        variant: error.code === 'PGRST116' ? 'default' : 'destructive'
      });
    }

    return {
      handled: true,
      shouldRetry: ['network', 'timeout', 'PGRST116'].some(keyword => 
        error.code === keyword || error.message?.toLowerCase().includes(keyword)
      ),
      fallbackRequired: error.code === 'PGRST116' || error.message?.includes('not found')
    };
  }, [toast]);

  const logSubscriptionAction = useCallback((action: string, data?: any) => {
    console.log(`📊 Subscription Action [${action}]:`, {
      action,
      data,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }, []);

  return {
    handleSubscriptionError,
    logSubscriptionAction
  };
};
