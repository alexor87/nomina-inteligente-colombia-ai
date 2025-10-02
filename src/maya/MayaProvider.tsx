import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MayaEngine } from './MayaEngine';
import { MayaChatService, type ChatMessage } from './services/MayaChatService';
import type { MayaMessage, MayaContext as MayaContextType, PayrollPhase } from './types';
import { useDashboard } from '@/hooks/useDashboard';
import { useEmployeeData } from '@/hooks/useEmployeeData';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';

interface MayaProviderValue {
  currentMessage: MayaMessage | null;
  isVisible: boolean;
  isChatMode: boolean;
  chatHistory: ChatMessage[];
  updateContext: (context: MayaContextType) => Promise<void>;
  hideMessage: () => void;
  showMessage: () => void;
  setChatMode: (enabled: boolean) => void;
  sendMessage: (message: string) => Promise<void>;
  addActionMessage: (message: string, executableActions: any[]) => void;
  setPhase: (phase: PayrollPhase, additionalData?: Partial<MayaContextType>) => Promise<void>;
  performIntelligentValidation: (companyId: string, periodId?: string, employees?: any[]) => Promise<any>;
  setErrorContext: (errorType: string, errorDetails: any) => Promise<void>;
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
  const location = useLocation();
  const { metrics, recentEmployees, recentActivity, payrollTrends, efficiencyMetrics, loading: dashboardLoading } = useDashboard();
  const { employees, isLoading: employeesLoading } = useEmployeeData();
  const { companyId } = useCurrentCompany();
  
  const [currentMessage, setCurrentMessage] = useState<MayaMessage | null>(null);
  const [isVisible, setIsVisible] = useState(autoShow);
  const [isChatMode, setIsChatMode] = useState(false);
  const [mayaEngine] = useState(() => MayaEngine.getInstance());
  const [chatService] = useState(() => MayaChatService.getInstance());
  
