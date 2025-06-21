
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash, Edit, Plus } from 'lucide-react';
import { CustomField, CUSTOM_FIELD_TYPES } from '@/types/employee-config';

interface CustomFieldsGlobalSectionProps {
  fields: CustomField[];
  onAdd: (field: Omit<CustomField, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<CustomField>) => void;
  onRemove: (id: string) => void;
}

export const CustomFieldsGlobalSection = ({ 
  fields, 
  onAdd, 
  onUpdate, 
  onRemove 
}: CustomFieldsGlobalSectionProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [fieldForm, setFieldForm] = useState({
    name: '',
    type: 'text' as const,
    required: false,
    visibleOnlyToHR: false,
    editableByEmployee: true,
    options: ['']
  });

  const handleOpenDialog = (field?: CustomField) => {
    if (field) {
      setEditingField(field);
      setFieldForm({
        name: field.name,
        type: field.type,
        required: field.required,
        visibleOnlyToHR: field.visibleOnlyToHR,
        editableByEmployee: field.editableByEmployee,
        options: field.options || ['']
      });
    } else {
      setEditingField(null);
      setFieldForm({
        name: '',
        type: 'text',
        required: false,
        visibleOnlyToHR: false,
        editableByEmployee: true,
        options: ['']
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveField = () => {
    const fieldData = {
      name: fieldForm.name,
      type: fieldForm.type,
      required: fieldForm.required,
      visibleOnlyToHR: fieldForm.visibleOnlyToHR,
      editableByEmployee: fieldForm.editableByEmployee,
      options: fieldForm.type === 'list' ? fieldForm.options.filter(opt => opt.trim()) : undefined
    };

    if (editingField) {
      onUpdate(editingField.id, fieldData);
    } else {
      onAdd(fieldData);
    }
    
    setIsDialogOpen(false);
  };

  const addOption = () => {
    setFieldForm(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const updateOption = (index: number, value: string) => {
    setFieldForm(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const removeOption = (index: number) => {
    setFieldForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">🧩 Campos Personalizados Globales</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Campo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingField ? 'Editar Campo' : 'Nuevo Campo Personalizado'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="fieldName">Nombre del campo</Label>
                <Input
                  id="fieldName"
                  value={fieldForm.name}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Número de cuenta bancaria"
                />
              </div>

              <div>
                <Label htmlFor="fieldType">Tipo de campo</Label>
                <Select value={fieldForm.type} onValueChange={(value: any) => setFieldForm(prev => ({ ...prev, type: value }))}>
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

              {fieldForm.type === 'list' && (
                <div>
                  <Label>Opciones de la lista</Label>
                  <div className="space-y-2 mt-2">
                    {fieldForm.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Opción ${index + 1}`}
                        />
                        {fieldForm.options.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeOption(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                      + Agregar opción
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="required"
                    checked={fieldForm.required}
                    onCheckedChange={(checked) => setFieldForm(prev => ({ ...prev, required: !!checked }))}
                  />
                  <Label htmlFor="required">¿Es obligatorio?</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="visibleOnlyToHR"
                    checked={fieldForm.visibleOnlyToHR}
                    onCheckedChange={(checked) => setFieldForm(prev => ({ ...prev, visibleOnlyToHR: !!checked }))}
                  />
                  <Label htmlFor="visibleOnlyToHR">¿Visible solo para RRHH?</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="editableByEmployee"
                    checked={fieldForm.editableByEmployee}
                    onCheckedChange={(checked) => setFieldForm(prev => ({ ...prev, editableByEmployee: !!checked }))}
                  />
                  <Label htmlFor="editableByEmployee">¿Puede editarlo el empleado?</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveField} disabled={!fieldForm.name.trim()}>
                  {editingField ? 'Actualizar' : 'Crear Campo'}
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {fields.length > 0 ? (
        <div className="space-y-3">
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
            >
              <div className="flex-1">
                <div className="font-medium">{field.name}</div>
                <div className="text-sm text-gray-600">
                  Tipo: {CUSTOM_FIELD_TYPES.find(t => t.value === field.type)?.label}
                  {field.required && ' • Obligatorio'}
                  {field.visibleOnlyToHR && ' • Solo RRHH'}
                  {!field.editableByEmployee && ' • No editable por empleado'}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog(field)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemove(field.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No hay campos personalizados configurados.
          <br />
          <span className="text-sm">Haz clic en "Agregar Campo" para crear el primero.</span>
        </div>
      )}
    </Card>
  );
};
