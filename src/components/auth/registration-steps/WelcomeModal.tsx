
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Sparkles } from 'lucide-react';

interface WelcomeModalProps {
  onNext: () => void;
}

export const WelcomeModal = ({ onNext }: WelcomeModalProps) => {
  const [selectedRole, setSelectedRole] = useState<'empresa' | null>(null);

  const handleContinue = () => {
    if (selectedRole === 'empresa') {
      onNext();
    }
  };

  return (
    <Card className="w-full max-w-md mx-4 animate-scale-in">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-blue-600 mr-2" />
          <CardTitle className="text-2xl">¡Bienvenido!</CardTitle>
        </div>
        <p className="text-gray-600">
          Cuéntanos un poco sobre ti para personalizar tu experiencia
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="font-medium text-gray-900">¿Cuál es tu rol?</p>
          
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedRole === 'empresa' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedRole('empresa')}
          >
            <div className="flex items-center">
              <Building2 className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <p className="font-medium">Empresa</p>
                <p className="text-sm text-gray-600">Gestiono nómina y empleados</p>
              </div>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleContinue}
          disabled={selectedRole !== 'empresa'}
          className="w-full"
        >
          Continuar
        </Button>
      </CardContent>
    </Card>
  );
};
