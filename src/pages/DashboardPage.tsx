
import React from 'react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { LoadingWithTimeout } from '@/components/ui/LoadingWithTimeout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

const DashboardPage = () => {
  const { subscription, loading, error, refreshSubscription } = useSubscription();

  // Show loading state with timeout while subscription is loading
  if (loading) {
    return (
      <LoadingWithTimeout 
        message="Cargando configuración de suscripción..."
        timeout={7}
        redirectTo="/error"
      />
    );
  }

  // Show error state with retry option
  if (error && !subscription) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="max-w-md w-full">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={refreshSubscription}
            className="w-full"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar Carga
          </Button>
        </div>
      </div>
    );
  }

  // Show warning if using fallback subscription
  const showFallbackWarning = error && subscription && subscription.id.includes('fallback');

  return (
    <div className="min-h-screen bg-gray-50">
      {showFallbackWarning && (
        <div className="p-4">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Usando configuración temporal de suscripción. {error}
              <Button 
                onClick={refreshSubscription}
                size="sm"
                variant="outline"
                className="ml-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {subscription && !error && (
        <div className="p-4">
          <Alert className="border-green-200 bg-green-50 mb-4">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Suscripción {subscription.plan_type} activa - {subscription.max_employees} empleados máx.
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <Dashboard />
    </div>
  );
};

export default DashboardPage;
