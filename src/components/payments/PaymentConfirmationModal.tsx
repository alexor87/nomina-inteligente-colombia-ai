
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckCircle, User, Calendar, CreditCard } from 'lucide-react';
import { PaymentEmployee } from '@/types/payments';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: PaymentEmployee | null;
  onConfirm: (confirmation: any) => void;
}

export const PaymentConfirmationModal = ({ 
  isOpen, 
  onClose, 
  employee, 
  onConfirm 
}: PaymentConfirmationModalProps) => {
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'transferencia' as 'transferencia' | 'efectivo' | 'datafono',
    confirmedBy: 'admin@empresa.com', // En un caso real vendría del contexto de usuario
    observations: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      employeeId: employee?.id,
      ...formData
    });
  };

  const handleClose = () => {
    setFormData({
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'transferencia',
      confirmedBy: 'admin@empresa.com',
      observations: ''
    });
    onClose();
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Confirmar Pago</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del empleado */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{employee.name}</h3>
                <p className="text-sm text-gray-600">{employee.position}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Banco:</span>
                <div className="font-medium">{employee.bankName}</div>
              </div>
              <div>
                <span className="text-gray-600">Cuenta:</span>
                <div className="font-medium font-mono">{employee.accountNumber}</div>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Valor a pagar:</span>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(employee.netPay)}
                </div>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="paymentDate" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Fecha de pago</span>
              </Label>
              <Input
                id="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod" className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Medio de pago</span>
              </Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(value) => setFormData({...formData, paymentMethod: value as any})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia bancaria</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="datafono">Datafonó/Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="confirmedBy">Confirmado por</Label>
              <Input
                id="confirmedBy"
                value={formData.confirmedBy}
                onChange={(e) => setFormData({...formData, confirmedBy: e.target.value})}
                placeholder="Email del usuario"
                required
              />
            </div>

            <div>
              <Label htmlFor="observations">Observaciones (opcional)</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => setFormData({...formData, observations: e.target.value})}
                placeholder="Notas adicionales sobre el pago..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar pago
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
