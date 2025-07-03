
import React, { useState } from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { FileText, Download, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoucherPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: PayrollEmployee | null;
  period: {
    startDate: string;
    endDate: string;
    type: string;
  } | null;
}

export const VoucherPreviewModal: React.FC<VoucherPreviewModalProps> = ({
  isOpen,
  onClose,
  employee,
  period
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownloadVoucher = async () => {
    if (!employee || !period) {
      toast({
        title: "Error",
        description: "Faltan datos del empleado o período",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🚀 Generando comprobante profesional para:', employee.name);
      
      const requestBody = {
        employee: {
          id: employee.id,
          name: employee.name,
          position: employee.position,
          baseSalary: employee.baseSalary,
          workedDays: employee.workedDays,
          extraHours: employee.extraHours,
          bonuses: employee.bonuses,
          disabilities: employee.disabilities,
          grossPay: employee.grossPay,
          deductions: employee.deductions,
          netPay: employee.netPay,
          eps: employee.eps,
          afp: employee.afp,
          transportAllowance: employee.transportAllowance
        },
        period: {
          startDate: period.startDate,
          endDate: period.endDate,
          type: period.type
        }
      };

      console.log('📤 Enviando request para PDF profesional:', requestBody);

      // SOLUCIÓN: Usar fetch directo en lugar de supabase.functions.invoke para control total del binary
      const response = await fetch(
        'https://xrmolrlkakwujyozgmilf.supabase.co/functions/v1/generate-voucher-pdf',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhybW9ybGtha3d1anlvemdtaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NzMxNDYsImV4cCI6MjA2NjE0OTE0Nn0.JSKbniDUkbNEAVCxCkrG_J5NQTt0yHc7W5PPheJ8X_U`
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en la respuesta:', response.status, errorText);
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
      }

      // CLAVE: Manejar la respuesta como ArrayBuffer para preservar los datos binarios
      const arrayBuffer = await response.arrayBuffer();
      console.log('✅ PDF recibido como ArrayBuffer, tamaño:', arrayBuffer.byteLength);

      if (arrayBuffer.byteLength === 0) {
        throw new Error('El PDF está vacío');
      }

      // Verificar que es un PDF válido (debe empezar con %PDF)
      const uint8Array = new Uint8Array(arrayBuffer);
      const pdfHeader = String.fromCharCode(...uint8Array.slice(0, 4));
      if (pdfHeader !== '%PDF') {
        console.error('❌ Respuesta no es un PDF válido:', pdfHeader);
        const textContent = new TextDecoder().decode(uint8Array);
        console.error('Contenido recibido:', textContent.substring(0, 200));
        throw new Error('La respuesta no es un PDF válido');
      }

      console.log('✅ PDF válido confirmado');

      // Crear blob correctamente con los datos binarios
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Crear enlace de descarga
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante-${employee.name.replace(/\s+/g, '-')}-${period.startDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('✅ PDF descargado exitosamente');

      toast({
        title: "✅ Comprobante generado",
        description: "El comprobante de pago se ha descargado exitosamente",
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error: any) {
      console.error('💥 Error generando comprobante:', error);
      toast({
        title: "Error al generar comprobante",
        description: error.message || "No se pudo generar el comprobante de pago. Verifica los datos e intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!employee || !period) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Cálculos detallados igual que en el PDF
  const salarioProporcional = Math.round((employee.baseSalary / 30) * employee.workedDays);
  const saludEmpleado = Math.round(employee.baseSalary * 0.04);
  const pensionEmpleado = Math.round(employee.baseSalary * 0.04);
  const fondoSolidaridad = employee.baseSalary > 4000000 ? Math.round(employee.baseSalary * 0.01) : 0;
  const otrasDeduccionesCalculadas = Math.max(0, employee.deductions - saludEmpleado - pensionEmpleado - fondoSolidaridad);
  const valorHoraExtra = Math.round((employee.baseSalary / 240) * 1.25);
  const totalHorasExtra = employee.extraHours * valorHoraExtra;

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
          Vista Previa - Comprobante de Nómina
        </CustomModalTitle>
      </CustomModalHeader>

      {/* Preview con el mismo diseño profesional que el PDF */}
      <div className="bg-white p-8 space-y-6" style={{ fontFamily: '"Open Sans", sans-serif' }}>
        
        <h1 className="text-2xl font-semibold text-center text-blue-800 mb-8">
          Comprobante de Nómina
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <Card className="border-l-4 border-l-blue-500 bg-slate-50">
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">EMPRESA</h3>
              <p className="font-semibold text-gray-900">Mi Empresa</p>
              <p className="text-sm text-gray-700">NIT: N/A</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500 bg-slate-50">
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">EMPLEADO</h3>
              <p className="font-semibold text-gray-900">{employee.name}</p>
              <p className="text-sm text-gray-700">CC: {employee.id?.slice(0, 8) || 'N/A'}</p>
              {employee.position && <p className="text-sm text-gray-700">Cargo: {employee.position}</p>}
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500 bg-slate-50">
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">PERÍODO DE PAGO</h3>
              <p className="font-semibold text-gray-900">{formatDate(period.startDate)} - {formatDate(period.endDate)}</p>
              <p className="text-sm text-gray-700">Días trabajados: {employee.workedDays}</p>
              <p className="text-sm text-gray-700">Salario Base: {formatCurrency(employee.baseSalary)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-blue-800 border-b-2 border-gray-200 pb-2">
            💵 Resumen del Pago
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Concepto</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Salario Proporcional</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(salarioProporcional)}</td>
                </tr>
                {employee.transportAllowance > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Subsidio de Transporte</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(employee.transportAllowance)}</td>
                  </tr>
                )}
                {employee.bonuses > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Bonificaciones</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(employee.bonuses)}</td>
                  </tr>
                )}
                {totalHorasExtra > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Horas Extras y Recargos</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(totalHorasExtra)}</td>
                  </tr>
                )}
                {employee.deductions > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-red-600">Deducciones</td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right">-{formatCurrency(employee.deductions)}</td>
                  </tr>
                )}
                <tr className="bg-blue-50">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-800">Total Neto a Pagar</td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-800 text-right">{formatCurrency(employee.netPay)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Horas Extras - Solo si tiene horas extra */}
        {employee.extraHours > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-blue-800 border-b-2 border-gray-200 pb-2">
              ⏱ Horas Extras, Ordinarias y Recargos
            </h2>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Concepto</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Cantidad</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Hora Extra Ordinaria</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">{employee.extraHours} horas</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(totalHorasExtra)}</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="px-4 py-3 text-sm font-semibold text-blue-800" colSpan={2}>Total pago por horas</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-800 text-right">{formatCurrency(totalHorasExtra)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {employee.deductions > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-blue-800 border-b-2 border-gray-200 pb-2">
              💸 Retenciones y Deducciones
            </h2>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Concepto</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">%</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {saludEmpleado > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">Salud</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center">4%</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(saludEmpleado)}</td>
                    </tr>
                  )}
                  {pensionEmpleado > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">Pensión</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center">4%</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(pensionEmpleado)}</td>
                    </tr>
                  )}
                  {fondoSolidaridad > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">Fondo de Solidaridad</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center">1%</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(fondoSolidaridad)}</td>
                    </tr>
                  )}
                  {otrasDeduccionesCalculadas > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">Otros</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center">-</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(otrasDeduccionesCalculadas)}</td>
                    </tr>
                  )}
                  <tr className="bg-blue-50">
                    <td className="px-4 py-3 text-sm font-semibold text-blue-800" colSpan={2}>Total Retenciones y Deducciones</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-800 text-right">{formatCurrency(employee.deductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-12 pt-6 border-t-2 border-gray-200">
          <div className="flex justify-between items-center mb-8">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mb-2 w-64">
                <p className="text-xs text-gray-600">Firma del Empleado</p>
              </div>
              <p className="font-semibold text-sm">{employee.name}</p>
              <p className="text-xs text-gray-600">CC: {employee.id?.slice(0, 8) || 'N/A'}</p>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mb-2 w-64">
                <p className="text-xs text-gray-600">Firma del Representante Legal</p>
              </div>
              <p className="font-semibold text-sm">Mi Empresa</p>
              <p className="text-xs text-gray-600">NIT: N/A</p>
            </div>
          </div>
          
          <div className="text-center text-xs text-gray-600 space-y-1">
            <p>Este documento fue generado con <span className="font-semibold text-blue-800">Finppi</span> – Software de Nómina y Seguridad Social</p>
            <p><a href="https://www.finppi.com" className="text-blue-600 hover:underline">www.finppi.com</a></p>
            <p className="mt-2">Generado el {new Date().toLocaleString('es-CO')}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isGenerating}>
          <X className="h-4 w-4 mr-2" />
          Cerrar
        </Button>
        <Button onClick={handleDownloadVoucher} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isGenerating ? 'Generando...' : 'Descargar PDF'}
        </Button>
      </div>
    </CustomModal>
  );
};
