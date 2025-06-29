
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayrollEmployee } from '@/types/payroll';
import { formatCurrency } from '@/lib/utils';
import { FileText, Download, X, Loader2 } from 'lucide-react';
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
    if (!employee || !period) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: {
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
            afp: employee.afp
          },
          period: {
            startDate: period.startDate,
            endDate: period.endDate,
            type: period.type
          }
        }
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante-${employee.name.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "✅ Comprobante generado",
        description: "El comprobante de pago se ha descargado exitosamente",
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('Error generating voucher:', error);
      toast({
        title: "Error al generar comprobante",
        description: "No se pudo generar el comprobante de pago",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!employee || !period) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Vista Previa - Comprobante de Pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del Período */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Período</div>
                  <div className="font-semibold">
                    {formatDate(period.startDate)} - {formatDate(period.endDate)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Tipo</div>
                  <div className="font-semibold capitalize">{period.type}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del Empleado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Empleado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Nombre</div>
                  <div className="font-semibold">{employee.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Cargo</div>
                  <div className="font-semibold">{employee.position}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">EPS</div>
                  <div className="font-semibold">{employee.eps || 'No asignada'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">AFP</div>
                  <div className="font-semibold">{employee.afp || 'No asignada'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detalles de Pago */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span>Salario Base</span>
                  <span className="font-semibold">{formatCurrency(employee.baseSalary)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Días Trabajados</span>
                  <span className="font-semibold">{employee.workedDays}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Horas Extra</span>
                  <span className="font-semibold">{employee.extraHours}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Bonificaciones</span>
                  <span className="font-semibold">{formatCurrency(employee.bonuses)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Incapacidades</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(employee.disabilities)}</span>
                </div>
                <div className="flex justify-between py-2 border-b bg-blue-50 px-3 rounded">
                  <span className="font-semibold">Total Devengado</span>
                  <span className="font-bold">{formatCurrency(employee.grossPay)}</span>
                </div>
                <div className="flex justify-between py-2 border-b bg-red-50 px-3 rounded">
                  <span className="font-semibold">Total Deducciones</span>
                  <span className="font-bold text-red-600">-{formatCurrency(employee.deductions)}</span>
                </div>
                <div className="flex justify-between py-3 bg-green-50 px-3 rounded">
                  <span className="font-bold text-lg">Neto a Pagar</span>
                  <span className="font-bold text-lg text-green-600">{formatCurrency(employee.netPay)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
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
      </DialogContent>
    </Dialog>
  );
};
