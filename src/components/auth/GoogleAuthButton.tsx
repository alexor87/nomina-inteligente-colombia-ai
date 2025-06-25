
import React from 'react';
import { Button } from '@/components/ui/button';
import { Chrome } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GoogleAuthButtonProps {
  mode: 'signin' | 'signup';
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  mode,
  loading,
  onLoadingChange
}) => {
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const handleGoogleAuth = async () => {
    onLoadingChange(true);
    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        console.error('Google auth error:', error);
        toast({
          title: "Error con Google",
          description: "No se pudo conectar con Google. Intenta nuevamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Unexpected Google auth error:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado.",
        variant: "destructive"
      });
    } finally {
      onLoadingChange(false);
    }
  };

  return (
    <Button
      onClick={handleGoogleAuth}
      variant="outline"
      className="w-full"
      disabled={loading}
    >
      <Chrome className="mr-2 h-4 w-4" />
      {loading 
        ? 'Conectando...' 
        : mode === 'signin' 
          ? 'Continuar con Google' 
          : 'Registrarse con Google'
      }
    </Button>
  );
};
