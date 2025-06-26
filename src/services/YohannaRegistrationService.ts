
import { supabase } from '@/integrations/supabase/client';
import { UserRegistrationCompleter } from './UserRegistrationCompleter';
import type { CompanyCreationData } from '@/types/registration-recovery';

export class YohannaRegistrationService {
  static async completeYohannaRegistration(): Promise<boolean> {
    try {
      console.log('🔧 Completing Yohanna\'s registration...');
      
      // Buscar usuario de Yohanna
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (error) {
        console.error('❌ Error fetching users:', error);
        return false;
      }

      const yohannaUser = users.find(u => u.email === 'yohanna.munozes@gmail.com');
      if (!yohannaUser) {
        console.error('❌ Yohanna user not found');
        return false;
      }

      // Datos de empresa para Yohanna (usando datos de ejemplo)
      const companyData: CompanyCreationData = {
        nit: '900123456-1',
        razon_social: 'Empresa de Yohanna S.A.S',
        email: 'yohanna.munozes@gmail.com',
        first_name: 'Yohanna',
        last_name: 'Muñoz'
      };

      return await UserRegistrationCompleter.completeUserRegistration(yohannaUser.id, companyData);
    } catch (error) {
      console.error('❌ Error completing Yohanna\'s registration:', error);
      return false;
    }
  }
}
