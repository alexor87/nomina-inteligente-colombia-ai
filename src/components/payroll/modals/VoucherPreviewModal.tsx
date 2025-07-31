import React, { useState } from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { FileText, Download, X, Loader2, CheckCircle } from 'lucide-react';
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
  companyInfo?: {
    razon_social: string;
    nit: string;
    direccion?: string;
    ciudad?: string;
    telefono?: string;
    email?: string;
    logo_url?: string;
  } | null;
}

export const VoucherPreviewModal: React.FC<VoucherPreviewModalProps> = ({
  isOpen,
  onClose,
  employee,
  period,
  companyInfo
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
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
    setDownloadSuccess(false);
    
    try {
      console.log('🚀 INICIANDO DESCARGA PDF NATIVO para:', employee.name);
      console.log('🔍 Employee object received in modal:', employee);
      console.log('🔍 Employee.id (payroll record ID):', employee.id);
      console.log('🔍 Employee.id type:', typeof employee.id);
      
      // NEW FORMAT: Send payrollId to get real database data
      const requestBody = {
        payrollId: employee.id // This should be the payroll record ID, not employee ID
      };

      console.log('📤 Enviando request al generador nativo:', JSON.stringify(requestBody, null, 2));

      // Timeout optimizado para el generador nativo
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('❌ Timeout en generador nativo');
      }, 30000); // 30 segundos es suficiente para generador nativo

      // Get current user session for auth
      const { data: { session } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getSession());
      
      if (!session?.access_token) {
        throw new Error('No hay sesión activa. Por favor inicia sesión nuevamente.');
      }

      const response = await fetch(
        'https://xrmorlkakwujyozgmilf.supabase.co/functions/v1/generate-voucher-pdf',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      console.log('📊 Response status del generador nativo:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = `Error del servidor (${response.status})`;
        
        try {
          const errorText = await response.text();
          console.error('❌ Error response:', errorText);
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        } catch (textError) {
          console.error('❌ Error leyendo respuesta de error:', textError);
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ Response OK del generador nativo, obteniendo ArrayBuffer...');

      const arrayBuffer = await response.arrayBuffer();
      console.log('📋 ArrayBuffer recibido del generador nativo, tamaño:', arrayBuffer.byteLength);

      // Validaciones mejoradas para el generador nativo
      if (arrayBuffer.byteLength === 0) {
        throw new Error('El PDF generado está vacío (0 bytes)');
      }

      if (arrayBuffer.byteLength < 500) {
        throw new Error(`El PDF generado es muy pequeño (${arrayBuffer.byteLength} bytes)`);
      }

      // Validación del header PDF nativo
      const uint8Array = new Uint8Array(arrayBuffer);
      const pdfHeader = String.fromCharCode(...uint8Array.slice(0, 5));
      
      console.log('🔍 Validando header PDF nativo:', pdfHeader);
      
      if (!pdfHeader.startsWith('%PDF-')) {
        console.error('❌ Header inválido del generador nativo:', pdfHeader);
        console.error('❌ Primeros 20 bytes:', Array.from(uint8Array.slice(0, 20)));
        throw new Error(`Archivo generado no es un PDF válido. Header: "${pdfHeader}"`);
      }

      console.log('✅ PDF NATIVO VALIDADO CORRECTAMENTE - Header:', pdfHeader, 'Tamaño:', arrayBuffer.byteLength);

      // Crear blob y descargar
      const blob = new Blob([arrayBuffer], { 
        type: 'application/pdf'
      });
      
      console.log('📋 Blob creado del PDF nativo, tamaño:', blob.size);

      // Crear URL temporal y descargar
      const url = URL.createObjectURL(blob);
      const fileName = `comprobante-${employee.name.replace(/\s+/g, '-')}-${period.startDate.replace(/\//g, '-')}.pdf`;
      
      // Crear elemento anchor para descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      // Agregar al DOM, hacer click, y limpiar
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
        console.log('🧹 Cleanup completado');
      }, 100);

      console.log('✅ DESCARGA COMPLETADA CON GENERADOR NATIVO:', fileName);

      setDownloadSuccess(true);

      toast({
        title: "✅ PDF generado exitosamente",
        description: `El comprobante de ${employee.name} se ha descargado correctamente con el generador nativo`,
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error: any) {
      console.error('💥 ERROR EN GENERADOR NATIVO:', error);
      console.error('💥 Error stack:', error.stack);
      
      let errorMessage = "Error desconocido en el generador PDF nativo";
      
      if (error.name === 'AbortError') {
        errorMessage = "La generación del PDF tardó demasiado. El generador nativo optimizado debería ser más rápido.";
      } else if (error.message?.includes('fetch')) {
        errorMessage = "Error de conexión con el generador nativo. Verifica tu internet.";
      } else if (error.message?.includes('PDF')) {
        errorMessage = `Error en el PDF nativo: ${error.message}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "❌ Error en generador PDF nativo",
        description: errorMessage,
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

  // Synchronized calculations with PDF generator
  const salarioBase = Number(employee.baseSalary) || 0;
  const diasTrabajados = Number(employee.workedDays) || 30;
  const salarioNeto = Number(employee.netPay) || 0;
  const deducciones = Number(employee.deductions) || 0;
  const horasExtra = Number(employee.extraHours) || 0;
  const bonificaciones = Number(employee.bonuses) || 0;
  const subsidioTransporte = Number(employee.transportAllowance) || 0;
  
  // Proportional salary calculation (same as PDF)
  const salarioProporcional = Math.round((salarioBase * diasTrabajados) / 30);
  
  // Extra hours calculation (same as PDF)
  const valorHoraExtra = Math.round((salarioBase / 240) * 1.25);
  const totalHorasExtra = horasExtra > 0 ? horasExtra * valorHoraExtra : 0;
  
  // Deductions calculation (same as PDF)
  const saludEmpleado = Math.round(salarioBase * 0.04);
  const pensionEmpleado = Math.round(salarioBase * 0.04);
  const totalDeduccionesCalculadas = saludEmpleado + pensionEmpleado;

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
          Vista Previa - Comprobante de Nómina (Generador Nativo)
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
              {/* Header elegante con logo prominente */}
              <div className="space-y-4">
                {companyInfo?.logo_url ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={companyInfo.logo_url}
                      alt="Logo empresa"
                      className="h-20 w-auto max-w-[200px] object-contain flex-shrink-0 rounded-lg shadow-sm border border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white h-20 w-20 rounded-lg items-center justify-center shadow-sm">
                      <span className="text-2xl font-bold">{companyInfo.razon_social.charAt(0)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex bg-gradient-to-br from-blue-500 to-blue-600 text-white h-20 w-20 rounded-lg items-center justify-center shadow-sm">
                    <span className="text-2xl font-bold">{companyInfo?.razon_social?.charAt(0) || 'E'}</span>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">EMPRESA</h3>
                  <p className="font-semibold text-gray-900 text-lg">{companyInfo?.razon_social || 'Mi Empresa'}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700">NIT: {companyInfo?.nit || 'N/A'}</p>
              {companyInfo?.direccion && (
                <p className="text-sm text-gray-700">Dirección: {companyInfo.direccion}</p>
              )}
              {companyInfo?.ciudad && (
                <p className="text-sm text-gray-700">Ciudad: {companyInfo.ciudad}</p>
              )}
              {companyInfo?.telefono && (
                <p className="text-sm text-gray-700">Teléfono: {companyInfo.telefono}</p>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500 bg-slate-50">
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">EMPLEADO</h3>
              <p className="font-semibold text-gray-900">{employee.name}</p>
              <p className="text-sm text-gray-700">CC: {employee.cedula || 'N/A'}</p>
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
            💵 Resumen del Pago (Generador Nativo)
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
                  <td className="px-4 py-3 text-sm text-gray-900">Salario Base</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(salarioBase)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Días Trabajados</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{diasTrabajados} días</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Salario Proporcional</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(salarioProporcional)}</td>
                </tr>
                {subsidioTransporte > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Subsidio de Transporte</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(subsidioTransporte)}</td>
                  </tr>
                )}
                {bonificaciones > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Bonificaciones</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(bonificaciones)}</td>
                  </tr>
                )}
                {totalHorasExtra > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Horas Extras ({horasExtra} hrs)</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(totalHorasExtra)}</td>
                  </tr>
                )}
                <tr className="bg-red-50">
                  <td className="px-4 py-3 text-sm font-semibold text-red-700">Total Deducciones</td>
                  <td className="px-4 py-3 text-sm font-semibold text-red-700 text-right">-{formatCurrency(deducciones)}</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="px-4 py-3 text-sm font-semibold text-green-700">NETO A PAGAR</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-700 text-right">{formatCurrency(salarioNeto)}</td>
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
                    <td className="px-4 py-3 text-sm text-gray-900">Horas Extra ({horasExtra} hrs)</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">Valor por hora: {formatCurrency(valorHoraExtra)}</td>
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
              <p className="text-xs text-gray-600">CC: {employee.cedula || 'N/A'}</p>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mb-2 w-64">
                <p className="text-xs text-gray-600">Firma del Representante Legal</p>
              </div>
              <p className="font-semibold text-sm">{companyInfo?.razon_social || 'Mi Empresa'}</p>
              <p className="text-xs text-gray-600">NIT: {companyInfo?.nit || 'N/A'}</p>
            </div>
          </div>
          
          <div className="text-center text-xs text-gray-600 space-y-1">
            <p>Este documento fue generado con <span className="font-semibold text-blue-800">Finppi</span> – Software de Nómina y Seguridad Social</p>
            <p><a href="https://www.finppi.com" className="text-blue-600 hover:underline">www.finppi.com</a></p>
            <p className="mt-2">Generado el {new Date().toLocaleString('es-CO')} - <span className="text-green-600 font-semibold">Generador PDF Nativo</span></p>
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
              Generando PDF Nativo...
            </>
          ) : downloadSuccess ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              PDF Descargado ✓
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF Nativo
            </>
          )}
        </Button>
      </div>
    </CustomModal>
  );
};
