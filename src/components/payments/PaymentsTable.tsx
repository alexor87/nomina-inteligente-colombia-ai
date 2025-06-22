
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Edit2, Save, X } from 'lucide-react';
import { PaymentEmployee } from '@/types/payments';

interface PaymentsTableProps {
  employees: PaymentEmployee[];
  selectedEmployees: string[];
  onSelectionChange: (selected: string[]) => void;
  onMarkAsPaid: (employee: PaymentEmployee) => void;
  onRetryPayment: (employee: PaymentEmployee) => void;
  onUpdateBankAccount: (employeeId: string, accountData: any) => Promise<boolean>;
}

export const PaymentsTable = ({
  employees,
  selectedEmployees,
  onSelectionChange,
  onMarkAsPaid,
  onRetryPayment,
  onUpdateBankAccount
}: PaymentsTableProps) => {
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    bankName: '',
    accountType: 'ahorros' as 'ahorros' | 'corriente',
    accountNumber: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pagado':
        return <Badge className="bg-green-100 text-green-800">Pagado</Badge>;
      case 'pendiente':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'fallido':
        return <Badge className="bg-red-100 text-red-800">Fallido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(employees.map(emp => emp.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedEmployees, employeeId]);
    } else {
      onSelectionChange(selectedEmployees.filter(id => id !== employeeId));
    }
  };

  const startEditingAccount = (employee: PaymentEmployee) => {
    setEditingAccount(employee.id);
    setEditForm({
      bankName: employee.bankName,
      accountType: employee.accountType,
      accountNumber: employee.accountNumber
    });
  };

  const saveAccountChanges = async (employeeId: string) => {
    const success = await onUpdateBankAccount(employeeId, editForm);
    if (success) {
      setEditingAccount(null);
    }
  };

  const cancelEditing = () => {
    setEditingAccount(null);
    setEditForm({ bankName: '', accountType: 'ahorros', accountNumber: '' });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedEmployees.length === employees.length && employees.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Tipo y N° Cuenta</TableHead>
              <TableHead>Neto a pagar</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Medio de pago</TableHead>
              <TableHead>Fecha de pago</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedEmployees.includes(employee.id)}
                    onCheckedChange={(checked) => handleSelectEmployee(employee.id, checked as boolean)}
                  />
                </TableCell>
                
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">{employee.name}</div>
                    <div className="text-sm text-gray-500">{employee.position}</div>
                    {employee.costCenter && (
                      <div className="text-xs text-gray-400">{employee.costCenter}</div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  {editingAccount === employee.id ? (
                    <Select
                      value={editForm.bankName}
                      onValueChange={(value) => setEditForm({...editForm, bankName: value})}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                        <SelectItem value="Banco de Bogotá">Banco de Bogotá</SelectItem>
                        <SelectItem value="Davivienda">Davivienda</SelectItem>
                        <SelectItem value="Nequi">Nequi</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm">{employee.bankName}</span>
                  )}
                </TableCell>

                <TableCell>
                  {editingAccount === employee.id ? (
                    <div className="space-y-2">
                      <Select
                        value={editForm.accountType}
                        onValueChange={(value) => setEditForm({...editForm, accountType: value as any})}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ahorros">Ahorros</SelectItem>
                          <SelectItem value="corriente">Corriente</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={editForm.accountNumber}
                        onChange={(e) => setEditForm({...editForm, accountNumber: e.target.value})}
                        placeholder="N° de cuenta"
                        className="w-32"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm capitalize">{employee.accountType}</div>
                      <div className="text-sm font-mono">{employee.accountNumber}</div>
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  <span className="font-medium">{formatCurrency(employee.netPay)}</span>
                </TableCell>

                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(employee.paymentStatus)}
                    {employee.paymentStatus === 'fallido' && employee.errorReason && (
                      <div className="text-xs text-red-600" title={employee.errorReason}>
                        <AlertCircle className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-sm capitalize">{employee.paymentMethod}</span>
                </TableCell>

                <TableCell>
                  <div>
                    {employee.paymentDate && (
                      <div className="text-sm">{new Date(employee.paymentDate).toLocaleDateString('es-CO')}</div>
                    )}
                    {employee.confirmedBy && (
                      <div className="text-xs text-gray-500">Por: {employee.confirmedBy}</div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center space-x-2">
                    {editingAccount === employee.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveAccountChanges(employee.id)}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {employee.paymentStatus === 'pendiente' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onMarkAsPaid(employee)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {employee.paymentStatus === 'fallido' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditingAccount(employee)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onRetryPayment(employee)}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {employees.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay empleados para mostrar
        </div>
      )}
    </div>
  );
};
