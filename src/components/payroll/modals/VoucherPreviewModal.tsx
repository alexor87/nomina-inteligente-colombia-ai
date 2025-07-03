
import React, { useState } from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { FileText, Download, X, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CompanyConfigurationService } from '@/services/CompanyConfigurationService';

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
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const { toast } = useToast();

  // Cargar datos reales de la empresa
  React.useEffect(() => {
    const loadCompanyData = async () => {
      try {
        const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
        if (companyId) {
          const company = await CompanyConfigurationService.getCompanyData(companyId);
          if (company) {
            setCompanyData(company);
            console.log('✅ Datos reales de empresa cargados para vista previa:', company);
          }
        }
      } catch (error) {
        console.error('Error loading company data:', error);
      }
    };

    if (isOpen) {
      loadCompanyData();
    }
  }, [isOpen]);

  const handleDownloadVoucher = async () => {
    if (!employee || !period) {
      toast({
        title: "Error",
        description: "Faltan datos del empleado o período",
        variant: "destructive"
      });
      return;
    }

    if (!companyData) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de la empresa",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setDownloadSuccess(false);
    
    try {
      console.log('🚀 GENERANDO PDF CORREGIDO con datos reales para:', employee.name);
      
      const requestBody = {
        employee: {
          id: employee.id,
          name: employee.name,
          cedula: employee.cedula || employee.id,
          tipo_documento: employee.tipo_documento || 'CC',
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
          transportAllowance: employee.transportAllowance || 162000
        },
        period: {
          startDate: period.startDate,
          endDate: period.endDate,
          type: period.type
        },
        company: {
          razon_social: companyData.razon_social,
          nit: companyData.nit,
          direccion: companyData.direccion || 'Dirección no especificada',
          telefono: companyData.telefono,
          email: companyData.email
        }
      };

      console.log('📤 Enviando datos REALES al generador CORREGIDO:', requestBody);

      const { data, error } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: requestBody
      });

      if (error) {
        console.error('❌ Error en edge function:', error);
        throw error;
      }

      console.log('✅ PDF CORREGIDO generado exitosamente');

      // Crear blob y descargar
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const fileName = `comprobante-corregido-${employee.name.replace(/\s+/g, '-')}-${period.startDate.replace(/\//g, '-')}.pdf`;
      
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

      console.log('✅ DESCARGA COMPLETADA con datos reales:', fileName);

      setDownloadSuccess(true);

      toast({
        title: "✅ PDF corregido generado exitosamente",
        description: `El comprobante con datos reales de ${employee.name} se ha descargado correctamente`,
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error: any) {
      console.error('💥 ERROR EN GENERADOR CORREGIDO:', error);
      
      toast({
        title: "❌ Error en generador PDF corregido",
        description: error.message || "Error desconocido en el generador corregido",
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

  // Cálculos CORREGIDOS igual que en el PDF
  const salarioBase = employee.baseSalary;
  const diasTrabajados = employee.workedDays || 30;
  const esPeriodoQuincenal = diasTrabajados <= 15;
  const diasDelPeriodo = esPeriodoQuincenal ? 15 : 30;
  const factorProporcional = diasTrabajados / diasDelPeriodo;
  const salarioProporcional = Math.round(salarioBase * factorProporcional);
  
  // Auxilio de transporte CORRECTO
  const auxilioTransporteLegal = 162000;
  const auxilioTransporte = Math.round(auxilioTransporteLegal * factorProporcional);
  
  // Deducciones PROPORCIONALES
  const saludEmpleado = Math.round(salarioBase * 0.04 * factorProporcional);
  const pensionEmpleado = Math.round(salarioBase * 0.04 * factorProporcional);
  const fondoSolidaridad = salarioBase > 4000000 ? Math.round(salarioBase * 0.01 * factorProporcional) : 0;
  
  const horasDelPeriodo = esPeriodoQuincenal ? 120 : 240;
  const valorHoraOrdinaria = salarioBase / horasDelPeriodo;
  const valorHoraExtra = valorHoraOrdinaria * 1.25;
  const totalHorasExtra = Math.round((employee.extraHours || 0) * valorHoraExtra);
  
  const bonificaciones = employee.bonuses || 0;
  const totalDevengado = salarioProporcional + auxilioTransporte + bonificaciones + totalHorasExtra;
  const totalDeduccionesCalculadas = saludEmpleado + pensionEmpleado + fondoSolidaridad;
  const otrasDeduccionesReales = Math.max(0, (employee.deductions || 0) - totalDeduccionesCalculadas);
  const totalDeducciones = totalDeduccionesCalculadas + otrasDeduccionesReales;
  const netoAPagar = totalDevengado - totalDeducciones;

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
          Vista Previa - Comprobante CORREGIDO con Datos Reales
        </CustomModalTitle>
      </CustomModalHeader>

      {/* Preview con cálculos CORREGIDOS */}
      <div className="bg-white p-8 space-y-6" style={{ fontFamily: '"Open Sans", sans-serif' }}>
        
        <h1 className="text-2xl font-semibold text-center text-blue-800 mb-8">
          Comprobante de Nómina CORREGIDO
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <Card className="border-l-4 border-l-blue-500 bg-slate-50">
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">EMPRESA</h3>
              <p className="font-semibold text-gray-900">{companyData?.razon_social || 'Cargando...'}</p>
              <p className="text-sm text-gray-700">NIT: {companyData?.nit || 'Cargando...'}</p>
              <p className="text-sm text-gray-700">{companyData?.direccion || 'Cargando...'}</p>
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
              <p className="text-sm text-gray-700">Días trabajados: {diasTrabajados}</p>
              <p className="text-sm text-gray-700">Salario Base: {formatCurrency(salarioBase)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-blue-800 border-b-2 border-gray-200 pb-2">
            💵 Resumen del Pago CORREGIDO
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
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Auxilio de Transporte</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(auxilioTransporte)}</td>
                </tr>
                {bonificaciones > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Bonificaciones</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(bonificaciones)}</td>
                  </tr>
                )}
                {totalHorasExtra > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Horas Extras y Recargos</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(totalHorasExtra)}</td>
                  </tr>
                )}
                <tr>
                  <td className="px-4 py-3 text-sm text-red-600">Total Deducciones</td>
                  <td className="px-4 py-3 text-sm text-red-600 text-right">-{formatCurrency(totalDeducciones)}</td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-800">Total Neto a Pagar CORREGIDO</td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-800 text-right">{formatCurrency(netoAPagar)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Deducciones detalladas */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-blue-800 border-b-2 border-gray-200 pb-2">
            💸 Deducciones CORREGIDAS (Proporcionales)
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
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Salud (Proporcional)</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center">4.0%</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(saludEmpleado)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Pensión (Proporcional)</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center">4.0%</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(pensionEmpleado)}</td>
                </tr>
                {fondoSolidaridad > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Fondo de Solidaridad</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">1.0%</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(fondoSolidaridad)}</td>
                  </tr>
                )}
                {otrasDeduccionesReales > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Otras Deducciones</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">-</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(otrasDeduccionesReales)}</td>
                  </tr>
                )}
                <tr className="bg-blue-50">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-800" colSpan={2}>Total Deducciones</td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-800 text-right">{formatCurrency(totalDeducciones)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t-2 border-gray-200">
          <div className="text-center text-xs text-gray-600 space-y-1">
            <p>Vista previa del comprobante con <span className="font-semibold text-green-600">DATOS REALES</span> y <span className="font-semibold text-blue-600">CÁLCULOS CORREGIDOS</span></p>
            <p><span className="text-green-600 font-semibold">✓ Salario proporcional exacto</span> | <span className="text-green-600 font-semibold">✓ Auxilio de transporte legal</span> | <span className="text-green-600 font-semibold">✓ Deducciones proporcionales</span></p>
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
              Generando PDF Corregido...
            </>
          ) : downloadSuccess ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              PDF Corregido Descargado ✓
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF Corregido
            </>
          )}
        </Button>
      </div>
    </CustomModal>
  );
};
