import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { MayaAvatar } from '@/maya/MayaAvatar';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { MayaActionExecutor } from '@/maya/components/MayaActionExecutor';
import type { ChatMessage } from '@/maya/services/MayaChatService';

interface MayaMessageProps {
  message: ChatMessage;
  isLatest?: boolean;
  showAvatar?: boolean;
}

export const MayaMessage: React.FC<MayaMessageProps> = ({ 
  message, 
  isLatest = false,
  showAvatar = true 
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role !== 'user' && message.role !== 'assistant';
  
  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center my-4"
      >
        <div className="bg-gray-100 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-2 max-w-md">
          <p className="text-xs text-gray-600 text-center">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} group`}
    >
      {!isUser && showAvatar && (
        <div className="flex-shrink-0 mt-1">
          <MayaAvatar 
            emotionalState="neutral"
            size="sm"
            isVisible={true}
          />
        </div>
      )}
      
      {!isUser && !showAvatar && <div className="w-9" />}
      
      <div className={`max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={`rounded-2xl px-5 py-3.5 ${
            isUser 
              ? 'bg-primary text-white shadow-lg' 
              : 'bg-gray-100 backdrop-blur-sm text-gray-900 border border-gray-200 shadow-sm'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </motion.div>
        
        {/* Timestamp - subtle */}
        <span className="text-[10px] text-gray-500 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {new Date(message.timestamp).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>

        {/* Quick replies for assistant messages */}
        {!isUser && message.quickReplies && message.quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.quickReplies.map((reply: any, idx: number) => (
              <Button
                key={idx}
                variant="ghost"
                size="sm"
                className="bg-white backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 text-xs h-8 px-3 transition-all"
              >
                {reply.label}
              </Button>
            ))}
          </div>
        )}

        {/* Executable Actions for assistant messages */}
        {!isUser && message.executableActions && message.executableActions.length > 0 && (
          <div className="mt-3">
            <MayaActionExecutor 
              actions={message.executableActions}
              onActionExecuted={(action, result) => {
                console.log('🎯 Action executed:', action.type, result);
              }}
            />
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center mt-1 shadow-sm">
          <User className="h-4 w-4 text-gray-600" />
        </div>
      )}
    </motion.div>
  );
};
