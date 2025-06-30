
import React, { useState, useEffect } from 'react';
import { CustomModal, CustomModalHeader, CustomModalTitle } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserMentionInput } from './UserMentionInput';
import { EmployeeNotesService } from '@/services/EmployeeNotesService';
import { EmployeeNote, CompanyUser } from '@/types/employee-notes';
import { useToast } from '@/hooks/use-toast';
import { 
  StickyNote, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  MessageCircle,
  Clock,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface EmployeeNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  periodId: string;
  periodName: string;
}

export const EmployeeNotesModal: React.FC<EmployeeNotesModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  periodId,
  periodName
}) => {
  const [notes, setNotes] = useState<EmployeeNote[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  // Estado para crear nueva nota
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteMentions, setNewNoteMentions] = useState<CompanyUser[]>([]);
  
  // Estado para editar nota existente
  const [editNoteText, setEditNoteText] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadNotes();
      loadCompanyUsers();
    }
  }, [isOpen, employeeId, periodId]);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const data = await EmployeeNotesService.getEmployeeNotes(employeeId, periodId);
      setNotes(data);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las notas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanyUsers = async () => {
    try {
      const users = await EmployeeNotesService.getCompanyUsers();
      setCompanyUsers(users);
    } catch (error) {
      console.error('Error loading company users:', error);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteText.trim()) {
      toast({
        title: "Error",
        description: "El texto de la nota no puede estar vacío",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreating(true);
      
      await EmployeeNotesService.createEmployeeNote({
        employee_id: employeeId,
        period_id: periodId,
        note_text: newNoteText,
        mentioned_users: newNoteMentions.map(user => user.user_id)
      });

      setNewNoteText('');
      setNewNoteMentions([]);
      
      await loadNotes();
      
      toast({
        title: "✅ Nota creada",
        description: "La nota se ha creado exitosamente",
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la nota",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditNote = (note: EmployeeNote) => {
    setEditingNoteId(note.id);
    setEditNoteText(note.note_text);
  };

  const handleSaveEdit = async (noteId: string) => {
    try {
      await EmployeeNotesService.updateEmployeeNote(noteId, editNoteText);
      setEditingNoteId(null);
      setEditNoteText('');
      await loadNotes();
      
      toast({
        title: "✅ Nota actualizada",
        description: "La nota se ha actualizado exitosamente",
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la nota",
        variant: "destructive"
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
      return;
    }

    try {
      await EmployeeNotesService.deleteEmployeeNote(noteId);
      await loadNotes();
      
      toast({
        title: "✅ Nota eliminada",
        description: "La nota se ha eliminado exitosamente",
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la nota",
        variant: "destructive"
      });
    }
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditNoteText('');
  };

  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={onClose}
      className="max-w-4xl max-h-[90vh] overflow-hidden"
      closeOnEscape={!isCreating}
      closeOnBackdrop={!isCreating}
    >
      <CustomModalHeader>
        <CustomModalTitle className="flex items-center gap-2">
          <StickyNote className="h-5 w-5" />
          Notas del Empleado - {employeeName}
        </CustomModalTitle>
        <p className="text-sm text-gray-600 mt-1">Período: {periodName}</p>
      </CustomModalHeader>

      <div className="flex flex-col h-[600px]">
        {/* Formulario para crear nueva nota */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-4 w-4" />
              Nueva Nota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UserMentionInput
              value={newNoteText}
              onChange={setNewNoteText}
              mentionedUsers={newNoteMentions}
              onMentionedUsersChange={setNewNoteMentions}
              companyUsers={companyUsers}
              placeholder="Escribe tu nota aquí. Usa @ para mencionar usuarios..."
            />
            
            <div className="flex justify-end">
              <Button 
                onClick={handleCreateNote} 
                disabled={isCreating || !newNoteText.trim()}
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Nota
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de notas existentes */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-4 w-4" />
              Notas Existentes ({notes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px] px-6">
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-12">
                  <StickyNote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay notas para este empleado en este período</p>
                  <p className="text-sm text-gray-400">Crea la primera nota usando el formulario de arriba</p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {notes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          <span className="font-medium">
                            {note.creator?.first_name} {note.creator?.last_name}
                          </span>
                          <Clock className="h-4 w-4 ml-2" />
                          <span>
                            {formatDistanceToNow(new Date(note.created_at), {
                              addSuffix: true,
                              locale: es
                            })}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditNote(note)}
                            disabled={editingNoteId === note.id}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {editingNoteId === note.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editNoteText}
                            onChange={(e) => setEditNoteText(e.target.value)}
                            className="w-full p-3 border rounded-md resize-y min-h-[100px]"
                          />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              <X className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                            <Button size="sm" onClick={() => handleSaveEdit(note.id)}>
                              <Save className="h-4 w-4 mr-1" />
                              Guardar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="whitespace-pre-wrap text-gray-800 mb-3">
                            {note.note_text}
                          </div>
                          
                          {/* Mostrar menciones */}
                          {note.mentions && note.mentions.length > 0 && (
                            <div className="border-t pt-3">
                              <p className="text-xs text-gray-600 mb-2">Usuarios mencionados:</p>
                              <div className="flex flex-wrap gap-1">
                                {note.mentions.map((mention) => (
                                  <span
                                    key={mention.id}
                                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                                  >
                                    @{mention.mentioned_user?.first_name} {mention.mentioned_user?.last_name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Cerrar
        </Button>
      </div>
    </CustomModal>
  );
};
