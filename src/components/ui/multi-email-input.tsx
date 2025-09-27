import React, { useState, useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MultiEmailInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxEmails?: number;
}

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const MultiEmailInput: React.FC<MultiEmailInputProps> = ({
  value = [],
  onChange,
  placeholder = "Ingresa emails y presiona espacio o enter",
  className,
  disabled = false,
  maxEmails = 10,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addEmail = (emailToAdd: string) => {
    const trimmedEmail = emailToAdd.trim();
    
    if (!trimmedEmail) return;
    
    if (!isValidEmail(trimmedEmail)) {
      // Could add toast notification here for invalid email
      return;
    }
    
    if (value.includes(trimmedEmail)) {
      // Email already exists
      return;
    }
    
    if (value.length >= maxEmails) {
      // Max emails reached
      return;
    }
    
    onChange([...value, trimmedEmail]);
    setInputValue('');
  };

  const removeEmail = (indexToRemove: number) => {
    const newEmails = value.filter((_, index) => index !== indexToRemove);
    onChange(newEmails);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const trimmedValue = inputValue.trim();
    
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'Tab':
        e.preventDefault();
        if (trimmedValue) {
          addEmail(trimmedValue);
        }
        break;
      case 'Backspace':
        if (!inputValue && value.length > 0) {
          removeEmail(value.length - 1);
        }
        break;
    }
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      addEmail(trimmedValue);
    }
  };

  const handleContainerClick = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const emails = pastedText.split(/[,;\s]+/).filter(Boolean);
    
    emails.forEach(email => {
      if (value.length < maxEmails) {
        addEmail(email);
      }
    });
  };

  const getPlaceholderText = () => {
    if (value.length === 0) return placeholder;
    if (value.length >= maxEmails) return `Máximo ${maxEmails} emails alcanzado`;
    return "Agregar otro email...";
  };

  return (
    <div
      className={cn(
        "min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-text",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onClick={handleContainerClick}
    >
      <div className="flex flex-wrap gap-1 items-center">
        {value.map((email, index) => (
          <Badge
            key={`${email}-${index}`}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1 h-6 text-xs"
          >
            <span className="max-w-[200px] truncate">{email}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEmail(index);
                }}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        
        {value.length < maxEmails && (
          <Input
            ref={inputRef}
            type="email"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={handleInputBlur}
            onPaste={handlePaste}
            placeholder={getPlaceholderText()}
            disabled={disabled}
            className="flex-1 min-w-[120px] border-0 p-0 h-6 text-sm focus:ring-0 focus:ring-offset-0 bg-transparent"
            style={{
              outline: 'none',
              boxShadow: 'none',
            }}
          />
        )}
      </div>
    </div>
  );
};