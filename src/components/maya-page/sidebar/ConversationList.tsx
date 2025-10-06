import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ConversationSummary } from '@/maya/types';
import { ConversationItem } from './ConversationItem';
import { ConversationGroupSection } from './ConversationGroupSection';
import { groupConversationsByDate, getGroupLabel } from '@/maya/utils/conversationGrouping';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConversationListProps {
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => Promise<void>;
  onArchiveConversation: (id: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  isLoading?: boolean;
  searchQuery?: string;
  mode?: 'active' | 'archived';
  onUnarchiveConversation?: (id: string) => Promise<void>;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onRenameConversation,
  onArchiveConversation,
  onDeleteConversation,
  isLoading = false,
  searchQuery = '',
  mode = 'active',
  onUnarchiveConversation
}) => {
  const [filteredConversations, setFilteredConversations] = useState(conversations);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = conversations.filter(conv => 
        conv.title.toLowerCase().includes(query) ||
        conv.lastMessage.toLowerCase().includes(query)
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [conversations, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredConversations.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-sm text-muted-foreground">
          {searchQuery 
            ? 'No se encontraron conversaciones' 
            : mode === 'archived' 
              ? 'No hay conversaciones archivadas' 
              : 'No hay conversaciones aún'
          }
        </p>
      </div>
    );
  }

  const grouped = groupConversationsByDate(filteredConversations);

  return (
    <ScrollArea className="flex-1">
      <div className="px-2 pb-4">
        {(Object.keys(grouped) as Array<keyof typeof grouped>).map(groupKey => (
          <ConversationGroupSection
            key={groupKey}
            title={getGroupLabel(groupKey)}
            count={grouped[groupKey].length}
            storageKey={`maya_group_${groupKey}_open`}
            defaultOpen={groupKey === 'today' || groupKey === 'yesterday'}
          >
            {grouped[groupKey].map(conversation => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === currentConversationId}
                onClick={() => onSelectConversation(conversation.id)}
                onRename={onRenameConversation}
                onArchive={onArchiveConversation}
                onDelete={onDeleteConversation}
                mode={mode}
                onUnarchive={onUnarchiveConversation}
              />
            ))}
          </ConversationGroupSection>
        ))}
      </div>
    </ScrollArea>
  );
};
