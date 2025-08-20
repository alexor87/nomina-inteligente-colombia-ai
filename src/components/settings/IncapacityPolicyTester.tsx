
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, TestTube, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { IncapacityCalculationService } from '@/services/IncapacityCalculationService';

interface TestResult {
  testName: string;
  frontendValue: number;
  backendValue?: number;
  expectedValue: number;
  isCorrect: boolean;
  details: string;
}

interface IncapacityPolicyTesterProps {
  currentPolicy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor';
}

export const IncapacityPolicyTester = ({ currentPolicy }: IncapacityPolicyTesterProps) => {
  const [testSalary, setTestSalary] = useState(1400000);
  const [testDays, setTestDays] = useState(15);
  const [testSubtype, setTestSubtype] = useState('general');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runFrontendCalculation = (salary: number, days: number, subtipo: string) => {
    return IncapacityCalculationService.computeIncapacityValue(salary, days, subtipo);
  };

  const calculateExpectedValue = (salary: number, days: number, subtipo: string, policy: string) => {
    const dailySalary = salary / 30;
    const smldv = 1423500 / 30; // SMLDV 2025
    
    if (subtipo === 'laboral') {
      return Math.round(dailySalary * days); // Siempre 100%
    }
    
    // Incapacidad general según política
    if (policy === 'standard_2d_100_rest_66') {
      if (days <= 2) {
        return Math.round(dailySalary * days);
      } else {
        const first2Days = dailySalary * 2;
        const remainingDays = days - 2;
        const daily66 = dailySalary * 0.6667;
        const appliedDaily = Math.max(daily66, smldv);
        return Math.round(first2Days + (appliedDaily * remainingDays));
      }
    } else {
      // from_day1_66_with_floor
      const daily66 = dailySalary * 0.6667;
      const appliedDaily = Math.max(daily66, smldv);
      return Math.round(appliedDaily * days);
    }
  };

  const runComprehensiveTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];
    
    const testCases = [
      { name: 'General 5 días', salary: testSalary, days: 5, subtipo: 'general' },
      { name: 'General 15 días', salary: testSalary, days: 15, subtipo: 'general' },
      { name: 'Laboral 5 días', salary: testSalary, days: 5, subtipo: 'laboral' },
      { name: 'Laboral 15 días', salary: testSalary, days: 15, subtipo: 'laboral' },
      { name: 'General 2 días (límite)', salary: testSalary, days: 2, subtipo: 'general' },
      { name: 'General 1 día', salary: testSalary, days: 1, subtipo: 'general' },
      // Casos con salario mínimo para probar piso SMLDV
      { name: 'Salario mínimo 15 días', salary: 1423500, days: 15, subtipo: 'general' },
    ];

    for (const testCase of testCases) {
      const frontendValue = runFrontendCalculation(testCase.salary, testCase.days, testCase.subtipo);
      const expectedValue = calculateExpectedValue(testCase.salary, testCase.days, testCase.subtipo, currentPolicy);
      
      const isCorrect = Math.abs(frontendValue - expectedValue) < 1; // Tolerancia de 1 peso por redondeo
      
      let details = '';
      const dailySalary = testCase.salary / 30;
      const smldv = 1423500 / 30;
      
      if (testCase.subtipo === 'laboral') {
        details = `Laboral: ${formatCurrency(dailySalary)} × ${testCase.days} días = ${formatCurrency(expectedValue)}`;
      } else {
        if (currentPolicy === 'standard_2d_100_rest_66') {
          if (testCase.days <= 2) {
            details = `Estándar (≤2 días): ${formatCurrency(dailySalary)} × ${testCase.days} = ${formatCurrency(expectedValue)}`;
          } else {
            const first2 = dailySalary * 2;
            const remaining = testCase.days - 2;
            const daily66 = dailySalary * 0.6667;
            const applied = Math.max(daily66, smldv);
            details = `Estándar: 2d×${formatCurrency(dailySalary)} + ${remaining}d×máx(${formatCurrency(daily66)}, ${formatCurrency(smldv)}) = ${formatCurrency(expectedValue)}`;
          }
        } else {
          const daily66 = dailySalary * 0.6667;
          const applied = Math.max(daily66, smldv);
          details = `Día 1 al 66.67%: ${testCase.days}d×máx(${formatCurrency(daily66)}, ${formatCurrency(smldv)}) = ${formatCurrency(expectedValue)}`;
        }
      }

      results.push({
        testName: testCase.name,
        frontendValue,
        expectedValue,
        isCorrect,
        details
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const runSingleTest = () => {
    const frontendValue = runFrontendCalculation(testSalary, testDays, testSubtype);
    const expectedValue = calculateExpectedValue(testSalary, testDays, testSubtype, currentPolicy);
    const isCorrect = Math.abs(frontendValue - expectedValue) < 1;
    
    const result: TestResult = {
      testName: `Prueba manual: ${testSubtype} ${testDays} días`,
      frontendValue,
      expectedValue,
      isCorrect,
      details: `Salario: ${formatCurrency(testSalary)}, Días: ${testDays}, Tipo: ${testSubtype}`
    };

    setTestResults([result]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          🧪 Pruebas de Política de Incapacidades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Policy Display */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-sm">
            <strong>Política activa:</strong> {currentPolicy === 'standard_2d_100_rest_66' 
              ? 'Estándar (2 días 100% + resto 66.67%)' 
              : 'Desde día 1 al 66.67% con piso SMLDV'}
          </div>
        </div>

        {/* Manual Test Controls */}
        <div className="space-y-4">
          <h4 className="font-medium">Prueba Manual</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="test-salary">Salario Base</Label>
              <Input
                id="test-salary"
                type="number"
                value={testSalary}
                onChange={(e) => setTestSalary(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="test-days">Días</Label>
              <Input
                id="test-days"
                type="number"
                value={testDays}
                onChange={(e) => setTestDays(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="test-subtype">Tipo</Label>
              <Select value={testSubtype} onValueChange={setTestSubtype}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General (EPS)</SelectItem>
                  <SelectItem value="laboral">Laboral (ARL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={runSingleTest} className="w-full" variant="outline">
            <Calculator className="h-4 w-4 mr-2" />
            Ejecutar Prueba Manual
          </Button>
        </div>

        <Separator />

        {/* Comprehensive Tests */}
        <div className="space-y-4">
          <Button 
            onClick={runComprehensiveTests} 
            disabled={isRunning}
            className="w-full"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isRunning ? 'Ejecutando Pruebas...' : 'Ejecutar Batería de Pruebas Completa'}
          </Button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Resultados de Pruebas</h4>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{result.testName}</span>
                    <Badge variant={result.isCorrect ? 'default' : 'destructive'}>
                      {result.isCorrect ? (
                        <><CheckCircle2 className="h-3 w-3 mr-1" />CORRECTO</>
                      ) : (
                        <><AlertTriangle className="h-3 w-3 mr-1" />ERROR</>
                      )}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>Frontend: <strong>{formatCurrency(result.frontendValue)}</strong></div>
                    <div>Esperado: <strong>{formatCurrency(result.expectedValue)}</strong></div>
                    {result.backendValue && (
                      <div>Backend: <strong>{formatCurrency(result.backendValue)}</strong></div>
                    )}
                    <div className="text-xs text-gray-600 mt-2">{result.details}</div>
                  </div>
                  {!result.isCorrect && (
                    <div className="mt-2 text-xs text-red-600">
                      Diferencia: {formatCurrency(Math.abs(result.frontendValue - result.expectedValue))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm">
                <strong>Resumen:</strong> {testResults.filter(r => r.isCorrect).length} de {testResults.length} pruebas correctas
                {testResults.some(r => !r.isCorrect) && (
                  <div className="text-red-600 mt-1">
                    ⚠️ Hay inconsistencias en el cálculo. Revisar implementación.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
