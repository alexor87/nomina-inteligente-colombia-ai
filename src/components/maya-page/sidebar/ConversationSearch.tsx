import React, { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ConversationSearchProps {
  onSearch: (query: string) => void;
  collapsed?: boolean;
}

export const ConversationSearch: React.FC<ConversationSearchProps> = ({ 
  onSearch, 
  collapsed = false 
}) => {
  const [query, setQuery] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      onSearch(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [onSearch]);

  if (collapsed) {
    return (
      <div className="flex items-center justify-center py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Buscar conversaciones..."
        value={query}
        onChange={handleChange}
        className="pl-9 bg-background"
      />
    </div>
  );
};
