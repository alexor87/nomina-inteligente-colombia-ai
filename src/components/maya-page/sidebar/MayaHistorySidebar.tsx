import React, { useState, useEffect, useRef } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NewConversationButton } from './NewConversationButton';
import { ConversationSearch } from './ConversationSearch';
import { ConversationList } from './ConversationList';
import { ArchiveToggle } from './ArchiveToggle';
import { useMaya } from '@/maya/MayaProvider';
import { useAuth } from '@/contexts/AuthContext';
import { MayaConversationManager } from '@/maya/services/MayaConversationManager';
import { ConversationSummary } from '@/maya/types';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
 
const STORAGE_KEY = 'maya_sidebar_collapsed';

export const MayaHistorySidebar: React.FC = () => {
  const { user, profile } = useAuth();
  
  // Protected Maya context access
  const mayaContext = (() => {
    try {
      return useMaya();
    } catch (error) {
      console.warn('⚠️ Maya context not available during cleanup');
      return null;
    }
  })();

  const clearConversation = mayaContext?.clearConversation || (async () => {});
  const currentConversationId = mayaContext?.currentConversationId || null;
  const loadConversation = mayaContext?.loadConversation || (async () => {});
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<ConversationSummary[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const prevDeletingRef = useRef(isDeleting);
  const isDeletingRef = useRef(false);
  const justDeletedRef = useRef(false);
 
  // Diagnostics: log overlay mount/unmount
  useEffect(() => {
    if (isMobile && !collapsed) {
      console.log('📱 MayaHistorySidebar overlay-mounted', { isMobile, collapsed });
      return () => console.log('📱 MayaHistorySidebar overlay-unmounted');
    }
  }, [isMobile, collapsed]);
 
  // Failsafe: after deletion finishes on mobile, force collapse
  useEffect(() => {
    const prev = prevDeletingRef.current;
    if (prev && !isDeleting && isMobile) {
      console.log('📱 MayaHistorySidebar: deletion finished, collapsing');
      setCollapsed(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    prevDeletingRef.current = isDeleting;
  }, [isDeleting, isMobile]);
 
  const conversationManager = MayaConversationManager.getInstance();

  // ✅ Cargar conversaciones cuando user y profile estén disponibles
  useEffect(() => {
    if (user?.id && profile?.company_id) {
      console.log('🔄 Sidebar: user y profile listos, cargando conversaciones...', {
        userId: user.id,
        companyId: profile.company_id
      });
      loadConversations();
      loadArchivedConversations();
    }
  }, [user?.id, profile?.company_id]);

  // ⚡ Recargar conversaciones cuando cambia currentConversationId (pero no durante eliminación)
  useEffect(() => {
    if (!isDeleting && currentConversationId) {
      // Skip reload si acabamos de eliminar (ya se hizo manual)
      if (justDeletedRef.current) {
        justDeletedRef.current = false;
        return;
      }
      loadConversations();
      loadArchivedConversations();
    }
  }, [currentConversationId, isDeleting]);

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

  const loadArchivedConversations = async () => {
    if (!user?.id || !profile?.company_id) return;
    
    try {
      const archived = await conversationManager.getArchivedConversations(user.id, profile.company_id);
      console.log('📦 Sidebar: Conversaciones archivadas cargadas:', archived.length);
      setArchivedConversations(archived);
    } catch (error) {
      console.error('❌ Sidebar: Error loading archived conversations:', error);
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
      conversationManager.setCurrentConversationId(id);
      
      // Navegar a MAYA si no estamos ahí
      if (location.pathname !== '/maya') {
        navigate('/maya');
      }
      
      // Cargar la conversación en el provider
      await loadConversation(id);
      
      toast.success('Conversación cargada');
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
    // Prevenir ejecuciones múltiples
    if (isDeletingRef.current) {
      console.log('⚠️ Deletion already in progress');
      return;
    }
    isDeletingRef.current = true;
    
    try {
      setIsDeleting(true);
      
      // 1. Validar que existe una conversación para eliminar
      if (!id) {
        throw new Error('ID de conversación inválido');
      }

      // 2. Eliminar de la base de datos
      await conversationManager.deleteConversation(id);
      
      // 3. Si es la conversación actual, limpiar el estado SIN generar mensaje inicial
      if (id === currentConversationId) {
        try {
          conversationManager.clearCurrentConversationId();
          await clearConversation(true);
        } catch (clearError) {
          console.error('Error clearing conversation state:', clearError);
          // Continuar aunque falle la limpieza
        }
      }
      
      // Marcar que acabamos de eliminar para evitar recarga duplicada
      justDeletedRef.current = true;
      
      // 4. Recargar lista de conversaciones una sola vez
      try {
        await Promise.all([
          loadConversations(),
          loadArchivedConversations()
        ]);
      } catch (loadError) {
        console.error('Error reloading conversations:', loadError);
        // Continuar aunque falle la recarga
      }
      
      toast.success('Conversación eliminada');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Error al eliminar', {
        description: error instanceof Error ? error.message : 'No se pudo eliminar la conversación'
      });
    } finally {
      // Asegurar que siempre se limpia el estado
      setIsDeleting(false);
      isDeletingRef.current = false;
      
      // Solo dispatch Escape si estamos en mobile con overlay visible
      if (isMobile && !collapsed) {
        try {
          requestAnimationFrame(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          });
        } catch {}
      }
      
      // En mobile, colapsar el sidebar después de eliminar
      if (isMobile) {
        setCollapsed(true);
        localStorage.setItem(STORAGE_KEY, 'true');
      }
    }
  };

  const currentConversations = viewMode === 'active' ? conversations : archivedConversations;

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

          {/* Archive Toggle */}
          {!collapsed && (
            <div className="p-3 border-b border-border">
              <ArchiveToggle
                mode={viewMode}
                onModeChange={setViewMode}
                activeCount={conversations.length}
                archivedCount={archivedConversations.length}
              />
            </div>
          )}

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
            ) : (
              <div className="flex flex-col gap-2 items-center py-4">
                <ArchiveToggle
                  mode={viewMode}
                  onModeChange={setViewMode}
                  activeCount={conversations.length}
                  archivedCount={archivedConversations.length}
                  collapsed
                />
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
        {isMobile && !collapsed && (
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
                  <ArchiveToggle
                    mode={viewMode}
                    onModeChange={setViewMode}
                    activeCount={conversations.length}
                    archivedCount={archivedConversations.length}
                  />
                </div>

                <div className="p-3 border-b border-border">
                  <ConversationSearch onSearch={setSearchQuery} />
                </div>

                <div className="flex-1 overflow-hidden">
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
