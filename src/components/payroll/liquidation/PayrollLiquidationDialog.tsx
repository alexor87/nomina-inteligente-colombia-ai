import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  Users, 
  DollarSign, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail
} from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';

interface PayrollLiquidationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onPreview?: () => void;
  period: {
    label: string;
    startDate: string;
    endDate: string;
  };
  employees: PayrollEmployee[];
  isLiquidating: boolean;
  validationResults?: {
    hasIncompleteNovelties: boolean;
    hasUnusualAmounts: boolean;
    legalCompliance: boolean;
    issues: string[];
  };
  autoSendEmails?: boolean;
  onAutoSendChange?: (enabled: boolean) => void;
}

export const PayrollLiquidationDialog: React.FC<PayrollLiquidationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onPreview,
  period,
  employees,
  isLiquidating,
  validationResults,
  autoSendEmails = true,
  onAutoSendChange
}) => {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(
    employees.map(e => e.id)
  );
  
  const totalGrossPay = employees
    .filter(emp => selectedEmployees.includes(emp.id))
    .reduce((sum, emp) => sum + emp.grossPay, 0);
    
  const totalDeductions = employees
    .filter(emp => selectedEmployees.includes(emp.id))
    .reduce((sum, emp) => sum + emp.deductions, 0);
    
  const totalNetPay = employees
    .filter(emp => selectedEmployees.includes(emp.id))
    .reduce((sum, emp) => sum + emp.netPay, 0);

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const hasIssues = validationResults && (
    validationResults.hasIncompleteNovelties ||
    validationResults.hasUnusualAmounts ||
    !validationResults.legalCompliance
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Confirmar Liquidación de Nómina
          </DialogTitle>
          <DialogDescription>
            Revisa cuidadosamente los detalles antes de proceder con la liquidación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Período */}
          <Card className="border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-800">Período a Liquidar</h3>
                  <p className="text-blue-700">{period.label}</p>
                  <p className="text-sm text-blue-600">
                    Del {period.startDate} al {period.endDate}
                  </p>
                </div>
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  <Clock className="h-3 w-3 mr-1" />
                  En Proceso
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Alertas de Validación */}
          {hasIssues && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800">Advertencias Encontradas</h3>
                    <ul className="mt-2 space-y-1 text-sm text-amber-700">
                      {validationResults?.issues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumen de Totales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Devengado</p>
                    <p className="text-lg font-semibold text-green-700">
                      {formatCurrency(totalGrossPay)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <DollarSign className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Deducciones</p>
                    <p className="text-lg font-semibold text-red-700">
                      {formatCurrency(totalDeductions)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Neto</p>
                    <p className="text-lg font-semibold text-blue-700">
                      {formatCurrency(totalNetPay)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Empleados */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Empleados Seleccionados ({selectedEmployees.length})
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEmployees(employees.map(e => e.id))}
                  >
                    Seleccionar Todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEmployees([])}
                  >
                    Deseleccionar Todos
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedEmployees.includes(employee.id)
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => handleEmployeeToggle(employee.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        selectedEmployees.includes(employee.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedEmployees.includes(employee.id) && (
                          <CheckCircle className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.position}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(employee.netPay)}</p>
                      <p className="text-sm text-muted-foreground">
                        {employee.status === 'valid' ? 'Válido' : 'Con Errores'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Opciones de Liquidación */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Opciones de Liquidación</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSendEmails}
                    onChange={(e) => onAutoSendChange?.(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span>Enviar comprobantes por email automáticamente</span>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLiquidating}>
            Cancelar
          </Button>
          
          {onPreview && (
            <Button
              variant="outline"
              onClick={onPreview}
              disabled={isLiquidating || selectedEmployees.length === 0}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Vista Previa
            </Button>
          )}
          
          <Button
            onClick={onConfirm}
            disabled={isLiquidating || selectedEmployees.length === 0}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            {isLiquidating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Liquidando...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4" />
                Liquidar Nómina ({selectedEmployees.length} empleados)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};