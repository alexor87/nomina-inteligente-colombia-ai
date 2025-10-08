import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  executableActions?: any[];
  quickReplies?: Array<{
    value: string;
    label: string;
    icon?: string;
  }>;
  fieldName?: string;
  conversationState?: Record<string, any>;
  isFlowMessage?: boolean;
  flowId?: string;
  stepId?: string;
}

export interface ChatConversation {
  messages: ChatMessage[];
  sessionId: string;
  companyId?: string;
  lastUpdated?: string;
}

export interface RichContext {
  currentPage: string;
  pageType: string;
  companyId?: string;
  timestamp: string;
  isLoading: boolean;
  dashboardData?: any;
  employeeData?: any;
  payrollData?: any;
  pendingAction?: {
    type: string;
    id: string;
    parameters: Record<string, any>;
    timestamp: string;
  };
}

export class MayaChatService {
  private static instance: MayaChatService;
  private static readonly STORAGE_KEY = 'maya_conversation_history';
  private currentConversation: ChatConversation;
  private conversationManager: any; // Will be injected
  private currentConversationId: string | null = null;

  private constructor() {
    // Load from localStorage on initialization
    this.currentConversation = this.loadFromStorage();
  }

  setConversationManager(manager: any): void {
    this.conversationManager = manager;
  }

  setCurrentConversation(conversationId: string): void {
    this.currentConversationId = conversationId;
    console.log('🔄 MAYA Chat: Set current conversation', { conversationId });
  }

  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  static getInstance(): MayaChatService {
    if (!MayaChatService.instance) {
      MayaChatService.instance = new MayaChatService();
    }
    return MayaChatService.instance;
  }

