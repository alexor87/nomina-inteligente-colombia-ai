
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { ConfigurationService } from '@/services/ConfigurationService';
import { useYear } from '@/contexts/YearContext';
import { useToast } from '@/hooks/use-toast';

export const YearConfigurationSettings = () => {
  const { selectedYear, setSelectedYear, availableYears } = useYear();
  const { toast } = useToast();
  const [showNewYearForm, setShowNewYearForm] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [baseYear, setBaseYear] = useState('2025');

  const currentConfig = ConfigurationService.getConfiguration(selectedYear);

  const handleCreateNewYear = () => {
    if (!newYear || parseInt(newYear) < 2021 || parseInt(newYear) > 2040) {
      toast({
        title: "Error",
        description: "Ingresa un año válido entre 2021 y 2040",
        variant: "destructive"
      });
      return;
    }

    try {
      ConfigurationService.createNewYear(newYear, baseYear);
      setSelectedYear(newYear);
      setShowNewYearForm(false);
      setNewYear('');
      
      toast({
        title: "Año creado",
        description: `La configuración para ${newYear} ha sido creada exitosamente`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la configuración del año",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Configuración por Año</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewYearForm(!showNewYearForm)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Año
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Year Selection */}
        <div className="space-y-2">
          <Label>Año de Configuración</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ConfigurationService.getAllYears().map(year => (
                <SelectItem key={year} value={year}>
                  {year} {year === '2025' && <Badge variant="secondary" className="ml-2">Actual</Badge>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* New Year Form */}
        {showNewYearForm && (
          <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
            <h4 className="font-medium">Crear Nuevo Año</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-year">Año</Label>
                <Input
                  id="new-year"
                  type="number"
                  placeholder="2026"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  min="2021"
                  max="2040"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base-year">Copiar configuración de</Label>
                <Select value={baseYear} onValueChange={setBaseYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ConfigurationService.getAllYears().map(year => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateNewYear} size="sm">
                Crear Año
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowNewYearForm(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Base Values */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <h3 className="text-lg font-medium">Valores Base {selectedYear}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <Label className="text-sm font-medium text-gray-600">SMMLV</Label>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(currentConfig.salarioMinimo)}
              </p>
              <p className="text-xs text-gray-500">Salario Mínimo Legal Vigente</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <Label className="text-sm font-medium text-gray-600">Subsidio de Transporte</Label>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(currentConfig.auxilioTransporte)}
              </p>
              <p className="text-xs text-gray-500">Para salarios hasta 2 SMMLV</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <Label className="text-sm font-medium text-gray-600">UVT</Label>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(currentConfig.uvt)}
              </p>
              <p className="text-xs text-gray-500">Unidad de Valor Tributario</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Contribution Caps */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <h3 className="text-lg font-medium">Topes de Cotización</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <Label className="text-sm font-medium text-gray-600">Tope Mínimo</Label>
              <p className="text-xl font-bold">1 SMMLV</p>
              <p className="text-sm text-gray-500">
                {formatCurrency(currentConfig.salarioMinimo)}
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <Label className="text-sm font-medium text-gray-600">Tope Máximo</Label>
              <p className="text-xl font-bold">25 SMMLV</p>
              <p className="text-sm text-gray-500">
                {formatCurrency(currentConfig.salarioMinimo * 25)}
              </p>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 Los topes de cotización definen el rango salarial sobre el cual se calculan 
              los aportes obligatorios a seguridad social y parafiscales.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
