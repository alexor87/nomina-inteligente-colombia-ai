
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DataPreviewTableProps {
  columns: string[];
  rows: any[];
}

export const DataPreviewTable = ({ columns, rows }: DataPreviewTableProps) => {
  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Vista Previa de Datos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                {columns.slice(0, 6).map(column => (
                  <th key={column} className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">
                    {column}
                  </th>
                ))}
                {columns.length > 6 && (
                  <th className="border border-gray-200 px-3 py-2 text-center text-sm font-medium">
                    +{columns.length - 6} más...
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 3).map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.slice(0, 6).map(column => (
                    <td key={column} className="border border-gray-200 px-3 py-2 text-sm">
                      {String(row[column] || '').slice(0, 30)}
                      {String(row[column] || '').length > 30 && '...'}
                    </td>
                  ))}
                  {columns.length > 6 && (
                    <td className="border border-gray-200 px-3 py-2 text-center text-sm text-gray-400">
                      ...
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 3 && (
          <p className="text-sm text-gray-500 mt-2">
            Mostrando 3 de {rows.length} filas
          </p>
        )}
      </CardContent>
    </Card>
  );
};
