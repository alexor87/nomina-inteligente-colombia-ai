import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { PayrollHistoryEmployee } from '@/types/payroll-history';
import { Plus, Edit, Download, Mail, Loader2 } from 'lucide-react';
import { NovedadUnifiedModal } from '@/components/payroll/novedades/NovedadUnifiedModal';
import { usePayrollNovedades } from '@/hooks/usePayrollNovedades';
import { useNovedades } from '@/hooks/useNovedades';
import { CreateNovedadData } from '@/types/novedades-enhanced';
import { calcularValorHoraExtra } from '@/utils/jornadaLegal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EditableEmployeeTableProps {
  employees: PayrollHistoryEmployee[];
  isEditMode: boolean;
  onEmployeeUpdate: (employeeId: string, updates: Partial<PayrollHistoryEmployee>) => void;
  periodId: string;
  periodData?: {
    startDate: string;
    endDate: string;
    type: string;
  };
  onNovedadChange: () => void;
}

export const EditableEmployeeTable = ({
  employees,
  isEditMode,
  onEmployeeUpdate,
  periodId,
  periodData,
  onNovedadChange
}: EditableEmployeeTableProps) => {
  const { toast } = useToast();
  const [novedadModal, setNovedadModal] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    employeeSalary: number;
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
    employeeSalary: 0
  });

  const [downloadingEmployees, setDownloadingEmployees] = useState<Set<string>>(new Set());
  const [sendingEmployees, setSendingEmployees] = useState<Set<string>>(new Set());

  const {
    loadNovedadesTotals,
    refreshEmployeeNovedades,
    getEmployeeNovedades
  } = usePayrollNovedades(periodId);

  const {
    createNovedad,
    isLoading: novedadesLoading
  } = useNovedades(periodId);

  // Cargar novedades al montar el componente
  useEffect(() => {
    if (employees.length > 0) {
      const employeeIds = employees.map(emp => emp.id);
      loadNovedadesTotals(employeeIds);
    }
  }, [employees, loadNovedadesTotals]);

  const handleOpenNovedadModal = (employee: PayrollHistoryEmployee) => {
    console.log('🎯 Opening novedad modal for employee:', {
      id: employee.id,
      name: employee.name,
      salary: employee.baseSalary
    });
    
    setNovedadModal({
      isOpen: true,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeSalary: employee.baseSalary
    });
  };

  const handleCloseNovedadModal = () => {
    setNovedadModal({
      isOpen: false,
      employeeId: '',
      employeeName: '',
      employeeSalary: 0
    });
  };

  const handleCreateNovedad = async (data: CreateNovedadData) => {
    console.log('🔄 Creating novedad with data:', data);
    
    const createData: CreateNovedadData = {
      empleado_id: novedadModal.employeeId,
      periodo_id: periodId,
      ...data
    };
    
    await createNovedad(createData, true);
    
    // Actualizar novedades para este empleado específico
    await refreshEmployeeNovedades(novedadModal.employeeId);
    
    // Trigger full refresh
    onNovedadChange();
  };

  const calculateSuggestedValue = (
    tipo: string,
    subtipo: string | undefined,
    horas?: number,
    dias?: number
  ): number | null => {
    if (!novedadModal.employeeId) return null;
    
    const employee = employees.find(emp => emp.id === novedadModal.employeeId);
    if (!employee) return null;
    
    console.log('🧮 Calculating suggested value:', {
      tipo,
      subtipo,
      horas,
      dias,
      employeeSalary: employee.baseSalary,
      periodId: periodId
    });
    
    const fechaPeriodo = new Date();
    const salarioDiario = employee.baseSalary / 30;
    const valorHoraExtra = calcularValorHoraExtra(employee.baseSalary, fechaPeriodo);
    const valorHoraRecargo = employee.baseSalary / 30 / 7.3333;
    
    switch (tipo) {
      case 'horas_extra':
        if (!horas || !subtipo) return null;
        const factors: Record<string, number> = {
          'diurnas': 1.25,
          'nocturnas': 1.75,
          'dominicales_diurnas': 2.05,
          'dominicales_nocturnas': 2.55,
          'festivas_diurnas': 2.05,
          'festivas_nocturnas': 2.55
        };
        const result = Math.round(valorHoraExtra * factors[subtipo] * horas);
        console.log(`💰 Overtime calculation: $${Math.round(valorHoraExtra)} × ${factors[subtipo]} × ${horas}h = $${result}`);
        return result;
        
      case 'recargo_nocturno':
        if (!horas || !subtipo) return null;
        const recargoFactors: Record<string, number> = {
          'nocturno': 0.35,
          'dominical': 0.80,
          'nocturno_dominical': 1.15,
          'festivo': 0.75,
          'nocturno_festivo': 1.10
        };
        const recargoResult = Math.round(valorHoraRecargo * recargoFactors[subtipo] * horas);
        console.log(`💰 Recargo calculation: $${Math.round(valorHoraRecargo)} × ${recargoFactors[subtipo]} × ${horas}h = $${recargoResult}`);
        return recargoResult;
        
      case 'vacaciones':
        if (!dias) return null;
        return Math.round(salarioDiario * dias);
        
      case 'incapacidad':
        if (!dias || !subtipo) return null;
        const percentages: Record<string, number> = {
          'comun': 0.667,
          'laboral': 1.0,
          'maternidad': 1.0
        };
        const diasPagados = subtipo === 'comun' ? Math.max(0, dias - 3) : dias;
        return Math.round(salarioDiario * percentages[subtipo] * diasPagados);
        
      case 'licencia_remunerada':
        if (!dias) return null;
        return Math.round(salarioDiario * dias);
        
      case 'ausencia':
        if (!dias) return null;
        return Math.round(salarioDiario * dias);
        
      default:
        return null;
    }
  };

  const handleDownloadVoucher = async (employee: PayrollHistoryEmployee) => {
    setDownloadingEmployees(prev => new Set(prev).add(employee.id));
    
    try {
      console.log('🚀 Descargando comprobante HISTÓRICO para:', employee.name);
      console.log('📋 Enviando datos HISTÓRICOS:', {
        employee_id: employee.id,
        period_id: periodId
      });

      const { data, error } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: {
          employee_id: employee.id,
          period_id: periodId
        }
      });

      if (error) {
        console.error('❌ Error en edge function:', error);
        throw error;
      }

      console.log('✅ PDF histórico generado exitosamente');

      // Crear blob y descargar
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante-historico-${employee.name.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "✅ Comprobante histórico descargado",
        description: `Comprobante con datos almacenados de ${employee.name} descargado correctamente`,
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('❌ Error descargando comprobante histórico:', error);
      toast({
        title: "Error al descargar",
        description: "No se pudo descargar el comprobante histórico",
        variant: "destructive"
      });
    } finally {
      setDownloadingEmployees(prev => {
        const newSet = new Set(prev);
        newSet.delete(employee.id);
        return newSet;
      });
    }
  };

  const handleResendVoucher = async (employee: PayrollHistoryEmployee) => {
    // For now, we'll ask for email in a simple prompt
    // In a real implementation, you might want to create a modal for this
    const email = prompt(`Ingresa el email para enviar el comprobante de ${employee.name}:`);
    
    if (!email) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email con formato válido",
        variant: "destructive"
      });
      return;
    }

    setSendingEmployees(prev => new Set(prev).add(employee.id));

    try {
      // First generate the voucher using historical data
      const { data: voucherData, error: voucherError } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: {
          employee_id: employee.id,
          period_id: periodId
        }
      });

      if (voucherError) throw voucherError;

      // Then send the email
      const { error: emailError } = await supabase.functions.invoke('send-voucher-email', {
        body: {
          employeeEmail: email,
          employeeName: employee.name,
          period: periodData,
          netPay: employee.netPay,
          voucherData: voucherData
        }
      });

      if (emailError) throw emailError;

      toast({
        title: "✅ Comprobante histórico enviado",
        description: `El comprobante histórico se ha enviado exitosamente a ${email}`,
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('Error sending historical voucher:', error);
      toast({
        title: "Error al enviar",
        description: "No se pudo enviar el comprobante histórico por email",
        variant: "destructive"
      });
    } finally {
      setSendingEmployees(prev => {
        const newSet = new Set(prev);
        newSet.delete(employee.id);
        return newSet;
      });
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                Empleado
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                Salario Base
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">
                Novedades
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                Neto a Pagar
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((employee) => {
              const novedades = getEmployeeNovedades(employee.id);
              const hasNovedades = novedades.hasNovedades;
              const novedadesValue = novedades.totalNeto;
              
              return (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{employee.name}</div>
                      <div className="text-sm text-gray-500">{employee.position}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(employee.baseSalary)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {hasNovedades && (
                        <div className="text-center">
                          <div className={`text-sm font-medium ${
                            novedadesValue >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(novedadesValue)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {novedades.totalDevengos > 0 && `+${formatCurrency(novedades.totalDevengos)}`}
                            {novedades.totalDeducciones > 0 && ` -${formatCurrency(novedades.totalDeducciones)}`}
                          </div>
                        </div>
                      )}
                  {isEditMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenNovedadModal(employee)}
                      className={`h-8 w-8 p-0 rounded-full border-dashed border-2 ${
                        hasNovedades 
                          ? 'border-purple-300 text-purple-600 hover:border-purple-500 hover:text-purple-700 hover:bg-purple-50'
                          : 'border-blue-300 text-blue-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      {hasNovedades ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(employee.netPay + novedadesValue)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {/* Download Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadVoucher(employee)}
                        disabled={downloadingEmployees.has(employee.id)}
                        className="h-8 w-8 p-0 border-blue-300 text-blue-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        title="Descargar comprobante histórico"
                      >
                        {downloadingEmployees.has(employee.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      
                      {/* Resend Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendVoucher(employee)}
                        disabled={sendingEmployees.has(employee.id)}
                        className="h-8 w-8 p-0 border-green-300 text-green-600 hover:border-green-500 hover:text-green-700 hover:bg-green-50"
                        title="Reenviar comprobante histórico por correo"
                      >
                        {sendingEmployees.has(employee.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Novedades */}
      <NovedadUnifiedModal
        isOpen={novedadModal.isOpen}
        onClose={handleCloseNovedadModal}
        employeeName={novedadModal.employeeName}
        employeeId={novedadModal.employeeId}
        employeeSalary={novedadModal.employeeSalary}
        periodId={periodId}
        onCreateNovedad={handleCreateNovedad}
        calculateSuggestedValue={calculateSuggestedValue}
      />
    </>
  );
};
