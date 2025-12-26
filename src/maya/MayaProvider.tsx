import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MayaEngine } from './MayaEngine';
import { MayaChatService, type ChatMessage } from './services/MayaChatService';
import { MayaConversationManager, type ConversationSummary } from './services/MayaConversationManager';
import type { MayaMessage, MayaContext as MayaContextType, PayrollPhase } from './types';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GuidedFlowManager } from './services/GuidedFlowManager';
import { FlowState, FlowType } from './types/GuidedFlow';

interface MayaProviderValue {
  currentMessage: MayaMessage | null;
  isVisible: boolean;
  isChatMode: boolean;
  isProcessing: boolean;
  chatHistory: ChatMessage[];
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  isLoadingConversations: boolean;
  activeFlow: FlowState | null;
  updateContext: (context: MayaContextType) => Promise<void>;
  hideMessage: () => void;
  showMessage: () => void;
  setChatMode: (enabled: boolean) => void;
  sendMessage: (message: string, conversationState?: Record<string, any>) => Promise<void>;
  addActionMessage: (message: string, executableActions: any[]) => void;
  setPhase: (phase: PayrollPhase, additionalData?: Partial<MayaContextType>) => Promise<void>;
  performIntelligentValidation: (companyId: string, periodId?: string, employees?: any[]) => Promise<any>;
  setErrorContext: (errorType: string, errorDetails: any) => Promise<void>;
  clearConversation: (skipMessage?: boolean) => Promise<void>;
  deleteCurrentConversation: () => Promise<void>;
  loadConversations: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  createNewConversation: () => Promise<string>;
  startGuidedFlow: (flowType: FlowType, isDemoMode?: boolean) => void;
  advanceFlow: (userInput: string) => Promise<void>;
  goBackInFlow: () => void;
  cancelFlow: () => void;
  completeFlowAndNavigate: (url: string) => void;
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

// 🔧 OPTIMIZACIÓN: Lazy loading del contexto - solo carga cuando MAYA lo necesita
interface LazyContextData {
  metrics: any | null;
  recentEmployees: any[] | null;
  recentActivity: any[] | null;
  payrollTrends: any[] | null;
  efficiencyMetrics: any[] | null;
  employees: any[] | null;
  isLoaded: boolean;
  isLoading: boolean;
}

export const MayaProvider: React.FC<MayaProviderProps> = ({ 
  children, 
  autoShow = true 
}) => {
  const location = useLocation();
  
  // 🔧 OPTIMIZACIÓN: Eliminamos useDashboard() y useEmployeeData() del nivel superior
  // Los datos se cargan SOLO cuando MAYA los necesita (lazy loading)
  const { companyId } = useCurrentCompany();
  
  // 🆕 Estado lazy para datos de contexto
  const [lazyContext, setLazyContext] = useState<LazyContextData>({
    metrics: null,
    recentEmployees: null,
    recentActivity: null,
    payrollTrends: null,
    efficiencyMetrics: null,
    employees: null,
    isLoaded: false,
    isLoading: false
  });
  
  // Ref para evitar cargas duplicadas
  const contextLoadingRef = useRef(false);
  
  const [currentMessage, setCurrentMessage] = useState<MayaMessage | null>(null);
  const [isVisible, setIsVisible] = useState(autoShow);
  const [isChatMode, setIsChatMode] = useState(() => {
    const persistedConversation = MayaChatService.getInstance().getConversation();
    return persistedConversation.messages.length > 0;
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [mayaEngine] = useState(() => MayaEngine.getInstance());
  const [chatService] = useState(() => MayaChatService.getInstance());
  const [conversationManager] = useState(() => MayaConversationManager.getInstance());
  const [flowManager] = useState(() => GuidedFlowManager.getInstance());
  
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [activeFlow, setActiveFlow] = useState<FlowState | null>(null);
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const persistedConversation = chatService.getConversation();
    return persistedConversation.messages;
  });

  // 🔧 OPTIMIZACIÓN: Función lazy para cargar contexto solo cuando se necesita
  const loadContextOnDemand = useCallback(async () => {
    if (lazyContext.isLoaded || contextLoadingRef.current || !companyId) {
      return lazyContext;
    }
    
    contextLoadingRef.current = true;
    setLazyContext(prev => ({ ...prev, isLoading: true }));
    
    console.log('🚀 MAYA: Loading context on demand (lazy)...');
    
    try {
      // Cargar solo datos de empleados (lo más necesario para MAYA)
      const { data: employeesResult } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId);
      
      const newContext = {
        metrics: null,
        recentEmployees: null,
        recentActivity: null,
        payrollTrends: null,
        efficiencyMetrics: null,
        employees: employeesResult || [],
        isLoaded: true,
        isLoading: false
      };
      
      setLazyContext(newContext);
      console.log('✅ MAYA: Context loaded lazily', { 
        employeeCount: employeesResult?.length 
      });
      
      return newContext;
    } catch (error) {
      console.error('❌ MAYA: Error loading context', error);
      setLazyContext(prev => ({ ...prev, isLoading: false }));
      return lazyContext;
    } finally {
      contextLoadingRef.current = false;
    }
  }, [companyId, lazyContext]);

