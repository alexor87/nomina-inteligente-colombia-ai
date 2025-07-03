
import React from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Calendar, Users, DollarSign, TrendingUp, Calculator, BarChart3, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PayrollSummary } from '@/types/payroll';

interface PayrollSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturn: () => void; // New prop for return to liquidation
  periodData: {
    startDate: string;
    endDate: string;
    type: string;
    period: string;
  };
  summary: PayrollSummary;
}

export const PayrollSuccessModal: React.FC<PayrollSuccessModalProps> = ({
  isOpen,
  onClose,
  onReturn,
  periodData,
  summary
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
      closeOnEscape={false}
      closeOnBackdrop={false}
    >
      <div className="text-center">
        {/* Success Icon */}
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>

        {/* Title */}
        <CustomModalHeader className="border-none pb-4">
          <CustomModalTitle className="text-3xl font-bold text-center text-green-800">
            ¡Nómina liquidada exitosamente!
          </CustomModalTitle>
        </CustomModalHeader>

        {/* Period Info */}
        <div className="mb-8 bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-center gap-2 text-green-700 mb-3">
            <Calendar className="h-5 w-5" />
            <span className="text-lg font-semibold">Período liquidado</span>
          </div>
          <div className="text-2xl font-bold text-green-800 mb-2">
            {periodData.period}
          </div>
          <div className="text-green-600">
            {formatDate(periodData.startDate)} - {formatDate(periodData.endDate)}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-8">
          <div className="grid grid-cols-2 gap-4">
            {summaryCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Card key={index} className="border-gray-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${card.bgColor}`}>
                        <Icon className={`h-5 w-5 ${card.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 mb-1">{card.label}</p>
                        <p className="text-lg font-semibold text-gray-900">{card.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-center mb-3">
            <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-blue-800 font-semibold">¡Proceso completado!</span>
          </div>
          <p className="text-blue-700">
            El período ha sido liquidado y cerrado exitosamente. Los comprobantes de pago están disponibles 
            en el historial de nómina. Ahora puedes crear el siguiente período de nómina.
          </p>
        </div>

        {/* Action Buttons - Aleluya Style */}
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={onReturn}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Regresar a Liquidación
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-8 py-3 text-lg"
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            Ver Historial
          </Button>
        </div>
      </div>
    </CustomModal>
  );
};