  private loadFromStorage(): ChatConversation {
    try {
      const stored = localStorage.getItem(MayaChatService.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('🤖 MAYA: Loaded conversation from localStorage', { 
          messageCount: parsed.messages?.length,
          companyId: parsed.companyId,
          lastUpdated: parsed.lastUpdated
        });
        return parsed;
      }
    } catch (error) {
      console.error('🤖 MAYA: Error loading from localStorage', error);
    }
    
    // Return fresh conversation if nothing in storage
    return {
      messages: [],
      sessionId: this.generateSessionId()
    };
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(MayaChatService.STORAGE_KEY, JSON.stringify(this.currentConversation));
      console.log('🤖 MAYA: Saved conversation to localStorage', { messageCount: this.currentConversation.messages.length });
    } catch (error) {
      console.error('🤖 MAYA: Error saving to localStorage', error);
    }
  }

  private generateSessionId(): string {
    return `maya_chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique idempotency key for request deduplication
   */
  private generateIdempotencyKey(): string {
    return `${this.currentConversation.sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async sendMessage(userMessage: string, context?: RichContext): Promise<ChatMessage> {
    console.log('🤖 MAYA Chat: Sending message:', userMessage);
    
    // Update company_id in conversation if context provided
    if (context?.companyId) {
      this.currentConversation.companyId = context.companyId;
      this.currentConversation.lastUpdated = new Date().toISOString();
    }
    
    // Add user message to conversation
    const userChatMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    this.currentConversation.messages.push(userChatMessage);

    // Generate idempotency key for this request
    const idempotencyKey = this.generateIdempotencyKey();

    // ✅ PROFESSIONAL: Extract action parameters with explicit state management
    let actionType: string | undefined;
    let actionParameters: Record<string, any> | undefined;
    
    if (userMessage.startsWith('action_')) {
      actionType = userMessage.replace('action_', '');
      
      // 🎯 PRIORITY 1: Use pendingAction from context (explicit state)
      if (context?.pendingAction?.parameters && 
          Object.keys(context.pendingAction.parameters).length > 0) {
        actionParameters = context.pendingAction.parameters;
        console.log('✅ [FRONTEND] Using pendingAction from context:', {
          actionType,
          periodId: actionParameters.periodId,
          startDate: actionParameters.startDate,
          endDate: actionParameters.endDate,
          companyId: actionParameters.companyId,
          source: 'richContext.pendingAction'
        });
      }
      // 🎯 PRIORITY 2: Fallback to conversation history
      else {
        const lastAssistantMessage = [...this.currentConversation.messages]
          .reverse()
          .find(m => m.role === 'assistant' && m.executableActions?.length > 0);
        
        if (lastAssistantMessage?.executableActions) {
          const matchingAction = lastAssistantMessage.executableActions.find((action: any) =>
            action.type === actionType ||
            action.type === 'liquidate_payroll_complete' ||
            action.id === `action_${actionType}`
          );
          
          if (matchingAction?.parameters) {
            actionParameters = matchingAction.parameters;
            console.log('✅ [FRONTEND] Extracted from conversation history:', {
              actionType,
              source: 'conversation_history'
            });
          }
        }
      }
      
      if (!actionParameters) {
        console.warn('⚠️ [FRONTEND] No parameters found for action:', actionType);
      }
    }

    try {
      console.log('🤖 MAYA Chat: Calling maya-intelligence function...');
      
      // ✅ PROFESSIONAL: Preserve executableActions for backend parameter extraction
      const simplifiedConversation = this.currentConversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.conversationState && { conversationState: msg.conversationState }),
        ...(msg.fieldName && { fieldName: msg.fieldName }),
        ...(msg.executableActions && msg.executableActions.length > 0 && { 
          executableActions: msg.executableActions 
        })
      }));
      
      // Extract last conversation state from most recent assistant message
      const lastAssistantMessage = [...this.currentConversation.messages]
        .reverse()
        .find(m => m.role === 'assistant');
      const lastConversationState = lastAssistantMessage?.conversationState;

      console.log('🔄 [FRONTEND] Simplified Request:', {
        messageCount: simplifiedConversation.length,
        hasIdempotencyKey: !!idempotencyKey,
        sessionId: this.currentConversation.sessionId
      });

      // Call MAYA intelligence with idempotency key and action parameters
      const { data, error } = await supabase.functions.invoke('maya-intelligence', {
        body: {
          conversation: simplifiedConversation,
          sessionId: this.currentConversation.sessionId,
          richContext: context,
          idempotencyKey,
          ...(actionType && { actionType }),
          ...(actionParameters && { actionParameters }),
          metadata: {
            messageCount: this.currentConversation.messages.length,
            companyId: this.currentConversation.companyId,
            lastUpdated: this.currentConversation.lastUpdated,
            ...(lastConversationState && { lastConversationState })
          }
        }
      });

      console.log('🤖 MAYA Chat: Function response:', { 
        hasData: !!data, 
        hasError: !!error,
        conversationStateReturned: !!data?.conversationState,
        actionCount: (data?.executableActions || data?.executable_actions || []).length
      });

      if (error) {
        console.error('🤖 MAYA Chat: Function error:', error);
        throw error;
      }

      // Create assistant response
      const assistantMessage: ChatMessage = {
        id: `maya_${Date.now()}`,
        role: 'assistant',
        content: data?.message ?? data?.response ?? "Disculpa, no pude procesar tu mensaje en este momento.",
        timestamp: new Date().toISOString(),
        executableActions: data?.executableActions || data?.executable_actions || [],
        quickReplies: data?.quickReplies || [],
        fieldName: data?.fieldName,
        conversationState: data?.conversationState
      };

      // Debug log for executable actions
      console.log('🎯 Actions from function:', { 
        count: (data?.executableActions || data?.executable_actions || []).length,
        actions: data?.executableActions || data?.executable_actions || []
      });

      console.log('🤖 MAYA Chat: Assistant response created:', assistantMessage);

      // ✅ PROFESSIONAL: Update pendingAction in context when assistant provides actions
      if (assistantMessage.executableActions && assistantMessage.executableActions.length > 0) {
        const firstAction = assistantMessage.executableActions[0];
        
        if (context) {
          context.pendingAction = {
            type: firstAction.type,
            id: firstAction.id || `action_${firstAction.type}`,
            parameters: firstAction.parameters || {},
            timestamp: new Date().toISOString()
          };
          console.log('✅ [FRONTEND] Stored pendingAction in context:', {
            type: context.pendingAction.type,
            hasParameters: Object.keys(context.pendingAction.parameters).length > 0,
            parameterKeys: Object.keys(context.pendingAction.parameters)
          });
        }
      }

      this.currentConversation.messages.push(assistantMessage);
      this.saveToStorage(); // Persist to localStorage
      
      // NUEVO: Persist to database if conversation manager is available
      if (this.conversationManager && this.currentConversationId) {
        try {
          await this.conversationManager.saveMessage(this.currentConversationId, userChatMessage);
          await this.conversationManager.saveMessage(this.currentConversationId, assistantMessage);
          console.log('💾 MAYA Chat: Saved messages to database');
        } catch (dbError) {
          console.error('❌ MAYA Chat: Failed to save to database', dbError);
          // Continue anyway - localStorage is backup
        }
      }
      
      return assistantMessage;

    } catch (error: any) {
      const debugCode = `E-${Date.now().toString().slice(-6)}`;
      let userFriendlyMessage = `Disculpa, tengo un problema técnico (${debugCode}). Por favor intenta de nuevo en unos segundos.`;
      
      // Retry once for FunctionsFetchError (boot failures)
      if (error instanceof FunctionsFetchError && !(error as any).isRetry) {
        console.warn('⚠️ MAYA Chat: Retrying after FunctionsFetchError...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
          (error as any).isRetry = true;
          return await this.sendMessage(userMessage, context);
        } catch (retryError) {
          console.error('❌ MAYA Chat: Retry failed:', retryError);
          // Continue with normal error handling below
        }
      }
      
      try {
        if (error instanceof FunctionsHttpError) {
          const errJson = await error.context.json().catch(() => null);
          console.error('🤖 MAYA Chat: FunctionsHttpError', { errJson, status: error.context.status });
          
          // Check for specific status codes
          if (error.context.status === 429) {
            userFriendlyMessage = 'Maya está recibiendo muchas consultas en este momento. Por favor intenta en unos segundos.';
          } else if (error.context.status === 402) {
            userFriendlyMessage = 'Límite de créditos alcanzado. Contacta al administrador para continuar usando Maya.';
          } else if (errJson?.message) {
            // Use server's error message if available
            userFriendlyMessage = errJson.message;
          }
        } else if (error instanceof FunctionsRelayError) {
          console.error('🤖 MAYA Chat: FunctionsRelayError', { name: error.name, message: error.message });
        } else if (error instanceof FunctionsFetchError) {
          console.error('🤖 MAYA Chat: FunctionsFetchError', { message: error.message });
        } else {
          console.error('🤖 MAYA Chat: Unknown error type', error);
        }
      } catch (parseErr) {
        console.error('🤖 MAYA Chat: Error parsing error context', parseErr);
      }
      
      // Fallback response with server message or debug code
      const fallbackMessage: ChatMessage = {
        id: `maya_fallback_${Date.now()}`,
        role: 'assistant',
        content: userFriendlyMessage,
        timestamp: new Date().toISOString()
      };

      this.currentConversation.messages.push(fallbackMessage);
      this.saveToStorage(); // Persist to localStorage
      return fallbackMessage;
    }
  }

  getConversation(): ChatConversation {
    return this.currentConversation;
  }

  clearConversation(): void {
    this.currentConversation = {
      messages: [],
      sessionId: this.generateSessionId(),
      companyId: undefined,
      lastUpdated: undefined
    };
    this.saveToStorage(); // Clear localStorage
    console.log('🤖 MAYA: Conversation cleared');
  }

  validateContextIntegrity(currentCompanyId?: string): boolean {
    if (!currentCompanyId) {
      console.log('🔍 MAYA: No company_id provided for validation');
      return true; // Allow if no company context
    }

    const storedCompanyId = this.currentConversation.companyId;
    
    if (!storedCompanyId) {
      console.log('🔍 MAYA: No stored company_id, updating with current');
      this.currentConversation.companyId = currentCompanyId;
      this.saveToStorage();
      return true;
    }

    if (storedCompanyId !== currentCompanyId) {
      console.warn('⚠️ MAYA: Company mismatch detected!', {
        stored: storedCompanyId,
        current: currentCompanyId
      });
      return false;
    }

    console.log('✅ MAYA: Context integrity validated');
    return true;
  }

  addSystemMessage(content: string): void {
    const systemMessage: ChatMessage = {
      id: `system_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date().toISOString()
    };
    
    this.currentConversation.messages.push(systemMessage);
    this.saveToStorage(); // Persist to localStorage
  }

  addMessage(message: ChatMessage): void {
    this.currentConversation.messages.push(message);
    this.saveToStorage(); // Persist to localStorage
    
    // 🆕 FASE 3: Guardar en BD si hay conversación activa
    if (this.conversationManager && this.currentConversationId) {
      this.conversationManager.saveMessage(this.currentConversationId, message)
        .catch(err => console.error('❌ MAYA Chat: Failed to persist flow message', err));
    }
  }

  updateMessage(messageId: string, updatedMessage: ChatMessage): void {
    const messageIndex = this.currentConversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      this.currentConversation.messages[messageIndex] = updatedMessage;
      this.saveToStorage();
      console.log('💾 MAYA: Updated message in storage', { messageId });
    }
  }

  getDebugInfo() {
    return {
      sessionId: this.currentConversation.sessionId,
      messagesCount: this.currentConversation.messages.length,
      lastMessage: this.currentConversation.messages[this.currentConversation.messages.length - 1],
    };
  }
}