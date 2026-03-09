import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const TrialExpiredBanner: React.FC = () => {
  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            Tu período de prueba ha expirado. Algunas funciones están deshabilitadas.
          </p>
        </div>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => window.open('mailto:soporte@nominapro.co?subject=Activar plan', '_blank')}
        >
          Activar plan
        </Button>
      </div>
    </div>
  );
};
