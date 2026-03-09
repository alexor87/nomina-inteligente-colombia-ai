import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RotateCcw, Save, Info, Check, X } from 'lucide-react';
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

interface EditedMapping {
  puc_account: string;
  puc_description: string;
}

export const PUCMappingEditor = () => {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<AccountingMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedMappings, setEditedMappings] = useState<Record<string, EditedMapping>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

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
          <CardTitle className="flex items-center gap-2">
            📊 Configuración de Cuentas PUC
          </CardTitle>
          <CardDescription>
            Personaliza las cuentas contables para la exportación de nómina. Los valores por defecto corresponden al PUC colombiano estándar.
          </CardDescription>
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
}

const MappingTable = ({ mappings, editedMappings, errors, onInputChange }: MappingTableProps) => {
  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Concepto</TableHead>
              <TableHead className="w-[140px]">Cuenta PUC</TableHead>
              <TableHead>Descripción</TableHead>
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[250px]">
                          <p className="text-xs">{conceptTooltips[mapping.concept]}</p>
                        </TooltipContent>
                      </Tooltip>
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};
