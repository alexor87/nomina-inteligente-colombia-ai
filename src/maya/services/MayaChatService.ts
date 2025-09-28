import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatConversation {
  messages: ChatMessage[];
  sessionId: string;
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
  private currentConversation: ChatConversation = {
    messages: [],
    sessionId: this.generateSessionId()
  };

  static getInstance(): MayaChatService {
    if (!MayaChatService.instance) {
      MayaChatService.instance = new MayaChatService();
    }
    return MayaChatService.instance;
  }

  private generateSessionId(): string {
    return `maya_chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async sendMessage(userMessage: string, context?: RichContext): Promise<ChatMessage> {
    console.log('🤖 MAYA Chat: Sending message:', userMessage);
    
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

      // Call MAYA intelligence with conversation history and rich context
      const { data, error } = await supabase.functions.invoke('maya-intelligence', {
        body: {
          message: userMessage,
          conversation: filteredConversation,
          context: context || 'chat_conversation',
          richContext: context, // Pass the rich contextual data
          phase: 'interactive_chat',
          sessionId: this.currentConversation.sessionId,
          debug: true
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
        content: data?.message || "Disculpa, no pude procesar tu mensaje en este momento.",
        timestamp: new Date().toISOString()
      };

      console.log('🤖 MAYA Chat: Assistant response created:', assistantMessage);

      this.currentConversation.messages.push(assistantMessage);
      return assistantMessage;

    } catch (error: any) {
      const debugCode = `E-${Date.now().toString().slice(-6)}`;
      let userFriendlyMessage = `Disculpa, tengo un problema técnico (${debugCode}). Por favor intenta de nuevo en unos segundos.`;
      
      try {
        if (error instanceof FunctionsHttpError) {
          const errJson = await error.context.json().catch(() => null);
          console.error('🤖 MAYA Chat: FunctionsHttpError', { errJson });
          // Use server's error message if available
          if (errJson?.message) {
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
      return fallbackMessage;
    }
  }

  getConversation(): ChatConversation {
    return this.currentConversation;
  }

  clearConversation(): void {
    this.currentConversation = {
      messages: [],
      sessionId: this.generateSessionId()
    };
  }

  addSystemMessage(content: string): void {
    const systemMessage: ChatMessage = {
      id: `system_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date().toISOString()
    };
    
    this.currentConversation.messages.push(systemMessage);
  }

  getDebugInfo() {
    return {
      sessionId: this.currentConversation.sessionId,
      messagesCount: this.currentConversation.messages.length,
      lastMessage: this.currentConversation.messages[this.currentConversation.messages.length - 1],
    };
  }
}