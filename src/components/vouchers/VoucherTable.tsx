
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { VoucherTableRow } from './VoucherTableRow';
import { PayrollVoucher } from '@/types/vouchers';
import { FileText } from 'lucide-react';

interface VoucherTableProps {
  vouchers: PayrollVoucher[];
  selectedVouchers: string[];
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
  onDownload: (id: string) => void;
  onSendEmail: (id: string) => void;
  onRegenerate: (id: string) => void;
  onClearFilters: () => void;
  totalVouchers: number;
}

export const VoucherTable = ({
  vouchers,
  selectedVouchers,
  onToggleSelection,
  onToggleAll,
  onDownload,
  onSendEmail,
  onRegenerate,
  onClearFilters,
  totalVouchers
}: VoucherTableProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedVouchers.length === vouchers.length && vouchers.length > 0}
                  onCheckedChange={onToggleAll}
                />
              </TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Neto a Pagar</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Enviado</TableHead>
              <TableHead>PDF</TableHead>
              <TableHead className="w-32">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vouchers.map((voucher) => (
              <VoucherTableRow
                key={voucher.id}
                voucher={voucher}
                isSelected={selectedVouchers.includes(voucher.id)}
                onToggleSelection={onToggleSelection}
                onDownload={onDownload}
                onSendEmail={onSendEmail}
                onRegenerate={onRegenerate}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      
      {vouchers.length === 0 && totalVouchers > 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500 mb-4">
            No se encontraron comprobantes que coincidan con los filtros aplicados.
          </div>
          <Button variant="outline" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        </div>
      )}
    </Card>
  );
};
