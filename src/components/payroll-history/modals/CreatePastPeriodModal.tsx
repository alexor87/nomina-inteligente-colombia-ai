
/**
 * 📅 MODAL CREAR PERÍODO PASADO - ALELUYA
 * Para migración de datos históricos de nómina
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
  Upload,
  Plus,
  CheckCircle,
  Loader2,
  Info
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
  const [formData, setFormData] = useState({
    periodName: '',
    startDate: '',
    endDate: '',
    type: 'mensual' as 'quincenal' | 'mensual' | 'semanal',
    employees: [] as Array<{
      employeeId: string;
      baseSalary: number;
      grossPay: number;
      deductions: number;
      netPay: number;
    }>
  });

  const [step, setStep] = useState<'basic' | 'employees' | 'confirm'>('basic');

  const handleBasicDataNext = () => {
    if (formData.periodName && formData.startDate && formData.endDate) {
      setStep('employees');
    }
  };

  const handleEmployeesNext = () => {
    // Por ahora, crear empleados de ejemplo para demostración
    const sampleEmployees = [
      {
        employeeId: 'emp-1',
        baseSalary: 1200000,
        grossPay: 1200000,
        deductions: 96000,
        netPay: 1104000
      },
      {
        employeeId: 'emp-2', 
        baseSalary: 1500000,
        grossPay: 1500000,
        deductions: 120000,
        netPay: 1380000
      }
    ];
    
    setFormData(prev => ({ ...prev, employees: sampleEmployees }));
    setStep('confirm');
  };

  const handleSubmit = async () => {
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      // Error manejado por el hook
    }
  };

  const handleClose = () => {
    setFormData({
      periodName: '',
      startDate: '',
      endDate: '',
      type: 'mensual',
      employees: []
    });
    setStep('basic');
    onClose();
  };

  const generatePeriodName = () => {
    if (!formData.startDate) return '';
    
    const date = new Date(formData.startDate);
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    if (formData.type === 'mensual') {
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    } else if (formData.type === 'quincenal') {
      const day = date.getDate();
      if (day <= 15) {
        return `1 - 15 ${months[date.getMonth()]} ${date.getFullYear()}`;
      } else {
        return `16 - 30 ${months[date.getMonth()]} ${date.getFullYear()}`;
      }
    }
    return formData.periodName;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Crear Período Pasado</span>
          </DialogTitle>
        </DialogHeader>

        {step === 'basic' && (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Utiliza esta función para migrar datos históricos de nómina a NomiVale.
                Los períodos pasados se crearán en estado "Cerrado".
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Información Básica del Período</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Fecha de Inicio *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, startDate: e.target.value }));
                        // Auto-generar nombre del período
                        setTimeout(() => {
                          const generated = generatePeriodName();
                          if (generated) {
                            setFormData(prev => ({ ...prev, periodName: generated }));
                          }
                        }, 100);
                      }}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">Fecha de Fin *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Tipo de Período *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'quincenal' | 'mensual' | 'semanal') => 
                        setFormData(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensual">Mensual</SelectItem>
                        <SelectItem value="quincenal">Quincenal</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="periodName">Nombre del Período *</Label>
                    <Input
                      id="periodName"
                      placeholder="Ej: Enero 2024"
                      value={formData.periodName}
                      onChange={(e) => setFormData(prev => ({ ...prev, periodName: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleBasicDataNext}
                disabled={!formData.periodName || !formData.startDate || !formData.endDate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Siguiente: Empleados
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'employees' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Datos de Empleados</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    En una implementación completa, aquí podrías subir un archivo Excel 
                    con los datos de nómina histórica. Por ahora, se crearán empleados de ejemplo.
                  </AlertDescription>
                </Alert>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Subir Archivo de Nómina
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Arrastra aquí tu archivo Excel o CSV con los datos históricos
                  </p>
                  <Button variant="outline" disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    Seleccionar Archivo
                  </Button>
                  <p className="text-sm text-gray-500 mt-2">
                    Formatos soportados: .xlsx, .csv
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Para esta demo, se usarán datos de ejemplo
                  </p>
                  <Button 
                    onClick={handleEmployeesNext}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Usar Datos de Ejemplo
                  </Button>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('basic')}>
                Regresar
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Confirmar Creación del Período</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2">
                    Resumen del Período
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Nombre:</strong> {formData.periodName}</p>
                      <p><strong>Tipo:</strong> {formData.type}</p>
                    </div>
                    <div>
                      <p><strong>Inicio:</strong> {formData.startDate}</p>
                      <p><strong>Fin:</strong> {formData.endDate}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">
                    Empleados ({formData.employees.length})
                  </h3>
                  <div className="space-y-2">
                    {formData.employees.map((emp, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>Empleado {index + 1}</span>
                        <span className="font-semibold">
                          ${emp.netPay.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-green-300 mt-2 pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total Nómina:</span>
                      <span>
                        ${formData.employees.reduce((sum, emp) => sum + emp.netPay, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Importante:</strong> Este período se creará en estado "Cerrado" 
                    y aparecerá en tu historial de nómina.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('employees')}>
                Regresar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Crear Período Pasado
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
