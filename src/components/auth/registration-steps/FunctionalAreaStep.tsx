
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, X } from 'lucide-react';
import { useCompanyRegistrationStore } from '../hooks/useCompanyRegistrationStore';

interface FunctionalAreaStepProps {
  onNext: () => void;
  onCancel?: () => void;
}

export const FunctionalAreaStep = ({ onNext, onCancel }: FunctionalAreaStepProps) => {
  const { data, updateData } = useCompanyRegistrationStore();
  const [selectedArea, setSelectedArea] = useState(data.functionalArea || '');

  const functionalAreas = [
    { id: 'recursos-humanos', label: 'Recursos Humanos', icon: '👥' },
    { id: 'contabilidad', label: 'Contabilidad', icon: '📊' },
    { id: 'administrativa', label: 'Administrativa', icon: '📋' },
    { id: 'gerencia', label: 'Gerencia', icon: '👔' },
    { id: 'estudiante', label: 'Estudiante', icon: '🎓' },
    { id: 'otra', label: 'Otra', icon: '💼' },
  ];

  const handleContinue = () => {
    if (selectedArea) {
      updateData({ functionalArea: selectedArea });
      onNext();
    }
  };

  return (
    <Card className="w-full max-w-lg mx-4 animate-fade-in relative">
      {onCancel && (
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      )}
      
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Users className="h-6 w-6 text-blue-600 mr-2" />
          <CardTitle>¿En qué área trabajas?</CardTitle>
        </div>
        <p className="text-gray-600">
          Esto nos ayuda a personalizar tu experiencia
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {functionalAreas.map((area) => (
            <div
              key={area.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                selectedArea === area.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedArea(area.id)}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{area.icon}</div>
                <p className="font-medium text-sm">{area.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4">
          {onCancel && (
            <Button 
              onClick={onCancel}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
          )}
          <Button 
            onClick={handleContinue} 
            disabled={!selectedArea}
            className="flex-1"
          >
            Continuar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
