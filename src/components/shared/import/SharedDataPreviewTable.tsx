import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SharedDataPreviewTableProps {
  columns: string[];
  rows: any[];
}

export const SharedDataPreviewTable = ({ columns, rows }: SharedDataPreviewTableProps) => {
  if (rows.length === 0) {
    return null;
  }

  const displayColumns = columns.slice(0, 6);
  const hasMoreColumns = columns.length > 6;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Vista previa de datos (primeras 3 filas)
          {hasMoreColumns && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              • Mostrando {displayColumns.length} de {columns.length} columnas
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {displayColumns.map((column, index) => (
                  <th key={index} className="text-left p-2 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 3).map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b">
                  {displayColumns.map((column, colIndex) => (
                    <td key={colIndex} className="p-2 max-w-32">
                      <div className="truncate" title={String(row[column] || '')}>
                        {String(row[column] || '-').slice(0, 30)}
                        {String(row[column] || '').length > 30 ? '...' : ''}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Mostrando {Math.min(3, rows.length)} de {rows.length} filas
        </div>
      </CardContent>
    </Card>
  );
};