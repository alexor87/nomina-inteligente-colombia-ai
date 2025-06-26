
import React from 'react';
import { 
  Dialog, 
  DialogContent
} from "@/components/ui/dialog";
import { PeriodStatus } from '@/services/PayrollPeriodIntelligentService';
import { IntelligentDialogHeader } from './intelligent-dialog/DialogHeader';
import { PeriodInfo } from './intelligent-dialog/PeriodInfo';
import { DialogActions } from './intelligent-dialog/DialogActions';

interface IntelligentPeriodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  periodStatus: PeriodStatus;
  onResumePeriod: () => void;
  onCreateNewPeriod: () => void;
  onViewLastPeriod: () => void;
  onGoToSettings: () => void;
  isLoading: boolean;
}

export const IntelligentPeriodDialog: React.FC<IntelligentPeriodDialogProps> = ({
  isOpen,
  onClose,
  periodStatus,
  onResumePeriod,
  onCreateNewPeriod,
  onViewLastPeriod,
  onGoToSettings,
  isLoading
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <IntelligentDialogHeader periodStatus={periodStatus} />
        <PeriodInfo periodStatus={periodStatus} />
        <DialogActions
          periodStatus={periodStatus}
          onResumePeriod={onResumePeriod}
          onCreateNewPeriod={onCreateNewPeriod}
          onViewLastPeriod={onViewLastPeriod}
          onGoToSettings={onGoToSettings}
          onClose={onClose}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
};
