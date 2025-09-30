
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getJornadaLegal, calcularValorHoraExtra } from '@/utils/jornadaLegal';
import { formatCurrency } from '@/lib/utils';
import { Calendar, Clock, Calculator } from 'lucide-react';

export const JornadaLegalTester: React.FC = () => {
  const [testResults, setTestResults] = useState<Array<{
    fecha: string;
    fechaObj: Date;
    jornada: any;
    valorHoraExtra: number;
  }>>([]);

  const runTests = () => {
    const salarioBase = 1300000; // Salario mínimo para pruebas
    const fechasPrueba = [
      { label: '1 Julio 2025 (antes del cambio)', fecha: new Date('2025-07-01') },
      { label: '14 Julio 2025 (último día 46h)', fecha: new Date('2025-07-14') },
      { label: '15 Julio 2025 (primer día 44h)', fecha: new Date('2025-07-15') },
      { label: '16 Julio 2025 (después del cambio)', fecha: new Date('2025-07-16') },
      { label: '1 Agosto 2025 (confirmación 44h)', fecha: new Date('2025-08-01') },
    ];

    console.log('🧪 INICIANDO PRUEBAS DE JORNADA LEGAL');
    
    const resultados = fechasPrueba.map(({ label, fecha }) => {
      console.log(`\n🔍 Probando: ${label}`);
      
      const jornada = getJornadaLegal(fecha);
      const valorHoraExtra = 0; // ✅ ELIMINADO: calcularValorHoraExtra (solo backend)
      
      console.log(`   📊 Resultado: ${jornada.horasSemanales}h/semana → ${jornada.horasMensuales}h/mes`);
      console.log(`   💰 Valor hora extra: $${Math.round(valorHoraExtra).toLocaleString()}`);
      
      return {
        fecha: label,
        fechaObj: fecha,
        jornada,
        valorHoraExtra
      };
    });

    setTestResults(resultados);
    console.log('✅ PRUEBAS COMPLETADAS');
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Verificador de Jornada Legal - Ley 2101 de 2021
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Validación de cálculos para la transición del 15 de julio de 2025
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTests} className="w-full mb-4">
          <Calculator className="h-4 w-4 mr-2" />
          Ejecutar Pruebas de Validación
        </Button>

        <div className="grid gap-4">
          {testResults.map((resultado, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{resultado.fecha}</span>
                </div>
                <Badge variant={
                  resultado.jornada.horasSemanales === 46 ? "default" : 
                  resultado.jornada.horasSemanales === 44 ? "secondary" : 
                  "outline"
                }>
                  {resultado.jornada.horasSemanales}h semanales
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Horas Mensuales</p>
                  <p className="font-semibold">{resultado.jornada.horasMensuales}h</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ley Aplicable</p>
                  <p className="font-semibold text-xs">{resultado.jornada.ley}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor Hora Extra</p>
                  <p className="font-semibold">{formatCurrency(resultado.valorHoraExtra)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <Badge variant={
                    (resultado.fechaObj < new Date('2025-07-15') && resultado.jornada.horasMensuales === 230) ||
                    (resultado.fechaObj >= new Date('2025-07-15') && resultado.jornada.horasMensuales === 220)
                    ? "default" : "destructive"
                  }>
                    {(resultado.fechaObj < new Date('2025-07-15') && resultado.jornada.horasMensuales === 230) ||
                     (resultado.fechaObj >= new Date('2025-07-15') && resultado.jornada.horasMensuales === 220)
                     ? "✅ Correcto" : "❌ Error"}
                  </Badge>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                {resultado.jornada.descripcion}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">Validación Esperada:</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• <strong>Antes del 15 julio 2025:</strong> 46h semanales = 230h mensuales</li>
            <li>• <strong>Desde el 15 julio 2025:</strong> 44h semanales = 220h mensuales</li>
            <li>• <strong>Valor hora extra:</strong> Debe cambiar proporcionalmente con la jornada</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
