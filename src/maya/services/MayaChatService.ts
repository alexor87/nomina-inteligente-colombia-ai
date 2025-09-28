import { createClient } from '@supabase/supabase-js';

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
  private supabase = createClient(
    'https://txviknqtzkjkjjefeqag.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dmlrbmF0emtqa2pqZWZlcWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNzc5OTIsImV4cCI6MjA1Njg1Mzk5Mn0.GRNGVAsccvtGmAjcOdJDZSD7ya4kNOlG_qIrwbzfGzA'
  );
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
    // Add user message to conversation
    const userChatMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    this.currentConversation.messages.push(userChatMessage);

    try {
      // Call MAYA intelligence with conversation history
      const { data, error } = await this.supabase.functions.invoke('maya-intelligence', {
        body: {
          message: userMessage,
          conversation: this.currentConversation.messages,
          context: context || 'chat_conversation',
          phase: 'interactive_chat',
          sessionId: this.currentConversation.sessionId
        }
      });

      if (error) throw error;

      // Create assistant response
      const assistantMessage: ChatMessage = {
        id: `maya_${Date.now()}`,
        role: 'assistant',
        content: data.message || "Disculpa, no pude procesar tu mensaje en este momento.",
        timestamp: new Date().toISOString()
      };

      this.currentConversation.messages.push(assistantMessage);
      return assistantMessage;

    } catch (error) {
      console.error('Error sending message to MAYA:', error);
      
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