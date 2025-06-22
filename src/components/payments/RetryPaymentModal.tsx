
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, AlertCircle, Edit2, User, Building2 } from 'lucide-react';
import { PaymentEmployee } from '@/types/payments';

interface RetryPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: PaymentEmployee | null;
  onRetry: (employeeId: string) => Promise<boolean>;
  onUpdateAccount: (employeeId: string, accountData: any) => Promise<boolean>;
}

export const RetryPaymentModal = ({ 
  isOpen, 
  onClose, 
  employee, 
  onRetry,
  onUpdateAccount 
}: RetryPaymentModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [accountData, setAccountData] = useState({
    bankName: employee?.bankName || '',
    accountType: employee?.accountType || 'ahorros' as 'ahorros' | 'corriente',
    accountNumber: employee?.accountNumber || ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleRetryPayment = async () => {
    if (!employee) return;
    
    setIsProcessing(true);
    try {
      const success = await onRetry(employee.id);
      if (success) {
        onClose();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!employee) return;
    
    setIsProcessing(true);
    try {
      const success = await onUpdateAccount(employee.id, accountData);
      if (success) {
        onClose();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setAccountData({
      bankName: employee?.bankName || '',
      accountType: employee?.accountType || 'ahorros',
      accountNumber: employee?.accountNumber || ''
    });
    onClose();
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 text-orange-600" />
            <span>Reintentar Pago</span>
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
            
            <div className="text-sm">
              <span className="text-gray-600">Valor a pagar:</span>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(employee.netPay)}
              </div>
            </div>
          </div>

          {/* Error actual */}
          {employee.errorReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <h3 className="font-medium text-red-800">Motivo del fallo</h3>
              </div>
              <p className="text-sm text-red-700">{employee.errorReason}</p>
            </div>
          )}

          {/* Opciones */}
          <Tabs defaultValue="retry" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="retry" className="flex items-center space-x-1">
                <RefreshCw className="h-4 w-4" />
                <span>Reintentar</span>
              </TabsTrigger>
              <TabsTrigger value="update" className="flex items-center space-x-1">
                <Edit2 className="h-4 w-4" />
                <span>Actualizar cuenta</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="retry" className="space-y-4">
              <div className="text-center py-4">
                <RefreshCw className="h-12 w-12 text-orange-600 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Reintentar con datos actuales</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Se volverá a intentar el pago con la información bancaria actual del empleado
                </p>
                <div className="bg-gray-50 rounded p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-600">Banco:</span>
                    <span className="font-medium">{employee.bankName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Cuenta:</span>
                    <span className="font-medium font-mono">{employee.accountNumber}</span>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleRetryPayment}
                disabled={isProcessing}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isProcessing ? 'Procesando...' : 'Reintentar pago'}
              </Button>
            </TabsContent>
            
            <TabsContent value="update" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bankName" className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4" />
                    <span>Banco</span>
                  </Label>
                  <Select 
                    value={accountData.bankName} 
                    onValueChange={(value) => setAccountData({...accountData, bankName: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                      <SelectItem value="Banco de Bogotá">Banco de Bogotá</SelectItem>
                      <SelectItem value="Davivienda">Davivienda</SelectItem>
                      <SelectItem value="Nequi">Nequi</SelectItem>
                      <SelectItem value="BBVA">BBVA</SelectItem>
                      <SelectItem value="Scotiabank">Scotiabank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="accountType">Tipo de cuenta</Label>
                  <Select 
                    value={accountData.accountType} 
                    onValueChange={(value) => setAccountData({...accountData, accountType: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ahorros">Ahorros</SelectItem>
                      <SelectItem value="corriente">Corriente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="accountNumber">Número de cuenta</Label>
                  <Input
                    id="accountNumber"
                    value={accountData.accountNumber}
                    onChange={(e) => setAccountData({...accountData, accountNumber: e.target.value})}
                    placeholder="Ingrese el número de cuenta"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleUpdateAccount}
                disabled={isProcessing || !accountData.bankName || !accountData.accountNumber}
                className="w-full"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                {isProcessing ? 'Actualizando...' : 'Actualizar y reintentar'}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
