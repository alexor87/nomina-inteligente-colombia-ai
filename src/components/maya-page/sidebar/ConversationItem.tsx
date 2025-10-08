import React, { useState } from 'react';
import { Edit2, Archive, Trash2, ArchiveRestore, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConversationSummary } from '@/maya/types';
import { formatRelativeTime, truncateText } from '@/maya/utils/conversationHelpers';

interface ConversationItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onClick: () => void;
  onRename: (id: string, newTitle: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onDelete: () => void;
  mode?: 'active' | 'archived';
  onUnarchive?: (id: string) => Promise<void>;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
  onRename,
  onArchive,
  onDelete,
  mode = 'active',
  onUnarchive
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);

  const handleRename = async () => {
    if (editTitle.trim() && editTitle !== conversation.title) {
      await onRename(conversation.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditTitle(conversation.title);
      setIsEditing(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          group relative px-3 py-2 rounded-lg cursor-pointer transition-colors
          ${mode === 'archived' ? 'opacity-70' : ''}
          ${isActive 
            ? 'bg-muted text-foreground' 
            : 'hover:bg-muted/30'
          }
        `}
        onClick={onClick}
      >
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="h-6 text-sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <div className="flex items-start gap-2">
              {/* Visual indicator */}
              <div className="w-2 h-2 rounded-full bg-primary/60 mt-1.5 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-normal text-foreground truncate">
                  {conversation.title}
                </h4>
                <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                  {truncateText(conversation.lastMessage, 50)}
                </p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {mode === 'archived' ? (
                    <>
                      <DropdownMenuItem
                        onSelect={() => onUnarchive?.(conversation.id)}
                      >
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Restaurar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => onDelete()}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onSelect={() => setIsEditing(true)}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Renombrar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => onArchive(conversation.id)}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archivar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => onDelete()}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <p className="text-xs text-muted-foreground/70 mt-1 ml-4">
              {formatRelativeTime(conversation.updated_at)}
            </p>
          </>
        )}
      </motion.div>
    </>
  );
};
