import React from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Simple markdown parser for basic formatting
  const renderContent = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let codeBlockContent: string[] = [];
    let inCodeBlock = false;
    let codeBlockIndex = 0;

    lines.forEach((line, idx) => {
      // Code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          const code = codeBlockContent.join('\n');
          const currentIndex = codeBlockIndex;
          elements.push(
            <div key={`code-${idx}`} className="relative group my-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(code, currentIndex)}
                className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600"
              >
                {copiedIndex === currentIndex ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-gray-300" />
                )}
              </Button>
              <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 overflow-x-auto">
                <code className="text-xs text-gray-100 font-mono leading-relaxed">{code}</code>
              </pre>
            </div>
          );
          codeBlockContent = [];
          inCodeBlock = false;
          codeBlockIndex++;
        } else {
          // Start code block
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-base font-semibold text-gray-900 mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
        return;
      }

      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-lg font-bold text-gray-900 mt-4 mb-2">
            {line.replace('## ', '')}
          </h2>
        );
        return;
      }

      // Lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const content = line.trim().replace(/^[-*]\s/, '');
        elements.push(
          <div key={idx} className="flex gap-2 my-1.5 ml-2">
            <span className="text-blue-600 mt-1.5 text-xs">•</span>
            <span className="text-sm text-gray-900 leading-relaxed flex-1">{content}</span>
          </div>
        );
        return;
      }

      // Bold text
      const boldPattern = /\*\*(.*?)\*\*/g;
      if (boldPattern.test(line)) {
        const parts = line.split(boldPattern);
        elements.push(
          <p key={idx} className="text-sm text-gray-900 leading-relaxed my-1.5">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{part}</strong> : part
            )}
          </p>
        );
        return;
      }

      // Regular paragraphs
      if (line.trim()) {
        elements.push(
          <p key={idx} className="text-sm text-gray-900 leading-relaxed my-1.5">
            {line}
          </p>
        );
      } else {
        elements.push(<div key={idx} className="h-2" />);
      }
    });

    return elements;
  };

  return <div className="space-y-0.5">{renderContent()}</div>;
};
