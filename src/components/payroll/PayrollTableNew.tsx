
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PayrollEmployee } from '@/types/payroll';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Edit, Trash2, Plus } from 'lucide-react';
import { NovedadUnifiedModal } from './novedades/NovedadUnifiedModal';

interface PayrollTableNewProps {
  employees: PayrollEmployee[];
  onRemoveEmployee: (employeeId: string) => void;
  onCreateNovedad: (employeeId: string, novedadData: any) => void;
  onRecalculate: (employeeId: string) => void;
  periodId: string;
  canEdit: boolean;
  selectedEmployees: string[];
  onToggleEmployee: (employeeId: string) => void;
  onToggleAll: () => void;
}

export const PayrollTableNew = ({ 
  employees, 
  onRemoveEmployee, 
  onCreateNovedad, 
  onRecalculate,
  periodId,
  canEdit,
  selectedEmployees,
  onToggleEmployee,
  onToggleAll
}: PayrollTableNewProps) => {
  const { toast } = useToast();
  const [isGeneratingVoucher, setIsGeneratingVoucher] = useState<string | null>(null);
  const [novedadModalOpen, setNovedadModalOpen] = useState(false);
  const [selectedEmployeeForNovedad, setSelectedEmployeeForNovedad] = useState<string | null>(null);
  const checkboxRef = useRef<HTMLButtonElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleGenerateVoucher = async (employee: PayrollEmployee) => {
    setIsGeneratingVoucher(employee.id);
    
    try {
      console.log('🎨 Generando comprobante HISTÓRICO usando datos almacenados...');
      console.log('👤 Empleado:', employee.name);
      console.log('📅 Período:', periodId);

      // Enviar employee_id y period_id para consultar datos históricos
      const voucherData = {
        employee_id: employee.id,
        period_id: periodId
      };

      console.log('📋 Datos enviados a la edge function HISTÓRICA:', voucherData);

      const { data, error } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: voucherData
      });

      if (error) {
        console.error('❌ Error en edge function:', error);
        throw error;
      }

      // Crear blob para descarga
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comprobante-historico-${employee.name?.replace(/\s+/g, '-') || 'empleado'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "✅ Comprobante HISTÓRICO generado",
        description: `Comprobante con datos almacenados de ${employee.name} descargado correctamente`,
      });

    } catch (error) {
      console.error('❌ Error generando comprobante histórico:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el comprobante histórico. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingVoucher(null);
    }
  };

  const handleOpenNovedadModal = (employeeId: string) => {
    setSelectedEmployeeForNovedad(employeeId);
    setNovedadModalOpen(true);
  };

  const handleCreateNovedad = async (novedadData: any) => {
    if (selectedEmployeeForNovedad) {
      await onCreateNovedad(selectedEmployeeForNovedad, novedadData);
      setNovedadModalOpen(false);
      setSelectedEmployeeForNovedad(null);
    }
  };

  const allSelected = employees.length > 0 && selectedEmployees.length === employees.length;
  const someSelected = selectedEmployees.length > 0 && selectedEmployees.length < employees.length;

  // Update checkbox indeterminate state
  useEffect(() => {
    if (checkboxRef.current) {
      (checkboxRef.current as any).indeterminate = someSelected;
    }
  }, [someSelected]);

  if (employees.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Sin empleados</h3>
        <p className="mt-1 text-sm text-gray-500">
          No hay empleados en este período de nómina.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white shadow-sm rounded-lg border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <Checkbox
                    ref={checkboxRef}
                    checked={allSelected}
                    onCheckedChange={onToggleAll}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empleado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salario Base
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Días Trab.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Devengado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deducciones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Neto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => onToggleEmployee(employee.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.cedula || employee.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(employee.baseSalary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.workedDays || 30}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(employee.grossPay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(employee.deductions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(employee.netPay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getStatusColor(employee.status || 'valid')}>
                      {employee.status === 'valid' ? 'Válido' : 
                       employee.status === 'warning' ? 'Advertencia' : 
                       employee.status === 'error' ? 'Error' : 
                       employee.status === 'incomplete' ? 'Incompleto' : 'Válido'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateVoucher(employee)}
                      disabled={isGeneratingVoucher === employee.id}
                      title="Generar comprobante con datos históricos almacenados"
                    >
                      {isGeneratingVoucher === employee.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    
                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenNovedadModal(employee.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRecalculate(employee.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRemoveEmployee(employee.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Novedad */}
      <NovedadUnifiedModal
        isOpen={novedadModalOpen}
        onClose={() => {
          setNovedadModalOpen(false);
          setSelectedEmployeeForNovedad(null);
        }}
        onCreateNovedad={handleCreateNovedad}
        employeeId={selectedEmployeeForNovedad || ''}
        employeeName={employees.find(emp => emp.id === selectedEmployeeForNovedad)?.name || ''}
        employeeSalary={employees.find(emp => emp.id === selectedEmployeeForNovedad)?.baseSalary || 0}
        periodId={periodId}
      />
    </div>
  );
};
