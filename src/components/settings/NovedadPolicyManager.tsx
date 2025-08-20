
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Settings, Play, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NovedadPolicyBackfillService } from '@/services/NovedadPolicyBackfillService';

interface NovedadPolicyManagerProps {
  incapacityPolicy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor';
  onIncapacityPolicyChange: (value: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor') => void;
  companyId?: string;
}

export const NovedadPolicyManager: React.FC<NovedadPolicyManagerProps> = ({
  incapacityPolicy,
  onIncapacityPolicyChange,
  companyId
}) => {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleAnalyzeBackfill = async () => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company ID is required for analysis",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await NovedadPolicyBackfillService.analyzeIncapacitiesForBackfill(companyId);
      setAnalysisResult(result);
      
      toast({
        title: "Análisis completado",
        description: `Se encontraron ${result.totalIncapacities} incapacidades en períodos abiertos`,
      });
    } catch (error) {
      console.error('Error analyzing backfill:', error);
      toast({
        title: "Error en análisis",
        description: "No se pudo completar el análisis",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyBackfill = async () => {
    if (!companyId || !analysisResult) {
      toast({
        title: "Error",
        description: "Se requiere análisis previo",
        variant: "destructive"
      });
      return;
    }

    setIsBackfilling(true);
    try {
      const result = await NovedadPolicyBackfillService.backfillIncapacitiesWithNewPolicy(
        companyId,
        incapacityPolicy
      );
      
      toast({
        title: "Backfill completado",
        description: `Se actualizaron ${result.updatedCount} incapacidades`,
      });
      
      // Reset analysis after successful backfill
      setAnalysisResult(null);
    } catch (error) {
      console.error('Error applying backfill:', error);
      toast({
        title: "Error en backfill",
        description: "No se pudo completar la actualización",
        variant: "destructive"
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Políticas de Novedades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="incapacity-policy">Política de Incapacidades</Label>
          <Select
            value={incapacityPolicy}
            onValueChange={onIncapacityPolicyChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard_2d_100_rest_66">
                Estándar: 2 días 100%, resto 66.67%
              </SelectItem>
              <SelectItem value="from_day1_66_with_floor">
                Desde día 1: 66.67% con piso SMLDV
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Importante:</p>
              <p>Los cambios en las políticas afectarán nuevos cálculos de novedades. Las novedades existentes mantendrán su valor original a menos que se recalculen manualmente.</p>
            </div>
          </div>
        </div>

        {companyId && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Actualizar Incapacidades Existentes</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleAnalyzeBackfill}
                disabled={isAnalyzing}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {isAnalyzing ? 'Analizando...' : 'Analizar Impacto'}
              </Button>
              
              <Button
                onClick={handleApplyBackfill}
                disabled={isBackfilling || !analysisResult}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                {isBackfilling ? 'Aplicando...' : 'Aplicar Cambios'}
              </Button>
            </div>

            {analysisResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <div className="space-y-1">
                  <div><strong>Incapacidades encontradas:</strong> {analysisResult.totalIncapacities}</div>
                  <div><strong>Períodos abiertos:</strong> {analysisResult.periodsAffected.length}</div>
                  <div><strong>Empleados afectados:</strong> {analysisResult.employeesAffected}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
