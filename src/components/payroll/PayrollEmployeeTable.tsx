
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Users, 
  Calculator, 
  Edit,
  FileText,
  Eye,
  Mail,
  StickyNote
} from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';
import { NovedadDrawer } from './novedades/NovedadDrawer';
import { EmployeeLiquidationModal } from './modals/EmployeeLiquidationModal';
import { EmployeeCalculationModal } from './modals/EmployeeCalculationModal';
import { VoucherPreviewModal } from './modals/VoucherPreviewModal';
import { VoucherSendDialog } from './modals/VoucherSendDialog';
import { EmployeeNotesModal } from './notes/EmployeeNotesModal';

interface PayrollEmployeeTableProps {
  employees: PayrollEmployee[];
  currentPeriod: any;
  isLoading?: boolean;
  onEmployeeUpdate?: (employeeId: string, updates: Partial<PayrollEmployee>) => void;
  onRecalculate?: (employeeId: string) => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const PayrollEmployeeTable: React.FC<PayrollEmployeeTableProps> = ({
  employees,
  currentPeriod,
  isLoading = false,
  onEmployeeUpdate,
  onRecalculate
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  const [showNovedadDrawer, setShowNovedadDrawer] = useState(false);
  const [showLiquidationModal, setShowLiquidationModal] = useState(false);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [showVoucherPreview, setShowVoucherPreview] = useState(false);
  const [showVoucherSend, setShowVoucherSend] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);

  const handleEmployeeAction = (employee: PayrollEmployee, action: string) => {
    setSelectedEmployee(employee);
    
    switch (action) {
      case 'novedades':
        setShowNovedadDrawer(true);
        break;
      case 'liquidation':
        setShowLiquidationModal(true);
        break;
      case 'calculation':
        setShowCalculationModal(true);
        break;
      case 'voucher-preview':
        setShowVoucherPreview(true);
        break;
      case 'voucher-send':
        setShowVoucherSend(true);
        break;
      case 'notes':
        setShowNotesModal(true);
        break;
      case 'recalculate':
        if (onRecalculate) {
          onRecalculate(employee.id);
        }
        break;
    }
  };

  const handleCloseModals = () => {
    setSelectedEmployee(null);
    setShowNovedadDrawer(false);
    setShowLiquidationModal(false);
    setShowCalculationModal(false);
    setShowVoucherPreview(false);
    setShowVoucherSend(false);
    setShowNotesModal(false);
  };

  const handleEmployeeUpdate = (employeeId: string, updates: Partial<PayrollEmployee>) => {
    if (onEmployeeUpdate) {
      onEmployeeUpdate(employeeId, updates);
    }
    handleCloseModals();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Cargando empleados...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (employees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Empleados
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay empleados en este período
          </h3>
          <p className="text-gray-600">
            Los empleados se cargarán automáticamente cuando estén disponibles para el período.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Empleados ({employees.length})
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Sistema Completo ✓
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-right">Salario Base</TableHead>
                  <TableHead className="text-right">Devengado</TableHead>
                  <TableHead className="text-right">Deducciones</TableHead>
                  <TableHead className="text-right">Neto a Pagar</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.position}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(employee.baseSalary)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(employee.grossPay)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(employee.deductions)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(employee.netPay)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={employee.status === 'valid' ? 'default' : 'secondary'}
                        className={employee.status === 'valid' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {employee.status === 'valid' ? 'Válido' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEmployeeAction(employee, 'novedades')}
                          title="Gestionar novedades"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEmployeeAction(employee, 'liquidation')}
                          title="Liquidación individual"
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEmployeeAction(employee, 'calculation')}
                          title="Ver cálculos detallados"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEmployeeAction(employee, 'voucher-preview')}
                          title="Vista previa del comprobante"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEmployeeAction(employee, 'voucher-send')}
                          title="Enviar comprobante"
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEmployeeAction(employee, 'notes')}
                          title="Notas del empleado"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          <StickyNote className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Drawer de Novedades */}
      <NovedadDrawer
        isOpen={showNovedadDrawer}
        onClose={handleCloseModals}
        employee={selectedEmployee}
        period={currentPeriod}
        onNovedadCreated={() => {
          // Callback cuando se crea una novedad
          if (selectedEmployee && onRecalculate) {
            onRecalculate(selectedEmployee.id);
          }
        }}
      />

      {/* Modal de Liquidación Individual */}
      {selectedEmployee && (
        <EmployeeLiquidationModal
          isOpen={showLiquidationModal}
          onClose={handleCloseModals}
          employee={selectedEmployee}
          periodId={currentPeriod?.id || ''}
          onUpdateEmployee={handleEmployeeUpdate}
          canEdit={true}
        />
      )}

      {/* Modal de Cálculos */}
      {selectedEmployee && (
        <EmployeeCalculationModal
          isOpen={showCalculationModal}
          onClose={handleCloseModals}
          employee={selectedEmployee}
        />
      )}

      {/* Modal de Vista Previa del Comprobante */}
      {selectedEmployee && (
        <VoucherPreviewModal
          isOpen={showVoucherPreview}
          onClose={handleCloseModals}
          employee={selectedEmployee}
          period={{
            startDate: currentPeriod?.fecha_inicio || '',
            endDate: currentPeriod?.fecha_fin || '',
            type: currentPeriod?.tipo_periodo || 'mensual'
          }}
        />
      )}

      {/* Dialog de Envío del Comprobante */}
      {selectedEmployee && (
        <VoucherSendDialog
          isOpen={showVoucherSend}
          onClose={handleCloseModals}
          employee={selectedEmployee}
          period={{
            startDate: currentPeriod?.fecha_inicio || '',
            endDate: currentPeriod?.fecha_fin || '',
            type: currentPeriod?.tipo_periodo || 'mensual'
          }}
        />
      )}

      {/* Modal de Notas del Empleado */}
      {selectedEmployee && (
        <EmployeeNotesModal
          isOpen={showNotesModal}
          onClose={handleCloseModals}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
          periodId={currentPeriod?.id || ''}
          periodName={currentPeriod?.periodo || ''}
        />
      )}
    </>
  );
};
