
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmployeeChange } from '@/types/employee-config';

interface ChangeHistorySectionProps {
  changes: EmployeeChange[];
}

export const ChangeHistorySection = ({ changes }: ChangeHistorySectionProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">🔄 Historial de Cambios</h3>
      
      {changes.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Campo</TableHead>
              <TableHead>Valor Anterior</TableHead>
              <TableHead>Valor Nuevo</TableHead>
              <TableHead>Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {changes.map((change) => (
              <TableRow key={change.id}>
                <TableCell>
                  {new Date(change.date).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </TableCell>
                <TableCell className="font-medium">{change.field}</TableCell>
                <TableCell className="text-red-600">{change.previousValue || '-'}</TableCell>
                <TableCell className="text-green-600">{change.newValue || '-'}</TableCell>
                <TableCell>{change.changedBy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No hay cambios registrados aún.
          <br />
          <span className="text-sm">Los cambios se registrarán automáticamente cuando edites la configuración.</span>
        </div>
      )}
    </Card>
  );
};
