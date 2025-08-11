
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Settings, Bell, Globe, Palette } from 'lucide-react';

export const ProfilePreferences = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    payrollAlerts: true,
    employeeUpdates: true,
    language: 'es',
    dateFormat: 'DD/MM/YYYY',
    theme: 'light'
  });

  const handleSubmit = async () => {
    setLoading(true);
    
    // Simulate API call - in a real app, you'd save to backend
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      
      toast({
        title: "Preferencias guardadas",
        description: "Tus preferencias han sido actualizadas correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar las preferencias",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSelectChange = (key: string, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notificaciones</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailNotifications">Notificaciones por Email</Label>
              <p className="text-sm text-gray-500">Recibir notificaciones importantes por correo</p>
            </div>
            <Switch
              id="emailNotifications"
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => handleToggle('emailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="pushNotifications">Notificaciones Push</Label>
              <p className="text-sm text-gray-500">Notificaciones en tiempo real en el navegador</p>
            </div>
            <Switch
              id="pushNotifications"
              checked={preferences.pushNotifications}
              onCheckedChange={(checked) => handleToggle('pushNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="payrollAlerts">Alertas de Nómina</Label>
              <p className="text-sm text-gray-500">Notificaciones sobre procesos de nómina</p>
            </div>
            <Switch
              id="payrollAlerts"
              checked={preferences.payrollAlerts}
              onCheckedChange={(checked) => handleToggle('payrollAlerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="employeeUpdates">Actualizaciones de Empleados</Label>
              <p className="text-sm text-gray-500">Cambios en información de empleados</p>
            </div>
            <Switch
              id="employeeUpdates"
              checked={preferences.employeeUpdates}
              onCheckedChange={(checked) => handleToggle('employeeUpdates', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Configuración Regional</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="language">Idioma</Label>
            <Select value={preferences.language} onValueChange={(value) => handleSelectChange('language', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un idioma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFormat">Formato de Fecha</Label>
            <Select value={preferences.dateFormat} onValueChange={(value) => handleSelectChange('dateFormat', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Apariencia</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Tema</Label>
            <Select value={preferences.theme} onValueChange={(value) => handleSelectChange('theme', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Oscuro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={loading}>
          <Settings className="h-4 w-4 mr-2" />
          {loading ? 'Guardando...' : 'Guardar Preferencias'}
        </Button>
      </div>
    </div>
  );
};
