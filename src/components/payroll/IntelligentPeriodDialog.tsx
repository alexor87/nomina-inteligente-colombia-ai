
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
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden">
        {/* Header Section */}
        <div className="px-6 pt-6 pb-4">
          <IntelligentDialogHeader periodStatus={periodStatus} />
        </div>
        
        {/* Content Section */}
        <div className="px-6 pb-4">
          <PeriodInfo periodStatus={periodStatus} />
        </div>
        
        {/* Actions Section */}
        <div className="px-6 pb-6 pt-2">
          <DialogActions
            periodStatus={periodStatus}
            onResumePeriod={onResumePeriod}
            onCreateNewPeriod={onCreateNewPeriod}
            onViewLastPeriod={onViewLastPeriod}
            onGoToSettings={onGoToSettings}
            onClose={onClose}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