  // Regenerate flow messages on mount if they have outdated quickReplies
  useEffect(() => {
    const regenerateFlowMessage = async () => {
      if (!activeFlow || chatHistory.length === 0) return;

      const lastMessage = chatHistory[chatHistory.length - 1];
      
      if (lastMessage.isFlowMessage && lastMessage.role === 'assistant') {
        try {
          const currentStepData = flowManager.getCurrentStep(activeFlow);
          const oldQuickReplies = JSON.stringify(lastMessage.quickReplies || []);
          const newQuickReplies = JSON.stringify(currentStepData.quickReplies || []);
          
          if (oldQuickReplies !== newQuickReplies) {
            const updatedMessage: ChatMessage = {
              ...lastMessage,
              quickReplies: currentStepData.quickReplies,
              executableActions: currentStepData.executableActions,
              timestamp: lastMessage.timestamp
            };
            
            const updatedHistory = [...chatHistory];
            updatedHistory[updatedHistory.length - 1] = updatedMessage;
            
            chatService.updateMessage(updatedMessage.id, updatedMessage);
            setChatHistory(updatedHistory);
          }
        } catch (error) {
          console.error('❌ [MAYA] Error regenerating flow message:', error);
        }
      }
    };

    regenerateFlowMessage();
  }, []);

  useEffect(() => {
    chatService.setConversationManager(conversationManager);
  }, [chatService, conversationManager]);

