
import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <div className={`container mx-auto px-6 py-6 ${className}`}>
      {children}
    </div>
  );
};
