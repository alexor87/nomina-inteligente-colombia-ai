
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Campo requerido",
        description: "Por favor ingresa tu email",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast({
            title: "Email no confirmado",
            description: "Debes confirmar tu email antes de poder restablecer la contraseña",
            variant: "destructive"
          });
        } else if (error.message.includes('Email rate limit exceeded')) {
          toast({
            title: "Demasiados intentos",
            description: "Has excedido el límite de intentos. Espera unos minutos antes de intentar nuevamente",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      setEmailSent(true);
      toast({
        title: "Email enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña",
      });
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el email. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Email Enviado</CardTitle>
          <CardDescription>
            Hemos enviado un enlace para restablecer tu contraseña a {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <p className="text-gray-600 text-sm mb-4">
              Revisa tu bandeja de entrada y sigue las instrucciones del email para restablecer tu contraseña.
            </p>
            <p className="text-gray-500 text-xs mb-6">
              Si no recibes el email en unos minutos, revisa tu carpeta de spam.
            </p>
          </div>
          
          <Button 
            onClick={onBackToLogin} 
            variant="outline" 
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio de sesión
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Recuperar Contraseña</CardTitle>
        <CardDescription>
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </Button>

          <Button 
            type="button" 
            onClick={onBackToLogin} 
            variant="ghost" 
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio de sesión
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