  const updateContext = useCallback(async (context: MayaContextType) => {
    try {
      const message = await mayaEngine.generateContextualMessage(context);
      setCurrentMessage(message);
      
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
    if (!currentMessage) {
      setPhase('initial').catch(console.error);
    }
  }, [currentMessage, setPhase]);

  const setChatModeHandler = useCallback((enabled: boolean) => {
    setIsChatMode(enabled);
    if (enabled) {
      setChatHistory(chatService.getConversation().messages);
    }
  }, [chatService]);

  // 🔧 OPTIMIZACIÓN: Memoizar generatePageContext con datos lazy
  const generatePageContext = useCallback(async () => {
    const currentPath = location.pathname;
    
    let pageType = 'unknown';
    if (currentPath.includes('/dashboard')) pageType = 'dashboard';
    else if (currentPath.includes('/employees')) pageType = 'employees';
    else if (currentPath.includes('/payroll')) pageType = 'payroll';
    else if (currentPath.includes('/reports')) pageType = 'reports';
    
    // Cargar contexto lazy si no está cargado
    const ctx = await loadContextOnDemand();
    
    // 🔧 OPTIMIZACIÓN: Pre-calcular datos de empleados una sola vez
    const employeesData = ctx.employees || [];
    const activeEmployees = employeesData.filter((e: any) => e.estado === 'activo');
    const totalSalary = employeesData.reduce((sum: number, e: any) => sum + (e.salario_base || 0), 0);
    
    const comprehensiveContext = {
      currentPage: currentPath,
      pageType,
      companyId,
      timestamp: new Date().toISOString(),
      isLoading: ctx.isLoading,
      
      dashboardData: {
        metrics: ctx.metrics ? {
          totalEmployees: ctx.metrics.totalEmployees,
          activeEmployees: ctx.metrics.activeEmployees,
          monthlyPayroll: ctx.metrics.monthlyPayrollTotal,
          pendingPayroll: ctx.metrics.pendingPayrolls
        } : null,
        
        recentEmployees: ctx.recentEmployees?.map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          position: emp.position,
          hireDate: emp.dateAdded,
          status: emp.status,
          department: 'N/A'
        })) || [],
        
        recentActivity: ctx.recentActivity?.map((activity: any) => ({
          type: activity.type,
          action: activity.action,
          user: activity.user,
          timestamp: activity.timestamp
        })) || [],
        
        payrollTrends: ctx.payrollTrends?.map((trend: any) => ({
          month: trend.month,
          total: trend.totalNeto,
          employeeCount: trend.employeesCount,
          avgPerEmployee: trend.employeesCount > 0 ? trend.totalNeto / trend.employeesCount : 0
        })) || [],
        
        efficiencyMetrics: ctx.efficiencyMetrics?.map((metric: any) => ({
          metric: metric.metric,
          value: metric.value,
          change: metric.change,
          unit: metric.unit
        })) || []
      },
      
      employeeData: {
        totalCount: employeesData.length,
        activeCount: activeEmployees.length,
        inactiveCount: employeesData.length - activeEmployees.length,
        allEmployees: employeesData.slice(0, 50).map((emp: any) => ({
          id: emp.id,
          name: `${emp.nombre} ${emp.apellido}`,
          position: emp.cargo,
          department: emp.departamento || 'N/A',
          salary: emp.salario_base,
          status: emp.estado
        })),
        totalSalaryBase: totalSalary,
        avgSalary: employeesData.length ? totalSalary / employeesData.length : 0
      }
    };
    
