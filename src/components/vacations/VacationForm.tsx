
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VacationFormProps {
  onSuccess?: () => void;
}

export const VacationForm: React.FC<VacationFormProps> = ({ onSuccess }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Formulario de Vacaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Formulario para registrar nuevas vacaciones y ausencias.
        </p>
        {/* TODO: Implement vacation form */}
      </CardContent>
    </Card>
  );
};
