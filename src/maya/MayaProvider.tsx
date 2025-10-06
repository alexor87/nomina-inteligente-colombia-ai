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
import type { FlowState, FlowType } from './types/GuidedFlow';

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
  clearConversation: () => void;
  loadConversations: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  createNewConversation: () => Promise<string>;
  startGuidedFlow: (flowType: FlowType) => void;
  advanceFlow: (userInput: string) => Promise<void>;
  goBackInFlow: () => void;
  cancelFlow: () => void;
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
  const startGuidedFlow = useCallback((flowType: FlowType) => {
    const flowState = flowManager.startFlow(flowType);
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
    
    console.log('🚀 Flow started:', flowType, initialStep);
  }, [flowManager, chatService]);

  const advanceFlow = useCallback(async (userInput: string) => {
    if (!activeFlow) return;
    
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
    
    // Add next step message
    const stepMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: result.currentStep.message,
      timestamp: new Date().toISOString(),
      quickReplies: result.currentStep.quickReplies,
      isFlowMessage: true,
      flowId: result.flowState.flowId,
      stepId: result.currentStep.id
    };
    
    chatService.addMessage(stepMessage);
    setChatHistory([...chatService.getConversation().messages]);
    
    // Handle execution step
    if (result.currentStep.type === 'execution') {
      try {
        const executionResult = await flowManager.executeFlowAction(result.flowState);
        
        // Store execution result in flow state
        result.flowState.accumulatedData._executionResult = executionResult;
        
        // Trigger employee refresh
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('employee-created', { 
            detail: executionResult 
          }));
        }
        
        // Auto-advance to result
        await advanceFlow('executed');
        
        toast.success('Empleado creado', {
          description: `${executionResult.employeeName} ha sido agregado exitosamente`
        });
        
      } catch (error: any) {
        console.error('Flow execution error:', error);
        
        // Handle specific errors
        if (error.message?.includes('ya existe')) {
          toast.error('Empleado duplicado', {
            description: 'Ya existe un empleado con este número de documento'
          });
        } else {
          toast.error('Error al crear empleado', {
            description: error.message || 'Ocurrió un error inesperado'
          });
        }
        
        // Send error message to chat
        const errorMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ Hubo un error al crear el empleado: ${error.message}. ¿Quieres intentar nuevamente?`,
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
  }, [activeFlow, flowManager, chatService]);

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

  const clearConversation = useCallback(async () => {
    try {
      // ✅ PASO 1: Limpiar el estado interno del chatService PRIMERO
      chatService.clearConversation();
      
      // PASO 2: Crear nueva conversación
      const newConvId = await createNewConversation();
      
      // PASO 3: Limpiar React state
      setChatHistory([]);
      setIsChatMode(false);
      await setPhase('initial');
      
      toast.success('Nueva conversación', {
        description: 'Tu conversación anterior ha sido guardada',
      });
    } catch (error) {
      console.error('❌ MAYA: Error creating new conversation', error);
      
      // Fallback: limpiar sin crear en BD
      chatService.clearConversation();
      setChatHistory([]);
      setIsChatMode(false);
      setCurrentConversationId(null);
      await setPhase('initial');
      
      toast.warning('Nueva conversación (modo local)', {
        description: 'La conversación no se guardará en el historial permanente',
      });
    }
  }, [createNewConversation, setPhase, chatService, setCurrentConversationId]);

  // NUEVO: Inicialización completa con migración y carga de conversaciones
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
            console.log('🔄 MAYA Provider: Restored last conversation', { id: lastConvId });
            return;
          }
        }

        // 4. Si no hay conversaciones, crear una nueva automáticamente
        const existingConvs = await conversationManager.getConversations(user.id, companyId);
        if (existingConvs.length === 0) {
          const newConvId = await createNewConversation();
          console.log('✨ MAYA Provider: Created initial conversation', { id: newConvId });
        }

      } catch (error) {
        console.error('❌ MAYA Provider: Initialization error', error);
      }
    };

    initializeConversations();
  }, [companyId, conversationManager, loadConversations, loadConversation, createNewConversation]);

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
    loadConversations,
    loadConversation,
    createNewConversation,
    startGuidedFlow,
    advanceFlow,
    goBackInFlow,
    cancelFlow
  };

  return (
    <MayaContext.Provider value={value}>
      {children}
    </MayaContext.Provider>
  );
};