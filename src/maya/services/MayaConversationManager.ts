import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage } from './MayaChatService';

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  updated_at: string;
  message_count: number;
}

export interface Conversation {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: any;
  created_at: string;
}

export class MayaConversationManager {
  private static instance: MayaConversationManager;
  private static readonly CURRENT_CONVERSATION_KEY = 'maya_current_conversation_id';

  static getInstance(): MayaConversationManager {
    if (!MayaConversationManager.instance) {
      MayaConversationManager.instance = new MayaConversationManager();
    }
    return MayaConversationManager.instance;
  }

  /**
   * Get all conversations for a user/company
   */
  async getConversations(userId: string, companyId: string): Promise<ConversationSummary[]> {
    try {
      const { data: conversations, error } = await supabase
        .from('maya_conversations')
        .select(`
          id,
          title,
          updated_at,
          is_archived,
          maya_messages (
            id,
            content,
            role,
            created_at
          )
        `)
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Transform to summary format
      const summaries: ConversationSummary[] = conversations?.map(conv => {
        const messages = (conv.maya_messages as any[]) || [];
        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
        
        return {
          id: conv.id,
          title: conv.title,
          lastMessage: lastMsg?.content?.substring(0, 60) || 'Sin mensajes',
          updated_at: conv.updated_at,
          message_count: messages.length
        };
      }) || [];

      console.log('📚 MAYA: Loaded conversations', { count: summaries.length });
      return summaries;
    } catch (error) {
      console.error('❌ MAYA: Error loading conversations', error);
      return [];
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, companyId: string): Promise<Conversation> {
    try {
      const { data, error } = await supabase
        .from('maya_conversations')
        .insert({
          user_id: userId,
          company_id: companyId,
          title: 'Nueva conversación',
          is_archived: false
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✨ MAYA: Created new conversation', { id: data.id });
      
      // Store as current conversation
      localStorage.setItem(MayaConversationManager.CURRENT_CONVERSATION_KEY, data.id);
      
      return data as Conversation;
    } catch (error) {
      console.error('❌ MAYA: Error creating conversation', error);
      throw error;
    }
  }

  /**
   * Load messages from a specific conversation
   */
  async loadConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const { data: messages, error } = await supabase
        .from('maya_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform to ChatMessage format
      const chatMessages: ChatMessage[] = messages?.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.created_at,
        executableActions: msg.metadata?.executableActions,
        quickReplies: msg.metadata?.quickReplies,
        fieldName: msg.metadata?.fieldName,
        conversationState: msg.metadata?.conversationState
      })) || [];

      console.log('💬 MAYA: Loaded conversation messages', { conversationId, count: chatMessages.length });
      return chatMessages;
    } catch (error) {
      console.error('❌ MAYA: Error loading messages', error);
      return [];
    }
  }

  /**
   * Save a message to a conversation
   */
  async saveMessage(conversationId: string, message: ChatMessage): Promise<void> {
    try {
      const { error } = await supabase
        .from('maya_messages')
        .insert({
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          metadata: {
            executableActions: message.executableActions,
            quickReplies: message.quickReplies,
            fieldName: message.fieldName,
            conversationState: message.conversationState
          }
        });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('maya_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      console.log('💾 MAYA: Saved message to conversation', { conversationId, role: message.role });
    } catch (error) {
      console.error('❌ MAYA: Error saving message', error);
      throw error;
    }
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('maya_conversations')
        .update({ title })
        .eq('id', conversationId);

      if (error) throw error;

      console.log('✏️ MAYA: Updated conversation title', { conversationId, title });
    } catch (error) {
      console.error('❌ MAYA: Error updating title', error);
      throw error;
    }
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('maya_conversations')
        .update({ is_archived: true })
        .eq('id', conversationId);

      if (error) throw error;

      console.log('📦 MAYA: Archived conversation', { conversationId });
    } catch (error) {
      console.error('❌ MAYA: Error archiving conversation', error);
      throw error;
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      // Messages will be deleted by cascade
      const { error } = await supabase
        .from('maya_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      console.log('🗑️ MAYA: Deleted conversation', { conversationId });
    } catch (error) {
      console.error('❌ MAYA: Error deleting conversation', error);
      throw error;
    }
  }

  /**
   * Generate title from first messages using edge function
   */
  async generateTitle(messages: ChatMessage[]): Promise<string> {
    try {
      if (messages.length < 2) return 'Nueva conversación';

      const { data, error } = await supabase.functions.invoke('maya-generate-title', {
        body: {
          messages: messages.slice(0, 2).map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

      return data?.title || 'Nueva conversación';
    } catch (error) {
      console.error('❌ MAYA: Error generating title', error);
      // Fallback: use first user message
      const firstUserMsg = messages.find(m => m.role === 'user');
      return firstUserMsg ? firstUserMsg.content.substring(0, 40) + '...' : 'Nueva conversación';
    }
  }

  /**
   * Migrate existing localStorage conversation to database
   */
  async migrateFromLocalStorage(userId: string, companyId: string): Promise<string | null> {
    try {
      const LEGACY_KEY = 'maya_conversation_history';
      const stored = localStorage.getItem(LEGACY_KEY);
      
      if (!stored) return null;

      const legacy = JSON.parse(stored);
      if (!legacy.messages || legacy.messages.length === 0) return null;

      console.log('🔄 MAYA: Migrating localStorage conversation', { messageCount: legacy.messages.length });

      // Create new conversation
      const conversation = await this.createConversation(userId, companyId);

      // Save all messages
      for (const message of legacy.messages) {
        await this.saveMessage(conversation.id, message);
      }

      // Generate title from first messages
      const title = await this.generateTitle(legacy.messages);
      await this.updateConversationTitle(conversation.id, title);

      // Clear legacy storage
      localStorage.removeItem(LEGACY_KEY);

      console.log('✅ MAYA: Migration complete', { conversationId: conversation.id, title });
      return conversation.id;
    } catch (error) {
      console.error('❌ MAYA: Migration failed', error);
      return null;
    }
  }

  /**
   * Get current conversation ID from cache
   */
  getCurrentConversationId(): string | null {
    return localStorage.getItem(MayaConversationManager.CURRENT_CONVERSATION_KEY);
  }

  /**
   * Set current conversation ID
   */
  setCurrentConversationId(conversationId: string): void {
    localStorage.setItem(MayaConversationManager.CURRENT_CONVERSATION_KEY, conversationId);
  }

  /**
   * Clear current conversation ID
   */
  clearCurrentConversationId(): void {
    localStorage.removeItem(MayaConversationManager.CURRENT_CONVERSATION_KEY);
  }
}
