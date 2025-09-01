import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertCircle, FileText, Clock, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NoveltyImportService } from '@/services/NoveltyImportService';
import { NOVEDAD_TYPE_LABELS, NovedadType } from '@/types/novedades-enhanced';
import { formatCurrency } from '@/lib/utils';

interface ImportData {
  file: File;
  columns: string[];
  rows: any[];
  mapping: Record<string, string>;
  validationResults?: Record<number, any>;
  totalRows?: number;
}

interface NoveltyImportConfirmationStepProps {
  data: ImportData;
  onComplete: () => void;
  onBack: () => void;
  companyId: string;
  periodId: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

export const NoveltyImportConfirmationStep = ({ 
  data, 
  onComplete, 
  onBack,
  companyId,
  periodId 
}: NoveltyImportConfirmationStepProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [currentImportStep, setCurrentImportStep] = useState('');
  const { toast } = useToast();

  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    setCurrentImportStep('Preparando importación...');

    try {
      // Prepare novelty data for import
      const noveltiesData = data.rows.map((row, index) => ({
        empleado_id: row._employeeId,
        company_id: companyId,
        periodo_id: periodId,
        tipo_novedad: row.tipo_novedad as NovedadType,
        subtipo: row.subtipo || undefined,
        fecha_inicio: row.fecha_inicio || undefined,
        fecha_fin: row.fecha_fin || undefined,
        dias: row.dias ? Number(row.dias) : undefined,
        horas: row.horas ? Number(row.horas) : undefined,
        valor: Number(row.valor),
        observacion: row.observacion || undefined,
        constitutivo_salario: row.constitutivo_salario === true || row.constitutivo_salario === 'true',
        _originalRowIndex: index
      }));

      console.log('📊 Iniciando importación de novedades:', {
        totalRows: noveltiesData.length,
        companyId,
        periodId,
        sampleData: noveltiesData[0]
      });

      setCurrentImportStep(`Importando ${noveltiesData.length} novedades...`);
      
      // Import novelties in batches
      const result = await NoveltyImportService.importNovelties(
        noveltiesData,
        (progress, step) => {
          setImportProgress(progress);
          setCurrentImportStep(step);
        }
      );

      setImportResult(result);

      if (result.success && result.imported > 0) {
        toast({
          title: "✅ Importación Completada",
          description: `Se importaron ${result.imported} novedades exitosamente`,
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: "⚠️ Importación con Errores",
          description: `Solo se importaron ${result.imported} de ${data.rows.length} novedades`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('❌ Error durante la importación:', error);
      setImportResult({
        success: false,
        imported: 0,
        failed: data.rows.length,
        errors: [{
          row: 0,
          error: error instanceof Error ? error.message : 'Error desconocido',
          data: {}
        }]
      });

      toast({
        title: "❌ Error en la Importación",
        description: "Ocurrió un error durante la importación de novedades",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFinish = () => {
    onComplete();
  };

  const getSummaryByType = () => {
    const summary: Record<string, { count: number; totalValue: number }> = {};
    
    data.rows.forEach(row => {
      const type = row.tipo_novedad as NovedadType;
      if (!summary[type]) {
        summary[type] = { count: 0, totalValue: 0 };
      }
      summary[type].count += 1;
      summary[type].totalValue += Number(row.valor || 0);
    });

    return summary;
  };

  const summary = getSummaryByType();
  const totalValue = Object.values(summary).reduce((sum, item) => sum + item.totalValue, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Confirmar Importación</h3>
        <p className="text-gray-600">
          Revisa el resumen antes de proceder con la importación
        </p>
      </div>

      {/* Import Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{data.rows.length}</div>
                <div className="text-sm text-gray-600">Novedades a Importar</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{Object.keys(summary).length}</div>
                <div className="text-sm text-gray-600">Tipos de Novedad</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="text-lg font-bold text-purple-600">{formatCurrency(totalValue)}</div>
              <div className="text-sm text-gray-600">Valor Total</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Novelty Type */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen por Tipo de Novedad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(summary).map(([type, data]) => (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">
                    {NOVEDAD_TYPE_LABELS[type as NovedadType] || type}
                  </div>
                  <div className="text-sm text-gray-600">
                    {data.count} {data.count === 1 ? 'novedad' : 'novedades'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(data.totalValue)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import Progress */}
      {isImporting && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Progreso de Importación</span>
                <span className="text-sm text-gray-600">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-3" />
              <div className="text-sm text-gray-600">{currentImportStep}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span>Resultado de la Importación</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-800 font-medium">
                    {importResult.imported} novedades importadas
                  </span>
                </div>
              </div>
              
              {importResult.failed > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-800 font-medium">
                      {importResult.failed} novedades fallidas
                    </span>
                  </div>
                </div>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-red-800">Errores encontrados:</h5>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {importResult.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                      Fila {error.row + 1}: {error.error}
                    </div>
                  ))}
                  {importResult.errors.length > 5 && (
                    <div className="text-sm text-gray-600">
                      ... y {importResult.errors.length - 5} errores más
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
          disabled={isImporting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        
        <div className="space-x-2">
          {!importResult && !isImporting && (
            <Button 
              onClick={handleImport}
              className="bg-green-600 hover:bg-green-700"
            >
              Importar {data.rows.length} Novedades
            </Button>
          )}
          
          {importResult && (
            <Button onClick={handleFinish}>
              Finalizar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};