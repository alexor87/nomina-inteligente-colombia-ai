
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AportesSettings = () => {
  const { toast } = useToast();
  
  // Estado para configuraciones
  const [operadorPila, setOperadorPila] = useState('');
  const [modificacionAvanzada, setModificacionAvanzada] = useState(false);
  const [topeMinimo, setTopeMinimo] = useState('1');
  const [topeMaximo, setTopeMaximo] = useState('25');
  const [aportesVoluntarios, setAportesVoluntarios] = useState({
    empleadoPension: false,
    empleadorPension: false,
    beneficiosTributarios: false
  });

  // Porcentajes estándar de aportes
  const [porcentajesEstandar] = useState([
    { aporte: 'Salud', empleador: 8.5, empleado: 4, total: 12.5, editable: true },
    { aporte: 'Pensión', empleador: 12, empleado: 4, total: 16, editable: true },
    { aporte: 'FSP', empleador: 0, empleado: 1, total: 1, editable: true },
    { aporte: 'Caja Compensación', empleador: 4, empleado: 0, total: 4, editable: false },
    { aporte: 'SENA', empleador: 2, empleado: 0, total: 2, editable: false },
    { aporte: 'ICBF', empleador: 3, empleado: 0, total: 3, editable: false }
  ]);

  // Tabla referencial ARL
  const nivelesARL = [
    { nivel: 'I', descripcion: 'Riesgo mínimo (administrativo)', porcentaje: 0.522 },
    { nivel: 'II', descripcion: 'Riesgo bajo (técnico)', porcentaje: 1.044 },
    { nivel: 'III', descripcion: 'Riesgo medio (manufactura)', porcentaje: 2.436 },
    { nivel: 'IV', descripcion: 'Riesgo alto (transporte, construcción)', porcentaje: 4.350 },
    { nivel: 'V', descripcion: 'Riesgo máximo (minería, explosivos)', porcentaje: 6.960 }
  ];

  // Afiliación por tipo de contrato
  const [afiliacionContrato] = useState([
    { tipoContrato: 'Laboral', afiliacion: 'Dependiente' },
    { tipoContrato: 'Prestación de servicios', afiliacion: 'Independiente (sin ARL)' },
    { tipoContrato: 'Extranjero sin pensión', afiliacion: 'Personalizado' }
  ]);

  const calcularCostoTotal = () => {
    return porcentajesEstandar.reduce((total, item) => total + item.empleador, 0);
  };

  const handleSave = () => {
    toast({
      title: "Configuración guardada",
      description: "Los aportes han sido actualizados correctamente.",
    });
  };

  const handleRevert = () => {
    toast({
      title: "Cambios revertidos",
      description: "Se han restaurado los valores anteriores.",
    });
  };

  const handleRestaurarDefecto = () => {
    toast({
      title: "Valores restaurados",
      description: "Se han cargado los valores por defecto del sistema.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">💰 Configuración de Aportes</h2>
        <p className="text-gray-600">Gestión de aportes parafiscales y seguridad social</p>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="pila" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="pila">PILA</TabsTrigger>
            <TabsTrigger value="porcentajes">Porcentajes</TabsTrigger>
            <TabsTrigger value="topes">Topes</TabsTrigger>
            <TabsTrigger value="voluntarios">Voluntarios</TabsTrigger>
            <TabsTrigger value="afiliacion">Afiliación</TabsTrigger>
            <TabsTrigger value="arl">Ref. ARL</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="pila" className="space-y-4">
              <div>
                <Label htmlFor="operador-pila">Operador PILA por defecto</Label>
                <Select value={operadorPila} onValueChange={setOperadorPila}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona operador PILA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soi">SOI</SelectItem>
                    <SelectItem value="miplanilla">MiPlanilla</SelectItem>
                    <SelectItem value="aportes-linea">Aportes en Línea</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  Este será el operador predeterminado para la generación del archivo PILA en la empresa.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="porcentajes" className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Switch 
                  id="modificacion-avanzada" 
                  checked={modificacionAvanzada} 
                  onCheckedChange={setModificacionAvanzada} 
                />
                <Label htmlFor="modificacion-avanzada">Modificación Avanzada</Label>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aporte</TableHead>
                    <TableHead>Empleador (%)</TableHead>
                    <TableHead>Empleado (%)</TableHead>
                    <TableHead>Total (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porcentajesEstandar.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.aporte}</TableCell>
                      <TableCell>
                        {modificacionAvanzada && item.editable ? (
                          <Input type="number" defaultValue={item.empleador} className="w-20" />
                        ) : (
                          `${item.empleador}%`
                        )}
                      </TableCell>
                      <TableCell>
                        {modificacionAvanzada && item.editable ? (
                          <Input type="number" defaultValue={item.empleado} className="w-20" />
                        ) : (
                          `${item.empleado}%`
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{item.total}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {modificacionAvanzada && (
                <Alert>
                  <AlertDescription>
                    ⚠️ Modificar los porcentajes puede generar inconsistencias con la normativa legal vigente.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="topes" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tope-minimo">Tope mínimo de cotización (SMMLV)</Label>
                  <Input 
                    id="tope-minimo" 
                    type="number" 
                    value={topeMinimo} 
                    onChange={(e) => setTopeMinimo(e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="tope-maximo">Tope máximo de cotización (SMMLV)</Label>
                  <Input 
                    id="tope-maximo" 
                    type="number" 
                    value={topeMaximo} 
                    onChange={(e) => setTopeMaximo(e.target.value)}
                    max="25"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Los topes controlan el salario base sobre el que se calculan los aportes obligatorios.
              </p>
            </TabsContent>

            <TabsContent value="voluntarios" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="empleado-pension" 
                    checked={aportesVoluntarios.empleadoPension} 
                    onCheckedChange={(checked) => 
                      setAportesVoluntarios(prev => ({...prev, empleadoPension: checked}))
                    } 
                  />
                  <Label htmlFor="empleado-pension">Aportes voluntarios del empleado a pensión obligatoria</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="empleador-pension" 
                    checked={aportesVoluntarios.empleadorPension} 
                    onCheckedChange={(checked) => 
                      setAportesVoluntarios(prev => ({...prev, empleadorPension: checked}))
                    } 
                  />
                  <Label htmlFor="empleador-pension">Aportes voluntarios del empleador a pensión obligatoria</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="beneficios-tributarios" 
                    checked={aportesVoluntarios.beneficiosTributarios} 
                    onCheckedChange={(checked) => 
                      setAportesVoluntarios(prev => ({...prev, beneficiosTributarios: checked}))
                    } 
                  />
                  <Label htmlFor="beneficios-tributarios">Activar beneficios tributarios por aportes voluntarios</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="afiliacion" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Contrato</TableHead>
                    <TableHead>Afiliación por defecto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {afiliacionContrato.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.tipoContrato}</TableCell>
                      <TableCell>{item.afiliacion}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="arl" className="space-y-4">
              <Alert>
                <AlertDescription>
                  📌 El nivel de riesgo ARL depende de las funciones de cada trabajador, no de la empresa. 
                  Este dato debe configurarse individualmente en la ficha del empleado o contrato.
                </AlertDescription>
              </Alert>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>% ARL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nivelesARL.map((nivel) => (
                    <TableRow key={nivel.nivel}>
                      <TableCell className="font-medium">{nivel.nivel}</TableCell>
                      <TableCell>{nivel.descripcion}</TableCell>
                      <TableCell>{nivel.porcentaje}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-sm text-gray-500">
                El porcentaje de ARL depende del nivel de riesgo asociado al cargo del trabajador.
              </p>
            </TabsContent>
          </div>
        </Tabs>

        {/* Resumen del costo prestacional */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Costo Prestacional Total Estimado</h4>
          <p className="text-blue-800">
            <strong>{calcularCostoTotal().toFixed(2)}%</strong> del salario base por empleado
            (solo aportes del empleador)
          </p>
        </div>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          Guardar Configuración
        </Button>
        <Button onClick={handleRevert} variant="outline">
          Revertir Cambios
        </Button>
        <Button onClick={handleRestaurarDefecto} variant="outline">
          Restaurar Valores por Defecto
        </Button>
      </div>
    </div>
  );
};
