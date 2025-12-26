import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MayaChatArea } from '@/components/maya-page/MayaChatArea';
import { MayaInputArea } from '@/components/maya-page/MayaInputArea';
import { useMaya } from '@/maya/MayaProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { MayaConversationManager } from '@/maya/services/MayaConversationManager';
import { ConversationSummary } from '@/maya/types';
import { toast } from 'sonner';
import { NewConversationButton } from '@/components/maya-page/sidebar/NewConversationButton';
import { ConversationSearch } from '@/components/maya-page/sidebar/ConversationSearch';
import { ConversationList } from '@/components/maya-page/sidebar/ConversationList';
import { ArchiveToggle } from '@/components/maya-page/sidebar/ArchiveToggle';
import { forceUIReset } from '@/utils/ui/overlayRecovery';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const PANEL_STORAGE_KEY = 'maya_conversation_panel_collapsed';

export default function MayaPage() {
  const { user } = useAuth();
  const { companyId } = useCurrentCompany();
  const isMobile = useIsMobile();
  
  const mayaContext = useMaya();
  const { clearConversation, currentConversationId, loadConversation } = mayaContext;

  const [panelCollapsed, setPanelCollapsed] = useState(() => {
    const stored = localStorage.getItem(PANEL_STORAGE_KEY);
    return stored === 'true' || isMobile;
  });
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<ConversationSummary[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeletingRef = useRef(false);
  const justDeletedRef = useRef(false);

  const conversationManager = MayaConversationManager.getInstance();

  // Load conversations when user and company are available
  useEffect(() => {
    if (user?.id && companyId) {
      loadConversations();
      loadArchivedConversations();
    }
  }, [user?.id, companyId]);

  // Reload conversations when currentConversationId changes
  useEffect(() => {
    if (!isDeleting && currentConversationId && user?.id && companyId) {
      if (justDeletedRef.current) {
        justDeletedRef.current = false;
        return;
      }
      loadConversations();
      loadArchivedConversations();
    }
  }, [currentConversationId, user?.id, companyId, isDeleting]);

  const loadConversations = async () => {
    if (!user?.id || !companyId) return;
    
    setIsLoading(true);
    try {
      const convs = await conversationManager.getConversations(user.id, companyId);
      setConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Error al cargar conversaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const loadArchivedConversations = async () => {
    if (!user?.id || !companyId) return;
    
    try {
      const archived = await conversationManager.getArchivedConversations(user.id, companyId);
      setArchivedConversations(archived);
    } catch (error) {
      console.error('Error loading archived conversations:', error);
    }
  };

  const handleTogglePanel = () => {
    const newValue = !panelCollapsed;
    setPanelCollapsed(newValue);
    localStorage.setItem(PANEL_STORAGE_KEY, String(newValue));
  };

  const handleNewConversation = async () => {
    await clearConversation();
    await loadConversations();
  };

  const handleSelectConversation = async (id: string) => {
    try {
      conversationManager.setCurrentConversationId(id);
      await loadConversation(id);
      toast.success('Conversación cargada');
      
      // Collapse panel on mobile after selecting
      if (isMobile) {
        setPanelCollapsed(true);
        localStorage.setItem(PANEL_STORAGE_KEY, 'true');
      }
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
      await loadArchivedConversations();
      
      toast.success('Conversación archivada', {
        action: {
          label: 'Deshacer',
          onClick: async () => {
            await handleUnarchiveConversation(id);
          }
        },
        duration: 5000
      });
    } catch (error) {
      console.error('Error archiving conversation:', error);
      toast.error('Error al archivar');
    }
  };

  const handleUnarchiveConversation = async (id: string) => {
    try {
      await conversationManager.unarchiveConversation(id);
      await loadConversations();
      await loadArchivedConversations();
      toast.success('Conversación restaurada');
    } catch (error) {
      console.error('Error unarchiving conversation:', error);
      toast.error('Error al restaurar');
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    
    try {
      setIsDeleting(true);
      await conversationManager.deleteConversation(id);
      
      if (id === currentConversationId) {
        conversationManager.clearCurrentConversationId();
        await clearConversation(true);
      }
      
      justDeletedRef.current = true;
      await loadConversations();
      await loadArchivedConversations();
      
      toast.success('Conversación eliminada');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Error al eliminar');
    } finally {
      setIsDeleting(false);
      isDeletingRef.current = false;
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          forceUIReset();
        });
      });
    }
  };

  const currentConversations = viewMode === 'active' ? conversations : archivedConversations;

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Conversation Panel - Internal to MayaPage */}
      <AnimatePresence mode="wait">
        {!panelCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? '100%' : 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={cn(
              "flex flex-col bg-muted/30 border-r border-border overflow-hidden",
              isMobile && "absolute inset-0 z-30 bg-background"
            )}
          >
            {/* Panel Header */}
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Conversaciones</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleTogglePanel}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* New Conversation Button */}
            <div className="p-3 border-b border-border">
              <NewConversationButton onClick={handleNewConversation} />
            </div>

            {/* Archive Toggle */}
            <div className="px-3 pt-2 pb-2">
              <ArchiveToggle
                mode={viewMode}
                onModeChange={setViewMode}
                activeCount={conversations.length}
                archivedCount={archivedConversations.length}
              />
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
              <ConversationSearch onSearch={setSearchQuery} />
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={currentConversations}
                currentConversationId={currentConversationId}
                onSelectConversation={handleSelectConversation}
                onRenameConversation={handleRenameConversation}
                onArchiveConversation={handleArchiveConversation}
                onDeleteConversation={handleDeleteConversation}
                onUnarchiveConversation={handleUnarchiveConversation}
                isLoading={isLoading}
                searchQuery={searchQuery}
                mode={viewMode}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Toggle Panel Button (when collapsed) */}
        {panelCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm border border-border shadow-sm"
            onClick={handleTogglePanel}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        <div className="flex-1 overflow-hidden px-4 md:px-8 pt-6 pb-4">
          <div className="max-w-5xl mx-auto h-full flex flex-col">
            <MayaChatArea />
            <MayaInputArea />
          </div>
        </div>
      </div>
    </div>
  );
}
