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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Mail, 
  Eye,
  Calculator,
  Building,
  User,
  Calendar
} from 'lucide-react';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';

interface PayrollPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: PayrollEmployee[];
  period: {
    label: string;
    startDate: string;
    endDate: string;
  };
  company: {
    name: string;
    nit: string;
    address?: string;
  };
  onDownloadVoucher?: (employeeId: string) => void;
  onSendEmail?: (employeeId: string) => void;
  onDownloadAll?: () => void;
  onSendAllEmails?: () => void;
}

interface VoucherPreviewProps {
  employee: PayrollEmployee;
  period: PayrollPreviewModalProps['period'];
  company: PayrollPreviewModalProps['company'];
  onDownload?: () => void;
  onSendEmail?: () => void;
}

const VoucherPreview: React.FC<VoucherPreviewProps> = ({
  employee,
  period,
  company,
  onDownload,
  onSendEmail
}) => {
  return (
    <div className="bg-white border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="text-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800">{company.name}</h2>
        <p className="text-sm text-gray-600">NIT: {company.nit}</p>
        {company.address && (
          <p className="text-sm text-gray-600">{company.address}</p>
        )}
        <div className="mt-3">
          <h3 className="text-lg font-semibold text-blue-700">
            COMPROBANTE DE PAGO DE NÓMINA
          </h3>
          <p className="text-sm text-gray-600">
            Período: {period.startDate} al {period.endDate}
          </p>
        </div>
      </div>

      {/* Employee Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Información del Empleado</h4>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Nombre:</span> {employee.name}</p>
            <p><span className="font-medium">Cargo:</span> {employee.position}</p>
            <p><span className="font-medium">Salario Base:</span> {formatCurrency(employee.baseSalary)}</p>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Período Laborado</h4>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Días Trabajados:</span> {employee.workedDays}</p>
            <p><span className="font-medium">Auxilio Transporte / Conectividad:</span> {formatCurrency(employee.transportAllowance)}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Devengado */}
      <div>
        <h4 className="font-semibold text-green-700 mb-3">DEVENGADO</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Salario Básico:</span>
              <span>{formatCurrency(employee.baseSalary)}</span>
            </div>
            <div className="flex justify-between">
              <span>Aux. de Transporte / Conectividad:</span>
              <span>{formatCurrency(employee.transportAllowance)}</span>
            </div>
            <div className="flex justify-between">
              <span>Horas Extras:</span>
              <span>{formatCurrency(employee.extraHours * 50000)}</span>
            </div>
            <div className="flex justify-between">
              <span>Bonificaciones:</span>
              <span>{formatCurrency(employee.bonuses)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Incapacidades:</span>
              <span>{formatCurrency(employee.disabilities)}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between font-semibold text-green-700 mt-3 pt-2 border-t">
          <span>TOTAL DEVENGADO:</span>
          <span>{formatCurrency(employee.grossPay)}</span>
        </div>
      </div>

      <Separator />

      {/* Deducciones */}
      <div>
        <h4 className="font-semibold text-red-700 mb-3">DEDUCCIONES</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Salud (4%):</span>
              <span>{formatCurrency(employee.healthDeduction)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pensión (4%):</span>
              <span>{formatCurrency(employee.pensionDeduction)}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between font-semibold text-red-700 mt-3 pt-2 border-t">
          <span>TOTAL DEDUCCIONES:</span>
          <span>{formatCurrency(employee.deductions)}</span>
        </div>
      </div>

      <Separator />

      {/* Neto a Pagar */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-blue-800">NETO A PAGAR:</span>
          <span className="text-xl font-bold text-blue-800">
            {formatCurrency(employee.netPay)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3 pt-4">
        {onDownload && (
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
        )}
        {onSendEmail && (
          <Button variant="outline" size="sm" onClick={onSendEmail}>
            <Mail className="h-4 w-4 mr-2" />
            Enviar por Email
          </Button>
        )}
      </div>
    </div>
  );
};

export const PayrollPreviewModal: React.FC<PayrollPreviewModalProps> = ({
  isOpen,
  onClose,
  employees,
  period,
  company,
  onDownloadVoucher,
  onSendEmail,
  onDownloadAll,
  onSendAllEmails
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    employees[0]?.id || ''
  );

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            Vista Previa de Comprobantes de Pago
          </DialogTitle>
          <DialogDescription>
            Revisa los comprobantes antes de la liquidación final
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Período */}
          <Card className="border-blue-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">{company.name}</p>
                    <p className="text-sm text-blue-600">NIT: {company.nit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">{period.label}</p>
                    <p className="text-sm text-green-600">
                      {period.startDate} al {period.endDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-purple-800">
                      {employees.length} Empleados
                    </p>
                    <p className="text-sm text-purple-600">Para liquidar</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="individual" className="space-y-4">
            <TabsList>
              <TabsTrigger value="individual">Vista Individual</TabsTrigger>
              <TabsTrigger value="summary">Resumen General</TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Lista de Empleados */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-sm">Seleccionar Empleado</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {employees.map((employee) => (
                        <button
                          key={employee.id}
                          onClick={() => setSelectedEmployeeId(employee.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedEmployeeId === employee.id
                              ? 'bg-blue-50 border-blue-200'
                              : 'hover:bg-gray-50 border-gray-200'
                          }`}
                        >
                          <p className="font-medium text-sm">{employee.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {employee.position}
                          </p>
                          <p className="text-xs font-medium text-green-600">
                            {formatCurrency(employee.netPay)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Comprobante Preview */}
                <div className="lg:col-span-3">
                  {selectedEmployee && (
                    <VoucherPreview
                      employee={selectedEmployee}
                      period={period}
                      company={company}
                      onDownload={() => onDownloadVoucher?.(selectedEmployee.id)}
                      onSendEmail={() => onSendEmail?.(selectedEmployee.id)}
                    />
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Resumen de Liquidación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Totales */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-700">
                          {formatCurrency(employees.reduce((sum, emp) => sum + emp.grossPay, 0))}
                        </p>
                        <p className="text-sm text-green-600">Total Devengado</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-700">
                          {formatCurrency(employees.reduce((sum, emp) => sum + emp.deductions, 0))}
                        </p>
                        <p className="text-sm text-red-600">Total Deducciones</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-700">
                          {formatCurrency(employees.reduce((sum, emp) => sum + emp.netPay, 0))}
                        </p>
                        <p className="text-sm text-blue-600">Total Neto</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-700">
                          {formatCurrency(employees.reduce((sum, emp) => sum + emp.employerContributions, 0))}
                        </p>
                        <p className="text-sm text-purple-600">Aportes Patronales</p>
                      </div>
                    </div>

                    {/* Lista resumen */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 font-medium text-sm">
                        Resumen por Empleado
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {employees.map((employee, index) => (
                          <div
                            key={employee.id}
                            className={`flex justify-between items-center px-4 py-3 ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                          >
                            <div>
                              <p className="font-medium">{employee.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {employee.position}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-blue-700">
                                {formatCurrency(employee.netPay)}
                              </p>
                              <Badge 
                                variant={employee.status === 'valid' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {employee.status === 'valid' ? 'Válido' : 'Con Errores'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          
          {onDownloadAll && (
            <Button
              variant="outline"
              onClick={onDownloadAll}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Descargar Todos
            </Button>
          )}
          
          {onSendAllEmails && (
            <Button
              onClick={onSendAllEmails}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Enviar Todos por Email
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};