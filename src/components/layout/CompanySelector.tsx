import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/contexts/RoleContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Building2, ChevronDown, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CompanyOption {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

export const CompanySelector = () => {
  const { user, profile, refreshUserData } = useAuth();
  const { roles } = useRoles();
  const { toast } = useToast();
  const [isChanging, setIsChanging] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Cargar empresas cuando se abre el dropdown
  const loadCompanies = async () => {
    if (!user || companies.length > 0) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_companies_simple', { _user_id: user.id });

      if (error) throw error;

      if (data && data.length > 0) {
        // Obtener detalles de las empresas
        const companyIds = data.map((item: any) => item.company_id);
        const { data: companyDetails, error: companyError } = await supabase
          .from('companies')
          .select('id, razon_social')
          .in('id', companyIds);

        if (companyError) throw companyError;

        const companiesWithRoles = data.map((item: any) => {
          const companyDetail = companyDetails?.find(c => c.id === item.company_id);
          return {
            id: item.company_id,
            name: companyDetail?.razon_social || 'Empresa sin nombre',
            role: item.role_name,
            isActive: item.company_id === profile?.company_id
          };
        });

        setCompanies(companiesWithRoles);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las empresas disponibles",
        variant: "destructive"
      });
    }
  };

  const changeCompany = async (companyId: string) => {
    if (!user || companyId === profile?.company_id) return;

    setIsChanging(true);
    try {
      // Actualizar el perfil del usuario con la nueva empresa
      const { error } = await supabase
        .from('profiles')
        .update({ company_id: companyId })
        .eq('user_id', user.id);

      if (error) throw error;

      const selectedCompany = companies.find(c => c.id === companyId);
      
      toast({
        title: "Empresa cambiada",
        description: `Cambiando a: ${selectedCompany?.name}`,
      });

      setIsOpen(false);

      // Recargar la página automáticamente después de un breve delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error changing company:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar la empresa",
        variant: "destructive"
      });
      setIsChanging(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadCompanies();
    }
  };

  // Only show if there are multiple companies
  if (roles.length <= 1) return null;

  const currentCompany = companies.find(c => c.isActive);
  const displayName = currentCompany?.name || 'Seleccionar empresa';

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center space-x-2 max-w-[200px]"
          disabled={isChanging}
        >
          <Building2 className="h-4 w-4" />
          <span className="truncate">{displayName}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Cambiar empresa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => changeCompany(company.id)}
            className="flex items-center justify-between cursor-pointer"
            disabled={isChanging}
          >
            <div className="flex flex-col flex-1">
              <span className="font-medium">{company.name}</span>
              <span className="text-xs text-muted-foreground">
                Rol: {company.role}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {company.isActive && (
                <>
                  <Badge variant="secondary" className="text-xs">
                    Activa
                  </Badge>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        {companies.length === 0 && (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">Cargando empresas...</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