  // Initialize chatHistory from persisted conversation
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const persistedConversation = chatService.getConversation();
    console.log('🤖 MAYA Provider: Initializing with persisted history', { messageCount: persistedConversation.messages.length });
    return persistedConversation.messages;
  });

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

  const setChatMode = useCallback((enabled: boolean) => {
    setIsChatMode(enabled);
    if (enabled) {
      // Switch to chat mode and show existing conversation
      setChatHistory(chatService.getConversation().messages);
    }
  }, [chatService]);

  // Generate comprehensive company context - ALWAYS include ALL available data regardless of page
  const generatePageContext = useCallback(() => {
    const currentPath = location.pathname;
    
    // Determine page type for context
    let pageType = 'unknown';
    if (currentPath.includes('/dashboard')) pageType = 'dashboard';
    else if (currentPath.includes('/employees')) pageType = 'employees';
    else if (currentPath.includes('/payroll')) pageType = 'payroll';
    else if (currentPath.includes('/reports')) pageType = 'reports';
    
    // ALWAYS include ALL available company data regardless of current page
    const comprehensiveContext = {
      // Basic page context
      currentPage: currentPath,
      pageType,
      companyId,
      timestamp: new Date().toISOString(),
      isLoading: dashboardLoading || employeesLoading,
      
      // COMPLETE Dashboard metrics - always available
      dashboardData: {
        metrics: metrics ? {
          totalEmployees: metrics.totalEmployees,
          activeEmployees: metrics.activeEmployees,
          monthlyPayroll: metrics.monthlyPayrollTotal,
          pendingPayroll: metrics.pendingPayrolls
        } : null,
        
        recentEmployees: recentEmployees?.map(emp => ({
          id: emp.id,
          name: emp.name,
          position: emp.position,
          hireDate: emp.dateAdded,
          status: emp.status,
          department: 'N/A' // Default since department is not in RecentEmployee type
        })) || [],
        
        recentActivity: recentActivity?.map(activity => ({
          type: activity.type,
          action: activity.action,
          user: activity.user,
          timestamp: activity.timestamp
        })) || [],
        
        payrollTrends: payrollTrends?.map(trend => ({
          month: trend.month,
          total: trend.totalNeto,
          employeeCount: trend.employeesCount,
          avgPerEmployee: trend.employeesCount > 0 ? trend.totalNeto / trend.employeesCount : 0
        })) || [],
        
        efficiencyMetrics: efficiencyMetrics?.map(metric => ({
          metric: metric.metric,
          value: metric.value,
          change: metric.change,
          unit: metric.unit
        })) || []
      },
      
      // COMPLETE Employee data - always available
      employeeData: {
        totalCount: employees?.length || 0,
        activeCount: employees?.filter(e => e.estado === 'activo').length || 0,
        inactiveCount: employees?.filter(e => e.estado === 'inactivo').length || 0,
        
        // Complete employee list with all details
        allEmployees: employees?.map(emp => ({
          id: emp.id,
          name: `${emp.nombre} ${emp.apellido}`,
          firstName: emp.nombre,
          lastName: emp.apellido,
          position: emp.cargo,
          department: emp.departamento || 'N/A',
          salary: emp.salarioBase,
          hireDate: emp.fechaIngreso,
          status: emp.estado,
          documentType: emp.tipoDocumento,
          documentNumber: emp.numeroCuenta || 'N/A', // Using available field
          email: emp.email,
          phone: emp.telefono,
          contractType: emp.tipoContrato || 'N/A',
          // Calculate years of service
          yearsOfService: emp.fechaIngreso ? 
            Math.floor((new Date().getTime() - new Date(emp.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 0
        })) || [],
        
        // Summary statistics
        totalSalaryBase: employees?.reduce((sum, emp) => sum + (emp.salarioBase || 0), 0) || 0,
        avgSalary: employees?.length ? 
          (employees.reduce((sum, emp) => sum + (emp.salarioBase || 0), 0) / employees.length) : 0,
          
        // Departmental breakdown
        byDepartment: employees?.reduce((acc, emp) => {
          const dept = emp.departamento || 'Sin Departamento';
          if (!acc[dept]) {
            acc[dept] = { count: 0, totalSalary: 0 };
          }
          acc[dept].count++;
          acc[dept].totalSalary += emp.salarioBase || 0;
          return acc;
        }, {} as Record<string, { count: number; totalSalary: number }>) || {},
        
        // Recent hires (last 6 months)
        recentHires: employees?.filter(emp => {
          if (!emp.fechaIngreso) return false;
          const hireDate = new Date(emp.fechaIngreso);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return hireDate >= sixMonthsAgo;
        }).map(emp => ({
          name: `${emp.nombre} ${emp.apellido}`,
          position: emp.cargo,
          hireDate: emp.fechaIngreso,
          salary: emp.salarioBase
        })) || [],
        
        // Senior employees (5+ years)
        seniorEmployees: employees?.filter(emp => {
          if (!emp.fechaIngreso) return false;
          const yearsOfService = Math.floor((new Date().getTime() - new Date(emp.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
          return yearsOfService >= 5;
        }).map(emp => ({
          name: `${emp.nombre} ${emp.apellido}`,
          position: emp.cargo,
          hireDate: emp.fechaIngreso,
          yearsOfService: Math.floor((new Date().getTime() - new Date(emp.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
        })) || []
      }
    };
    
    // Add debug logging to verify context completeness
    console.log('🔍 MAYA Context Generated:', {
      pageType,
      employeeCount: comprehensiveContext.employeeData.totalCount,
      hasMetrics: !!comprehensiveContext.dashboardData.metrics,
      hasTrends: comprehensiveContext.dashboardData.payrollTrends.length,
      hasActivity: comprehensiveContext.dashboardData.recentActivity.length,
      departmentCount: Object.keys(comprehensiveContext.employeeData.byDepartment).length
    });
    
    return comprehensiveContext;
  }, [location.pathname, companyId, dashboardLoading, employeesLoading, metrics, recentEmployees, recentActivity, payrollTrends, efficiencyMetrics, employees]);

  const sendMessage = useCallback(async (message: string) => {
    try {
      // Generate rich contextual data
      const richContext = generatePageContext();
      
      const response = await chatService.sendMessage(message, richContext);
      
      // Update chat history
      setChatHistory([...chatService.getConversation().messages]);
      
      // Also create a contextual message for non-chat mode
      const contextualMessage: MayaMessage = {
        id: response.id,
        message: response.content,
        emotionalState: 'neutral',
        contextualActions: [],
        executableActions: Array.isArray(response.executableActions) ? response.executableActions : [], // Ensure it's always an array
        timestamp: response.timestamp,
        isVisible: true
      };
      
      setCurrentMessage(contextualMessage);
      
    } catch (error) {
      console.error('Error sending message to MAYA:', error);
      throw error;
    }
  }, [chatService, generatePageContext]);

  const addActionMessage = useCallback((message: string, executableActions: any[]) => {
    const actionMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: message,
      timestamp: new Date().toISOString(),
      executableActions: executableActions || []
    };
    
    chatService.addSystemMessage(message);
    // Add the executable actions to the last message
    const conversation = chatService.getConversation();
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage) {
      lastMessage.executableActions = executableActions || [];
    }
    
    setChatHistory([...chatService.getConversation().messages]);
    
    // Also update current message for info mode
    setCurrentMessage({
      id: actionMessage.id,
      message: actionMessage.content,
      emotionalState: 'encouraging',
      contextualActions: [],
      executableActions: executableActions || [],
      timestamp: actionMessage.timestamp,
      isVisible: true
    });
  }, [chatService]);

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
        validationResults,
        employeeCount: employees?.length
      });

      return validationResults;
    } catch (error) {
      console.error('Error en validación inteligente de MAYA:', error);
      
      // Trigger error phase on validation failure
      await setPhase('error', {
        hasErrors: true,
        errorType: 'validation_system_error',
        errorDetails: { message: error.message || 'Error en sistema de validación', error }
      });
      
      throw error;
    }
  }, [setPhase]);

  const setErrorContext = useCallback(async (errorType: string, errorDetails: any) => {
    await setPhase('error', {
      hasErrors: true,
      errorType,
      errorDetails
    });
  }, [setPhase]);

  // Sync with persisted conversation on mount
  useEffect(() => {
    const existingConversation = chatService.getConversation();
    if (existingConversation.messages.length > 0) {
      console.log('🤖 MAYA Provider: Syncing with persisted conversation', { messageCount: existingConversation.messages.length });
      setChatHistory([...existingConversation.messages]);
      
      // Set current message to last assistant message if exists
      const lastAssistantMessage = [...existingConversation.messages].reverse().find(msg => msg.role === 'assistant');
      if (lastAssistantMessage) {
        setCurrentMessage({
          id: lastAssistantMessage.id,
          message: lastAssistantMessage.content,
          emotionalState: 'neutral',
          contextualActions: [],
          executableActions: lastAssistantMessage.executableActions || [],
          timestamp: lastAssistantMessage.timestamp,
          isVisible: true
        });
      }
    } else if (autoShow) {
      // Only initialize with welcome message if no persisted conversation
      const initializeMaya = async () => {
        await setPhase('initial');
      };
      initializeMaya();
    }
  }, [chatService, autoShow]); // Removed setPhase to prevent re-initialization on every phase change

  // Initialize chat with current message when switching to chat mode
  useEffect(() => {
    if (currentMessage && isChatMode && chatHistory.length === 0) {
      chatService.addSystemMessage(currentMessage.message);
      setChatHistory([...chatService.getConversation().messages]);
    }
  }, [currentMessage, isChatMode, chatHistory.length, chatService]);

  const value: MayaProviderValue = {
    currentMessage,
    isVisible,
    isChatMode,
    chatHistory,
    updateContext,
    hideMessage,
    showMessage,
    setChatMode,
    sendMessage,
    addActionMessage,
    setPhase,
    performIntelligentValidation,
    setErrorContext
  };

  return (
    <MayaContext.Provider value={value}>
      {children}
    </MayaContext.Provider>
  );
};