import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Settings, ArrowRight, FileText, CheckCircle2, Play } from 'lucide-react';

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
      className="max-w-2xl"
    >
      <div className="space-y-8">
        {/* Header con gradiente */}
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">
              Configuración Legal Requerida
            </h2>
            <p className="text-muted-foreground text-lg mt-2">
              Para crear períodos de nómina del año <span className="font-semibold text-foreground">{year}</span>
            </p>
          </div>
        </div>
        
        {/* Explicación mejorada */}
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-amber-800 font-medium leading-relaxed">
                Para crear períodos de nómina del año {year}, primero debes configurar los parámetros legales como 
                <span className="font-semibold"> salario mínimo, UVT, porcentajes de aportes</span> y demás valores requeridos por la ley.
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Pasos con cards individuales */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg text-center">Sigue estos pasos:</h4>
          <div className="grid gap-3">
            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">1</div>
                  <div className="flex items-center space-x-2 text-foreground font-medium">
                    <Settings className="h-4 w-4 text-primary" />
                    <span>Ve a Configuración → Legal</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">2</div>
                  <div className="flex items-center space-x-2 text-foreground font-medium">
                    <Play className="h-4 w-4 text-primary" />
                    <span>Crea un nuevo año ({year})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">3</div>
                  <div className="flex items-center space-x-2 text-foreground font-medium">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Configura todos los parámetros legales</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-green-200 hover:border-green-300 transition-colors bg-green-50/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm font-semibold text-white">4</div>
                  <div className="flex items-center space-x-2 text-green-800 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Regresa aquí para crear los períodos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Acciones mejoradas */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12"
          >
            Configurar Después
          </Button>
          
          <Button
            onClick={handleGoToConfiguration}
            className="flex-1 h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Settings className="h-5 w-5 mr-2" />
            <span className="font-semibold">Ir a Configuración Legal</span>
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </CustomModal>
  );
};