
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Download } from 'lucide-react';
import { NovedadImportStep } from './ImportNovedadesDrawer';
import { NovedadesImportService } from '@/services/NovedadesImportService';

interface NovedadesFileUploadStepProps {
  onNext: (step: NovedadImportStep) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export const NovedadesFileUploadStep = ({
  onNext,
  isProcessing,
  setIsProcessing
}: NovedadesFileUploadStepProps) => {
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast({
        title: "Formato no válido",
        description: "Por favor selecciona un archivo CSV o Excel (.xlsx, .xls)",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      console.log('📄 Procesando archivo:', file.name);
      const result = await NovedadesImportService.parseFile(file);
      
      if (result.success && result.data) {
        console.log('✅ Archivo procesado exitosamente:', {
          rows: result.data.rows.length,
          columns: result.data.columns.length
        });

        onNext({
          step: 'mapping',
          data: {
            file,
            columns: result.data.columns,
            rows: result.data.rows
          }
        });
      } else {
        throw new Error(result.error || 'Error procesando el archivo');
      }
    } catch (error: any) {
      console.error('❌ Error procesando archivo:', error);
      toast({
        title: "Error procesando archivo",
        description: error.message || "No se pudo procesar el archivo",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onNext, setIsProcessing, toast]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const downloadTemplate = () => {
    const headers = [
      'cedula',
      'periodo',
      'fecha_inicio',
      'fecha_fin',
      'dias',
      'horas',
      'tipo_novedad',
      'subtipo',
      'valor',
      'observacion',
      'constitutivo_salario'
    ];
    
    const csvContent = headers.join(',') + '\n' +
      '12345678,2025-01,2025-01-15,2025-01-16,2,0,vacaciones,,150000,Vacaciones programadas,true\n' +
      '87654321,2025-01,,,0,8,horas_extra,diurnas,120000,Horas extra trabajadas,false';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'plantilla_novedades.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir archivo de novedades
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
              ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-gray-400'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !isProcessing && document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={handleInputChange}
              disabled={isProcessing}
            />
            
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            
            {isProcessing ? (
              <div className="space-y-2">
                <p className="text-lg font-medium">Procesando archivo...</p>
                <p className="text-sm text-gray-600">Por favor espera</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Arrastra y suelta tu archivo aquí, o haz clic para seleccionar
                </p>
                <p className="text-sm text-gray-600">
                  Formatos soportados: CSV, Excel (.xlsx, .xls)
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Descargar plantilla CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formato esperado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p><strong>Columnas requeridas:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>cedula:</strong> Cédula del empleado</li>
              <li><strong>periodo:</strong> ID del período o nombre (ej: "2025-01")</li>
              <li><strong>tipo_novedad:</strong> Tipo de novedad (vacaciones, horas_extra, etc.)</li>
              <li><strong>valor:</strong> Valor monetario (opcional si se calcula automáticamente)</li>
            </ul>
            <p><strong>Columnas opcionales:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>fecha_inicio, fecha_fin:</strong> Fechas en formato YYYY-MM-DD</li>
              <li><strong>dias:</strong> Número de días</li>
              <li><strong>horas:</strong> Número de horas</li>
              <li><strong>subtipo:</strong> Subtipo de novedad</li>
              <li><strong>observacion:</strong> Observaciones adicionales</li>
              <li><strong>constitutivo_salario:</strong> true/false</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
