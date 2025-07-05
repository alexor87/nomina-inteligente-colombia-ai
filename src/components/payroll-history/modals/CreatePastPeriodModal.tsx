
/**
 * 📅 MODAL DE CREACIÓN DE PERÍODO PASADO - ALELUYA
 * Para migración de datos históricos con interfaz profesional
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar,
  Plus,
  Info,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface CreatePastPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (periodData: {
    periodName: string;
    startDate: string;
    endDate: string;
    type: 'quincenal' | 'mensual' | 'semanal';
    employees: Array<{
      employeeId: string;
      baseSalary: number;
      grossPay: number;
      deductions: number;
      netPay: number;
    }>;
  }) => Promise<void>;
  isLoading: boolean;
}

export const CreatePastPeriodModal: React.FC<CreatePastPeriodModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading
}) => {
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
  const [formData, setFormData] = useState({
    periodName: '',
    startDate: '',
    endDate: '',
    type: '' as 'quincenal' | 'mensual' | 'semanal' | ''
  });

  const handleSubmit = async () => {
    if (!formData.periodName || !formData.startDate || !formData.endDate || !formData.type) {
      return;
    }
    
    setStep('processing');
    
    try {
      // Simular datos de empleados (en implementación real vendría de un formulario más complejo)
      const employeesData = [
        {
          employeeId: 'emp-1',
          baseSalary: 1300000,
          grossPay: 1300000,
          deductions: 104000,
          netPay: 1196000
        }
      ];

      await onSubmit({
        periodName: formData.periodName,
        startDate: formData.startDate,
        endDate: formData.endDate,
        type: formData.type,
        employees: employeesData
      });
      
      setStep('success');
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (error) {
      setStep('form');
    }
  };

  const handleClose = () => {
    setFormData({
      periodName: '',
      startDate: '',
      endDate: '',
      type: ''
    });
    setStep('form');
    onClose();
  };

  const canSubmit = formData.periodName && formData.startDate && formData.endDate && formData.type;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <span>Crear Período Pasado</span>
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Migración de datos:</strong> Crea períodos pasados para migrar 
                información histórica de nómina de otros sistemas.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Período</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="periodName">
                    Nombre del período *
                  </Label>
                  <Input
                    id="periodName"
                    placeholder="Ej: Enero 2024, 1-15 Junio 2024"
                    value={formData.periodName}
                    onChange={(e) => setFormData(prev => ({ ...prev, periodName: e.target.value }))}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">
                      Fecha de inicio *
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">
                      Fecha de fin *
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="type">
                    Tipo de período *
                  </Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: 'quincenal' | 'mensual' | 'semanal') => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Alert className="border-yellow-200 bg-yellow-50">
              <Info className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Próximos pasos:</strong> Después de crear el período, podrás 
                importar los datos de empleados desde Excel o ingresarlos manualmente.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Período Pasado
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
              <h3 className="text-lg font-medium">Creando período pasado...</h3>
              <p className="text-gray-600">
                Configurando estructura de datos históricos
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-12">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h3 className="text-lg font-medium text-green-800">
                ¡Período pasado creado exitosamente!
              </h3>
              <p className="text-gray-600">
                Ya puedes empezar a migrar los datos de empleados
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
