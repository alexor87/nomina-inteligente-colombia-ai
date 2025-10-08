import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MayaEngine } from './MayaEngine';
import { MayaChatService, type ChatMessage } from './services/MayaChatService';
import { MayaConversationManager, type ConversationSummary } from './services/MayaConversationManager';
import type { MayaMessage, MayaContext as MayaContextType, PayrollPhase } from './types';
import { useDashboard } from '@/hooks/useDashboard';
import { useEmployeeData } from '@/hooks/useEmployeeData';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GuidedFlowManager } from './services/GuidedFlowManager';
import { FlowState, FlowType } from './types/GuidedFlow';

interface MayaProviderValue {
  currentMessage: MayaMessage | null;
  isVisible: boolean;
  isChatMode: boolean;
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
  const [isChatMode, setIsChatMode] = useState(() => {
    const persistedConversation = MayaChatService.getInstance().getConversation();
    return persistedConversation.messages.length > 0;
  });
  const [mayaEngine] = useState(() => MayaEngine.getInstance());
  const [chatService] = useState(() => MayaChatService.getInstance());
  const [conversationManager] = useState(() => MayaConversationManager.getInstance());
  const [flowManager] = useState(() => GuidedFlowManager.getInstance());
  
  // NUEVO: Estado de conversaciones
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  
  // NUEVO: Estado de flujos guiados
  const [activeFlow, setActiveFlow] = useState<FlowState | null>(null);
  
