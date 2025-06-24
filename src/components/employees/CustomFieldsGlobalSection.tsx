
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CustomField, CUSTOM_FIELD_TYPES } from '@/types/employee-config';
import { Plus, Trash2 } from 'lucide-react';

interface CustomFieldsGlobalSectionProps {
  customFields: CustomField[];
  onAdd: (field: Omit<CustomField, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<CustomField>) => void;
  onRemove: (id: string) => void;
}

export const CustomFieldsGlobalSection = ({ 
  customFields, 
  onAdd, 
  onUpdate, 
  onRemove 
}: CustomFieldsGlobalSectionProps) => {
  const handleAddField = () => {
    onAdd({
      name: 'Nuevo Campo',
      label: 'Nuevo Campo',
      type: 'text',
      required: false,
      visibleOnlyToHR: false,
      editableByEmployee: true
    });
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Campos Personalizados</h3>
        <Button onClick={handleAddField} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Campo
        </Button>
      </div>
      
      <div className="space-y-4">
        {customFields.map((field) => (
          <div key={field.id} className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg">
            <div className="col-span-3">
              <Input
                value={field.name}
                onChange={(e) => onUpdate(field.id, { name: e.target.value })}
                placeholder="Nombre del campo"
              />
            </div>
            
            <div className="col-span-2">
              <Select value={field.type} onValueChange={(value) => onUpdate(field.id, { type: value as any })}>
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
            
            <div className="col-span-2 flex items-center space-x-2">
              <Checkbox
                checked={field.required}
                onCheckedChange={(checked) => onUpdate(field.id, { required: checked as boolean })}
              />
              <label className="text-sm">Requerido</label>
            </div>
            
            <div className="col-span-2 flex items-center space-x-2">
              <Checkbox
                checked={field.visibleOnlyToHR}
                onCheckedChange={(checked) => onUpdate(field.id, { visibleOnlyToHR: checked as boolean })}
              />
              <label className="text-sm">Solo RH</label>
            </div>
            
            <div className="col-span-2 flex items-center space-x-2">
              <Checkbox
                checked={field.editableByEmployee}
                onCheckedChange={(checked) => onUpdate(field.id, { editableByEmployee: checked as boolean })}
              />
              <label className="text-sm">Editable</label>
            </div>
            
            <div className="col-span-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(field.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        
        {customFields.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay campos personalizados configurados.
            <br />
            Haz clic en "Agregar Campo" para crear uno nuevo.
          </div>
        )}
      </div>
    </Card>
  );
};
