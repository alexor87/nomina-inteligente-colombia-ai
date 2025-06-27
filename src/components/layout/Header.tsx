
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Crown, AlertTriangle } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { CompanySelector } from './CompanySelector';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

export const Header = () => {
  const { user, profile, isSuperAdmin, roles } = useAuth();
  const { subscription, isTrialExpired } = useSubscription();

  const getCompanyDisplayName = () => {
    if (isSuperAdmin) return 'Super Admin Panel';
    
    // Para empresas múltiples, mostrar un nombre genérico ya que el selector está visible
    if (roles.length > 1) return 'Nómina Inteligente';
    
    // Para una sola empresa, intentar obtener el nombre de la empresa
    if (profile?.company_id) {
      // Aquí podrías obtener el nombre real de la empresa desde el contexto o estado
      // Por ahora usaremos un nombre genérico
      return 'Mi Empresa';
    }
    
    return 'Nómina Inteligente';
  };

  const getSubscriptionBadge = () => {
    if (isSuperAdmin) {
      return (
        <Badge variant="default" className="bg-red-100 text-red-800">
          <Crown className="h-3 w-3 mr-1" />
          Super Admin
        </Badge>
      );
    }

    if (!subscription) return null;

    if (isTrialExpired) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Trial Expirado
        </Badge>
      );
    }

    if (subscription.status === 'trial') {
      const daysLeft = subscription.trial_ends_at 
        ? Math.ceil((new Date(subscription.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Trial: {daysLeft} días restantes
        </Badge>
      );
    }

    const planColors = {
      basico: 'bg-gray-100 text-gray-800',
      profesional: 'bg-blue-100 text-blue-800',
      empresarial: 'bg-purple-100 text-purple-800'
    };

    return (
      <Badge 
        variant="outline" 
        className={planColors[subscription.plan_type] || 'bg-gray-100 text-gray-800'}
      >
        Plan {subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)}
      </Badge>
    );
  };

  const companyDisplayName = getCompanyDisplayName();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">
              {companyDisplayName}
            </h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-3">
            <span className="text-sm text-gray-600">|</span>
            
            {/* Selector de empresa si hay múltiples empresas */}
            {roles.length > 1 && <CompanySelector />}
            
            {getSubscriptionBadge()}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {isSuperAdmin && (
            <Link to="/super-admin">
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                <Crown className="h-4 w-4 mr-2" />
                Panel Admin
              </Button>
            </Link>
          )}
          
          {isTrialExpired && !isSuperAdmin && (
            <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
              Actualizar Plan
            </Button>
          )}
          
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
