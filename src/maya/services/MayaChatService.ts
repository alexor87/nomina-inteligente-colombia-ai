import { supabase } from '@/integrations/supabase/client';

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

  async sendMessage(userMessage: string, context?: any): Promise<ChatMessage> {
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
      
      // Call MAYA intelligence with conversation history
      const { data, error } = await supabase.functions.invoke('maya-intelligence', {
        body: {
          message: userMessage,
          conversation: this.currentConversation.messages,
          context: context || 'chat_conversation',
          phase: 'interactive_chat',
          sessionId: this.currentConversation.sessionId
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

    } catch (error) {
      console.error('🤖 MAYA Chat: Error sending message:', error);
      
      // Fallback response
      const fallbackMessage: ChatMessage = {
        id: `maya_fallback_${Date.now()}`,
        role: 'assistant',
        content: "Disculpa, tengo un problema técnico. Por favor intenta de nuevo.",
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
}