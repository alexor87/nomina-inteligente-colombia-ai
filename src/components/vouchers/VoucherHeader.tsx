
import { AlertCircle } from 'lucide-react';

interface VoucherHeaderProps {
  title?: string;
  description?: string;
}

export const VoucherHeader = ({ 
  title = "Comprobantes de Nómina",
  description = "Gestiona, descarga y envía comprobantes de nómina de forma eficiente"
}: VoucherHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="text-gray-600 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
};
