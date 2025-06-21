
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CustomField, CUSTOM_FIELD_TYPES } from '@/types/employee-config';
import { Trash2 } from 'lucide-react';

interface CustomFieldsSectionProps {
  fields: CustomField[];
  onAdd: (field: Omit<CustomField, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<CustomField>) => void;
  onRemove: (id: string) => void;
}

export const CustomFieldsSection = ({ fields, onAdd, onUpdate, onRemove }: CustomFieldsSectionProps) => {
  const [showForm, setShowForm] = useState(false);
  const [newField, setNewField] = useState({
    name: '',
    type: 'text' as any,
    required: false,
    visibleOnlyToHR: false,
    editableByEmployee: true,
    options: [] as string[]
  });

  const handleAddField = () => {
    if (!newField.name.trim()) return;
    
    onAdd(newField);
    setNewField({
      name: '',
      type: 'text',
      required: false,
      visibleOnlyToHR: false,
      editableByEmployee: true,
      options: []
    });
    setShowForm(false);
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">🧩 Campos Personalizados</h3>
        <Button onClick={() => setShowForm(!showForm)} variant="outline">
          {showForm ? 'Cancelar' : 'Agregar Campo'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium mb-4">Nuevo Campo Personalizado</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fieldName">Nombre del Campo</Label>
              <Input
                id="fieldName"
                value={newField.name}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                placeholder="Ej: Número de hijos"
              />
            </div>

            <div>
              <Label htmlFor="fieldType">Tipo de Campo</Label>
              <Select value={newField.type} onValueChange={(value) => setNewField({ ...newField, type: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={newField.required}
                onCheckedChange={(checked) => setNewField({ ...newField, required: !!checked })}
              />
              <Label htmlFor="required">¿Obligatorio?</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="visibleOnlyToHR"
                checked={newField.visibleOnlyToHR}
                onCheckedChange={(checked) => setNewField({ ...newField, visibleOnlyToHR: !!checked })}
              />
              <Label htmlFor="visibleOnlyToHR">¿Visible solo para RRHH?</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="editableByEmployee"
                checked={newField.editableByEmployee}
                onCheckedChange={(checked) => setNewField({ ...newField, editableByEmployee: !!checked })}
              />
              <Label htmlFor="editableByEmployee">¿Editable por el empleado?</Label>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleAddField}>Agregar Campo</Button>
            <Button onClick={() => setShowForm(false)} variant="outline">Cancelar</Button>
          </div>
        </div>
      )}

      {fields.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Obligatorio</TableHead>
              <TableHead>Solo RRHH</TableHead>
              <TableHead>Editable</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field) => (
              <TableRow key={field.id}>
                <TableCell className="font-medium">{field.name}</TableCell>
                <TableCell>
                  {CUSTOM_FIELD_TYPES.find(t => t.value === field.type)?.label}
                </TableCell>
                <TableCell>{field.required ? '✅' : '❌'}</TableCell>
                <TableCell>{field.visibleOnlyToHR ? '✅' : '❌'}</TableCell>
                <TableCell>{field.editableByEmployee ? '✅' : '❌'}</TableCell>
                <TableCell>
                  <Button
                    onClick={() => onRemove(field.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No hay campos personalizados configurados.
          <br />
          <Button onClick={() => setShowForm(true)} variant="link">
            Agregar el primer campo personalizado
          </Button>
        </div>
      )}
    </Card>
  );
};
