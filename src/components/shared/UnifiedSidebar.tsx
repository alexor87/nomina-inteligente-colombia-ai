import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMaya } from '@/maya/MayaProvider';
import { useAuth } from '@/contexts/AuthContext';
import { MayaConversationManager } from '@/maya/services/MayaConversationManager';
import { ConversationSummary } from '@/maya/types';
import { toast } from 'sonner';
import { NewConversationButton } from '@/components/maya-page/sidebar/NewConversationButton';
import { ConversationSearch } from '@/components/maya-page/sidebar/ConversationSearch';
import { ConversationList } from '@/components/maya-page/sidebar/ConversationList';
import { SidebarHeader } from './sidebar/SidebarHeader';
import { SidebarDivider } from './sidebar/SidebarDivider';
import { ModuleNavigation } from './sidebar/ModuleNavigation';
import { ToggleButton } from './sidebar/ToggleButton';

const STORAGE_KEY = 'unified_sidebar_collapsed';

export const UnifiedSidebar: React.FC = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const companyId = user.user_metadata?.company_id;
      const convs = await conversationManager.getConversations(user.id, companyId);
      setConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
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

  const handleNewConversation = () => {
    clearConversation();
    loadConversations();
    // Navigate to Maya if not already there
    if (location.pathname !== '/maya') {
      navigate('/maya');
    }
  };

  const handleSelectConversation = async (id: string) => {
    try {
      const messages = await conversationManager.loadConversationMessages(id);
      conversationManager.setCurrentConversationId(id);
      window.location.reload();
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
      toast.success('Conversación archivada');
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
      {/* Desktop Unified Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 288 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:flex flex-col bg-background border-r border-border relative z-20"
      >
        <div className="flex flex-col h-full">
          {/* SECCIÓN SUPERIOR: MAYA */}
          <div className="flex-none flex flex-col border-b border-border" style={{ maxHeight: '45vh' }}>
            <SidebarHeader collapsed={collapsed} />
            
            <div className="px-3 py-2">
              <NewConversationButton 
                onClick={handleNewConversation} 
                collapsed={collapsed}
              />
            </div>

            {!collapsed && (
              <div className="px-3 pb-2">
                <ConversationSearch 
                  onSearch={setSearchQuery} 
                  collapsed={collapsed}
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto min-h-0">
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
          </div>

          {/* SEPARADOR ELEGANTE */}
          <SidebarDivider />

          {/* SECCIÓN INFERIOR: MÓDULOS */}
          <div className="flex-1 flex flex-col min-h-0">
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <ModuleNavigation collapsed={collapsed} />
            </nav>

            <div className="p-2 border-t border-border flex-shrink-0">
              <ToggleButton 
                collapsed={collapsed} 
                onToggle={handleToggleCollapse} 
              />
            </div>
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
                <SidebarHeader collapsed={false} />
                
                <div className="p-3 border-b border-border">
                  <NewConversationButton onClick={handleNewConversation} />
                </div>

                <div className="px-3 pb-2">
                  <ConversationSearch onSearch={setSearchQuery} />
                </div>

                <div className="flex-1 overflow-y-auto border-b border-border" style={{ maxHeight: '40vh' }}>
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

                <SidebarDivider />

                <nav className="flex-1 px-3 py-4 overflow-y-auto">
                  <ModuleNavigation collapsed={false} />
                </nav>

                <div className="p-2 border-t border-border">
                  <ToggleButton 
                    collapsed={false} 
                    onToggle={handleToggleCollapse} 
                  />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
