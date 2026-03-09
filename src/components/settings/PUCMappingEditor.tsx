import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RotateCcw, Save, Info, Plus, Trash2 } from 'lucide-react';
import { 
  AccountingMappingService, 
  AccountingMapping,
  conceptLabels,
  conceptTooltips 
} from '@/services/AccountingMappingService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditedMapping {
  puc_account: string;
  puc_description: string;
}

interface NewMappingForm {
  concept: string;
  puc_account: string;
  puc_description: string;
  entry_type: 'debito' | 'credito';
}

export const PUCMappingEditor = () => {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<AccountingMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedMappings, setEditedMappings] = useState<Record<string, EditedMapping>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMapping, setNewMapping] = useState<NewMappingForm>({
    concept: '',
    puc_account: '',
    puc_description: '',
    entry_type: 'debito'
  });
  const [newMappingErrors, setNewMappingErrors] = useState<Record<string, string>>({});
  const [creatingMapping, setCreatingMapping] = useState(false);

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      setLoading(true);
      // Inicializar si es necesario
      await AccountingMappingService.initializeIfNeeded();
      const data = await AccountingMappingService.getMappings();
      setMappings(data);
      // Inicializar estado de edición
      const edited: Record<string, EditedMapping> = {};
      data.forEach(m => {
        edited[m.id] = { puc_account: m.puc_account, puc_description: m.puc_description };
      });
      setEditedMappings(edited);
    } catch (error) {
      console.error('Error loading mappings:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las cuentas contables",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, field: 'puc_account' | 'puc_description', value: string) => {
    setEditedMappings(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));

    // Validar cuenta PUC
    if (field === 'puc_account') {
      if (!AccountingMappingService.validatePucAccount(value) && value.length > 0) {
        setErrors(prev => ({ ...prev, [id]: 'Solo números, 4-10 dígitos' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[id];
          return newErrors;
        });
      }
    }
  };

  const hasChanges = () => {
    return mappings.some(m => {
      const edited = editedMappings[m.id];
      return edited && (edited.puc_account !== m.puc_account || edited.puc_description !== m.puc_description);
    });
  };

  const handleSave = async () => {
    // Validar antes de guardar
    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      toast({
        title: "Error de validación",
        description: "Corrige los errores antes de guardar",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      
      // Obtener solo los mapeos que cambiaron
      const changedMappings = mappings
        .filter(m => {
          const edited = editedMappings[m.id];
          return edited && (edited.puc_account !== m.puc_account || edited.puc_description !== m.puc_description);
        })
        .map(m => ({
          id: m.id,
          puc_account: editedMappings[m.id].puc_account,
          puc_description: editedMappings[m.id].puc_description
        }));

      if (changedMappings.length === 0) {
        toast({
          title: "Sin cambios",
          description: "No hay cambios para guardar"
        });
        return;
      }

      await AccountingMappingService.updateMappingsBatch(changedMappings);
      
      toast({
        title: "Guardado",
        description: `${changedMappings.length} cuenta(s) actualizada(s)`
      });

      // Recargar para sincronizar estado
      await loadMappings();
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    try {
      setSaving(true);
      await AccountingMappingService.restoreDefaults();
      toast({
        title: "Restaurado",
        description: "Se restauraron los valores por defecto del PUC colombiano"
      });
      await loadMappings();
    } catch (error) {
      console.error('Error restoring defaults:', error);
      toast({
        title: "Error",
        description: "No se pudieron restaurar los valores por defecto",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNewMappingChange = (field: keyof NewMappingForm, value: string) => {
    setNewMapping(prev => ({ ...prev, [field]: value }));
    
    // Validar cuenta PUC
    if (field === 'puc_account') {
      if (!AccountingMappingService.validatePucAccount(value) && value.length > 0) {
        setNewMappingErrors(prev => ({ ...prev, puc_account: 'Solo números, 4-10 dígitos' }));
      } else {
        setNewMappingErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.puc_account;
          return newErrors;
        });
      }
    }
    
    // Validar nombre del concepto
    if (field === 'concept') {
      if (value.length < 3) {
        setNewMappingErrors(prev => ({ ...prev, concept: 'Mínimo 3 caracteres' }));
      } else {
        setNewMappingErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.concept;
          return newErrors;
        });
      }
    }
  };

  const handleCreateMapping = async () => {
    // Validar campos
    const errors: Record<string, string> = {};
    if (newMapping.concept.length < 3) errors.concept = 'Mínimo 3 caracteres';
    if (!AccountingMappingService.validatePucAccount(newMapping.puc_account)) errors.puc_account = 'Solo números, 4-10 dígitos';
    if (!newMapping.puc_description.trim()) errors.puc_description = 'Requerido';
    
    if (Object.keys(errors).length > 0) {
      setNewMappingErrors(errors);
      return;
    }

    try {
      setCreatingMapping(true);
      
      // Verificar si la cuenta PUC ya existe
      const isDuplicate = await AccountingMappingService.isPucAccountDuplicate(newMapping.puc_account);
      if (isDuplicate) {
        setNewMappingErrors({ puc_account: 'Esta cuenta PUC ya existe' });
        return;
      }

      await AccountingMappingService.createMapping(
        newMapping.concept.toLowerCase().replace(/\s+/g, '_'),
        newMapping.puc_account,
        newMapping.puc_description,
        newMapping.entry_type
      );

      toast({
        title: "Cuenta creada",
        description: `Se agregó "${newMapping.concept}" al listado`
      });

      // Reset form and close dialog
      setNewMapping({ concept: '', puc_account: '', puc_description: '', entry_type: 'debito' });
      setNewMappingErrors({});
      setDialogOpen(false);
      
      // Reload mappings
      await loadMappings();
    } catch (error) {
      console.error('Error creating mapping:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la cuenta",
        variant: "destructive"
      });
    } finally {
      setCreatingMapping(false);
    }
  };

  const handleDeleteMapping = async (mapping: AccountingMapping) => {
    try {
      setSaving(true);
      await AccountingMappingService.deleteMapping(mapping.id);
      toast({
        title: "Eliminado",
        description: `Se eliminó la cuenta "${mapping.puc_description}"`
      });
      await loadMappings();
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la cuenta",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Cargando configuración...</span>
        </div>
      </Card>
    );
  }

  // Agrupar por tipo
  const debitoMappings = mappings.filter(m => m.entry_type === 'debito');
  const creditoMappings = mappings.filter(m => m.entry_type === 'credito');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                📊 Configuración de Cuentas PUC
              </CardTitle>
              <CardDescription>
                Personaliza las cuentas contables para la exportación de nómina. Los valores por defecto corresponden al PUC colombiano estándar.
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Cuenta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Cuenta Personalizada</DialogTitle>
                  <DialogDescription>
                    Crea una cuenta PUC adicional para conceptos específicos de tu empresa.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="concept">Nombre del Concepto</Label>
                    <Input
                      id="concept"
                      value={newMapping.concept}
                      onChange={(e) => handleNewMappingChange('concept', e.target.value)}
                      placeholder="Ej: Bono de productividad"
                      className={newMappingErrors.concept ? 'border-destructive' : ''}
                    />
                    {newMappingErrors.concept && (
                      <span className="text-xs text-destructive">{newMappingErrors.concept}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="puc_account">Cuenta PUC</Label>
                    <Input
                      id="puc_account"
                      value={newMapping.puc_account}
                      onChange={(e) => handleNewMappingChange('puc_account', e.target.value)}
                      placeholder="Ej: 510595"
                      className={`font-mono ${newMappingErrors.puc_account ? 'border-destructive' : ''}`}
                      maxLength={10}
                    />
                    {newMappingErrors.puc_account && (
                      <span className="text-xs text-destructive">{newMappingErrors.puc_account}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="puc_description">Descripción</Label>
                    <Input
                      id="puc_description"
                      value={newMapping.puc_description}
                      onChange={(e) => handleNewMappingChange('puc_description', e.target.value)}
                      placeholder="Ej: Otros gastos de personal"
                      className={newMappingErrors.puc_description ? 'border-destructive' : ''}
                    />
                    {newMappingErrors.puc_description && (
                      <span className="text-xs text-destructive">{newMappingErrors.puc_description}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entry_type">Tipo de Entrada</Label>
                    <Select
                      value={newMapping.entry_type}
                      onValueChange={(value) => handleNewMappingChange('entry_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debito">Débito (Gastos/Devengados)</SelectItem>
                        <SelectItem value="credito">Crédito (Pasivos/Deducciones)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateMapping} disabled={creatingMapping}>
                    {creatingMapping ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Crear Cuenta
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Débitos - Gastos */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Devengados y Aportes Patronales (Débito)
            </h3>
            <MappingTable 
              mappings={debitoMappings}
              editedMappings={editedMappings}
              errors={errors}
              onInputChange={handleInputChange}
              onDelete={handleDeleteMapping}
              saving={saving}
            />
          </div>

          {/* Créditos - Pasivos */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              Deducciones y Provisiones (Crédito)
            </h3>
            <MappingTable 
              mappings={creditoMappings}
              editedMappings={editedMappings}
              errors={errors}
              onInputChange={handleInputChange}
              onDelete={handleDeleteMapping}
              saving={saving}
            />
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={saving}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar por defecto
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Restaurar valores por defecto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esto reemplazará todas las cuentas PUC personalizadas con los valores estándar del PUC colombiano. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestoreDefaults}>
                    Restaurar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges()}
              variant="info"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente de tabla reutilizable
interface MappingTableProps {
  mappings: AccountingMapping[];
  editedMappings: Record<string, EditedMapping>;
  errors: Record<string, string>;
  onInputChange: (id: string, field: 'puc_account' | 'puc_description', value: string) => void;
  onDelete: (mapping: AccountingMapping) => void;
  saving: boolean;
}

const MappingTable = ({ mappings, editedMappings, errors, onInputChange, onDelete, saving }: MappingTableProps) => {
  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Concepto</TableHead>
              <TableHead className="w-[140px]">Cuenta PUC</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map(mapping => {
              const edited = editedMappings[mapping.id];
              const hasError = !!errors[mapping.id];
              const isChanged = edited && (
                edited.puc_account !== mapping.puc_account || 
                edited.puc_description !== mapping.puc_description
              );

              return (
                <TableRow key={mapping.id} className={isChanged ? 'bg-accent/30' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{conceptLabels[mapping.concept] || mapping.concept}</span>
                      {mapping.is_custom ? (
                        <Badge variant="secondary" className="text-xs">
                          Personalizado
                        </Badge>
                      ) : conceptTooltips[mapping.concept] ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[250px]">
                            <p className="text-xs">{conceptTooltips[mapping.concept]}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <Input
                        value={edited?.puc_account || ''}
                        onChange={(e) => onInputChange(mapping.id, 'puc_account', e.target.value)}
                        className={`font-mono text-sm h-8 ${hasError ? 'border-destructive' : ''}`}
                        placeholder="510506"
                        maxLength={10}
                      />
                      {hasError && (
                        <span className="absolute -bottom-5 left-0 text-xs text-destructive">
                          {errors[mapping.id]}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={edited?.puc_description || ''}
                      onChange={(e) => onInputChange(mapping.id, 'puc_description', e.target.value)}
                      className="text-sm h-8"
                      placeholder="Descripción de la cuenta"
                    />
                  </TableCell>
                  <TableCell>
                    {mapping.is_custom && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar esta cuenta?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará la cuenta "{mapping.puc_description}". Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onDelete(mapping)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};
