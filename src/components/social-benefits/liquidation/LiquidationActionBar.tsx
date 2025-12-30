import React, { useState } from 'react';
import { Search, Download, CheckCircle, Loader2, HelpCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ConfirmLiquidationModal } from './ConfirmLiquidationModal';

type BenefitType = 'prima' | 'cesantias' | 'intereses_cesantias';

interface LiquidationActionBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDownload: () => void;
  onLiquidate: () => Promise<void>;
  isLiquidating: boolean;
  isLiquidated: boolean;
  benefitLabel: string;
  employeesCount: number;
  totalAmount: number;
  benefitType?: BenefitType;
}

const FAQ_ITEMS: Record<BenefitType, { question: string; answer: string }[]> = {
  prima: [
    {
      question: '¿Cómo se calcula la prima?',
      answer: 'La prima equivale a un mes de salario por año trabajado. Se calcula sobre el salario promedio del semestre, incluyendo el auxilio de transporte.',
    },
    {
      question: '¿Cuándo debo pagar la prima?',
      answer: 'La prima del primer semestre se paga a más tardar el 30 de junio. La del segundo semestre, máximo el 20 de diciembre.',
    },
  ],
  cesantias: [
    {
      question: '¿Cómo se calculan las cesantías?',
      answer: 'Las cesantías equivalen a un mes de salario por año trabajado. Se calculan sobre el último salario devengado.',
    },
    {
      question: '¿Cuándo debo consignar las cesantías?',
      answer: 'Las cesantías deben consignarse al fondo antes del 14 de febrero del año siguiente.',
    },
  ],
  intereses_cesantias: [
    {
      question: '¿Cómo se calculan los intereses?',
      answer: 'Los intereses corresponden al 12% anual sobre el saldo de cesantías acumuladas durante el año.',
    },
    {
      question: '¿Cuándo debo pagar los intereses?',
      answer: 'Los intereses se pagan directamente al trabajador antes del 31 de enero de cada año.',
    },
  ],
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const LiquidationActionBar: React.FC<LiquidationActionBarProps> = ({
  searchTerm,
  onSearchChange,
  onDownload,
  onLiquidate,
  isLiquidating,
  isLiquidated,
  benefitLabel,
  employeesCount,
  totalAmount,
  benefitType = 'prima',
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const faqs = FAQ_ITEMS[benefitType] || FAQ_ITEMS.prima;

  const handleConfirmLiquidation = async () => {
    await onLiquidate();
    setShowConfirmModal(false);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card rounded-lg border">
        {/* Left side - Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empleado..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Help button with FAQs */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Ayuda</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Preguntas Frecuentes</h4>
                <div className="space-y-2">
                  {faqs.map((faq, index) => (
                    <Collapsible key={index}>
                      <CollapsibleTrigger className="flex items-start gap-2 text-sm text-left hover:text-primary transition-colors w-full py-1.5">
                        <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{faq.question}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-5 pb-2">
                        <p className="text-xs text-muted-foreground">{faq.answer}</p>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Descargar resumen
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Descarga un resumen en Excel del cálculo de esta prestación social, los valores pagados y por pagar para cada persona.</p>
            </TooltipContent>
          </Tooltip>

          {isLiquidated ? (
            <Button variant="secondary" size="sm" disabled className="gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Liquidado
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isLiquidating || employeesCount === 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLiquidating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Liquidando...
                    </>
                  ) : (
                    `Liquidar ${benefitLabel.toLowerCase()}`
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>Al liquidar verás reflejada la {benefitLabel.toLowerCase()} en el resumen de nómina, las colillas de pago y el archivo para pago en banco.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <ConfirmLiquidationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmLiquidation}
        isProcessing={isLiquidating}
        benefitLabel={benefitLabel}
        employeesCount={employeesCount}
        totalAmount={totalAmount}
      />
    </>
  );
};
