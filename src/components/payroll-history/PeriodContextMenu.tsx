
import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Unlock, AlertCircle } from "lucide-react";
import { PayrollHistoryPeriod } from '@/types/payroll-history';

interface PeriodContextMenuProps {
  period: PayrollHistoryPeriod;
  canUserReopenPeriods: boolean;
  onReopenPeriod: (period: PayrollHistoryPeriod) => void;
}

export const PeriodContextMenu = ({ 
  period, 
  canUserReopenPeriods, 
  onReopenPeriod 
}: PeriodContextMenuProps) => {
  const canReopen = period.status === 'cerrado' && canUserReopenPeriods && !period.reportedToDian;

  if (!canReopen) {
    return (
      <Button variant="ghost" size="sm" disabled className="opacity-30">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={() => onReopenPeriod(period)}
          className="flex items-center px-3 py-2 text-amber-700 hover:bg-amber-50 cursor-pointer"
        >
          <Unlock className="h-4 w-4 mr-2" />
          <span className="font-medium">Reabrir Periodo</span>
        </ContextMenuItem>
        <div className="px-3 py-1 text-xs text-gray-500 border-t mt-1">
          <div className="flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            Requiere confirmación
          </div>
        </div>
      </ContextMenuContent>
    </ContextMenu>
  );
};
