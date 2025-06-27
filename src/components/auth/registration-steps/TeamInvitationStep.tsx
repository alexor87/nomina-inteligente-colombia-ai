
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail } from 'lucide-react';
import { useCompanyRegistrationStore } from '../hooks/useCompanyRegistrationStore';

interface TeamInvitationStepProps {
  onNext: () => void;
}

export const TeamInvitationStep = ({ onNext }: TeamInvitationStepProps) => {
  const { data, updateData } = useCompanyRegistrationStore();
  const [invitationData, setInvitationData] = useState({
    role: data.invitedMember?.role || '',
    name: data.invitedMember?.name || '',
    email: data.invitedMember?.email || '',
  });

  const [showInviteForm, setShowInviteForm] = useState(false);

  const roles = [
    { value: 'administrador', label: 'Administrador' },
    { value: 'rrhh', label: 'Recursos Humanos' },
    { value: 'contador', label: 'Contador' },
    { value: 'asistente', label: 'Asistente' },
    { value: 'consultor', label: 'Consultor' },
  ];

  const handleFinish = () => {
    if (showInviteForm && invitationData.role && invitationData.name && invitationData.email) {
      updateData({ invitedMember: invitationData });
    }
    onNext();
  };

  const handleSkip = () => {
    onNext();
  };

  return (
    <Card className="w-full max-w-lg mx-4 animate-fade-in">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <UserPlus className="h-6 w-6 text-blue-600 mr-2" />
          <CardTitle>¿Quieres agregar a un compañero?</CardTitle>
        </div>
        <p className="text-gray-600">
          Invita a alguien de tu equipo para que te ayude con la nómina
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!showInviteForm ? (
          <div className="space-y-4">
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => setShowInviteForm(true)}
              >
                <Mail className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Sí, quiero invitar a alguien</p>
                  <p className="text-sm text-gray-600">Agregar un compañero de trabajo</p>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={handleSkip}
              >
                Omitir e ir al app
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="role">Rol del invitado</Label>
              <Select 
                value={invitationData.role} 
                onValueChange={(value) => setInvitationData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Nombre del invitado</Label>
              <Input
                id="name"
                value={invitationData.name}
                onChange={(e) => setInvitationData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <Label htmlFor="email">Correo corporativo</Label>
              <Input
                id="email"
                type="email"
                value={invitationData.email}
                onChange={(e) => setInvitationData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="juan.perez@empresa.com"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowInviteForm(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleFinish}
                disabled={!invitationData.role || !invitationData.name || !invitationData.email}
                className="flex-1"
              >
                Finalizar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
