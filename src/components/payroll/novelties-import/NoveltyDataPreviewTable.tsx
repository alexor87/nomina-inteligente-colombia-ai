import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface NoveltyDataPreviewTableProps {
  columns: string[];
  rows: any[];
  mappings: Record<string, string>;
}

export const NoveltyDataPreviewTable = ({ columns, rows, mappings }: NoveltyDataPreviewTableProps) => {
  const getMappedFieldLabel = (column: string): string | null => {
    const mappedField = Object.entries(mappings).find(([_, mappedColumn]) => mappedColumn === column);
    if (mappedField) {
      const fieldLabels: Record<string, string> = {
        'employee_identification': 'ID Empleado',
        'tipo_novedad': 'Tipo Novedad',
        'valor': 'Valor',
        'subtipo': 'Subtipo',
        'fecha_inicio': 'Fecha Inicio',
        'fecha_fin': 'Fecha Fin',
        'dias': 'Días',
        'horas': 'Horas',
        'observacion': 'Observación',
        'constitutivo_salario': 'Constitutivo'
      };
      return fieldLabels[mappedField[0]] || mappedField[0];
    }
    return null;
  };

  if (rows.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-gray-500">
        No hay datos para mostrar en la vista previa
      </div>
    );
  }

  return (
    <div>
      <h4 className="font-medium mb-3">Vista Previa (Primeras 5 filas)</h4>
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => {
                  const mappedLabel = getMappedFieldLabel(column);
                  return (
                    <TableHead key={column} className="min-w-[120px]">
                      <div className="space-y-1">
                        <div className="font-medium">{column}</div>
                        {mappedLabel && (
                          <Badge variant="outline" className="text-xs">
                            {mappedLabel}
                          </Badge>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column, colIndex) => (
                    <TableCell key={`${rowIndex}-${colIndex}`} className="max-w-[200px]">
                      <div className="truncate" title={String(row[colIndex] || '')}>
                        {row[colIndex] !== null && row[colIndex] !== undefined && row[colIndex] !== ''
                          ? String(row[colIndex])
                          : <span className="text-gray-400 italic">vacío</span>
                        }
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};