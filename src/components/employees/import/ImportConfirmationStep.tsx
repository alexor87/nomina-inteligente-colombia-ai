
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertCircle, Users, FileText, Clock } from 'lucide-react';
import { ImportData } from '../ImportEmployeesDrawer';
import { useToast } from '@/hooks/use-toast';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';
import { supabase } from '@/integrations/supabase/client';

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
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleImport = async () => {
    setIsImporting(true);
    setProgress(0);
    
    try {
      // Get current user's company ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No se pudo obtener el ID de la empresa');
      }

      const companyId = profile.company_id;
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process valid rows
      const employeesWithCompany = data.validRows.map(row => ({
        ...row,
        empresaId: companyId,
        custom_fields: row.custom_fields || {}
      }));

      for (let i = 0; i < employeesWithCompany.length; i++) {
        const employee = employeesWithCompany[i];
        
        try {
          const result = await EmployeeUnifiedService.create(employee);
          
          if (result.success) {
            successful++;
          } else {
            failed++;
            errors.push(`Error en empleado ${employee.nombre} ${employee.apellido}: ${result.error}`);
          }
        } catch (error: any) {
          failed++;
          errors.push(`Error en empleado ${employee.nombre} ${employee.apellido}: ${error.message}`);
        }
        
        // Update progress
        setProgress(((i + 1) / employeesWithCompany.length) * 100);
      }

      setResults({ successful, failed, errors });

      if (successful > 0) {
        toast({
          title: "Importación completada",
          description: `Se importaron ${successful} empleados correctamente`,
          className: "border-green-200 bg-green-50"
        });
      }

      if (failed > 0) {
        toast({
          title: "Algunos empleados no se importaron",
          description: `${failed} empleados tuvieron errores`,
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
                  <p className="text-2xl font-bold text-green-900">{data.validRows.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">Inválidos</p>
                  <p className="text-2xl font-bold text-red-900">{data.invalidRows.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-800">Total</p>
                  <p className="text-2xl font-bold text-blue-900">{data.totalRows}</p>
                </div>
              </div>
            </div>

            {data.invalidRows.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <p className="font-semibold text-yellow-800">
                    Atención: {data.invalidRows.length} empleados no se importarán
                  </p>
                </div>
                <p className="text-sm text-yellow-700">
                  Los empleados con errores no serán incluidos en la importación. 
                  Puedes corregir los errores en tu archivo y volver a intentar.
                </p>
              </div>
            )}

            {isImporting && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Importando empleados...</span>
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
                    <span>Exitosos: {results.successful}</span>
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
                          • {error}
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
              disabled={isImporting || data.validRows.length === 0}
            >
              {isImporting ? 'Importando...' : `Importar ${data.validRows.length} empleados`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
