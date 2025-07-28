import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Settings, ArrowRight } from 'lucide-react';

interface MissingConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: string;
}

export const MissingConfigurationModal: React.FC<MissingConfigurationModalProps> = ({
  isOpen,
  onClose,
  year
}) => {
  const navigate = useNavigate();

  const handleGoToConfiguration = () => {
    navigate('/app/configuracion/legal');
    onClose();
  };

  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={onClose}
      className="max-w-md"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Configuración Legal Requerida</h2>
            <p className="text-muted-foreground">
              Para crear períodos de nómina del año {year}
            </p>
          </div>
        </div>
        
        {/* Explicación */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-800">
              Primero debes configurar los parámetros legales para el año {year}, 
              como salario mínimo, UVT, porcentajes de aportes, etc.
            </p>
          </CardContent>
        </Card>
        
        {/* Pasos a seguir */}
        <div className="space-y-3">
          <h4 className="font-medium">Pasos a seguir:</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span>
              <span>Ve a Configuración → Legal</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">2</span>
              <span>Crea un nuevo año ({year})</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">3</span>
              <span>Configura todos los parámetros legales</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">4</span>
              <span>Regresa aquí para crear los períodos</span>
            </div>
          </div>
        </div>
        
        {/* Acciones */}
        <div className="flex justify-between space-x-4">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Configurar Después
          </Button>
          
          <Button
            onClick={handleGoToConfiguration}
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Ir a Configuración Legal</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </CustomModal>
  );
};