import React from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PayrollSummary } from '@/types/payroll';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface PayrollSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodData: {
    startDate: string;
    endDate: string;
    type: string;
  };
  summary: PayrollSummary;
  periodId?: string;
}

export const PayrollSuccessModal: React.FC<PayrollSuccessModalProps> = ({
  isOpen,
  onClose,
  periodData,
  summary,
  periodId
}) => {
  const navigate = useNavigate();

  // Load authoritative summary directly from DB - NO FALLBACKS TO PARENT DATA
  const [loadingSummary, setLoadingSummary] = React.useState(false);
  const [dbSummary, setDbSummary] = React.useState<{ employeesCount: number; totalNet: number } | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      if (!isOpen || !periodId) {
        console.log('Modal not open or no periodId, clearing summary');
        setDbSummary(null);
        return;
      }
      
      console.log(`🔍 Fetching authoritative summary for periodId: ${periodId}`);
      setLoadingSummary(true);
      
      try {
        // Query with company_id for precision and add detailed logging
        const { data, error } = await supabase
          .from('payrolls')
          .select('neto_pagado, company_id')
          .eq('period_id', periodId);
          
        if (error) {
          console.error('❌ Error fetching payroll summary:', error);
          throw error;
        }
        
        const totalNet = (data as any[] | null)?.reduce((acc, row) => acc + Number(row.neto_pagado || 0), 0) ?? 0;
        const employeesCount = (data as any[] | null)?.length ?? 0;
        
        console.log(`✅ DB Summary: ${employeesCount} employees, Total: ${totalNet}`);
        
        if (isMounted) setDbSummary({ employeesCount, totalNet });
      } catch (e) {
        console.error('❌ Error fetching payroll summary:', e);
        if (isMounted) setDbSummary(null);
      } finally {
        if (isMounted) setLoadingSummary(false);
      }
    };
    
    fetchSummary();
    return () => { isMounted = false; };
  }, [isOpen, periodId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleGoToHistory = () => {
    onClose();
    navigate(periodId ? `/modules/payroll-history/${periodId}` : '/modules/payroll-history');
  };
  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={onClose}
      className="max-w-md"
      closeOnEscape={true}
      closeOnBackdrop={true}
    >
      <div className="text-center space-y-6">
        {/* Success Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success/10 mb-4">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>

        {/* Title */}
        <CustomModalHeader className="border-none pb-0">
          <CustomModalTitle className="text-xl font-semibold text-center">
            Nómina liquidada exitosamente
          </CustomModalTitle>
        </CustomModalHeader>

        {/* Period Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Período liquidado</span>
          </div>
          <div className="text-lg font-medium text-foreground">
            {formatDate(periodData.startDate)} - {formatDate(periodData.endDate)}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4 py-4 border-t border-b border-border">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Empleados procesados</span>
              <div className="font-medium">
                {loadingSummary ? 'Consolidando...' : 
                 dbSummary ? dbSummary.employeesCount : 
                 'Sin datos disponibles'}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Neto a pagar</span>
              <div className="font-medium">
                {loadingSummary ? 'Consolidando...' : 
                 dbSummary ? formatCurrency(dbSummary.totalNet) : 
                 'Sin datos disponibles'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cerrar
          </Button>
          <Button onClick={handleGoToHistory} className="flex-1">
            Ver historial
          </Button>
        </div>
      </div>
    </CustomModal>
  );
};