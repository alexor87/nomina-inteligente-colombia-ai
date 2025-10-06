import React, { useState, useEffect } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NewConversationButton } from './NewConversationButton';
import { ConversationSearch } from './ConversationSearch';
import { ConversationList } from './ConversationList';
import { useMaya } from '@/maya/MayaProvider';
import { useAuth } from '@/contexts/AuthContext';
import { MayaConversationManager } from '@/maya/services/MayaConversationManager';
import { ConversationSummary } from '@/maya/types';
import { toast } from 'sonner';

const STORAGE_KEY = 'maya_sidebar_collapsed';

export const MayaHistorySidebar: React.FC = () => {
  const { user, profile } = useAuth();
  const { clearConversation, currentConversationId } = useMaya();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const conversationManager = MayaConversationManager.getInstance();

  // ✅ Cargar conversaciones cuando user y profile estén disponibles
  useEffect(() => {
    if (user?.id && profile?.company_id) {
      console.log('🔄 Sidebar: user y profile listos, cargando conversaciones...', {
        userId: user.id,
        companyId: profile.company_id
      });
      loadConversations();
    }
  }, [user?.id, profile?.company_id]);

  // ⚡ Recargar conversaciones cuando cambia currentConversationId
  useEffect(() => {
    if (currentConversationId) {
      loadConversations();
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    console.log('📋 Sidebar: loadConversations llamado', {
      hasUser: !!user?.id,
      hasCompanyId: !!profile?.company_id,
      userId: user?.id,
      companyId: profile?.company_id
    });
    
    if (!user?.id || !profile?.company_id) {
      console.warn('⚠️ Sidebar: No se puede cargar, falta user o company_id');
      return;
    }
    
    setIsLoading(true);
    try {
      const convs = await conversationManager.getConversations(user.id, profile.company_id);
      console.log('✅ Sidebar: Conversaciones cargadas:', convs.length);
      setConversations(convs);
    } catch (error) {
      console.error('❌ Sidebar: Error loading conversations:', error);
      toast.error('Error al cargar conversaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCollapse = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    localStorage.setItem(STORAGE_KEY, String(newValue));
  };

  const handleNewConversation = async () => {
    await clearConversation();
    await loadConversations();
    // Navigate to Maya if not already there
    if (location.pathname !== '/maya') {
      navigate('/maya');
    }
  };

  const handleSelectConversation = async (id: string) => {
    try {
      const messages = await conversationManager.loadConversationMessages(id);
      conversationManager.setCurrentConversationId(id);
      // The MayaProvider will handle loading the messages
      window.location.reload(); // Simple reload to load new conversation
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Error al cargar la conversación');
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await conversationManager.updateConversationTitle(id, newTitle);
      await loadConversations();
      toast.success('Conversación renombrada');
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast.error('Error al renombrar');
    }
  };

  const handleArchiveConversation = async (id: string) => {
    try {
      await conversationManager.archiveConversation(id);
      await loadConversations();
      toast.success('Conversación archivada', {
        action: {
          label: 'Deshacer',
          onClick: () => {
            // TODO: Implement unarchive
          }
        }
      });
    } catch (error) {
      console.error('Error archiving conversation:', error);
      toast.error('Error al archivar');
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await conversationManager.deleteConversation(id);
      await loadConversations();
      if (id === currentConversationId) {
        clearConversation();
      }
      toast.success('Conversación eliminada');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Error al eliminar');
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 288 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:flex flex-col bg-muted/30 border-r border-border relative z-20"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <NewConversationButton 
              onClick={handleNewConversation} 
              collapsed={collapsed}
            />
          </div>

          {/* Search */}
          {!collapsed && (
            <div className="p-3 border-b border-border">
              <ConversationSearch 
                onSearch={setSearchQuery} 
                collapsed={collapsed}
              />
            </div>
          )}

          {/* Conversation List */}
          <div className="flex-1 overflow-hidden">
            {!collapsed ? (
              <ConversationList
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelectConversation={handleSelectConversation}
                onRenameConversation={handleRenameConversation}
                onArchiveConversation={handleArchiveConversation}
                onDeleteConversation={handleDeleteConversation}
                isLoading={isLoading}
                searchQuery={searchQuery}
              />
            ) : (
              <div className="flex items-center justify-center py-4">
                <span className="text-xs text-muted-foreground">{conversations.length}</span>
              </div>
            )}
          </div>

          {/* Footer - Toggle Button */}
          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleCollapse}
              className="w-full"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Overlay Sidebar */}
      <AnimatePresence>
        {!collapsed && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={handleToggleCollapse}
            />
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-background border-r border-border z-50 flex flex-col"
            >
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border">
                  <NewConversationButton onClick={handleNewConversation} />
                </div>

                <div className="p-3 border-b border-border">
                  <ConversationSearch onSearch={setSearchQuery} />
                </div>

                <div className="flex-1 overflow-hidden">
                  <ConversationList
                    conversations={conversations}
                    currentConversationId={currentConversationId}
                    onSelectConversation={handleSelectConversation}
                    onRenameConversation={handleRenameConversation}
                    onArchiveConversation={handleArchiveConversation}
                    onDeleteConversation={handleDeleteConversation}
                    isLoading={isLoading}
                    searchQuery={searchQuery}
                  />
                </div>

                <div className="p-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleCollapse}
                    className="w-full"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
