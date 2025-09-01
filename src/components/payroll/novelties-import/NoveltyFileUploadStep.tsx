import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { NOVELTY_IMPORT_TEMPLATE_HEADERS, NOVELTY_IMPORT_TEMPLATE_SAMPLE_DATA } from './NoveltyFieldMapping';

export interface ImportStep {
  step: 'upload' | 'mapping' | 'validation' | 'confirmation';
  data?: {
    file: File;
    columns: string[];
    rows: any[];
    errors?: string[];
    mapping?: Record<string, string>;
    totalRows?: number;
    validationResults?: Record<number, any>;
  };
}

interface NoveltyFileUploadStepProps {
  onNext: (step: ImportStep) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export const NoveltyFileUploadStep = ({ onNext, isProcessing, setIsProcessing }: NoveltyFileUploadStepProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    
    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx?|csv)$/i)) {
      setError('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV válido');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo es demasiado grande. El tamaño máximo permitido es 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (jsonData.length === 0) {
        throw new Error('El archivo está vacío');
      }

      if (jsonData.length < 2) {
        throw new Error('El archivo debe tener al menos una fila de encabezados y una fila de datos');
      }

      // Extract headers and data
      const columns = jsonData[0].map((col: any) => String(col || '').trim()).filter(col => col);
      const dataRows = jsonData.slice(1).filter(row => 
        row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
      );

      if (columns.length === 0) {
        throw new Error('No se encontraron columnas válidas en el archivo');
      }

      if (dataRows.length === 0) {
        throw new Error('No se encontraron filas de datos válidas en el archivo');
      }

      if (dataRows.length > 1000) {
        throw new Error('El archivo contiene demasiadas filas. El límite máximo es 1000 novedades por importación');
      }

      console.log('📊 Archivo procesado exitosamente:', {
        fileName: selectedFile.name,
        columns: columns.length,
        dataRows: dataRows.length,
        firstFewColumns: columns.slice(0, 5)
      });

      onNext({
        step: 'mapping',
        data: {
          file: selectedFile,
          columns,
          rows: dataRows,
          totalRows: dataRows.length
        }
      });

    } catch (error) {
      console.error('❌ Error procesando archivo:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido procesando el archivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [NOVELTY_IMPORT_TEMPLATE_HEADERS, ...NOVELTY_IMPORT_TEMPLATE_SAMPLE_DATA];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    const colWidths = NOVELTY_IMPORT_TEMPLATE_HEADERS.map(() => ({ width: 20 }));
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Novedades');
    XLSX.writeFile(wb, 'plantilla_importacion_novedades.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Importar Novedades desde Excel o CSV</h3>
        <p className="text-gray-600 mb-4">
          Sube un archivo con las novedades para procesarlas masivamente en esta liquidación
        </p>
        
        <Button 
          variant="outline" 
          onClick={downloadTemplate}
          className="mb-4"
        >
          <Download className="h-4 w-4 mr-2" />
          Descargar Plantilla Excel
        </Button>
      </div>

      <Card 
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : selectedFile 
              ? 'border-green-400 bg-green-50' 
              : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          
          <div className={`rounded-full p-3 ${
            selectedFile ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {selectedFile ? (
              <FileText className="h-8 w-8 text-green-600" />
            ) : (
              <Upload className="h-8 w-8 text-gray-400" />
            )}
          </div>
          
          {selectedFile ? (
            <div className="text-center">
              <p className="font-medium text-green-700">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700 mb-1">
                Arrastra tu archivo aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500">
                Formatos soportados: Excel (.xlsx, .xls) y CSV
              </p>
              <p className="text-sm text-gray-500">
                Tamaño máximo: 10MB | Máximo 1000 novedades
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={processFile}
          disabled={!selectedFile || isProcessing}
          className="min-w-[120px]"
        >
          {isProcessing ? 'Procesando...' : 'Continuar'}
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">💡 Consejos para el archivo:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Usa la plantilla descargable para asegurar el formato correcto</li>
          <li>• La identificación del empleado puede ser: cédula, email o ID interno</li>
          <li>• Los tipos de novedad válidos están predefinidos en el sistema</li>
          <li>• Las fechas deben estar en formato YYYY-MM-DD (ej: 2024-01-15)</li>
          <li>• Para ausencias e incapacidades, incluye fechas de inicio y fin</li>
          <li>• Para horas extra, especifica las horas trabajadas</li>
        </ul>
      </div>
    </div>
  );
};