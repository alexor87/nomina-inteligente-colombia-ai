
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, AlertCircle, FileText, Users, DollarSign } from 'lucide-react';
import { PaymentEmployee, BankFileGeneration } from '@/types/payments';
import { usePayments } from '@/hooks/usePayments';

interface BankFileGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  employees: PaymentEmployee[];
}

export const BankFileGenerator = ({ isOpen, onClose, employees }: BankFileGeneratorProps) => {
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<'txt' | 'csv' | 'xlsx'>('txt');
  const { generateBankFile, isGeneratingFile } = usePayments();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Filtrar empleados válidos (con datos bancarios completos)
  const validEmployees = employees.filter(emp => 
    emp.bankName && emp.accountNumber && emp.paymentStatus !== 'pagado'
  );

  const invalidEmployees = employees.filter(emp => 
    !emp.bankName || !emp.accountNumber
  );

  // Agrupar por banco
  const employeesByBank = validEmployees.reduce((acc, emp) => {
    if (!acc[emp.bankName]) {
      acc[emp.bankName] = [];
    }
    acc[emp.bankName].push(emp);
    return acc;
  }, {} as Record<string, PaymentEmployee[]>);

  const totalAmount = validEmployees.reduce((sum, emp) => sum + emp.netPay, 0);

  const bankFormats: Record<string, string[]> = {
    'bancolombia': ['txt', 'csv'],
    'bogota': ['txt', 'xlsx'],
    'davivienda': ['txt', 'csv'],
    'nequi': ['csv'],
    'excel_generico': ['xlsx']
  };

  const handleGenerateFile = async () => {
    if (!selectedBank) return;

    const bankEmployees = selectedBank === 'todos' 
      ? validEmployees 
      : employeesByBank[selectedBank] || [];

    const config: BankFileGeneration = {
      bankName: selectedBank as any,
      format: selectedFormat,
      employees: bankEmployees,
      totalAmount: bankEmployees.reduce((sum, emp) => sum + emp.netPay, 0),
      totalAccounts: bankEmployees.length
    };

    const result = await generateBankFile(config);
    if (result.success) {
      onClose();
    }
  };

  const getAvailableFormats = () => {
    if (!selectedBank || selectedBank === 'todos') {
      return ['txt', 'csv', 'xlsx'];
    }
    return bankFormats[selectedBank] || ['txt'];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Generar Archivo Bancario</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Validaciones */}
          {invalidEmployees.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <h3 className="font-medium text-amber-800">Empleados con datos incompletos</h3>
              </div>
              <p className="text-sm text-amber-700 mb-3">
                {invalidEmployees.length} empleados no serán incluidos por falta de datos bancarios
              </p>
              <div className="space-y-1">
                {invalidEmployees.slice(0, 3).map(emp => (
                  <div key={emp.id} className="text-xs text-amber-600">
                    • {emp.name} - {!emp.bankName ? 'Sin banco' : 'Sin cuenta'}
                  </div>
                ))}
                {invalidEmployees.length > 3 && (
                  <div className="text-xs text-amber-600">
                    ... y {invalidEmployees.length - 3} más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selección de banco */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar banco
            </label>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un banco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los bancos (archivo genérico)</SelectItem>
                {Object.entries(employeesByBank).map(([bank, emps]) => (
                  <SelectItem key={bank} value={bank}>
                    {bank} ({emps.length} empleados)
                  </SelectItem>
                ))}
                <SelectItem value="excel_generico">Excel genérico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Formato de archivo */}
          {selectedBank && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formato de archivo
              </label>
              <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableFormats().map(format => (
                    <SelectItem key={format} value={format}>
                      {format.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preview de totales */}
          {selectedBank && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Resumen del archivo</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Users className="h-4 w-4 text-blue-600 mr-1" />
                    <span className="text-sm text-gray-600">Empleados</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {selectedBank === 'todos' ? validEmployees.length : (employeesByBank[selectedBank]?.length || 0)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-gray-600">Total</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(
                      selectedBank === 'todos' 
                        ? totalAmount 
                        : (employeesByBank[selectedBank]?.reduce((sum, emp) => sum + emp.netPay, 0) || 0)
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <FileText className="h-4 w-4 text-purple-600 mr-1" />
                    <span className="text-sm text-gray-600">Formato</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    <Badge variant="secondary">{selectedFormat.toUpperCase()}</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desglose por banco */}
          {selectedBank === 'todos' && Object.keys(employeesByBank).length > 1 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Desglose por banco</h3>
              <div className="space-y-2">
                {Object.entries(employeesByBank).map(([bank, emps]) => (
                  <div key={bank} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{bank}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">{emps.length} empleados</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(emps.reduce((sum, emp) => sum + emp.netPay, 0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGenerateFile}
            disabled={!selectedBank || isGeneratingFile || validEmployees.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingFile ? 'Generando...' : 'Generar archivo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
