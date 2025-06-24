
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { ImportStep } from '../ImportEmployeesDrawer';
import * as XLSX from 'xlsx';

interface FileUploadStepProps {
  onNext: (step: ImportStep) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export const FileUploadStep = ({ onNext, isProcessing, setIsProcessing }: FileUploadStepProps) => {
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    
    // Validar tipo de archivo
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx?|csv)$/i)) {
      setError('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV (.csv)');
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Máximo 10MB permitido.');
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
      let workbook: XLSX.WorkBook;

      if (selectedFile.name.toLowerCase().endsWith('.csv')) {
        const text = new TextDecoder().decode(arrayBuffer);
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        workbook = XLSX.read(arrayBuffer, { type: 'array' });
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        setError('El archivo debe contener al menos una fila de encabezados y una fila de datos');
        return;
      }

      // Obtener columnas (primera fila)
      const columns = (jsonData[0] as string[]).filter(col => col && col.trim() !== '');
      
      // Obtener filas de datos
      const rows = jsonData.slice(1)
        .filter((row: any) => row.some((cell: any) => cell !== null && cell !== undefined && cell !== ''))
        .map((row: any, index: number) => {
          const rowData: any = { _rowIndex: index + 2 }; // +2 porque empezamos desde la fila 2 del Excel
          columns.forEach((col, colIndex) => {
            rowData[col] = row[colIndex] || '';
          });
          return rowData;
        });

      if (rows.length === 0) {
        setError('No se encontraron filas de datos válidas en el archivo');
        return;
      }

      console.log('Archivo procesado:', { columns, rows: rows.slice(0, 5) });

      onNext({
        step: 'mapping',
        data: {
          file: selectedFile,
          columns,
          rows
        }
      });

    } catch (error) {
      console.error('Error processing file:', error);
      setError('Error al procesar el archivo. Verifica que el formato sea correcto.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Sube tu archivo de empleados
        </h3>
        <p className="text-gray-600">
          Acepta archivos Excel (.xlsx, .xls) o CSV. No necesitas usar una plantilla específica.
        </p>
      </div>

      <Card 
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : selectedFile 
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          
          {selectedFile ? (
            <>
              <FileText className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-600">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Arrastra tu archivo aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-600">
                Archivos Excel (.xlsx, .xls) o CSV hasta 10MB
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={processFile}
          disabled={!selectedFile || isProcessing}
          className="min-w-32"
        >
          {isProcessing ? 'Procesando...' : 'Continuar'}
        </Button>
      </div>
    </div>
  );
};
