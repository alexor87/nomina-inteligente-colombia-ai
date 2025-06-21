
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Info } from 'lucide-react';

interface ContributionPercentages {
  saludEmpleador: number;
  saludEmpleado: number;
  pensionEmpleador: number;
  pensionEmpleado: number;
  fsp: number;
  cajaCompensacion: number;
  sena: number;
  icbf: number;
}

interface ContractAffiliation {
  tipo: string;
  afiliacion: string;
}

export const AportesSettings = () => {
  const { toast } = useToast();
  
  const [config, setConfig] = useState({
    operadorPILA: 'SOI',
    topeMinimoCotizacion: 1,
    topeMaximoCotizacion: 25,
    modificacionAvanzada: false,
    aportesVoluntarios: {
      empleadoPension: false,
      empleadorPension: false,
      beneficiosTributarios: false
    }
  });

  const [porcentajes, setPorcentajes] = useState<ContributionPercentages>({
    saludEmpleador: 8.5,
    saludEmpleado: 4.0,
    pensionEmpleador: 12.0,
    pensionEmpleado: 4.0,
    fsp: 1.0,
    cajaCompensacion: 4.0,
    sena: 2.0,
    icbf: 3.0
  });

  const [afiliacionPorContrato, setAfiliacionPorContrato] = useState<ContractAffiliation[]>([
    { tipo: 'Laboral', afiliacion: 'Dependiente' },
    { tipo: 'Prestación de servicios', afiliacion: 'Independiente (sin ARL)' },
    { tipo: 'Extranjero sin pensión', afiliacion: 'Personalizado' }
  ]);

  const nivelesRiesgoARL = [
    { nivel: 'I', descripcion: 'Riesgo mínimo (administrativo)', porcentaje: '0.522%' },
    { nivel: 'II', descripcion: 'Riesgo bajo (técnico)', porcentaje: '1.044%' },
    { nivel: 'III', descripcion: 'Riesgo medio (manufactura)', porcentaje: '2.436%' },
    { nivel: 'IV', descripcion: 'Riesgo alto (transporte, construcción)', porcentaje: '4.350%' },
    { nivel: 'V', descripcion: 'Riesgo máximo (minería, explosivos)', porcentaje: '6.960%' }
  ];

  const calcularCostoPrestacional = () => {
    const totalEmpleador = porcentajes.saludEmpleador + porcentajes.pensionEmpleador + 
                          porcentajes.cajaCompensacion + porcentajes.sena + porcentajes.icbf;
    const totalEmpleado = porcentajes.saludEmpleado + porcentajes.pensionEmpleado + porcentajes.fsp;
    return { empleador: totalEmpleador, empleado: totalEmpleado, total: totalEmpleador + totalEmpleado };
  };

  const handlePorcentajeChange = (campo: keyof ContributionPercentages, valor: number) => {
    const nuevosPorcentajes = { ...porcentajes, [campo]: valor };
    
    // Validaciones
    const costos = calcularCostoPrestacional();
    if (costos.empleador > 30) {
      toast({
        title: "⚠️ Advertencia",
        description: "Los aportes del empleador no pueden exceder el 30%",
        variant: "destructive"
      });
      return;
    }

    setPorcentajes(nuevosPorcentajes);
  };

  const handleSave = () => {
    // Validaciones finales
    if (config.topeMinimoCotizacion < 1 || config.topeMaximoCotizacion > 25) {
      toast({
        title: "Error de validación",
        description: "Los topes de cotización están fuera del rango legal",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Configuración guardada",
      description: "Los parámetros de aportes y seguridad social han sido actualizados.",
    });
  };

  const handleRevertir = () => {
    // Restaurar valores originales
    setConfig({
      operadorPILA: 'SOI',
      topeMinimoCotizacion: 1,
      topeMaximoCotizacion: 25,
      modificacionAvanzada: false,
      aportesVoluntarios: {
        empleadoPension: false,
        empleadorPension: false,
        beneficiosTributarios: false
      }
    });
    
    setPorcentajes({
      saludEmpleador: 8.5,
      saludEmpleado: 4.0,
      pensionEmpleador: 12.0,
      pensionEmpleado: 4.0,
      fsp: 1.0,
      cajaCompensacion: 4.0,
      sena: 2.0,
      icbf: 3.0
    });

    toast({
      title: "Cambios revertidos",
      description: "Se han restaurado los valores anteriores"
    });
  };

  const costos = calcularCostoPrestacional();

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">💰 Aportes y Seguridad Social</h2>
          <p className="text-gray-600">Configuración de operadores PILA, porcentajes y reglas de cotización</p>
        </div>

        <Tabs defaultValue="operador" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="operador">🏛️ PILA</TabsTrigger>
            <TabsTrigger value="porcentajes">📊 Porcentajes</TabsTrigger>
            <TabsTrigger value="topes">📉 Topes</TabsTrigger>
            <TabsTrigger value="voluntarios">💼 Voluntarios</TabsTrigger>
            <TabsTrigger value="afiliacion">👤 Afiliación</TabsTrigger>
            <TabsTrigger value="arl">⚠️ Ref. ARL</TabsTrigger>
          </TabsList>

          {/* Sección 1: Operador PILA */}
          <TabsContent value="operador">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="operadorPILA">Operador PILA por Defecto</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 inline ml-2 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este será el operador predeterminado para la generación del archivo PILA en la empresa.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Select value={config.operadorPILA} onValueChange={(value) => setConfig(prev => ({ ...prev, operadorPILA: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOI">SOI</SelectItem>
                      <SelectItem value="MiPlanilla">MiPlanilla</SelectItem>
                      <SelectItem value="Aportes en Línea">Aportes en Línea</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Sección 2: Porcentajes */}
          <TabsContent value="porcentajes">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Porcentajes Estándar de Aportes</h3>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="modificacion-avanzada">Modificación Avanzada</Label>
                    <Switch
                      id="modificacion-avanzada"
                      checked={config.modificacionAvanzada}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, modificacionAvanzada: checked }))}
                    />
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aporte</TableHead>
                      <TableHead>Empleador</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Salud</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          value={porcentajes.saludEmpleador}
                          onChange={(e) => config.modificacionAvanzada && handlePorcentajeChange('saludEmpleador', parseFloat(e.target.value))}
                          disabled={!config.modificacionAvanzada}
                          className="w-20"
                        />%
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          value={porcentajes.saludEmpleado}
                          onChange={(e) => config.modificacionAvanzada && handlePorcentajeChange('saludEmpleado', parseFloat(e.target.value))}
                          disabled={!config.modificacionAvanzada}
                          className="w-20"
                        />%
                      </TableCell>
                      <TableCell>{(porcentajes.saludEmpleador + porcentajes.saludEmpleado).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Pensión</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          value={porcentajes.pensionEmpleador}
                          onChange={(e) => config.modificacionAvanzada && handlePorcentajeChange('pensionEmpleador', parseFloat(e.target.value))}
                          disabled={!config.modificacionAvanzada}
                          className="w-20"
                        />%
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          value={porcentajes.pensionEmpleado}
                          onChange={(e) => config.modificacionAvanzada && handlePorcentajeChange('pensionEmpleado', parseFloat(e.target.value))}
                          disabled={!config.modificacionAvanzada}
                          className="w-20"
                        />%
                      </TableCell>
                      <TableCell>{(porcentajes.pensionEmpleador + porcentajes.pensionEmpleado).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">FSP (si > 4 SMMLV)</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          min="1"
                          max="2"
                          value={porcentajes.fsp}
                          onChange={(e) => config.modificacionAvanzada && handlePorcentajeChange('fsp', parseFloat(e.target.value))}
                          disabled={!config.modificacionAvanzada}
                          className="w-20"
                        />%
                      </TableCell>
                      <TableCell>{porcentajes.fsp}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Caja de Compensación</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={porcentajes.cajaCompensacion}
                          disabled
                          className="w-20 bg-gray-100"
                        />%
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{porcentajes.cajaCompensacion}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">SENA</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={porcentajes.sena}
                          disabled
                          className="w-20 bg-gray-100"
                        />%
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{porcentajes.sena}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">ICBF</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={porcentajes.icbf}
                          disabled
                          className="w-20 bg-gray-100"
                        />%
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{porcentajes.icbf}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {config.modificacionAvanzada && costos.empleador > 25 && (
                  <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-md">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Advertencia: Los porcentajes están por fuera de los rangos legales estándar</span>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-md">
                  <h4 className="font-semibold text-blue-900 mb-2">Resumen del Costo Prestacional Estimado</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Empleador:</span>
                      <span className="font-semibold ml-2">{costos.empleador.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Empleado:</span>
                      <span className="font-semibold ml-2">{costos.empleado.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Total:</span>
                      <span className="font-semibold ml-2">{costos.total.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Sección 3: Topes */}
          <TabsContent value="topes">
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Topes de Cotización</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 inline ml-2 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Los topes controlan el salario base sobre el que se calculan los aportes obligatorios.</p>
                  </TooltipContent>
                </Tooltip>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="topeMinimo">Tope Mínimo de Cotización (SMMLV)</Label>
                    <Input
                      id="topeMinimo"
                      type="number"
                      min="1"
                      value={config.topeMinimoCotizacion}
                      onChange={(e) => setConfig(prev => ({ ...prev, topeMinimoCotizacion: parseInt(e.target.value) }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="topeMaximo">Tope Máximo de Cotización (SMMLV)</Label>
                    <Input
                      id="topeMaximo"
                      type="number"
                      max="25"
                      value={config.topeMaximoCotizacion}
                      onChange={(e) => setConfig(prev => ({ ...prev, topeMaximoCotizacion: parseInt(e.target.value) }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                {(config.topeMinimoCotizacion < 1 || config.topeMaximoCotizacion > 25) && (
                  <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Error: Los valores están fuera del rango legal permitido</span>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Sección 4: Aportes Voluntarios */}
          <TabsContent value="voluntarios">
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Aportes Voluntarios</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="voluntario-empleado">Aportes voluntarios del empleado a pensión obligatoria</Label>
                    </div>
                    <Switch
                      id="voluntario-empleado"
                      checked={config.aportesVoluntarios.empleadoPension}
                      onCheckedChange={(checked) => setConfig(prev => ({
                        ...prev,
                        aportesVoluntarios: { ...prev.aportesVoluntarios, empleadoPension: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="voluntario-empleador">Aportes voluntarios del empleador a pensión obligatoria</Label>
                    </div>
                    <Switch
                      id="voluntario-empleador"
                      checked={config.aportesVoluntarios.empleadorPension}
                      onCheckedChange={(checked) => setConfig(prev => ({
                        ...prev,
                        aportesVoluntarios: { ...prev.aportesVoluntarios, empleadorPension: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="beneficios-tributarios">Activar beneficios tributarios por aportes voluntarios</Label>
                    </div>
                    <Switch
                      id="beneficios-tributarios"
                      checked={config.aportesVoluntarios.beneficiosTributarios}
                      onCheckedChange={(checked) => setConfig(prev => ({
                        ...prev,
                        aportesVoluntarios: { ...prev.aportesVoluntarios, beneficiosTributarios: checked }
                      }))}
                    />
                  </div>
                </div>

                {(config.aportesVoluntarios.empleadoPension || config.aportesVoluntarios.empleadorPension) && (
                  <div className="bg-green-50 p-3 rounded-md">
                    <p className="text-sm text-green-700">
                      ✓ Estos conceptos estarán disponibles en la ficha del empleado y en novedades.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Sección 5: Afiliación por Contrato */}
          <TabsContent value="afiliacion">
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Afiliación por Tipo de Contrato</h3>
                <p className="text-sm text-gray-600">Reglas predeterminadas que se aplicarán en la creación de empleados</p>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de Contrato</TableHead>
                      <TableHead>Afiliación por Defecto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {afiliacionPorContrato.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.tipo}</TableCell>
                        <TableCell>
                          <Select
                            value={item.afiliacion}
                            onValueChange={(value) => {
                              const nuevaAfiliacion = [...afiliacionPorContrato];
                              nuevaAfiliacion[index].afiliacion = value;
                              setAfiliacionPorContrato(nuevaAfiliacion);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Dependiente">Dependiente</SelectItem>
                              <SelectItem value="Independiente (sin ARL)">Independiente (sin ARL)</SelectItem>
                              <SelectItem value="Personalizado">Personalizado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Sección 6: Tabla Referencial ARL */}
          <TabsContent value="arl">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Tabla Referencial ARL</h3>
                  <div className="bg-yellow-50 p-3 rounded-md mt-2">
                    <p className="text-sm text-yellow-800">
                      📌 <strong>Nota importante:</strong> El nivel de riesgo ARL depende de las funciones de cada trabajador, 
                      no de la empresa. Este dato debe configurarse individualmente en la ficha del empleado o contrato.
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 inline ml-2 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>El porcentaje de ARL depende del nivel de riesgo asociado al cargo del trabajador.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>% ARL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nivelesRiesgoARL.map((nivel, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{nivel.nivel}</TableCell>
                        <TableCell>{nivel.descripcion}</TableCell>
                        <TableCell>{nivel.porcentaje}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Controles inferiores */}
        <div className="flex gap-4">
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Guardar Configuración
          </Button>
          <Button variant="outline" onClick={handleRevertir}>
            Revertir Cambios
          </Button>
          <Button variant="outline" onClick={() => {
            setConfig({
              operadorPILA: 'SOI',
              topeMinimoCotizacion: 1,
              topeMaximoCotizacion: 25,
              modificacionAvanzada: false,
              aportesVoluntarios: {
                empleadoPension: false,
                empleadorPension: false,
                beneficiosTributarios: false
              }
            });
            toast({
              title: "Valores restaurados",
              description: "Se han cargado los valores por defecto"
            });
          }}>
            Restaurar Valores por Defecto
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};
