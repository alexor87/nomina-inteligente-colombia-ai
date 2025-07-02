
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, AlertCircle, User, Mail, Phone, Building, Calendar, CreditCard } from 'lucide-react';
import { EmployeeService } from '@/services/EmployeeService';
import { toast } from 'sonner';
import { TIPOS_DOCUMENTO } from '@/types/employee-config';

interface ImportData {
  validRows: any[];
  invalidRows: any[];
  mapping: Record<string, string>;
  totalRows: number;
}

interface ImportConfirmationStepProps {
  data: ImportData;
  onComplete: () => void;
  onBack: () => void;
}

export const ImportConfirmationStep: React.FC<ImportConfirmationStepProps> = ({
  data,
  onComplete,
  onBack
}) => {
  const [isImporting, setIsImporting] = React.useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const row of data.validRows) {
        try {
          const employeeData = {
            cedula: row.cedula || '',
            tipoDocumento: row.tipoDocumento || 'CC' as const,
            nombre: row.nombre || '',
            apellido: row.apellido || '',
            email: row.email || '',
            telefono: row.telefono || '',
            salarioBase: parseFloat(row.salarioBase) || 0,
            tipoContrato: row.tipoContrato || 'indefinido' as const,
            fechaIngreso: row.fechaIngreso || new Date().toISOString().split('T')[0],
            estado: row.estado || 'activo' as const,
            eps: row.eps || '',
            afp: row.afp || '',
            arl: row.arl || '',
            cajaCompensacion: row.cajaCompensacion || '',
            cargo: row.cargo || '',
            empresaId: '', // Se asignará automáticamente en el servicio
            estadoAfiliacion: 'pendiente' as const,
            // Campos bancarios opcionales
            banco: row.banco || null,
            tipoCuenta: row.tipoCuenta || 'ahorros',
            numeroCuenta: row.numeroCuenta || null,
            titularCuenta: row.titularCuenta || null
          };

          await EmployeeService.createEmployee(employeeData);
          successCount++;
        } catch (error) {
          console.error('Error importing employee:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Se importaron ${successCount} empleados exitosamente`);
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} empleados no pudieron ser importados`);
      }

      onComplete();
      
    } catch (error) {
      console.error('Error durante la importación:', error);
      toast.error('Error durante la importación masiva');
    } finally {
      setIsImporting(false);
    }
  };

  
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold">Confirmación de Importación</h3>
            <p className="text-gray-600">
              Revisa el resumen antes de proceder con la importación
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-green-800 font-medium">Válidos</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {data.validRows.length}
              </Badge>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-red-800 font-medium">Con errores</span>
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                {data.invalidRows.length}
              </Badge>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">Total</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {data.totalRows}
              </Badge>
            </div>
          </div>
        </div>

        {data.validRows.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Vista previa de empleados válidos</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Salario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.validRows.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{row.nombre} {row.apellido}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          <span>{row.tipoDocumento || 'CC'} {row.cedula}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{row.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span>{row.cargo || 'No especificado'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            ${parseFloat(row.salarioBase || 0).toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.validRows.length > 5 && (
                <div className="p-3 bg-gray-50 text-center text-sm text-gray-600">
                  ... y {data.validRows.length - 5} empleados más
                </div>
              )}
            </div>
          </div>
        )}

        {data.invalidRows.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-red-900 mb-3 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Empleados con errores ({data.invalidRows.length})
            </h4>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 mb-2">
                Los siguientes registros tienen errores y no serán importados:
              </p>
              <ul className="text-sm text-red-700 space-y-1">
                {data.invalidRows.slice(0, 5).map((row, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="font-medium">Fila {row.rowIndex}:</span>
                    <span>{row.errors?.join(', ') || 'Datos incompletos'}</span>
                  </li>
                ))}
              </ul>
              {data.invalidRows.length > 5 && (
                <p className="text-sm text-red-600 mt-2">
                  ... y {data.invalidRows.length - 5} errores más
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isImporting}>
          Volver
        </Button>
        <Button 
          onClick={handleImport} 
          disabled={data.validRows.length === 0 || isImporting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isImporting ? 'Importando...' : `Importar ${data.validRows.length} empleados`}
        </Button>
      </div>
    </div>
  );
};
