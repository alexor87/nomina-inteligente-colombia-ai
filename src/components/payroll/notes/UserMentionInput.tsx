
import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { CompanyUser } from '@/types/employee-notes';
import { X } from 'lucide-react';

interface UserMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  mentionedUsers: CompanyUser[];
  onMentionedUsersChange: (users: CompanyUser[]) => void;
  companyUsers: CompanyUser[];
  placeholder?: string;
  className?: string;
}

export const UserMentionInput: React.FC<UserMentionInputProps> = ({
  value,
  onChange,
  mentionedUsers,
  onMentionedUsersChange,
  companyUsers,
  placeholder = "Escribe tu nota aquí. Usa @ para mencionar usuarios...",
  className = ""
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<CompanyUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);
    
    // Detectar si se está escribiendo una mención
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      setMentionQuery(query);
      
      const filtered = companyUsers.filter(user =>
        user.display_name.toLowerCase().includes(query) &&
        !mentionedUsers.some(mentioned => mentioned.user_id === user.user_id)
      );
      
      setFilteredUsers(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setFilteredUsers([]);
    }
  };

  const handleUserSelect = (user: CompanyUser) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Reemplazar la mención parcial con el nombre completo
    const beforeMention = textBeforeCursor.replace(/@\w*$/, '');
    const newValue = `${beforeMention}@${user.display_name} ${textAfterCursor}`;
    
    onChange(newValue);
    
    // Agregar usuario a la lista de mencionados
    if (!mentionedUsers.some(mentioned => mentioned.user_id === user.user_id)) {
      onMentionedUsersChange([...mentionedUsers, user]);
    }
    
    setShowSuggestions(false);
    setFilteredUsers([]);
    
    // Enfocar el textarea nuevamente
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleRemoveMention = (userId: string) => {
    const updatedMentioned = mentionedUsers.filter(user => user.user_id !== userId);
    onMentionedUsersChange(updatedMentioned);
    
    // También remover la mención del texto si existe
    const userToRemove = mentionedUsers.find(user => user.user_id === userId);
    if (userToRemove) {
      const updatedText = value.replace(new RegExp(`@${userToRemove.display_name}`, 'g'), '');
      onChange(updatedText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && filteredUsers.length > 0) {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
      // Aquí podrías agregar navegación con flechas si quieres
    }
  };

  return (
    <div className="space-y-3">
      {/* Lista de usuarios mencionados */}
      {mentionedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 font-medium">Mencionando a:</span>
          {mentionedUsers.map((user) => (
            <div
              key={user.user_id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              <span>{user.display_name}</span>
              <button
                type="button"
                onClick={() => handleRemoveMention(user.user_id)}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea con sugerencias */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`min-h-[120px] resize-y ${className}`}
        />
        
        {/* Lista de sugerencias */}
        {showSuggestions && filteredUsers.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filteredUsers.map((user) => (
              <button
                key={user.user_id}
                type="button"
                onClick={() => handleUserSelect(user)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">{user.display_name}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <p className="text-xs text-gray-500">
        Tip: Usa @ seguido del nombre para mencionar a otros usuarios de tu empresa
      </p>
    </div>
  );
};
