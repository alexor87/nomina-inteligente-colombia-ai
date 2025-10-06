import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingWithTimeout } from '@/components/ui/LoadingWithTimeout';

export const RootRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingWithTimeout message="Cargando..." timeout={7} redirectTo="/home" />;
  }
  
  // Usuario autenticado → MAYA
  if (user) {
    return <Navigate to="/maya" replace />;
  }
  
  // Usuario NO autenticado → Landing page
  return <Navigate to="/home" replace />;
};
