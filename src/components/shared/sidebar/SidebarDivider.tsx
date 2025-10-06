import React from 'react';

export const SidebarDivider: React.FC = () => {
  return (
    <div className="relative h-px my-2">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0" />
    </div>
  );
};
