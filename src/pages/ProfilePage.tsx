
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyDetails } from '@/hooks/useCompanyDetails';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { PasswordChange } from '@/components/profile/PasswordChange';
import { ProfilePreferences } from '@/components/profile/ProfilePreferences';
import { User, Building, Shield, Settings } from 'lucide-react';

const ProfilePage = () => {
  const { user, profile, roles, isSuperAdmin } = useAuth();
  const { companyDetails } = useCompanyDetails();
  const [activeTab, setActiveTab] = useState("personal");

  if (!user || !profile) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Cargando información del perfil...</p>
        </div>
      </div>
    );
  }

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-600">Gestiona tu información personal y configuraciones</p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Información General</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <AvatarUpload />
            </div>
            
            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{fullName || 'Sin nombre'}</h2>
                <p className="text-gray-600">{user.email}</p>
              </div>

              {/* Company Info */}
              {companyDetails && (
                <div className="flex items-center space-x-2 text-sm">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{companyDetails.razon_social}</span>
                </div>
              )}

              {/* Roles */}
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <div className="flex flex-wrap gap-2">
                  {isSuperAdmin ? (
                    <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                      SuperAdmin
                    </Badge>
                  ) : (
                    roles.map((role, index) => (
                      <Badge key={index} variant="outline" className="capitalize">
                        {role.role}
                      </Badge>
                    ))
                  )}
                  {roles.length === 0 && !isSuperAdmin && (
                    <Badge variant="secondary">Sin roles asignados</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Personal</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Seguridad</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Preferencias</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>Empresa</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <ProfileForm />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <PasswordChange />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <ProfilePreferences />
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              {companyDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Razón Social</label>
                      <p className="text-gray-900">{companyDetails.razon_social}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">NIT</label>
                      <p className="text-gray-900">{companyDetails.nit}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{companyDetails.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Teléfono</label>
                      <p className="text-gray-900">{companyDetails.telefono || 'No registrado'}</p>
                    </div>
                    {companyDetails.direccion && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-500">Dirección</label>
                        <p className="text-gray-900">{companyDetails.direccion}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No hay información de empresa disponible</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
