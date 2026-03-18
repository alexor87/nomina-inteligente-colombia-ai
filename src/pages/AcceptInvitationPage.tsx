import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { TeamInvitationService, TeamInvitation } from '@/services/TeamInvitationService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Token de invitación no válido');
      return;
    }

    TeamInvitationService.getInvitationByToken(token).then((inv) => {
      if (!inv) {
        setStatus('error');
        setErrorMessage('Invitación no encontrada o expirada');
        return;
      }
      if (inv.status !== 'pending') {
        setStatus('error');
        setErrorMessage(inv.status === 'accepted' ? 'Esta invitación ya fue aceptada' : 'Esta invitación ha expirado');
        return;
      }
      if (new Date(inv.expires_at) < new Date()) {
        setStatus('error');
        setErrorMessage('Esta invitación ha expirado');
        return;
      }
      setInvitation(inv);
      setStatus('ready');
    });
  }, [token]);

  // Once we have auth state and invitation, redirect to login if needed
  useEffect(() => {
    if (authLoading || status !== 'ready' || !invitation) return;

    if (!user) {
      // Not logged in — send to login with invite token
      sessionStorage.setItem('pendingInviteToken', token!);
      navigate(`/login?invite=${token}`, { replace: true });
      return;
    }

    // Wrong account logged in — sign out and redirect to login
    if (user.email?.toLowerCase() !== invitation.invited_email) {
      sessionStorage.setItem('pendingInviteToken', token!);
      supabase.auth.signOut().then(() => {
        navigate(`/login?invite=${token}`, { replace: true });
      });
    }
  }, [authLoading, user, status, invitation, token, navigate]);

  const handleAccept = async () => {
    if (!token) return;
    setStatus('accepting');

    const result = await TeamInvitationService.acceptInvitation(token);

    if (result.success) {
      setStatus('success');
      toast({ title: '¡Bienvenido!', description: result.message });
      setTimeout(() => navigate('/modules/dashboard', { replace: true }), 2000);
    } else {
      setStatus('error');
      setErrorMessage(result.message);
    }
  };

  const roleLabels: Record<string, string> = {
    administrador: 'Administrador',
    rrhh: 'Recursos Humanos',
    contador: 'Contador',
    asistente: 'Asistente',
    consultor: 'Consultor',
    visualizador: 'Visualizador',
    soporte: 'Soporte externo',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Invitación de equipo</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">

          {(status === 'loading' || authLoading) && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <p className="text-gray-500">Verificando invitación...</p>
            </div>
          )}

          {status === 'ready' && invitation && user && user.email?.toLowerCase() === invitation.invited_email && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Has sido invitado a unirte al equipo como:
              </p>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-2xl font-semibold text-blue-700">
                  {roleLabels[invitation.role] || invitation.role}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                Cuenta: <strong>{user.email}</strong>
              </p>
              <Button onClick={handleAccept} className="w-full">
                Aceptar y unirme al equipo
              </Button>
            </div>
          )}

          {status === 'accepting' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <p className="text-gray-500">Procesando...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold text-green-700">¡Te has unido al equipo!</p>
              <p className="text-gray-500 text-sm">Redirigiendo al dashboard...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <XCircle className="h-12 w-12 text-red-400" />
              <p className="text-red-600 font-medium">{errorMessage}</p>
              <Button variant="outline" onClick={() => navigate('/login')}>
                Ir al inicio de sesión
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