  // Initialize chatHistory from persisted conversation
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const persistedConversation = chatService.getConversation();
    console.log('🤖 MAYA Provider: Initializing with persisted history', { messageCount: persistedConversation.messages.length });
    return persistedConversation.messages;
  });

  // 🆕 Regenerate flow messages on mount if they have outdated quickReplies
  useEffect(() => {
    const regenerateFlowMessage = async () => {
      if (!activeFlow || chatHistory.length === 0) return;

      const lastMessage = chatHistory[chatHistory.length - 1];
      
      // Check if last message is a flow message from assistant
      if (lastMessage.isFlowMessage && lastMessage.role === 'assistant') {
        console.log('🔄 [MAYA] Checking if flow message needs regeneration');
        
        try {
          // Get current step data with latest code
          const currentStepData = flowManager.getCurrentStep(activeFlow);
          
          // Compare quickReplies
          const oldQuickReplies = JSON.stringify(lastMessage.quickReplies || []);
          const newQuickReplies = JSON.stringify(currentStepData.quickReplies || []);
          
          if (oldQuickReplies !== newQuickReplies) {
            console.log('✨ [MAYA] Quick replies changed, updating message', {
              old: lastMessage.quickReplies,
              new: currentStepData.quickReplies
            });
            
            // Create updated message
            const updatedMessage: ChatMessage = {
              ...lastMessage,
              quickReplies: currentStepData.quickReplies,
              executableActions: currentStepData.executableActions,
              timestamp: lastMessage.timestamp // Keep original timestamp
            };
            
            // Update in memory
            const updatedHistory = [...chatHistory];
            updatedHistory[updatedHistory.length - 1] = updatedMessage;
            
            // Save to storage and state
            chatService.updateMessage(updatedMessage.id, updatedMessage);
            setChatHistory(updatedHistory);
            
            console.log('✅ [MAYA] Message regenerated successfully');
          } else {
            console.log('✓ [MAYA] Quick replies unchanged, no regeneration needed');
          }
        } catch (error) {
          console.error('❌ [MAYA] Error regenerating flow message:', error);
        }
      }
    };

    regenerateFlowMessage();
  }, []); // Only on mount

  // Inject conversation manager into chat service
  useEffect(() => {
    chatService.setConversationManager(conversationManager);
  }, [chatService, conversationManager]);

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
    if (!currentMessage) {
      setPhase('initial').catch(console.error);
    }
  }, [currentMessage, setPhase]);

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

  // NUEVO: Cargar todas las conversaciones
  const loadConversations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) return;

      setIsLoadingConversations(true);
      const convs = await conversationManager.getConversations(user.id, companyId);
      setConversations(convs);
      console.log('📚 MAYA Provider: Loaded conversations', { count: convs.length });
    } catch (error) {
      console.error('❌ MAYA Provider: Error loading conversations', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [conversationManager, companyId]);

  // NUEVO: Cargar una conversación específica
  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const messages = await conversationManager.loadConversationMessages(conversationId);
      setChatHistory(messages);
      setCurrentConversationId(conversationId);
      chatService.setCurrentConversation(conversationId);
      conversationManager.setCurrentConversationId(conversationId);
      console.log('💬 MAYA Provider: Loaded conversation', { conversationId, messageCount: messages.length });
    } catch (error) {
      console.error('❌ MAYA Provider: Error loading conversation', error);
    }
  }, [conversationManager, chatService]);

  // NUEVO: Crear nueva conversación
  const createNewConversation = useCallback(async (): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) throw new Error('No user or company');

      const newConv = await conversationManager.createConversation(user.id, companyId);
      await loadConversations(); // Refresh list
      await loadConversation(newConv.id);
      
      // 🆕 Sincronizar con chatService
      chatService.setCurrentConversation(newConv.id);
      
      console.log('✨ MAYA Provider: Created new conversation', { id: newConv.id });
      return newConv.id;
    } catch (error) {
      console.error('❌ MAYA Provider: Error creating conversation', error);
      throw error;
    }
  }, [conversationManager, companyId, loadConversations, loadConversation]);

  // Guided Flow functions
  const startGuidedFlow = useCallback((flowType: FlowType, isDemoMode: boolean = false) => {
    const flowState = flowManager.startFlow(flowType, isDemoMode);
    setActiveFlow(flowState);
    
    const initialStep = flowManager.getCurrentStep(flowState);
    
    // Add flow start message to chat
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
    
    console.log('🚀 Flow started:', flowType, { isDemoMode }, initialStep);
  }, [flowManager, chatService]);

  // 🆕 FASE 1: Cleanup y navegación externa (DECLARAR ANTES de advanceFlow)
  const completeFlowAndNavigate = useCallback((url: string) => {
    console.log('🚀 MAYA: Completing flow and navigating', { url });
    
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
    
    // 🆕 FASE 3: Crear conversación si no existe (para quick replies)
    if (!currentConversationId) {
      console.log('🆕 MAYA: Creating conversation for flow action');
      try {
        await createNewConversation();
      } catch (error) {
        console.error('❌ MAYA: Failed to create conversation for flow', error);
        // Continue anyway - flow can work without DB persistence
      }
    }
    
    const result = await flowManager.advance(activeFlow, userInput);
    
    if (result.validationError) {
      // Show validation error
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
    
    // 🆕 FASE 1: Detectar navegación externa después de completed
    if (result.currentStep.id === 'completed' && result.flowState.accumulatedData._navigate_url) {
      const navigateUrl = result.flowState.accumulatedData._navigate_url;
      console.log('🚀 MAYA: Flow completed with navigation', { url: navigateUrl });
      
      // Add final step message
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
      
      // Trigger navigation via callback
      completeFlowAndNavigate(navigateUrl);
      return;
    }
    
    // Add next step message
    const stepMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: result.currentStep.message,
      timestamp: new Date().toISOString(),
      quickReplies: result.currentStep.quickReplies,
      isFlowMessage: true,
      flowId: result.flowState.flowId,
      stepId: result.currentStep.id,
      // ✅ Incluir executableActions si existen en el resultado de ejecución
      ...(result.flowState.accumulatedData._executionResult?.executableActions && {
        executableActions: result.flowState.accumulatedData._executionResult.executableActions
      })
    };
    
    console.log('💬 Adding flow step message:', {
      stepId: result.currentStep.id,
      hasQuickReplies: !!result.currentStep.quickReplies,
      quickRepliesCount: result.currentStep.quickReplies?.length || 0,
      quickReplies: result.currentStep.quickReplies
    });
    
    chatService.addMessage(stepMessage);
    setChatHistory([...chatService.getConversation().messages]);
    
    // Handle execution step
    if (result.currentStep.type === 'execution') {
      try {
        // 🆕 FASE 2: Interceptar acciones de navegación para ejecutarlas localmente
        const pendingAction = result.flowState.accumulatedData._pending_action;
        
        if (result.flowState.currentStep === 'action_execution' && pendingAction?.type === 'view_details') {
          console.log('🧭 [MAYA] Executing view_details action locally:', pendingAction);
          
          // Ejecutar navegación localmente
          const { navigationPath, entityType, entityId, entityName } = pendingAction.parameters;
          
          let path = navigationPath;
          if (!path) {
            // Construir ruta según entityType
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
                console.error('❌ Tipo de entidad no soportado:', entityType);
                path = '/';
            }
          }
          
          console.log('✅ [MAYA] Navigating to:', path);
          
          // Guardar resultado para el siguiente step
          result.flowState.accumulatedData._action_execution_result = {
            success: true,
            message: `Navegando a ${entityName || 'detalles'}...`,
            data: {}
          };
          
          // Limpiar pending action
          delete result.flowState.accumulatedData._pending_action;
          
          // Auto-advance y navegar
          await advanceFlow('executed');
          
          // Navegar después de un pequeño delay
          setTimeout(() => {
            window.location.href = path;
          }, 300);
          
          return;
        }
        
        // Para otras acciones, ejecutar normalmente vía flowManager
        const executionResult = await flowManager.executeFlowAction(result.flowState);
        
        // Store execution result in flow state
        result.flowState.accumulatedData._executionResult = executionResult;
        
        // For loading_employees step, store employee count and auto-advance
        if (result.flowState.currentStep === 'loading_employees') {
          result.flowState.accumulatedData.employee_count = executionResult.employee_count;
          // Auto-advance to novelties_check
          setTimeout(() => advanceFlow('loaded'), 500);
          return;
        }

        // For current_period_loading step, store period and auto-advance
        if (result.flowState.currentStep === 'current_period_loading') {
          result.flowState.accumulatedData.current_period = executionResult.period;
          result.flowState.accumulatedData.selected_period_id = executionResult.period.id;
          result.flowState.accumulatedData.period_name = executionResult.period.name;
          // Auto-advance to employee_selection
          setTimeout(() => advanceFlow('loaded'), 500);
          return;
        }

        // For period_list_loading step, store periods and auto-advance
        if (result.flowState.currentStep === 'period_list_loading') {
          result.flowState.accumulatedData.available_periods = executionResult.periods;
          // Auto-advance to period_list_selection
          setTimeout(() => advanceFlow('loaded'), 500);
          return;
        }

        // 🆕 DEMO FLOW: Auto-ejecutar cálculo y generación de PDF
        if (result.flowState.flowId === FlowType.ONBOARDING_DEMO_LIQUIDATION) {
          if (result.flowState.currentStep === 'calculating') {
            // Ejecutar cálculo demo
            result.flowState.accumulatedData._calculation_result = executionResult;
            setTimeout(() => advanceFlow('calculated'), 800);
            return;
          }
          
          if (result.flowState.currentStep === 'generating_pdf') {
            // Marcar que se debe generar PDF
            result.flowState.accumulatedData.generating_pdf = true;
            // Ejecutar generación de PDF
            const pdfResult = await flowManager.executeFlowAction(result.flowState);
            result.flowState.accumulatedData._pdf_result = pdfResult;
            setTimeout(() => advanceFlow('generated'), 1000);
            return;
          }
        }
        
        // Trigger employee refresh for employee creation
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('employee-created', { 
            detail: executionResult 
          }));
        }
        
        // 🔧 FIX: Avanzar manualmente con el flowState actualizado (evita recursión con estado stale)
        setActiveFlow(result.flowState); // Persistir el estado con _executionResult
        
        const nextResult = await flowManager.advance(result.flowState, 'executed');
        setActiveFlow(nextResult.flowState);
        
        // Construir mensaje del siguiente step (result)
        // Evaluar quickReplies si son una función
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
        
        // Completar flujo si llegó al final
        if (nextResult.currentStep.id === 'completed' || nextResult.currentStep.id === 'result') {
          flowManager.completeFlow(nextResult.flowState);
          
          // 🆕 DEMO FLOW: Marcar demo como completado
          if (nextResult.flowState.flowId === FlowType.ONBOARDING_DEMO_LIQUIDATION) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('profiles')
                .update({ demo_payroll_completed: true })
                .eq('user_id', user.id);
              console.log('✅ [DEMO] Demo marked as completed');
            }
          }
          
          if (nextResult.flowState.accumulatedData._navigate_url) {
            completeFlowAndNavigate(nextResult.flowState.accumulatedData._navigate_url);
            return;
          }
        }
        
        // ✅ CORRECCIÓN 1: Toast solo para flujo de empleados
        if (result.flowState.flowId === FlowType.EMPLOYEE_CREATE) {
          toast.success('Empleado creado', {
            description: `${executionResult.employeeName} ha sido agregado exitosamente`
          });
        }
        
      } catch (error: any) {
        console.error('Flow execution error:', error);
        
        // Determine flow context for error messages
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
        
        // Handle specific error types
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
        
        // Send contextual error message to chat
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
    
    // Handle completion
    if (result.currentStep.id === 'completed' || result.currentStep.id === 'result') {
      flowManager.completeFlow(result.flowState);
      setActiveFlow(null);
    }
  }, [activeFlow, flowManager, chatService, completeFlowAndNavigate, createNewConversation, currentConversationId]);

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
    console.log('📨 MAYA: Sending message with state', { message, conversationState });
    
    // If we're in a flow, advance it instead of sending regular message
    if (activeFlow) {
      await advanceFlow(message);
      return;
    }
    
    // 🆕 Auto-crear conversación si es el primer mensaje
    if (!currentConversationId) {
      console.log('🎬 MAYA: Primera interacción, creando conversación automáticamente...');
      try {
        const newConvId = await createNewConversation();
        
        // ✨ Título instantáneo: usar las primeras palabras del mensaje
        const instantTitle = message.length > 40 
          ? message.substring(0, 40) + '...' 
          : message;
        
        await conversationManager.updateConversationTitle(newConvId, instantTitle);
        await loadConversations(); // ⚡ Actualizar sidebar INMEDIATAMENTE
        
        toast.success('Nueva conversación iniciada');
        console.log('✅ MAYA: Conversación creada con título instantáneo', { title: instantTitle });
      } catch (error) {
        console.error('❌ MAYA: Error creando conversación, continuando sin BD', error);
        // Continuar sin BD (fallback a localStorage)
      }
    }
    
    try {
      // Generate rich contextual data
      const richContext = generatePageContext();
      
      // Enrich context with conversation state if provided
      const enrichedContext = conversationState ? {
        ...richContext,
        conversationParams: conversationState
      } : richContext;
      
      const response = await chatService.sendMessage(message, enrichedContext);
      
      // Update chat history
      setChatHistory([...chatService.getConversation().messages]);
      
      // Also create a contextual message for non-chat mode
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

  const clearConversation = useCallback(async (skipMessage: boolean = false) => {
    try {
      console.log('🧹 MAYA: Clearing conversation (no auto-create)...');
      
      // Limpiar el estado interno del chatService
      chatService.clearConversation();
      
      // Limpiar React state (SIN auto-crear conversación)
      setChatHistory([]);
      setIsChatMode(false);
      setCurrentConversationId(null);
      conversationManager.clearCurrentConversationId();
      
      // Evitar generar mensaje inicial durante procesos de eliminación
      if (!skipMessage) {
        await setPhase('initial');
      }
      
      console.log('✅ MAYA: Conversation cleared');
    } catch (error) {
      console.error('❌ MAYA: Error clearing conversation', error);
    }
  }, [setPhase, chatService, conversationManager]);

  const deleteCurrentConversation = useCallback(async () => {
    // Si no hay conversación en BD, solo limpiar estado local
    if (!currentConversationId) {
      console.log('🧹 MAYA: No DB conversation, clearing local state only');
      chatService.clearConversation();
      setChatHistory([]);
      setIsChatMode(false);
      
      if (activeFlow) {
        flowManager.cancelFlow(activeFlow);
        setActiveFlow(null);
      }
      
      // Avoid triggering initial message during local clear
      toast.success('Conversación limpiada');
      return;
    }

    try {
      console.log('🗑️ MAYA: Deleting current conversation', { id: currentConversationId });
      
      // 1. Eliminar de la base de datos
      await conversationManager.deleteConversation(currentConversationId);
      
      // 2. Limpiar estado local
      chatService.clearConversation();
      setChatHistory([]);
      setIsChatMode(false);
      setCurrentConversationId(null);
      conversationManager.clearCurrentConversationId();
      
      // 3. Cancelar flujo activo si existe
      if (activeFlow) {
        flowManager.cancelFlow(activeFlow);
        setActiveFlow(null);
      }
      
      // 4. Mostrar confirmación (la recarga de lista se hace en el sidebar)
      // NO resetear a fase inicial aquí - el sidebar lo maneja y evita bloqueos
      toast.success('Conversación eliminada', {
        description: 'La conversación ha sido eliminada permanentemente'
      });
      
      console.log('✅ MAYA: Conversation deleted successfully');
    } catch (error) {
      console.error('❌ MAYA: Error deleting conversation', error);
      toast.error('Error al eliminar', {
        description: 'No se pudo eliminar la conversación'
      });
    }
  }, [currentConversationId, conversationManager, chatService, activeFlow, flowManager, setPhase, loadConversations]);

  // 🆕 FASE 2: Inicialización con prevención de re-inicio de flujos completados
  useEffect(() => {
    const initializeConversations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) return;

      try {
        // 1. Cargar lista de conversaciones
        await loadConversations();

        // 2. Intentar migrar conversación de localStorage si existe
        const migratedId = await conversationManager.migrateFromLocalStorage(user.id, companyId);
        if (migratedId) {
          console.log('✅ MAYA Provider: Migrated localStorage conversation', { id: migratedId });
          await loadConversation(migratedId);
          setIsChatMode(true);
          return;
        }

        // 3. Restaurar última conversación activa
        const lastConvId = conversationManager.getCurrentConversationId();
        if (lastConvId) {
          const messages = await conversationManager.loadConversationMessages(lastConvId);
          if (messages.length > 0) {
            await loadConversation(lastConvId);
            setIsChatMode(true);
            
            // 🆕 FASE 2: Detectar si el último mensaje indica flujo completado
            const lastMessage = messages[messages.length - 1];
            const isFlowCompleted = 
              lastMessage?.content?.includes('✅ Proceso completado') ||
              lastMessage?.content?.includes('¡Nómina calculada exitosamente!') ||
              lastMessage?.content?.includes('✅ ¡Nómina calculada exitosamente!') ||
              lastMessage?.stepId === 'completed' ||
              lastMessage?.stepId === 'result';
            
            if (isFlowCompleted) {
              console.log('🚫 MAYA: Flow already completed, not restoring activeFlow');
              setActiveFlow(null);
            } else if (lastMessage?.isFlowMessage && lastMessage?.flowId && lastMessage?.stepId) {
              // Solo restaurar si está en progreso
              console.log('🔄 MAYA: Restoring active flow', {
                flowId: lastMessage.flowId,
                stepId: lastMessage.stepId
              });
              // Restaurar flow state básico (sin history completo)
              setActiveFlow({
                flowId: lastMessage.flowId as FlowType,
                currentStep: lastMessage.stepId,
                accumulatedData: {},
                history: [],
                startedAt: new Date().toISOString(),
                lastUpdatedAt: new Date().toISOString()
              });
            }
            
            console.log('🔄 MAYA Provider: Restored last conversation', { id: lastConvId });
            return;
          }
        }

        // 4. Si no hay conversaciones, esperar a que el usuario escriba
        const existingConvs = await conversationManager.getConversations(user.id, companyId);
        if (existingConvs.length === 0) {
          console.log('📝 MAYA Provider: No conversations yet, waiting for first message');
          // No crear conversación - se creará automáticamente cuando el usuario envíe el primer mensaje
        }

      } catch (error) {
        console.error('❌ MAYA Provider: Initialization error', error);
      }
    };

    initializeConversations();
  }, [companyId, conversationManager, loadConversations, loadConversation]);

  // 🆕 AUTO-TRIGGER: Demo flow para usuarios nuevos sin empleados
  useEffect(() => {
    const checkAndTriggerDemo = async () => {
      // Solo ejecutar en la página de MAYA
      if (!location.pathname.includes('/maya')) return;
      
      // Solo si hay companyId y NO hay flujo activo
      if (!companyId || activeFlow) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Obtener perfil del usuario
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_maya_visit, demo_payroll_completed')
          .eq('user_id', user.id)
          .single();

        console.log('🔍 [DEMO] Checking onboarding status:', profile);

        // Solo continuar si es primera visita Y demo no completado
        if (!profile?.first_maya_visit || profile?.demo_payroll_completed) {
          return;
        }

        // Verificar que no tenga empleados
        const { count: employeeCount } = await supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId);

        console.log('👥 [DEMO] Employee count:', employeeCount);

        // Si tiene empleados, no mostrar demo
        if (employeeCount && employeeCount > 0) {
          // Marcar como visitado pero no completado
          await supabase
            .from('profiles')
            .update({ first_maya_visit: false })
            .eq('user_id', user.id);
          return;
        }

        // ✨ TRIGGER: Iniciar demo flow automáticamente después de 2 segundos
        console.log('🎯 [DEMO] Triggering onboarding demo flow...');
        
        setTimeout(() => {
          // Verificar que no haya iniciado otro flujo mientras tanto
          if (!activeFlow && !chatHistory.some(m => m.isFlowMessage)) {
            startGuidedFlow(FlowType.ONBOARDING_DEMO_LIQUIDATION);
            
            // Marcar primera visita como completada (pero demo aún no)
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

  // Legacy: Sync with old localStorage conversation for backward compatibility
  useEffect(() => {
    const existingConversation = chatService.getConversation();
    const currentCompanyId = companyId;
    
    if (existingConversation.messages.length > 0) {
      console.log('🤖 MAYA Provider: Syncing with persisted conversation', { 
        messageCount: existingConversation.messages.length,
        storedCompanyId: existingConversation.companyId,
        currentCompanyId
      });
      
      // Validate context integrity
      const isValid = chatService.validateContextIntegrity(currentCompanyId);
      
      if (!isValid) {
        console.warn('⚠️ MAYA Provider: Company mismatch detected, clearing conversation');
        chatService.clearConversation();
        setChatHistory([]);
        setIsChatMode(false);
        
        // Show notification to user
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
      setIsChatMode(true); // Auto-activate chat mode when history exists
      
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
  }, [companyId, chatService, autoShow, setPhase]); // Re-run when company changes

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
    conversations,
    currentConversationId,
    isLoadingConversations,
    activeFlow,
    updateContext,
    hideMessage,
    showMessage,
    setChatMode,
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