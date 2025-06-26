
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

interface SupportModeAlertProps {
  onGoBackToSupport: () => void;
}

export const SupportModeAlert = ({ onGoBackToSupport }: SupportModeAlertProps) => {
  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Shield className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <div className="flex items-center justify-between">
          <span className="font-medium">
            Modo Soporte Activo - Estás viendo datos de una empresa cliente
          </span>
          <Button variant="outline" size="sm" onClick={onGoBackToSupport}>
            Volver al Backoffice
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
