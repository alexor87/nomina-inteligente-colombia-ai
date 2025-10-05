import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
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
}

export class MayaChatService {
  private static instance: MayaChatService;
  private static readonly STORAGE_KEY = 'maya_conversation_history';
  private currentConversation: ChatConversation;

  private constructor() {
    // Load from localStorage on initialization
    this.currentConversation = this.loadFromStorage();
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

    try {
      console.log('🤖 MAYA Chat: Calling maya-intelligence function...');
      
      // Filter conversation for OpenAI (only role and content)
      const filteredConversation = this.currentConversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call MAYA intelligence with simplified KISS architecture
      const { data, error } = await supabase.functions.invoke('maya-intelligence', {
        body: {
          conversation: filteredConversation,
          sessionId: this.currentConversation.sessionId,
          richContext: context
        }
      });

      console.log('🤖 MAYA Chat: Function response:', { data, error });

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

      this.currentConversation.messages.push(assistantMessage);
      this.saveToStorage(); // Persist to localStorage
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

  getDebugInfo() {
    return {
      sessionId: this.currentConversation.sessionId,
      messagesCount: this.currentConversation.messages.length,
      lastMessage: this.currentConversation.messages[this.currentConversation.messages.length - 1],
    };
  }
}