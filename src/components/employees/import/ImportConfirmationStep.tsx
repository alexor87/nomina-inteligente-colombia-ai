
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, ArrowLeft, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmployeeDataService } from '@/services/EmployeeDataService';
import { EmployeeService } from '@/services/EmployeeService';

interface ImportConfirmationStepProps {
  data: any;
  onComplete: () => void;
  onBack: () => void;
}

export const ImportConfirmationStep = ({ data, onComplete, onBack }: ImportConfirmationStepProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'completed' | 'error'>('idle');
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const { toast } = useToast();

  const handleImport = async () => {
    setIsImporting(true);
    setImportStatus('importing');
    setImportProgress(0);

    try {
      // Obtener la empresa del usuario
      const companyId = await EmployeeDataService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró la empresa del usuario');
      }

      const totalRows = data.validRows.length;
      let processed = 0;
      let imported = 0;
      let errors = 0;

      // Procesar empleados en lotes de 5
      const batchSize = 5;
      for (let i = 0; i < totalRows; i += batchSize) {
        const batch = data.validRows.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (rowData: any) => {
          try {
            // Preparar datos del empleado
            const employeeData = {
              cedula: rowData.cedula,
              nombre: rowData.nombre,
              apellido: rowData.apellido,
              email: rowData.email || '',
              telefono: rowData.telefono || '',
              salarioBase: Number(rowData.salarioBase),
              tipoContrato: rowData.tipoContrato || 'indefinido',
              fechaIngreso: rowData.fechaIngreso,
              estado: rowData.estado || 'activo',
              eps: rowData.eps || '',
              afp: rowData.afp || '',
              arl: rowData.arl || '',
              cajaCompensacion: rowData.cajaCompensacion || '',
              cargo: rowData.cargo || '',
              empresaId: companyId,
              estadoAfiliacion: rowData.estadoAfiliacion || 'pendiente',
              // Campos bancarios
              banco: rowData.banco || '',
              tipoCuenta: rowData.tipoCuenta || 'ahorros',
              numeroCuenta: rowData.numeroCuenta || '',
              titularCuenta: rowData.titularCuenta || ''
            };

            console.log('Importando empleado:', employeeData);

            await EmployeeService.create(employeeData);
            imported++;
          } catch (error) {
            console.error('Error importing employee:', error);
            errors++;
          }
          
          processed++;
          setImportProgress((processed / totalRows) * 100);
        });

        await Promise.all(batchPromises);
        
        // Pequeña pausa entre lotes para no sobrecargar
        if (i + batchSize < totalRows) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setImportedCount(imported);
      setErrorCount(errors);
      setImportStatus('completed');

      // Registrar la importación
      try {
        // Aquí podrías registrar en la tabla employee_imports si es necesario
        console.log('Import completed:', { imported, errors, total: totalRows });
      } catch (logError) {
        console.error('Error logging import:', logError);
      }

      toast({
        title: "Importación completada",
        description: `Se importaron ${imported} empleados exitosamente${errors > 0 ? `. ${errors} registros con errores.` : '.'}`,
      });

    } catch (error: any) {
      console.error('Import error:', error);
      setImportStatus('error');
      toast({
        title: "Error en la importación",
        description: error.message || "Ocurrió un error durante la importación",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  if (importStatus === 'importing') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Importando empleados...
          </h3>
          <p className="text-gray-600">
            Por favor espera mientras procesamos los datos
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Progreso de importación</span>
                <span>{Math.round(importProgress)}%</span>
              </div>
              <Progress value={importProgress} className="h-3" />
              <div className="text-center text-sm text-gray-500">
                Procesando empleados en lotes para mejor rendimiento...
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (importStatus === 'completed') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            ¡Importación completada!
          </h3>
          <p className="text-gray-600">
            Los empleados han sido importados exitosamente
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="flex items-center p-4">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <div className="text-2xl font-bold text-green-600">{importedCount}</div>
                <div className="text-sm text-gray-600">Empleados importados</div>
              </div>
            </CardContent>
          </Card>

          {errorCount > 0 && (
            <Card>
              <CardContent className="flex items-center p-4">
                <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                  <div className="text-sm text-gray-600">Errores encontrados</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-center">
          <Button onClick={handleComplete} size="lg">
            <Users className="h-4 w-4 mr-2" />
            Ver empleados importados
          </Button>
        </div>
      </div>
    );
  }

  if (importStatus === 'error') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error en la importación
          </h3>
          <p className="text-gray-600">
            Ocurrió un error durante el proceso de importación
          </p>
        </div>

        <div className="flex justify-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button onClick={handleImport}>
            Reintentar importación
          </Button>
        </div>
      </div>
    );
  }

  // Estado inicial - confirmación
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Confirmar importación
        </h3>
        <p className="text-gray-600">
          Revisa el resumen antes de proceder con la importación
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen de importación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Archivo:</span>
              <div className="font-medium">{data.file?.name}</div>
            </div>
            <div>
              <span className="text-gray-600">Total de filas:</span>
              <div className="font-medium">{data.rows.length}</div>
            </div>
            <div>
              <span className="text-gray-600">Filas válidas:</span>
              <div className="font-medium text-green-600">{data.validRows.length}</div>
            </div>
            <div>
              <span className="text-gray-600">Filas con errores:</span>
              <div className="font-medium text-red-600">{data.invalidRows.length}</div>
            </div>
          </div>

          {data.invalidRows.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                <div className="text-sm">
                  <strong>Nota:</strong> Solo se importarán las filas válidas. 
                  Las filas con errores serán omitidas.
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Button 
          onClick={handleImport}
          disabled={isImporting || data.validRows.length === 0}
          size="lg"
        >
          {isImporting ? 'Importando...' : `Importar ${data.validRows.length} empleados`}
        </Button>
      </div>
    </div>
  );
};
