
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { NovedadImportStep } from './ImportNovedadesDrawer';
import { NovedadesImportService } from '@/services/NovedadesImportService';
import { useToast } from '@/hooks/use-toast';

interface NovedadesValidationPreviewStepProps {
  data: {
    file?: File;
    columns?: string[];
    rows?: any[];
    mappings?: any[];
    mapping?: Record<string, string>;
  };
  periodId: string;
  onNext: (step: NovedadImportStep) => void;
  onBack: () => void;
}

export const NovedadesValidationPreviewStep = ({
  data,
  periodId,
  onNext,
  onBack
}: NovedadesValidationPreviewStepProps) => {
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    validateData();
  }, []);

  const validateData = async () => {
    if (!data.rows || !data.mapping) return;

    setIsValidating(true);
    try {
      console.log('🔍 Validando datos de importación...');
      const result = await NovedadesImportService.validateAndPrepareData(
        data.rows,
        data.mapping,
        periodId
      );
      
      setValidationResult(result);
      console.log('✅ Validación completada:', {
        valid: result.validRows.length,
        invalid: result.invalidRows.length
      });
    } catch (error: any) {
      console.error('❌ Error en validación:', error);
      toast({
        title: "Error de validación",
        description: error.message || "No se pudo validar los datos",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!validationResult?.validRows?.length) return;

    setIsImporting(true);
    try {
      console.log('🚀 Iniciando importación de novedades...');
      const result = await NovedadesImportService.importNovedades(
        validationResult.validRows,
        periodId
      );

      if (result.success) {
        onNext({
          step: 'result',
          data: {
            ...data,
            validRows: validationResult.validRows,
            invalidRows: validationResult.invalidRows,
            totalRows: data.rows?.length || 0,
            importResult: {
              success: result.imported,
              errors: result.errors,
              employeesAffected: result.employeesAffected
            }
          }
        });
      } else {
        throw new Error(result.error || 'Error en la importación');
      }
    } catch (error: any) {
      console.error('❌ Error en importación:', error);
      toast({
        title: "Error de importación",
        description: error.message || "No se pudo completar la importación",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const exportErrors = () => {
    if (!validationResult?.invalidRows?.length) return;

    const headers = ['Fila', 'Error', 'Datos'];
    const csvContent = headers.join(',') + '\n' +
      validationResult.invalidRows.map((row: any, index: number) => {
        const rowData = Object.values(row.originalData || {}).join('; ');
        return `${index + 1},"${row.error}","${rowData}"`;
      }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'errores_importacion.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (isValidating) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600">Validando datos...</p>
        </div>
      </div>
    );
  }

  if (!validationResult) {
    return (
      <div className="text-center text-red-600">
        Error cargando la validación
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Resumen de validación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {validationResult.validRows.length}
              </div>
              <div className="text-sm text-gray-600">Filas válidas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {validationResult.invalidRows.length}
              </div>
              <div className="text-sm text-gray-600">Filas con errores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {validationResult.employeesFound || 0}
              </div>
              <div className="text-sm text-gray-600">Empleados encontrados</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="valid" className="w-full">
        <TabsList>
          <TabsTrigger value="valid" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Filas válidas ({validationResult.validRows.length})
          </TabsTrigger>
          <TabsTrigger value="invalid" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Errores ({validationResult.invalidRows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="valid" className="space-y-4">
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Empleado</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Valor</th>
                  <th className="px-3 py-2 text-left">Días/Horas</th>
                </tr>
              </thead>
              <tbody>
                {validationResult.validRows.slice(0, 100).map((row: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="px-3 py-2">
                      <div>
                        <div className="font-medium">{row.employeeName}</div>
                        <div className="text-xs text-gray-500">{row.empleado_id}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{row.tipo_novedad}</Badge>
                      {row.subtipo && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {row.subtipo}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      ${(row.valor || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      {row.dias && `${row.dias}d`}
                      {row.horas && `${row.horas}h`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {validationResult.validRows.length > 100 && (
              <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                Mostrando primeras 100 filas de {validationResult.validRows.length} total
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="invalid" className="space-y-4">
          {validationResult.invalidRows.length > 0 && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={exportErrors} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar errores
              </Button>
            </div>
          )}
          
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-red-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Fila</th>
                  <th className="px-3 py-2 text-left">Error</th>
                  <th className="px-3 py-2 text-left">Datos</th>
                </tr>
              </thead>
              <tbody>
                {validationResult.invalidRows.map((row: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="px-3 py-2">{row.rowIndex + 1}</td>
                    <td className="px-3 py-2 text-red-600">{row.error}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {JSON.stringify(row.originalData).slice(0, 100)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        
        <Button 
          onClick={handleImport} 
          disabled={validationResult.validRows.length === 0 || isImporting}
        >
          {isImporting ? 'Importando...' : 'Importar novedades'}
          {!isImporting && <ArrowRight className="h-4 w-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
};
