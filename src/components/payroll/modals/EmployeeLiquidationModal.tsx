
import React, { useState, useEffect } from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { Calculator, Save, X } from 'lucide-react';

interface EmployeeLiquidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: PayrollEmployee | null;
  onUpdateEmployee: (id: string, updates: Partial<PayrollEmployee>) => void;
  canEdit: boolean;
}

export const EmployeeLiquidationModal: React.FC<EmployeeLiquidationModalProps> = ({
  isOpen,
  onClose,
  employee,
  onUpdateEmployee,
  canEdit
}) => {
  const [formData, setFormData] = useState({
    baseSalary: 0,
    workedDays: 0,
    extraHours: 0,
    disabilities: 0,
    bonuses: 0,
    absences: 0,
    deductions: 0
  });

  // useEffect optimizado para evitar loops infinitos
  useEffect(() => {
    if (employee && isOpen) {
      console.log('📝 Inicializando formData para empleado:', employee.name);
      setFormData({
        baseSalary: employee.baseSalary,
        workedDays: employee.workedDays,
        extraHours: employee.extraHours,
        disabilities: employee.disabilities,
        bonuses: employee.bonuses,
        absences: employee.absences,
        deductions: employee.deductions
      });
    }
  }, [employee?.id, isOpen]); // Solo dependemos del ID del empleado y si el modal está abierto

  const handleInputChange = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (employee) {
      console.log('💾 Guardando cambios para empleado:', employee.name);
      onUpdateEmployee(employee.id, formData);
      onClose();
    }
  };

  const calculateGrossPay = () => {
    const dailySalary = formData.baseSalary / 30;
    const workedSalary = dailySalary * formData.workedDays;
    const extraHoursPay = formData.extraHours * (formData.baseSalary / 240) * 1.25;
    return workedSalary + extraHoursPay + formData.bonuses - formData.disabilities - formData.absences;
  };

  const calculateNetPay = () => {
    const grossPay = calculateGrossPay();
    return grossPay - formData.deductions;
  };

  if (!employee) return null;

  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={onClose}
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <CustomModalHeader>
        <CustomModalTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Liquidación Individual - {employee.name}
        </CustomModalTitle>
      </CustomModalHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información del Empleado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información del Empleado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={employee.name} disabled />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input value={employee.position} disabled />
            </div>
            <div>
              <Label>EPS</Label>
              <Input value={employee.eps || 'No asignada'} disabled />
            </div>
            <div>
              <Label>AFP</Label>
              <Input value={employee.afp || 'No asignada'} disabled />
            </div>
          </CardContent>
        </Card>

        {/* Valores Editables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Valores de Liquidación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Salario Base</Label>
              <Input
                type="number"
                value={formData.baseSalary}
                onChange={(e) => handleInputChange('baseSalary', Number(e.target.value))}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Días Trabajados</Label>
              <Input
                type="number"
                value={formData.workedDays}
                onChange={(e) => handleInputChange('workedDays', Number(e.target.value))}
                disabled={!canEdit}
                max="30"
              />
            </div>
            <div>
              <Label>Horas Extra</Label>
              <Input
                type="number"
                value={formData.extraHours}
                onChange={(e) => handleInputChange('extraHours', Number(e.target.value))}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Incapacidades</Label>
              <Input
                type="number"
                value={formData.disabilities}
                onChange={(e) => handleInputChange('disabilities', Number(e.target.value))}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Bonificaciones</Label>
              <Input
                type="number"
                value={formData.bonuses}
                onChange={(e) => handleInputChange('bonuses', Number(e.target.value))}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Ausencias</Label>
              <Input
                type="number"
                value={formData.absences}
                onChange={(e) => handleInputChange('absences', Number(e.target.value))}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Deducciones Adicionales</Label>
              <Input
                type="number"
                value={formData.deductions}
                onChange={(e) => handleInputChange('deductions', Number(e.target.value))}
                disabled={!canEdit}
              />
            </div>
          </CardContent>
        </Card>

        {/* Resumen de Cálculos */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Resumen de Liquidación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Total Devengado</div>
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(calculateGrossPay())}
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-600 font-medium">Total Deducciones</div>
                <div className="text-2xl font-bold text-red-700">
                  {formatCurrency(formData.deductions)}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Neto a Pagar</div>
                <div className="text-2xl font-bold text-green-700">
                  {formatCurrency(calculateNetPay())}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        {canEdit && (
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        )}
      </div>
    </CustomModal>
  );
};
