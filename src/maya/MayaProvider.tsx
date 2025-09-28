import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MayaEngine } from './MayaEngine';
import type { MayaMessage, MayaContext as MayaContextType, PayrollPhase } from './types';

interface MayaProviderValue {
  currentMessage: MayaMessage | null;
  isVisible: boolean;
  updateContext: (context: MayaContextType) => Promise<void>;
  hideMessage: () => void;
  showMessage: () => void;
  setPhase: (phase: PayrollPhase, additionalData?: Partial<MayaContextType>) => Promise<void>;
  performIntelligentValidation: (companyId: string, periodId?: string, employees?: any[]) => Promise<any>;
}

const MayaContext = createContext<MayaProviderValue | null>(null);

export const useMaya = () => {
  const context = useContext(MayaContext);
  if (!context) {
    throw new Error('useMaya must be used within a MayaProvider');
  }
  return context;
};

interface MayaProviderProps {
  children: React.ReactNode;
  autoShow?: boolean;
}

export const MayaProvider: React.FC<MayaProviderProps> = ({ 
  children, 
  autoShow = true 
}) => {
  const [currentMessage, setCurrentMessage] = useState<MayaMessage | null>(null);
  const [isVisible, setIsVisible] = useState(autoShow);
  const [mayaEngine] = useState(() => MayaEngine.getInstance());

  const updateContext = useCallback(async (context: MayaContextType) => {
    try {
      const message = await mayaEngine.generateContextualMessage(context);
      setCurrentMessage(message);
      
      // Auto-show Maya when there's a new message
      if (autoShow) {
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Error updating Maya context:', error);
    }
  }, [mayaEngine, autoShow]);

  const setPhase = useCallback(async (phase: PayrollPhase, additionalData?: Partial<MayaContextType>) => {
    const context: MayaContextType = {
      phase,
      ...additionalData
    };
    await updateContext(context);
  }, [updateContext]);

  const hideMessage = useCallback(() => {
    setIsVisible(false);
  }, []);

  const showMessage = useCallback(() => {
    setIsVisible(true);
  }, []);

  const performIntelligentValidation = useCallback(async (
    companyId: string,
    periodId?: string,
    employees?: any[]
  ) => {
    try {
      const { MayaIntelligentValidationService } = await import('./services/MayaIntelligentValidationService');
      const validationResults = await MayaIntelligentValidationService.performIntelligentValidation(
        companyId,
        periodId,
        employees
      );

      // Actualizar contexto con resultados de validación
      await setPhase('data_validation', {
        hasErrors: validationResults.hasIssues,
        validationResults
      });

      return validationResults;
    } catch (error) {
      console.error('Error en validación inteligente de MAYA:', error);
      throw error;
    }
  }, [setPhase]);

  // Initialize Maya with welcome message
  useEffect(() => {
    const initializeMaya = async () => {
      await setPhase('initial');
    };
    
    if (autoShow) {
      initializeMaya();
    }
  }, [setPhase, autoShow]);

  const value: MayaProviderValue = {
    currentMessage,
    isVisible,
    updateContext,
    hideMessage,
    showMessage,
    setPhase,
    performIntelligentValidation
  };

  return (
    <MayaContext.Provider value={value}>
      {children}
    </MayaContext.Provider>
  );
};