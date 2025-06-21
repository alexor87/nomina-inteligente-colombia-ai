
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CustomField, CUSTOM_FIELD_TYPES } from '@/types/employee-config';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface CustomFieldsGlobalSectionProps {
  customFields: CustomField[];
  onUpdateCustomFields: (fields: CustomField[]) => void;
}

export const CustomFieldsGlobalSection = ({ 
  customFields, 
  onUpdateCustomFields 
}: CustomFieldsGlobalSectionProps) => {
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newField, setNewField] = useState<Partial<CustomField>>({
    name: '',
    type: 'text',
    required: false,
    visibleOnlyToHR: false,
    editableByEmployee: false,
    options: []
  });

  const handleSaveField = () => {
    if (!newField.name) return;

    const field: CustomField = {
      id: editingField?.id || Date.now().toString(),
      name: newField.name,
      type: newField.type as any,
      required: newField.required || false,
      visibleOnlyToHR: newField.visibleOnlyToHR || false,
      editableByEmployee: newField.editableByEmployee || false,
      options: newField.type === 'list' ? newField.options : undefined
    };

    if (editingField) {
      onUpdateCustomFields(customFields.map(f => f.id === editingField.id ? field : f));
    } else {
      onUpdateCustomFields([...customFields, field]);
    }

    resetForm();
  };

  const handleDeleteField = (fieldId: string) => {
    onUpdateCustomFields(customFields.filter(f => f.id !== fieldId));
  };

  const resetForm = () => {
    setNewField({
      name: '',
      type: 'text',
      required: false,
      visibleOnlyToHR: false,
      editableByEmployee: false,
      options: []
    });
    setEditingField(null);
    setIsDialogOpen(false);
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setNewField({
      name: field.name,
      type: field.type,
      required: field.required,
      visibleOnlyToHR: field.visibleOnlyToHR,
      editableByEmployee: field.editableByEmployee,
      options: field.options || []
    });
    setIsDialogOpen(true);
  };

  const addOption = () => {
    setNewField(prev => ({
      ...prev,
      options: [...(prev.options || []), '']
    }));
  };

  const updateOption = (index: number, value: string) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt) || []
    }));
  };

  const removeOption = (index: number) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campos Personalizados Globales</CardTitle>
        <CardDescription>
          Define campos adicionales que aparecerán en la ficha de todos los empleados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {customFields.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay campos personalizados definidos
          </div>
        ) : (
          <div className="space-y-3">
            {customFields.map((field) => (
              <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{field.name}</span>
                    <Badge variant="outline">
                      {CUSTOM_FIELD_TYPES.find(t => t.value === field.type)?.label}
                    </Badge>
                    {field.required && <Badge variant="secondary">Obligatorio</Badge>}
                    {field.visibleOnlyToHR && <Badge variant="secondary">Solo RRHH</Badge>}
                    {field.editableByEmployee && <Badge variant="secondary">Editable</Badge>}
                  </div>
                  {field.type === 'list' && field.options && (
                    <div className="text-sm text-gray-600">
                      Opciones: {field.options.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditField(field)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteField(field.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Campo Personalizado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingField ? 'Editar Campo' : 'Nuevo Campo Personalizado'}
              </DialogTitle>
              <DialogDescription>
                Define un campo adicional para la ficha de empleados
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="fieldName">Nombre del campo</Label>
                <Input
                  id="fieldName"
                  value={newField.name}
                  onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Número de hijos"
                />
              </div>

              <div>
                <Label htmlFor="fieldType">Tipo de campo</Label>
                <Select
                  value={newField.type}
                  onValueChange={(value) => setNewField(prev => ({ ...prev, type: value as any }))}
                >
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

              {newField.type === 'list' && (
                <div>
                  <Label>Opciones de la lista</Label>
                  <div className="space-y-2">
                    {(newField.options || []).map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Opción ${index + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar opción
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="required">Campo obligatorio</Label>
                  <Switch
                    id="required"
                    checked={newField.required}
                    onCheckedChange={(checked) => setNewField(prev => ({ ...prev, required: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="hrOnly">Visible solo para RRHH</Label>
                  <Switch
                    id="hrOnly"
                    checked={newField.visibleOnlyToHR}
                    onCheckedChange={(checked) => setNewField(prev => ({ ...prev, visibleOnlyToHR: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="editable">Editable por empleado</Label>
                  <Switch
                    id="editable"
                    checked={newField.editableByEmployee}
                    onCheckedChange={(checked) => setNewField(prev => ({ ...prev, editableByEmployee: checked }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button onClick={handleSaveField} disabled={!newField.name}>
                {editingField ? 'Guardar Cambios' : 'Crear Campo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
