
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle, User, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PayrollEmployee } from '@/types/payroll';

interface PayrollTableProps {
  employees: PayrollEmployee[];
  onUpdateEmployee: (id: string, field: string, value: number) => void;
  isLoading: boolean;
}

export const PayrollTable = ({ employees, onUpdateEmployee, isLoading }: PayrollTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (employee: PayrollEmployee) => {
    switch (employee.status) {
      case 'valid':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Válido
          </Badge>
        );
      case 'error':
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-red-100 text-red-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {employee.errors.map((error, idx) => (
                  <p key={idx} className="text-xs">{error}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      case 'incomplete':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Incompleto
          </Badge>
        );
    }
  };

  const EditableCell = ({ 
    value, 
    onSave, 
    type = 'number',
    className = '' 
  }: { 
    value: number; 
    onSave: (value: number) => void; 
    type?: string;
    className?: string;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value.toString());

    const handleSave = () => {
      const numValue = parseFloat(tempValue) || 0;
      onSave(numValue);
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setTempValue(value.toString());
        setIsEditing(false);
      }
    };

    if (isEditing) {
      return (
        <Input
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
          autoFocus
        />
      );
    }

    return (
      <div 
        className={`cursor-pointer hover:bg-gray-50 p-2 rounded text-sm ${className}`}
        onClick={() => {
          setIsEditing(true);
          setTempValue(value.toString());
        }}
      >
        {type === 'currency' ? formatCurrency(value) : value}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar empleado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredEmployees.length} empleados
          </div>
        </div>

        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Importar novedades
        </Button>
      </div>

      {/* Tabla */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead className="w-48">Empleado</TableHead>
              <TableHead className="w-24">Días</TableHead>
              <TableHead className="w-24">H. Extra</TableHead>
              <TableHead className="w-24">Incap.</TableHead>
              <TableHead className="w-32">Bonific.</TableHead>
              <TableHead className="w-24">Ausenc.</TableHead>
              <TableHead className="w-32">Devengado</TableHead>
              <TableHead className="w-32">Deducc.</TableHead>
              <TableHead className="w-32">Neto</TableHead>
              <TableHead className="w-24">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((employee) => (
              <TableRow key={employee.id} className="hover:bg-gray-50">
                <TableCell>
                  <div>
                    <div className="font-medium text-sm">{employee.name}</div>
                    <div className="text-xs text-gray-500">{employee.position}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <EditableCell
                    value={employee.workedDays}
                    onSave={(value) => onUpdateEmployee(employee.id, 'workedDays', value)}
                  />
                </TableCell>
                <TableCell>
                  <EditableCell
                    value={employee.extraHours}
                    onSave={(value) => onUpdateEmployee(employee.id, 'extraHours', value)}
                  />
                </TableCell>
                <TableCell>
                  <EditableCell
                    value={employee.disabilities}
                    onSave={(value) => onUpdateEmployee(employee.id, 'disabilities', value)}
                  />
                </TableCell>
                <TableCell>
                  <EditableCell
                    value={employee.bonuses}
                    onSave={(value) => onUpdateEmployee(employee.id, 'bonuses', value)}
                    type="currency"
                  />
                </TableCell>
                <TableCell>
                  <EditableCell
                    value={employee.absences}
                    onSave={(value) => onUpdateEmployee(employee.id, 'absences', value)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(employee.grossPay)}
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(employee.deductions)}
                </TableCell>
                <TableCell className="font-bold">
                  {formatCurrency(employee.netPay)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(employee)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};
