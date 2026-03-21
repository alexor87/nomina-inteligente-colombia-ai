
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyRegistrationWizard } from '@/components/auth/CompanyRegistrationWizard';
import { useToast } from '@/hooks/use-toast';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { LoadingWithTimeout } from '@/components/ui/LoadingWithTimeout';

const CompanyRegistrationPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { companyId, loading } = useCurrentCompany();

  // Guard: si el usuario ya tiene empresa, redirigir al dashboard
  useEffect(() => {
    if (!loading && companyId) {
      navigate('/modules/dashboard', { replace: true });
    }
  }, [companyId, loading, navigate]);

  if (loading) {
    return <LoadingWithTimeout message="Verificando empresa..." timeout={7} redirectTo="/login" />;
  }

  if (companyId) return null;

  const handleComplete = () => {
    toast({
      title: "¡Empresa configurada exitosamente!",
      description: "Bienvenido a tu dashboard de nómina. Ya puedes comenzar a gestionar empleados.",
    });
    setTimeout(() => {
      navigate('/modules/dashboard');
    }, 2000);
  };

  const handleCancel = () => {
    navigate('/modules/dashboard');
  };

  return (
    <CompanyRegistrationWizard
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
};

export default CompanyRegistrationPage;
