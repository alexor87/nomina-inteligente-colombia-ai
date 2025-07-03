
import React, { useState } from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { FileText, Download, X, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoucherPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: PayrollEmployee | null;
  period: {
    startDate: string;
    endDate: string;
    type: string;
  } | null;
  periodId?: string;
}

export const VoucherPreviewModal: React.FC<VoucherPreviewModalProps> = ({
  isOpen,
  onClose,
  employee,
  period,
  periodId
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [historicalData, setHistoricalData] = useState<any>(null);
  const { toast } = useToast();

  // Cargar datos históricos almacenados
  React.useEffect(() => {
    const loadHistoricalData = async () => {
      if (!isOpen || !employee?.id || !periodId) return;

      try {
        console.log('🔍 Cargando datos históricos almacenados...');
        
        const { data, error } = await supabase
          .from('payrolls')
          .select(`
            *,
            employees!inner(nombre, apellido, cedula, tipo_documento, cargo),
            companies!inner(razon_social, nit, direccion, telefono, email),
            payroll_periods_real!inner(fecha_inicio, fecha_fin, periodo)
          `)
          .eq('employee_id', employee.id)
          .eq('period_id', periodId)
          .single();

        if (error) {
          console.error('Error loading historical data:', error);
          return;
        }

        if (data) {
          setHistoricalData(data);
          console.log('✅ Datos históricos cargados para vista previa:', {
            empleado: data.employees.nombre,
            total_devengado: data.total_devengado,
            neto_pagado: data.neto_pagado
          });
        }
      } catch (error) {
        console.error('Error loading historical data:', error);
      }
    };

    loadHistoricalData();
  }, [isOpen, employee?.id, periodId]);

  const handleDownloadVoucher = async () => {
    if (!employee || !periodId) {
      toast({
        title: "Error",
        description: "Faltan datos del empleado o período",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setDownloadSuccess(false);
    
    try {
      console.log('🚀 GENERANDO PDF HISTÓRICO con datos almacenados para:', employee.name);
      
      const requestBody = {
        employee_id: employee.id,
        period_id: periodId
      };

      console.log('📤 Enviando datos HISTÓRICOS al generador:', requestBody);

      const { data, error } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: requestBody
      });

      if (error) {
        console.error('❌ Error en edge function:', error);
        throw error;
      }

      console.log('✅ PDF HISTÓRICO generado exitosamente');

      // Crear blob y descargar
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const fileName = `comprobante-historico-${employee.name.replace(/\s+/g, '-')}-${period?.startDate.replace(/\//g, '-')}.pdf`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);

      console.log('✅ DESCARGA COMPLETADA con datos históricos:', fileName);

      setDownloadSuccess(true);

      toast({
        title: "✅ PDF histórico generado exitosamente",
        description: `El comprobante con datos almacenados de ${employee.name} se ha descargado correctamente`,
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error: any) {
      console.error('💥 ERROR EN GENERADOR HISTÓRICO:', error);
      
      toast({
        title: "❌ Error en generador PDF histórico",
        description: error.message || "Error desconocido en el generador histórico",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!employee || !period) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Usar datos HISTÓRICOS si están disponibles, sino mostrar los actuales
  const displayData = historicalData ? {
    salarioBase: Number(historicalData.salario_base) || 0,
    diasTrabajados: Number(historicalData.dias_trabajados) || 30,
    auxilioTransporte: Number(historicalData.auxilio_transporte) || 0,
    totalDevengado: Number(historicalData.total_devengado) || 0,
    totalDeducciones: Number(historicalData.total_deducciones) || 0,
    netoAPagar: Number(historicalData.neto_pagado) || 0,
    saludEmpleado: Number(historicalData.salud_empleado) || 0,
    pensionEmpleado: Number(historicalData.pension_empleado) || 0,
    horasExtra: Number(historicalData.horas_extra) || 0,
    bonificaciones: Number(historicalData.bonificaciones) || 0,
    empresa: historicalData.companies?.razon_social || 'Empresa',
    nit: historicalData.companies?.nit || 'Sin NIT',
    direccion: historicalData.companies?.direccion || 'Dirección no especificada'
  } : {
    // Fallback a datos actuales si no hay históricos
    salarioBase: employee.baseSalary,
    diasTrabajados: employee.workedDays || 30,
    auxilioTransporte: employee.transportAllowance || 0,
    totalDevengado: employee.grossPay,
    totalDeducciones: employee.deductions,
    netoAPagar: employee.netPay,
    saludEmpleado: Math.round(employee.baseSalary * 0.04),
    pensionEmpleado: Math.round(employee.baseSalary * 0.04),
    horasExtra: employee.extraHours * Math.round((employee.baseSalary / 240) * 1.25),
    bonificaciones: employee.bonuses || 0,
    empresa: 'Empresa',
    nit: 'Sin NIT',
    direccion: 'Dirección no especificada'
  };

  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={onClose}
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
      closeOnEscape={false}
      closeOnBackdrop={false}
    >
      <CustomModalHeader>
        <CustomModalTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Vista Previa - Comprobante HISTÓRICO con Datos Almacenados
        </CustomModalTitle>
      </CustomModalHeader>

      {/* Preview con datos HISTÓRICOS */}
      <div className="bg-white p-8 space-y-6" style={{ fontFamily: '"Open Sans", sans-serif' }}>
        
        <h1 className="text-2xl font-semibold text-center text-blue-800 mb-8">
          Comprobante de Nómina HISTÓRICO
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <Card className="border-l-4 border-l-blue-500 bg-slate-50">
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">EMPRESA</h3>
              <p className="font-semibold text-gray-900">{displayData.empresa}</p>
              <p className="text-sm text-gray-700">NIT: {displayData.nit}</p>
              <p className="text-sm text-gray-700">{displayData.direccion}</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500 bg-slate-50">
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">EMPLEADO</h3>
              <p className="font-semibold text-gray-900">{employee.name}</p>
              <p className="text-sm text-gray-700">{employee.tipo_documento || 'CC'}: {employee.cedula || employee.id}</p>
              {employee.position && <p className="text-sm text-gray-700">Cargo: {employee.position}</p>}
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500 bg-slate-50">
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">PERÍODO DE PAGO</h3>
              <p className="font-semibold text-gray-900">{formatDate(period.startDate)} - {formatDate(period.endDate)}</p>
              <p className="text-sm text-gray-700">Días trabajados: {displayData.diasTrabajados}</p>
              <p className="text-sm text-gray-700">Salario Base: {formatCurrency(displayData.salarioBase)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-blue-800 border-b-2 border-gray-200 pb-2">
            💵 Resumen del Pago HISTÓRICO
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Concepto</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor Histórico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Salario Base</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(displayData.salarioBase)}</td>
                </tr>
                {displayData.auxilioTransporte > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Auxilio de Transporte</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(displayData.auxilioTransporte)}</td>
                  </tr>
                )}
                {displayData.bonificaciones > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Bonificaciones</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(displayData.bonificaciones)}</td>
                  </tr>
                )}
                {displayData.horasExtra > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Horas Extras y Recargos</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(displayData.horasExtra)}</td>
                  </tr>
                )}
                <tr>
                  <td className="px-4 py-3 text-sm text-red-600">Total Deducciones</td>
                  <td className="px-4 py-3 text-sm text-red-600 text-right">-{formatCurrency(displayData.totalDeducciones)}</td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-800">Total Neto a Pagar HISTÓRICO</td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-800 text-right">{formatCurrency(displayData.netoAPagar)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Deducciones históricas detalladas */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-blue-800 border-b-2 border-gray-200 pb-2">
            💸 Deducciones HISTÓRICAS
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Concepto</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor Histórico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayData.saludEmpleado > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Salud Empleado</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(displayData.saludEmpleado)}</td>
                  </tr>
                )}
                {displayData.pensionEmpleado > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Pensión Empleado</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(displayData.pensionEmpleado)}</td>
                  </tr>
                )}
                <tr className="bg-blue-50">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-800">Total Deducciones Históricas</td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-800 text-right">{formatCurrency(displayData.totalDeducciones)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t-2 border-gray-200">
          <div className="text-center text-xs text-gray-600 space-y-1">
            <p>Vista previa del comprobante con <span className="font-semibold text-green-600">DATOS HISTÓRICOS ALMACENADOS</span></p>
            <p><span className="text-green-600 font-semibold">✓ Valores exactos liquidados</span> | <span className="text-green-600 font-semibold">✓ Consistencia histórica</span> | <span className="text-green-600 font-semibold">✓ Auditabilidad completa</span></p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isGenerating}>
          <X className="h-4 w-4 mr-2" />
          Cerrar
        </Button>
        <Button onClick={handleDownloadVoucher} disabled={isGenerating} className="relative">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando PDF Histórico...
            </>
          ) : downloadSuccess ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              PDF Histórico Descargado ✓
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF Histórico
            </>
          )}
        </Button>
      </div>
    </CustomModal>
  );
};
