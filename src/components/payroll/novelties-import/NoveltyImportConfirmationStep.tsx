import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertCircle, FileText, Clock, ArrowLeft, Users } from 'lucide-react';
import { ImportStep, ImportData } from '@/types/import-shared';
import { useToast } from '@/hooks/use-toast';
import { NoveltyImportService } from '@/services/NoveltyImportService';
import { NOVEDAD_TYPE_LABELS, NovedadType } from '@/types/novedades-enhanced';
import { formatCurrency } from '@/lib/utils';

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

export const NoveltyImportConfirmationStep: React.FC<NoveltyImportConfirmationStepProps> = ({
  data,
  onComplete,
  onBack,
  companyId,
  periodId 
}) => {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    setIsImporting(true);
    setProgress(0);
    
    try {      
      // Prepare novelty data for import
      const noveltiesData = (data.validRows || []).map((row, index) => ({
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
      
      // Import novelties in batches
      const result = await NoveltyImportService.importNovelties(
        noveltiesData,
        (progress, step) => {
          setProgress(progress);
        }
      );

      setResults(result);

      if (result.success && result.imported > 0) {
        toast({
          title: "Importación completada",
          description: `Se importaron ${result.imported} novedades exitosamente`,
          className: "border-green-200 bg-green-50"
        });
      }

      if (result.failed > 0) {
        toast({
          title: "Algunas novedades no se importaron",
          description: `${result.failed} novedades tuvieron errores`,
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('Error during import:', error);
      toast({
        title: "Error en la importación",
        description: error.message || "Error inesperado durante la importación",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  const getSummaryByType = () => {
    const summary: Record<string, { count: number; totalValue: number }> = {};
    
    (data.validRows || []).forEach(row => {
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Confirmación de Importación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">Válidos</p>
                  <p className="text-2xl font-bold text-green-900">{data.validRows?.length || 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">Inválidos</p>
                  <p className="text-2xl font-bold text-red-900">{data.invalidRows?.length || 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-800">Total</p>
                  <p className="text-2xl font-bold text-blue-900">{data.totalRows || 0}</p>
                </div>
              </div>
            </div>

            {(data.invalidRows?.length || 0) > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <p className="font-semibold text-yellow-800">
                    Atención: {data.invalidRows?.length} novedades no se importarán
                  </p>
                </div>
                <p className="text-sm text-yellow-700">
                  Las novedades con errores no serán incluidas en la importación. 
                  Puedes corregir los errores en tu archivo y volver a intentar.
                </p>
              </div>
            )}

            {isImporting && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Importando novedades...</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-gray-600">
                  {Math.round(progress)}% completado
                </p>
              </div>
            )}

            {results && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold">Resultados de la importación:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span>Exitosos: {results.imported}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span>Fallidos: {results.failed}</span>
                  </div>
                </div>
                
                {results.errors.length > 0 && (
                  <div className="mt-3">
                    <h5 className="font-medium text-red-800 mb-2">Errores:</h5>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {results.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-700">
                          • {error.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
          disabled={isImporting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        
        <div className="flex gap-3">
          {results ? (
            <Button onClick={handleComplete}>
              Finalizar
            </Button>
          ) : (
            <Button 
              onClick={handleImport}
              disabled={isImporting || (data.validRows?.length || 0) === 0}
            >
              {isImporting ? 'Importando...' : `Importar ${data.validRows?.length || 0} novedades`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};