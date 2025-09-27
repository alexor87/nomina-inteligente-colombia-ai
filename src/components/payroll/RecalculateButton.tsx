import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import { executeRecalculation } from '@/utils/recalculatePayroll';

export const RecalculateButton = () => {
  return (
    <Button 
      onClick={executeRecalculation}
      variant="default"
      size="sm"
      className="flex items-center gap-2"
    >
      <Calculator className="h-4 w-4" />
      Recalcular Nómina
    </Button>
  );
};