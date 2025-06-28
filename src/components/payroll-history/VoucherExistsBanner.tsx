
import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText } from "lucide-react";

interface VoucherExistsBannerProps {
  hasVouchers: boolean;
}

export const VoucherExistsBanner = ({ hasVouchers }: VoucherExistsBannerProps) => {
  if (!hasVouchers) return null;

  return (
    <Alert className="bg-blue-50 border-blue-200 mb-6">
      <FileText className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-900">
        📄 Este período ya cuenta con comprobantes emitidos. Al guardar cambios se crearán nuevas versiones y los anteriores quedarán anulados automáticamente.
      </AlertDescription>
    </Alert>
  );
};
