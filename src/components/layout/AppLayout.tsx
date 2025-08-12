
import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4">
        {children}
      </main>
    </div>
  );
};
