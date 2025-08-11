
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Calculator, Users, BarChart3, FileText, Shield, CheckCircle2, Clock3 } from 'lucide-react';
import * as Accordion from '@radix-ui/react-accordion';

export const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated users to the app dashboard
    if (!loading && user) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only show landing page for non-authenticated users
  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Navigation */}
      <nav className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Calculator className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">Finppi Nómina</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost">Iniciar Sesión</Button>
              </Link>
              <Link to="/register">
                <Button>
                  Comenzar Gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight animate-fade-in">
            Gestiona tu <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Nómina</span>
            <br />
            de forma simple
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-fade-in">
            Simplifica la gestión de recursos humanos con nuestra plataforma integral 
            para el cálculo de nómina, administración de empleados y generación de reportes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="text-lg px-8 py-3">
                Comenzar Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login?demo=1">
              <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                Ver Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Trust Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-sm text-muted-foreground">
          <div><span className="font-semibold text-foreground">+5.000</span> empleados gestionados</div>
          <div><span className="font-semibold text-foreground">Cumplimiento</span> UGPP y DIAN</div>
          <div><span className="font-semibold text-foreground">99.9%</span> disponibilidad</div>
          <div><span className="font-semibold text-foreground">Soporte</span> dedicado</div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">¿Cómo funciona Finppi Nómina?</h2>
          <p className="text-lg text-muted-foreground">En tres pasos estás listo para liquidar tu nómina</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow hover-scale">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Configura tu empresa</CardTitle>
              <CardDescription>Datos básicos, centros de costo y reglas de liquidación.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow hover-scale">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Importa empleados</CardTitle>
              <CardDescription>Carga masiva con Excel o crea registros individuales.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow hover-scale">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock3 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Liquida y paga</CardTitle>
              <CardDescription>Calcula nómina, genera comprobantes y exporta PILA/contabilidad.</CardDescription>
            </CardHeader>
          </Card>
        </div>
        <div className="mt-10 text-center">
          <Link to="/register"><Button size="lg">Probar gratis ahora<ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
        </div>
      </section>


      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Todo lo que necesitas para gestionar tu nómina
          </h2>
          <p className="text-lg text-muted-foreground">
            Potentes herramientas diseñadas para simplificar tus procesos de RRHH
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow hover-scale">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Gestión de Empleados</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Administra la información completa de tus empleados de forma centralizada y segura.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow hover-scale">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Cálculo de Nómina</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Automatiza el cálculo de salarios, deducciones y aportes con precisión total.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow hover-scale">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Reportes y Análisis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Genera reportes detallados y obtén insights valiosos sobre tu nómina.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow hover-scale">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Comprobantes Digitales</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Genera y envía comprobantes de pago digitales de forma automática.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Link to="/login?demo=1">
            <Button variant="outline" size="lg">Ver demo guiada</Button>
          </Link>
        </div>
      </section>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h3 className="text-2xl font-bold text-foreground text-center mb-6">Preguntas Frecuentes</h3>
        <Accordion.Root type="single" collapsible className="space-y-3">
          <Accordion.Item value="q1" className="border border-border rounded-md">
            <Accordion.Header>
              <Accordion.Trigger className="w-full text-left px-4 py-3 font-medium">
                ¿Puedo cancelar en cualquier momento?
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="px-4 pb-4 text-muted-foreground">
              Sí. No hay contratos a largo plazo; puedes cancelar cuando quieras.
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="q2" className="border border-border rounded-md">
            <Accordion.Header>
              <Accordion.Trigger className="w-full text-left px-4 py-3 font-medium">
                ¿Cumple con la normativa colombiana?
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="px-4 pb-4 text-muted-foreground">
              Mantenemos actualizados cálculos y reportes según UGPP, DIAN y PILA.
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="q3" className="border border-border rounded-md">
            <Accordion.Header>
              <Accordion.Trigger className="w-full text-left px-4 py-3 font-medium">
                ¿Hay soporte de implementación?
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="px-4 pb-4 text-muted-foreground">
              Sí, te acompañamos para migrar datos y configurar tu nómina rápidamente.
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para simplificar tu gestión de nómina?
          </h2>
          <p className="text-xl mb-8 text-primary-foreground/80">
            Únete a cientos de empresas que ya confían en Finppi Nómina
          </p>
          <Link to="/register">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Comenzar Ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-background border-t border-border text-muted-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Calculator className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">Finppi Nómina</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 Finppi. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
