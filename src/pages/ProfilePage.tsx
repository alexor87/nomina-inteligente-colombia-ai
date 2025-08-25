
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/contexts/RoleContext';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, User } from 'lucide-react';

export const ProfilePage = () => {
  const { user, profile } = useAuth();
  const { roles, isSuperAdmin } = useRoles();

  if (!user || !profile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p>Cargando perfil...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <User className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProfileForm />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información de Cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {isSuperAdmin ? (
                    <Badge variant="default" className="flex items-center space-x-1">
                      <Crown className="h-3 w-3" />
                      <span>SuperAdmin</span>
                    </Badge>
                  ) : (
                    roles.map((role, index) => (
                      <Badge key={index} variant="outline" className="capitalize">
                        {role.role}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
