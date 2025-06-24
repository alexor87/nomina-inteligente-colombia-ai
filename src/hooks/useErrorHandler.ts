
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

export interface ErrorHandlerOptions {
  title?: string;
  fallbackMessage?: string;
  showToast?: boolean;
  logToConsole?: boolean;
}

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = useCallback((
    error: unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      title = 'Error',
      fallbackMessage = 'Ha ocurrido un error inesperado',
      showToast = true,
      logToConsole = true
    } = options;

    let errorMessage = fallbackMessage;

    // Extraer mensaje de error
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as any).message;
    }

    // Log en consola
    if (logToConsole) {
      console.error(`${title}:`, error);
    }

    // Mostrar toast
    if (showToast) {
      toast({
        title,
        description: errorMessage,
        variant: 'destructive'
      });
    }

    return errorMessage;
  }, [toast]);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError
  };
};
