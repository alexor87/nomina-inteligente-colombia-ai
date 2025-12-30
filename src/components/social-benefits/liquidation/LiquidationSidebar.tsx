import React from 'react';
import { Calendar, HelpCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface LiquidationSidebarProps {
  benefitType: 'prima' | 'cesantias' | 'intereses_cesantias';
  periodStart?: string;
  periodEnd?: string;
  legalDeadline?: string;
}

const FAQ_ITEMS: Record<string, { question: string; answer: string }[]> = {
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

export const LiquidationSidebar: React.FC<LiquidationSidebarProps> = ({
  benefitType,
  periodStart,
  periodEnd,
  legalDeadline,
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const faqs = FAQ_ITEMS[benefitType] || [];

  return (
    <div className="space-y-4 sticky top-6">
      {/* Period info card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha inicio</p>
            <p className="font-medium">{formatDate(periodStart)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha fin</p>
            <p className="font-medium">{formatDate(periodEnd)}</p>
          </div>
          {legalDeadline && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha límite legal</p>
                <p className="font-medium text-destructive">{formatDate(legalDeadline)}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* FAQ card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            Preguntas Frecuentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {faqs.map((faq, index) => (
            <Collapsible key={index}>
              <CollapsibleTrigger className="flex items-start gap-2 text-sm text-left hover:text-primary transition-colors w-full py-2">
                <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{faq.question}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-5.5 pb-2">
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