    return comprehensiveContext;
  }, [location.pathname, companyId, loadContextOnDemand]);

  const loadConversations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) return;

      setIsLoadingConversations(true);
      const convs = await conversationManager.getConversations(user.id, companyId);
      setConversations(convs);
    } catch (error) {
      console.error('❌ MAYA Provider: Error loading conversations', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [conversationManager, companyId]);

  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const messages = await conversationManager.loadConversationMessages(conversationId);
      setChatHistory(messages);
      setCurrentConversationId(conversationId);
      chatService.setCurrentConversation(conversationId);
      conversationManager.setCurrentConversationId(conversationId);
    } catch (error) {
      console.error('❌ MAYA Provider: Error loading conversation', error);
    }
  }, [conversationManager, chatService]);

  const createNewConversation = useCallback(async (): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) throw new Error('No user or company');

      const newConv = await conversationManager.createConversation(user.id, companyId);
      await loadConversations();
      await loadConversation(newConv.id);
      chatService.setCurrentConversation(newConv.id);
      
      return newConv.id;
    } catch (error) {
      console.error('❌ MAYA Provider: Error creating conversation', error);
      throw error;
    }
  }, [conversationManager, companyId, loadConversations, loadConversation, chatService]);

  const startGuidedFlow = useCallback((flowType: FlowType, isDemoMode: boolean = false) => {
    const flowState = flowManager.startFlow(flowType, isDemoMode);
    setActiveFlow(flowState);
    
    const initialStep = flowManager.getCurrentStep(flowState);
    
    const flowMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: initialStep.message,
      timestamp: new Date().toISOString(),
      quickReplies: initialStep.quickReplies,
      isFlowMessage: true,
      flowId: flowType,
      stepId: initialStep.id
    };
    
    chatService.addMessage(flowMessage);
    setChatHistory([...chatService.getConversation().messages]);
  }, [flowManager, chatService]);

  const completeFlowAndNavigate = useCallback((url: string) => {
    if (activeFlow) {
      flowManager.completeFlow(activeFlow);
      setActiveFlow(null);
    }
    
    if (currentConversationId) {
      conversationManager.updateConversationTitle(
        currentConversationId, 
        '✅ Flujo completado'
      ).catch(err => console.error('❌ Failed to update conversation title', err));
    }
    
    setTimeout(() => {
      window.location.href = url;
    }, 100);
  }, [activeFlow, currentConversationId, flowManager, conversationManager]);

  const advanceFlow = useCallback(async (userInput: string) => {
    if (!activeFlow) return;
    
    setIsProcessing(true);
    
    try {
      if (!currentConversationId) {
        try {
          await createNewConversation();
        } catch (error) {
          console.error('❌ MAYA: Failed to create conversation for flow', error);
        }
      }
      
      const result = await flowManager.advance(activeFlow, userInput);
      
      if (result.validationError) {
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'system',
          content: `❌ ${result.validationError}`,
          timestamp: new Date().toISOString()
        };
        chatService.addMessage(errorMessage);
        setChatHistory([...chatService.getConversation().messages]);
        return;
      }
      
      setActiveFlow(result.flowState);
      
      if (result.currentStep.id === 'completed' && result.flowState.accumulatedData._start_new_flow) {
        const nextFlowType = result.flowState.accumulatedData._start_new_flow;
        
        const stepMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: result.currentStep.message,
          timestamp: new Date().toISOString(),
          isFlowMessage: true,
          flowId: result.flowState.flowId,
          stepId: result.currentStep.id
        };
        
        chatService.addMessage(stepMessage);
        setChatHistory([...chatService.getConversation().messages]);
        
        flowManager.completeFlow(result.flowState);
        setActiveFlow(null);
        
        setTimeout(() => {
          startGuidedFlow(nextFlowType, false);
        }, 300);
        
        return;
      }
      
      if (result.currentStep.id === 'completed' && result.flowState.accumulatedData._navigate_url) {
        const navigateUrl = result.flowState.accumulatedData._navigate_url;
        
        const stepMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: result.currentStep.message,
          timestamp: new Date().toISOString(),
          isFlowMessage: true,
          flowId: result.flowState.flowId,
          stepId: result.currentStep.id
        };
        
        chatService.addMessage(stepMessage);
        setChatHistory([...chatService.getConversation().messages]);
        
        completeFlowAndNavigate(navigateUrl);
        return;
      }
      
      const stepMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.currentStep.message,
        timestamp: new Date().toISOString(),
        quickReplies: result.currentStep.quickReplies,
        isFlowMessage: true,
        flowId: result.flowState.flowId,
        stepId: result.currentStep.id,
        ...(result.flowState.accumulatedData._executionResult?.executableActions && {
          executableActions: result.flowState.accumulatedData._executionResult.executableActions
        })
      };
      
      chatService.addMessage(stepMessage);
      setChatHistory([...chatService.getConversation().messages]);
    
      if (result.currentStep.type === 'execution') {
        try {
          const pendingAction = result.flowState.accumulatedData._pending_action;
          
          if (result.flowState.currentStep === 'action_execution' && pendingAction?.type === 'view_details') {
            const { navigationPath, entityType, entityId, entityName } = pendingAction.parameters;
            
            let path = navigationPath;
            if (!path) {
              switch (entityType) {
                case 'period':
                  path = `/modules/liquidation?period=${entityId}`;
                  break;
                case 'employee':
                  path = `/employees/${entityId}`;
                  break;
                case 'payroll':
                  path = `/modules/liquidation?payroll=${entityId}`;
                  break;
                default:
                  path = '/';
              }
            }
            
            result.flowState.accumulatedData._action_execution_result = {
              success: true,
              message: `Navegando a ${entityName || 'detalles'}...`,
              data: {}
            };
            
            delete result.flowState.accumulatedData._pending_action;
            
            await advanceFlow('executed');
            
            setTimeout(() => {
              window.location.href = path;
            }, 300);
            
            return;
          }
          
          const executionResult = await flowManager.executeFlowAction(result.flowState);
          result.flowState.accumulatedData._executionResult = executionResult;
          
          if (result.flowState.currentStep === 'loading_employees') {
            result.flowState.accumulatedData.employee_count = executionResult.employee_count;
            setTimeout(() => advanceFlow('loaded'), 500);
            return;
          }

          if (result.flowState.currentStep === 'current_period_loading') {
            result.flowState.accumulatedData.current_period = executionResult.period;
            result.flowState.accumulatedData.selected_period_id = executionResult.period.id;
            result.flowState.accumulatedData.period_name = executionResult.period.name;
            setTimeout(() => advanceFlow('loaded'), 500);
            return;
          }

          if (result.flowState.currentStep === 'period_list_loading') {
            result.flowState.accumulatedData.available_periods = executionResult.periods;
            setTimeout(() => advanceFlow('loaded'), 500);
            return;
          }

          if (result.flowState.flowId === FlowType.ONBOARDING_DEMO_LIQUIDATION) {
            if (result.flowState.currentStep === 'calculating') {
              result.flowState.accumulatedData._calculation_result = executionResult;
              setTimeout(() => advanceFlow('calculated'), 800);
              return;
            }
            
            if (result.flowState.currentStep === 'generating_pdf') {
              result.flowState.accumulatedData.generating_pdf = true;
              const pdfResult = await flowManager.executeFlowAction(result.flowState);
              result.flowState.accumulatedData._pdf_result = pdfResult;
              setTimeout(() => advanceFlow('generated'), 1000);
              return;
            }
          }
          
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('employee-created', { 
              detail: executionResult 
            }));
          }
          
          setActiveFlow(result.flowState);
          
          const nextResult = await flowManager.advance(result.flowState, 'executed');
          setActiveFlow(nextResult.flowState);
          
          const evaluatedQuickReplies = typeof nextResult.currentStep.quickReplies === 'function'
            ? nextResult.currentStep.quickReplies(nextResult.flowState.accumulatedData)
            : nextResult.currentStep.quickReplies;

          const nextStepMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: nextResult.currentStep.message,
            timestamp: new Date().toISOString(),
            quickReplies: evaluatedQuickReplies,
            isFlowMessage: true,
            flowId: nextResult.flowState.flowId,
            stepId: nextResult.currentStep.id,
            ...(executionResult.executableActions && {
              executableActions: executionResult.executableActions.filter(
                (action: any) => action && typeof action === 'object' && action.type && action.label
              )
            })
          };
          
          chatService.addMessage(nextStepMessage);
          setChatHistory([...chatService.getConversation().messages]);
          
          if (nextResult.currentStep.id === 'completed' || nextResult.currentStep.id === 'result') {
            flowManager.completeFlow(nextResult.flowState);
            
            if (nextResult.flowState.flowId === FlowType.ONBOARDING_DEMO_LIQUIDATION) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase
                  .from('profiles')
                  .update({ demo_payroll_completed: true })
                  .eq('user_id', user.id);
              }
            }
            
            if (nextResult.flowState.accumulatedData._navigate_url) {
              completeFlowAndNavigate(nextResult.flowState.accumulatedData._navigate_url);
              return;
            }
          }
          
          if (result.flowState.flowId === FlowType.EMPLOYEE_CREATE) {
            toast.success('Empleado creado', {
              description: `${executionResult.employeeName} ha sido agregado exitosamente`
            });
          }
          
        } catch (error: any) {
          console.error('Flow execution error:', error);
          
          const flowId = result.flowState.flowId;
          let errorTitle = 'Error';
          let errorContext = 'en el proceso';
          
          if (flowId === 'EMPLOYEE_CREATE') {
            errorTitle = 'Error al crear empleado';
            errorContext = 'al crear el empleado';
          } else if (flowId === 'PAYROLL_CALCULATE') {
            errorTitle = 'Error al calcular nómina';
            errorContext = 'al calcular la nómina';
          }
          
          if (error.message?.includes('ya existe')) {
            toast.error('Empleado duplicado', {
              description: 'Ya existe un empleado con este número de documento'
            });
          } else if (error.message?.includes('No hay un período activo')) {
            toast.error('Sin período activo', {
              description: 'Debes crear un período de nómina primero desde el módulo de nómina'
            });
          } else {
            toast.error(errorTitle, {
              description: error.message || 'Ocurrió un error inesperado'
            });
          }
          
          const errorMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ Hubo un error ${errorContext}: ${error.message}. ¿Quieres intentar nuevamente?`,
            timestamp: new Date().toISOString(),
            quickReplies: [
              { label: '🔄 Intentar de nuevo', value: 'retry' },
              { label: '❌ Cancelar', value: 'cancel' }
            ]
          };
          
          chatService.addMessage(errorMsg);
          setChatHistory([...chatService.getConversation().messages]);
        }
      }
      
      if (result.currentStep.id === 'completed' || result.currentStep.id === 'result') {
        flowManager.completeFlow(result.flowState);
        setActiveFlow(null);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [activeFlow, flowManager, chatService, completeFlowAndNavigate, createNewConversation, currentConversationId, startGuidedFlow]);

  const goBackInFlow = useCallback(() => {
    if (!activeFlow) return;
    
    const previousState = flowManager.goBack(activeFlow);
    if (!previousState) {
      toast.error('No se puede retroceder más');
      return;
    }
    
    setActiveFlow(previousState);
    const currentStep = flowManager.getCurrentStep(previousState);
    
    const backMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: currentStep.message,
      timestamp: new Date().toISOString(),
      quickReplies: currentStep.quickReplies,
      isFlowMessage: true,
      flowId: previousState.flowId,
      stepId: currentStep.id
    };
    
    chatService.addMessage(backMessage);
    setChatHistory([...chatService.getConversation().messages]);
  }, [activeFlow, flowManager, chatService]);

  const cancelFlow = useCallback(() => {
    if (!activeFlow) return;
    
    flowManager.cancelFlow(activeFlow);
    setActiveFlow(null);
    
    const cancelMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: 'Flujo cancelado',
      timestamp: new Date().toISOString()
    };
    
    chatService.addMessage(cancelMessage);
    setChatHistory([...chatService.getConversation().messages]);
    toast.success('Flujo cancelado');
  }, [activeFlow, flowManager, chatService]);

  const sendMessage = useCallback(async (message: string, conversationState?: Record<string, any>) => {
    setIsProcessing(true);
    
    try {
      if (activeFlow) {
        await advanceFlow(message);
        return;
      }
      
      if (!currentConversationId) {
        try {
          const newConvId = await createNewConversation();
          
          const instantTitle = message.length > 40 
            ? message.substring(0, 40) + '...' 
            : message;
          
          await conversationManager.updateConversationTitle(newConvId, instantTitle);
          await loadConversations();
          
          toast.success('Nueva conversación iniciada');
        } catch (error) {
          console.error('❌ MAYA: Error creando conversación, continuando sin BD', error);
        }
      }
      
      // 🔧 OPTIMIZACIÓN: Cargar contexto lazy solo cuando se envía mensaje
      const richContext = await generatePageContext();
      
      const enrichedContext = conversationState ? {
        ...richContext,
        conversationParams: conversationState
      } : richContext;
      
      const response = await chatService.sendMessage(message, enrichedContext);
      
      setChatHistory([...chatService.getConversation().messages]);
      
      const contextualMessage: MayaMessage = {
        id: response.id,
        message: response.content,
        emotionalState: 'neutral',
        contextualActions: [],
        executableActions: Array.isArray(response.executableActions) ? response.executableActions : [],
        quickReplies: response.quickReplies,
        fieldName: response.fieldName,
        conversationState: response.conversationState,
        timestamp: response.timestamp,
        isVisible: true
      };
      
      setCurrentMessage(contextualMessage);
      
    } catch (error) {
      console.error('Error sending message to MAYA:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [chatService, generatePageContext, currentConversationId, conversationManager, loadConversations, createNewConversation, activeFlow, advanceFlow]);

  const addActionMessage = useCallback((message: string, executableActions: any[]) => {
    const actionMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: message,
      timestamp: new Date().toISOString(),
      executableActions: executableActions || []
    };
    
    chatService.addSystemMessage(message);
    const conversation = chatService.getConversation();
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage) {
      lastMessage.executableActions = executableActions || [];
    }
    
    setChatHistory([...chatService.getConversation().messages]);
    
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

      await setPhase('data_validation', {
        hasErrors: validationResults.hasIssues,
        validationResults,
        employeeCount: employees?.length
      });

      return validationResults;
    } catch (error) {
      console.error('Error en validación inteligente de MAYA:', error);
      
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

  const clearConversation = useCallback(async (skipMessage: boolean = false) => {
    try {
      chatService.clearConversation();
      setChatHistory([]);
      setIsChatMode(false);
      setCurrentConversationId(null);
      conversationManager.clearCurrentConversationId();
      
      if (!skipMessage) {
        await setPhase('initial');
      }
    } catch (error) {
      console.error('❌ MAYA: Error clearing conversation', error);
    }
  }, [setPhase, chatService, conversationManager]);

  const deleteCurrentConversation = useCallback(async () => {
    if (!currentConversationId) {
      chatService.clearConversation();
      setChatHistory([]);
      setIsChatMode(false);
      
      if (activeFlow) {
        flowManager.cancelFlow(activeFlow);
        setActiveFlow(null);
      }
      
      toast.success('Conversación limpiada');
      return;
    }

    try {
      await conversationManager.deleteConversation(currentConversationId);
      
      chatService.clearConversation();
      setChatHistory([]);
      setIsChatMode(false);
      setCurrentConversationId(null);
      conversationManager.clearCurrentConversationId();
      
      if (activeFlow) {
        flowManager.cancelFlow(activeFlow);
        setActiveFlow(null);
      }
      
      toast.success('Conversación eliminada', {
        description: 'La conversación ha sido eliminada permanentemente'
      });
    } catch (error) {
      console.error('❌ MAYA: Error deleting conversation', error);
      toast.error('Error al eliminar', {
        description: 'No se pudo eliminar la conversación'
      });
    }
  }, [currentConversationId, conversationManager, chatService, activeFlow, flowManager]);

  // Initialization effect
  useEffect(() => {
    const initializeConversations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) return;

      try {
        await loadConversations();

        const migratedId = await conversationManager.migrateFromLocalStorage(user.id, companyId);
        if (migratedId) {
          await loadConversation(migratedId);
          setIsChatMode(true);
          return;
        }

        const lastConvId = conversationManager.getCurrentConversationId();
        if (lastConvId) {
          const messages = await conversationManager.loadConversationMessages(lastConvId);
          if (messages.length > 0) {
            await loadConversation(lastConvId);
            setIsChatMode(true);
            
            const lastMessage = messages[messages.length - 1];
            const isFlowCompleted = 
              lastMessage?.content?.includes('✅ Proceso completado') ||
              lastMessage?.content?.includes('¡Nómina calculada exitosamente!') ||
              lastMessage?.content?.includes('✅ ¡Nómina calculada exitosamente!') ||
              lastMessage?.stepId === 'completed' ||
              lastMessage?.stepId === 'result';
            
            if (isFlowCompleted) {
              setActiveFlow(null);
            } else if (lastMessage?.isFlowMessage && lastMessage?.flowId && lastMessage?.stepId) {
              setActiveFlow({
                flowId: lastMessage.flowId as FlowType,
                currentStep: lastMessage.stepId,
                accumulatedData: {},
                history: [],
                startedAt: new Date().toISOString(),
                lastUpdatedAt: new Date().toISOString()
              });
            }
            return;
          }
        }

        const existingConvs = await conversationManager.getConversations(user.id, companyId);
        if (existingConvs.length === 0) {
          console.log('📝 MAYA Provider: No conversations yet, waiting for first message');
        }

      } catch (error) {
        console.error('❌ MAYA Provider: Initialization error', error);
      }
    };

    initializeConversations();
  }, [companyId, conversationManager, loadConversations, loadConversation]);

  // Demo flow auto-trigger
  useEffect(() => {
    const checkAndTriggerDemo = async () => {
      if (!location.pathname.includes('/maya')) return;
      if (!companyId || activeFlow) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('first_maya_visit, demo_payroll_completed')
          .eq('user_id', user.id)
          .single();

        if (!profile?.first_maya_visit || profile?.demo_payroll_completed) {
          return;
        }

        const { count: employeeCount } = await supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId);

        if (employeeCount && employeeCount > 0) {
          await supabase
            .from('profiles')
            .update({ first_maya_visit: false })
            .eq('user_id', user.id);
          return;
        }

        setTimeout(() => {
          if (!activeFlow && !chatHistory.some(m => m.isFlowMessage)) {
            startGuidedFlow(FlowType.ONBOARDING_DEMO_LIQUIDATION);
            
            supabase
              .from('profiles')
              .update({ first_maya_visit: false })
              .eq('user_id', user.id)
              .then(() => console.log('✅ [DEMO] First visit marked'));
          }
        }, 2000);

      } catch (error) {
        console.error('❌ [DEMO] Error checking onboarding status:', error);
      }
    };

    checkAndTriggerDemo();
  }, [companyId, location.pathname, activeFlow, chatHistory, startGuidedFlow]);

  // Legacy localStorage sync
  useEffect(() => {
    const existingConversation = chatService.getConversation();
    const currentCompanyId = companyId;
    
    if (existingConversation.messages.length > 0) {
      const isValid = chatService.validateContextIntegrity(currentCompanyId);
      
      if (!isValid) {
        chatService.clearConversation();
        setChatHistory([]);
        setIsChatMode(false);
        
        import('@/hooks/use-toast').then(({ toast }) => {
          toast({
            title: 'Contexto actualizado',
            description: 'El historial de conversación se ha limpiado para tu empresa actual.',
            duration: 5000
          });
        });
        return;
      }
      
      setChatHistory([...existingConversation.messages]);
      setIsChatMode(true);
      
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
      const initializeMaya = async () => {
        await setPhase('initial');
      };
      initializeMaya();
    }
  }, [companyId, chatService, autoShow, setPhase]);

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
    isProcessing,
    chatHistory,
    conversations,
    currentConversationId,
    isLoadingConversations,
    activeFlow,
    updateContext,
    hideMessage,
    showMessage,
    setChatMode: setChatModeHandler,
    sendMessage,
    addActionMessage,
    setPhase,
    performIntelligentValidation,
    setErrorContext,
    clearConversation,
    deleteCurrentConversation,
    loadConversations,
    loadConversation,
    createNewConversation,
    startGuidedFlow,
    advanceFlow,
    goBackInFlow,
    cancelFlow,
    completeFlowAndNavigate
  };

  return (
    <MayaContext.Provider value={value}>
      {children}
    </MayaContext.Provider>
  );
};
