import React from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Calendar, Users, DollarSign, TrendingUp, Calculator, BarChart3, FileText, FileCheck, Plus, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PayrollSummary } from '@/types/payroll';
import { useNavigate } from 'react-router-dom';

interface PayrollSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodData: {
    startDate: string;
    endDate: string;
    type: string;
  };
  summary: PayrollSummary;
}

export const PayrollSuccessModal: React.FC<PayrollSuccessModalProps> = ({
  isOpen,
  onClose,
  periodData,
  summary
}) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleGoToHistory = () => {
    onClose();
    navigate('/app/payroll-history');
  };

  const handleCreateNewPeriod = () => {
    onClose();
    navigate('/app/payroll');
  };

  const summaryCards = [
    {
      icon: Users,
      label: 'Empleados procesados',
      value: `${summary.validEmployees}/${summary.totalEmployees}`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: TrendingUp,
      label: 'Total devengado',
      value: formatCurrency(summary.totalGrossPay),
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: DollarSign,
      label: 'Total deducciones',
      value: formatCurrency(summary.totalDeductions),
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      icon: Calculator,
      label: 'Neto a pagar',
      value: formatCurrency(summary.totalNetPay),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={onClose}
      className="max-w-2xl"
      closeOnEscape={true}
      closeOnBackdrop={true}
    >
      <div className="text-center">
        {/* Success Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6 animate-scale-in">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        {/* Title */}
        <CustomModalHeader className="border-none pb-2">
          <CustomModalTitle className="text-2xl font-bold text-center">
            ¡Nómina liquidada exitosamente!
          </CustomModalTitle>
        </CustomModalHeader>

        {/* Period Info */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Período liquidado</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {formatDate(periodData.startDate)} - {formatDate(periodData.endDate)}
          </div>
          <div className="text-sm text-gray-500 capitalize">
            Período {periodData.type}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 justify-center text-muted-foreground mb-3">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Resumen de liquidación</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {summaryCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Card key={index} className="border-border shadow-sm hover-scale animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${card.bgColor} transition-all duration-300`}>
                        <Icon className={`h-4 w-4 ${card.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-1">{card.label}</p>
                        <p className="text-sm font-semibold text-foreground truncate">{card.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Vouchers Section */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 justify-center text-muted-foreground mb-3">
            <FileCheck className="h-4 w-4" />
            <span className="text-sm font-medium">Comprobantes generados</span>
          </div>
          
          <Card className="border-border shadow-sm animate-fade-in" style={{ animationDelay: '400ms' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-50">
                    <FileText className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Comprobantes de pago</p>
                    <p className="text-sm font-semibold text-foreground">{summary.validEmployees} generados</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleGoToHistory}>
                    <Download className="h-3 w-3 mr-1" />
                    Ver todos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Next Steps Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Próximos pasos</h4>
          <div className="text-left space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <p className="text-xs text-blue-800">Los comprobantes están disponibles en el <strong>Historial de Nómina</strong></p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <p className="text-xs text-blue-800">Puedes descargar los vouchers individuales o en lote</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <p className="text-xs text-blue-800">Revisa los reportes de liquidación para análisis detallado</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={handleCreateNewPeriod} className="order-2 sm:order-1">
            <Plus className="h-4 w-4 mr-2" />
            Liquidar nuevo período
          </Button>
          <Button variant="outline" onClick={onClose} className="order-3 sm:order-2">
            Continuar trabajando
          </Button>
          <Button onClick={handleGoToHistory} className="bg-primary hover:bg-primary/90 order-1 sm:order-3">
            <BarChart3 className="h-4 w-4 mr-2" />
            Ver historial completo
          </Button>
        </div>
      </div>
    </CustomModal>
  );
};