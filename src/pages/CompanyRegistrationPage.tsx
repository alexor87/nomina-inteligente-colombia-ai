
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyRegistrationWizard } from '@/components/auth/CompanyRegistrationWizard';
import { useToast } from '@/hooks/use-toast';

const CompanyRegistrationPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleComplete = () => {
    toast({
      title: "¡Empresa configurada exitosamente!",
      description: "Bienvenido a tu dashboard de nómina. Ya puedes comenzar a gestionar empleados.",
    });
    
    // Redirigir al dashboard después de completar el registro
    setTimeout(() => {
      navigate('/modules/dashboard');
    }, 2000);
  };

  const handleCancel = () => {
    // Redirigir al dashboard si cancela (el usuario ya está registrado)
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
