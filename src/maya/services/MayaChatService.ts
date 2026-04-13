import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

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
  isStreaming?: boolean;
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
      // Excluir companyId del almacenamiento para no exponer datos sensibles
      const { companyId, ...safeConversation } = this.currentConversation as any;
      localStorage.setItem(MayaChatService.STORAGE_KEY, JSON.stringify(safeConversation));
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

  async sendMessage(
    userMessage: string,
    context?: RichContext,
    onMessageUpdate?: (messageId: string, content: string) => void,
    _skipAddUser = false
  ): Promise<ChatMessage> {
    console.log('🤖 MAYA Chat: Sending message:', userMessage);

    // Update company_id in conversation if context provided
    if (context?.companyId) {
      this.currentConversation.companyId = context.companyId;
      this.currentConversation.lastUpdated = new Date().toISOString();
    }

    // Add user message to conversation (skipped on retry to avoid duplicates)
    const userChatMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };

    if (!_skipAddUser) {
      this.currentConversation.messages.push(userChatMessage);
    }

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

    // Feature flag: route to multi-agent engine when enabled
    const useMultiAgent = import.meta.env.VITE_MULTI_AGENT_ENABLED === 'true';
    const edgeFunction = useMultiAgent ? 'maya-execution-engine' : 'maya-intelligence';

    try {
      console.log(`🤖 MAYA Chat: Calling ${edgeFunction} function...`);
      
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

      // Get auth token (session token or anon key fallback)
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || SUPABASE_ANON_KEY;

      // Only request streaming for non-action messages when caller supports it
      const isActionMessage = userMessage.startsWith('action_');
      const requestStreaming = !isActionMessage && !!onMessageUpdate;

      const requestBody = {
        conversation: simplifiedConversation,
        sessionId: this.currentConversation.sessionId,
        richContext: context,
        idempotencyKey,
        wantsStreaming: requestStreaming,  // flag in body — avoids CORS custom-header issues
        ...(actionType && { actionType }),
        ...(actionParameters && { actionParameters }),
        metadata: {
          messageCount: this.currentConversation.messages.length,
          companyId: this.currentConversation.companyId,
          lastUpdated: this.currentConversation.lastUpdated,
          ...(lastConversationState && { lastConversationState })
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      let httpResponse: Response;
      try {
        httpResponse = await fetch(`${SUPABASE_URL}/functions/v1/${edgeFunction}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!httpResponse.ok) {
        const status = httpResponse.status;
        const errJson = await httpResponse.json().catch(() => httpResponse.text().catch(() => null));
        const err: any = new Error(errJson?.message || `HTTP ${status}`);
        err.status = status;
        err.errJson = errJson;
        throw err;
      }

      // ── Detect SSE vs JSON by body content (Supabase gateway strips response headers) ──
      let data: any;
      const responseText = await httpResponse.text();
      const isSSE = responseText.trimStart().startsWith('data: ');

      if (isSSE && onMessageUpdate) {
        const streamMsgId = `maya_${Date.now()}`;
        let accumulated = '';

        for (const line of responseText.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break;
          try {
            const parsed = JSON.parse(raw);
            const token = parsed.choices?.[0]?.delta?.content ?? '';
            if (token) {
              accumulated += token;
              onMessageUpdate(streamMsgId, accumulated);
            }
          } catch { /* ignore malformed SSE chunks */ }
        }

        data = { message: accumulated, _streamMsgId: streamMsgId, executableActions: [], quickReplies: [] };

      } else {
        // ── JSON path (actions / non-streaming) ────────────────────────────
        data = JSON.parse(responseText);
      }

      console.log('🤖 MAYA Chat: Function response:', {
        hasData: !!data,
        isStreaming: !!data?._streamMsgId,
        conversationStateReturned: !!data?.conversationState,
        actionCount: (data?.executableActions || data?.executable_actions || []).length
      });

      // Create assistant response con validación de acciones
      const rawActions = data?.executableActions || data?.executable_actions || [];
      const validActions = rawActions.filter(
        (action: any) => action && typeof action === 'object' && action.type && action.label
      );
      
      const assistantMessage: ChatMessage = {
        id: data?._streamMsgId ?? `maya_${Date.now()}`,
        role: 'assistant',
        content: data?.message ?? data?.response ?? "Disculpa, no pude procesar tu mensaje en este momento.",
        timestamp: new Date().toISOString(),
        executableActions: validActions,
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

      // Retry once on network failures (fetch rejected) — skip re-adding user message
      if (error instanceof TypeError && !error.isRetry) {
        console.warn('⚠️ MAYA Chat: Network error, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
          error.isRetry = true;
          return await this.sendMessage(userMessage, context, onMessageUpdate, true);
        } catch (retryError) {
          console.error('❌ MAYA Chat: Retry failed:', retryError);
        }
      }

      const status = error?.status;
      if (status === 429) {
        userFriendlyMessage = 'Maya está recibiendo muchas consultas en este momento. Por favor intenta en unos segundos.';
      } else if (status === 402) {
        userFriendlyMessage = 'Límite de créditos alcanzado. Contacta al administrador para continuar usando Maya.';
      } else if (error?.errJson?.message) {
        userFriendlyMessage = error.errJson.message;
      }
      console.error('🤖 MAYA Chat: Error', { status, message: error?.message });
      
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