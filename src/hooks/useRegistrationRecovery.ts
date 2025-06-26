
import { useState } from 'react';
import { RegistrationRecoveryService, IncompleteRegistration } from '@/services/RegistrationRecoveryService';
import { useToast } from '@/hooks/use-toast';

export const useRegistrationRecovery = () => {
  const [loading, setLoading] = useState(false);
  const [incompleteRegistrations, setIncompleteRegistrations] = useState<IncompleteRegistration[]>([]);
  const { toast } = useToast();

  const findIncompleteRegistrations = async () => {
    setLoading(true);
    try {
      const registrations = await RegistrationRecoveryService.findIncompleteRegistrations();
      setIncompleteRegistrations(registrations);
      
      toast({
        title: "Búsqueda completada",
        description: `Se encontraron ${registrations.length} registros incompletos`,
      });
      
      return registrations;
    } catch (error) {
      console.error('Error finding incomplete registrations:', error);
      toast({
        title: "Error",
        description: "No se pudieron buscar registros incompletos",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const completeYohannaRegistration = async () => {
    setLoading(true);
    try {
      const success = await RegistrationRecoveryService.completeYohannaRegistration();
      
      if (success) {
        toast({
          title: "¡Éxito!",
          description: "El registro de Yohanna se completó correctamente",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo completar el registro de Yohanna",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error completing Yohanna registration:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al completar el registro",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const runAutoRecovery = async () => {
    setLoading(true);
    try {
      const results = await RegistrationRecoveryService.runAutoRecovery();
      
      toast({
        title: "Recuperación completada",
        description: `${results.completed} registros completados, ${results.failed} fallaron`,
      });
      
      return results;
    } catch (error) {
      console.error('Error in auto recovery:', error);
      toast({
        title: "Error",
        description: "No se pudo ejecutar la recuperación automática",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    incompleteRegistrations,
    findIncompleteRegistrations,
    completeYohannaRegistration,
    runAutoRecovery
  };
};
