
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  User, Calendar, DollarSign, FileText, Shield, Clock, 
  Mail, Download, Eye, Send, CheckCircle, XCircle,
  TrendingUp, Building, Phone, MapPin
} from 'lucide-react';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface EmployeeProfileProps {
  employee: EmployeeWithStatus;
  onClose: () => void;
}

interface PayrollRecord {
  id: string;
  periodo: string;
  totalDevengado: number;
  totalDeducciones: number;
  netoPagado: number;
  estado: string;
  fechaCreacion: string;
}

interface VoucherRecord {
  id: string;
  tipo: string;
  periodo: string;
  pdfUrl?: string;
  xmlUrl?: string;
  enviado: boolean;
  fechaEnvio?: string;
  estado: string;
}

interface ContributionRecord {
  mes: string;
  eps: number;
  arl: number;
  pension: number;
  cajaCompensacion: number;
  ibc: number;
}

interface NoveltyRecord {
  id: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  valor: number;
  dias?: number;
  aplicadoEn: string;
  estado: string;
}

interface ContractChange {
  id: string;
  fecha: string;
  evento: string;
  descripcion: string;
  valorAnterior?: string;
  valorNuevo?: string;
}

interface Communication {
  id: string;
  fecha: string;
  medio: string;
  documento: string;
  destinatario: string;
  resultado: string;
  error?: string;
}

export const EmployeeProfile = ({ employee, onClose }: EmployeeProfileProps) => {
  const [activeTab, setActiveTab] = useState("nomina");
  const [isLoading, setIsLoading] = useState(false);
  const [payrollHistory, setPayrollHistory] = useState<PayrollRecord[]>([]);
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [contributions, setContributions] = useState<ContributionRecord[]>([]);
  const [novelties, setNovelties] = useState<NoveltyRecord[]>([]);
  const [contractChanges, setContractChanges] = useState<ContractChange[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadEmployeeData();
  }, [employee.id]);

  const loadEmployeeData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadPayrollHistory(),
        loadVouchers(),
        loadContributions(),
        loadNovelties(),
        loadContractChanges(),
        loadCommunications()
      ]);
    } catch (error) {
      console.error('Error loading employee data:', error);
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron cargar todos los datos del empleado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPayrollHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('payrolls')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      const records: PayrollRecord[] = (data || []).map(payroll => ({
        id: payroll.id,
        periodo: payroll.periodo,
        totalDevengado: Number(payroll.total_devengado || 0),
        totalDeducciones: Number(payroll.total_deducciones || 0),
        netoPagado: Number(payroll.neto_pagado || 0),
        estado: payroll.estado || 'borrador',
        fechaCreacion: payroll.created_at
      }));

      setPayrollHistory(records);
    } catch (error) {
      console.error('Error loading payroll history:', error);
    }
  };

  const loadVouchers = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_vouchers')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const records: VoucherRecord[] = (data || []).map(voucher => ({
        id: voucher.id,
        tipo: 'Desprendible',
        periodo: voucher.periodo,
        pdfUrl: voucher.pdf_url,
        xmlUrl: voucher.xml_url,
        enviado: voucher.sent_to_employee || false,
        fechaEnvio: voucher.sent_date,
        estado: voucher.voucher_status || 'pendiente'
      }));

      setVouchers(records);
    } catch (error) {
      console.error('Error loading vouchers:', error);
    }
  };

  const loadContributions = async () => {
    // Simular datos de aportes - en producción vendría de una tabla específica
    const mockContributions: ContributionRecord[] = [
      {
        mes: 'Junio 2025',
        eps: 160000,
        arl: 8000,
        pension: 256000,
        cajaCompensacion: 20000,
        ibc: 1000000
      },
      {
        mes: 'Mayo 2025',
        eps: 160000,
        arl: 8000,
        pension: 256000,
        cajaCompensacion: 20000,
        ibc: 1000000
      }
    ];
    setContributions(mockContributions);
  };

  const loadNovelties = async () => {
    // Simular novedades - en producción vendría de una tabla de novedades
    const mockNovelties: NoveltyRecord[] = [
      {
        id: '1',
        fecha: '2025-06-10',
        tipo: 'Vacaciones',
        descripcion: 'Vacaciones programadas',
        valor: 0,
        dias: 5,
        aplicadoEn: '1-15 junio',
        estado: 'aplicado'
      }
    ];
    setNovelties(mockNovelties);
  };

  const loadContractChanges = async () => {
    // Simular cambios contractuales
    const mockChanges: ContractChange[] = [
      {
        id: '1',
        fecha: '2025-01-01',
        evento: 'Aumento salarial',
        descripcion: 'Incremento salarial anual',
        valorAnterior: '$1.200.000',
        valorNuevo: '$1.500.000'
      }
    ];
    setContractChanges(mockChanges);
  };

  const loadCommunications = async () => {
    try {
      const { data, error } = await supabase
        .from('voucher_audit_log')
        .select('*')
        .eq('user_id', 'system') // Filtrar por comunicaciones del sistema
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const records: Communication[] = (data || []).map(log => ({
        id: log.id,
        fecha: log.created_at,
        medio: log.method || 'Email',
        documento: 'Comprobante de pago',
        destinatario: log.recipient_email || employee.email,
        resultado: log.success ? 'Enviado' : 'Error',
        error: log.error_message
      }));

      setCommunications(records);
    } catch (error) {
      console.error('Error loading communications:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      'activo': { color: 'bg-green-100 text-green-800', text: 'Activo' },
      'inactivo': { color: 'bg-red-100 text-red-800', text: 'Inactivo' },
      'vacaciones': { color: 'bg-blue-100 text-blue-800', text: 'Vacaciones' },
      'incapacidad': { color: 'bg-yellow-100 text-yellow-800', text: 'Incapacidad' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const handleDownloadVoucher = async (voucher: VoucherRecord) => {
    if (!voucher.pdfUrl) {
      toast({
        title: "Archivo no disponible",
        description: "El comprobante aún no ha sido generado",
        variant: "destructive"
      });
      return;
    }
    
    // Simular descarga
    toast({
      title: "Descarga iniciada",
      description: `Descargando comprobante de ${voucher.periodo}`,
    });
  };

  const handleResendVoucher = async (voucher: VoucherRecord) => {
    toast({
      title: "Reenvío iniciado",
      description: `Reenviando comprobante de ${voucher.periodo} a ${employee.email}`,
    });
  };

  const getLastPayroll = () => {
    return payrollHistory.length > 0 ? payrollHistory[0] : null;
  };

  const lastPayroll = getLastPayroll();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header del perfil */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={employee.avatar} alt={`${employee.nombre} ${employee.apellido}`} />
                  <AvatarFallback className="bg-blue-600 text-white text-2xl">
                    {employee.nombre[0]}{employee.apellido[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-3">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {employee.nombre} {employee.apellido}
                    </h1>
                    <p className="text-lg text-gray-600">{employee.cargo}</p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {getStatusBadge(employee.estado)}
                    <Badge variant="outline" className="text-sm">
                      {employee.cedula}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
            
            {/* KPIs rápidos */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                <div className="text-sm text-gray-600">Ingreso</div>
                <div className="font-semibold">{formatDate(employee.fechaIngreso)}</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Building className="h-5 w-5 mx-auto mb-2 text-green-600" />
                <div className="text-sm text-gray-600">Contrato</div>
                <div className="font-semibold capitalize">{employee.tipoContrato}</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <DollarSign className="h-5 w-5 mx-auto mb-2 text-purple-600" />
                <div className="text-sm text-gray-600">Salario Base</div>
                <div className="font-semibold">{formatCurrency(employee.salarioBase)}</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 mx-auto mb-2 text-orange-600" />
                <div className="text-sm text-gray-600">Último Período</div>
                <div className="font-semibold text-sm">{lastPayroll?.periodo || 'N/A'}</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <TrendingUp className="h-5 w-5 mx-auto mb-2 text-green-600" />
                <div className="text-sm text-gray-600">Último Neto</div>
                <div className="font-semibold">{lastPayroll ? formatCurrency(lastPayroll.netoPagado) : 'N/A'}</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <FileText className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                <div className="text-sm text-gray-600">Comprobantes</div>
                <div className="font-semibold">{vouchers.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs principales */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white border shadow-sm">
            <TabsTrigger value="nomina" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Nómina</span>
            </TabsTrigger>
            <TabsTrigger value="comprobantes" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Comprobantes</span>
            </TabsTrigger>
            <TabsTrigger value="aportes" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Aportes</span>
            </TabsTrigger>
            <TabsTrigger value="novedades" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Novedades</span>
            </TabsTrigger>
            <TabsTrigger value="cambios" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Cambios</span>
            </TabsTrigger>
            <TabsTrigger value="comunicaciones" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Comunicaciones</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content: Historial de nómina */}
          <TabsContent value="nomina">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span>Historial de Nómina</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payrollHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Devengado</TableHead>
                        <TableHead>Deducciones</TableHead>
                        <TableHead>Neto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-center">Ver</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollHistory.map((payroll) => (
                        <TableRow key={payroll.id}>
                          <TableCell className="font-medium">{payroll.periodo}</TableCell>
                          <TableCell className="text-green-600 font-semibold">
                            {formatCurrency(payroll.totalDevengado)}
                          </TableCell>
                          <TableCell className="text-red-600 font-semibold">
                            {formatCurrency(payroll.totalDeducciones)}
                          </TableCell>
                          <TableCell className="text-blue-600 font-semibold">
                            {formatCurrency(payroll.netoPagado)}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              payroll.estado === 'pagada' ? 'bg-green-100 text-green-800' :
                              payroll.estado === 'procesada' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {payroll.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Drawer>
                              <DrawerTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DrawerTrigger>
                              <DrawerContent className="max-w-4xl mx-auto">
                                <DrawerHeader>
                                  <DrawerTitle>Detalle de Nómina - {payroll.periodo}</DrawerTitle>
                                </DrawerHeader>
                                <div className="p-6 space-y-4">
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                      <div className="text-2xl font-bold text-green-600">
                                        {formatCurrency(payroll.totalDevengado)}
                                      </div>
                                      <div className="text-sm text-gray-600">Total Devengado</div>
                                    </div>
                                    <div className="text-center p-4 bg-red-50 rounded-lg">
                                      <div className="text-2xl font-bold text-red-600">
                                        {formatCurrency(payroll.totalDeducciones)}
                                      </div>
                                      <div className="text-sm text-gray-600">Deducciones</div>
                                    </div>
                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                      <div className="text-2xl font-bold text-blue-600">
                                        {formatCurrency(payroll.netoPagado)}
                                      </div>
                                      <div className="text-sm text-gray-600">Neto Pagado</div>
                                    </div>
                                  </div>
                                </div>
                              </DrawerContent>
                            </Drawer>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay historial de nómina disponible
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Content: Comprobantes */}
          <TabsContent value="comprobantes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>Comprobantes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vouchers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>PDF</TableHead>
                        <TableHead>XML</TableHead>
                        <TableHead>Enviado</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vouchers.map((voucher) => (
                        <TableRow key={voucher.id}>
                          <TableCell className="font-medium">{voucher.tipo}</TableCell>
                          <TableCell>{voucher.periodo}</TableCell>
                          <TableCell>
                            {voucher.pdfUrl ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadVoucher(voucher)}
                              >
                                <Download className="h-4 w-4 text-blue-600" />
                              </Button>
                            ) : (
                              <span className="text-gray-400">–</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {voucher.xmlUrl ? (
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4 text-green-600" />
                              </Button>
                            ) : (
                              <span className="text-gray-400">–</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {voucher.enviado ? (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-600">Sí</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="text-sm text-red-600">No</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendVoucher(voucher)}
                              >
                                <Send className="h-4 w-4 text-blue-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay comprobantes disponibles
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Content: Aportes */}
          <TabsContent value="aportes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <span>Aportes a Seguridad Social</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>EPS</TableHead>
                      <TableHead>ARL</TableHead>
                      <TableHead>Pensión</TableHead>
                      <TableHead>Caja</TableHead>
                      <TableHead>IBC</TableHead>
                      <TableHead className="text-center">Ver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributions.map((contribution, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{contribution.mes}</TableCell>
                        <TableCell>{formatCurrency(contribution.eps)}</TableCell>
                        <TableCell>{formatCurrency(contribution.arl)}</TableCell>
                        <TableCell>{formatCurrency(contribution.pension)}</TableCell>
                        <TableCell>{formatCurrency(contribution.cajaCompensacion)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(contribution.ibc)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Content: Novedades */}
          <TabsContent value="novedades">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span>Novedades Laborales</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {novelties.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Días / Valor</TableHead>
                        <TableHead>Aplicada en</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {novelties.map((novelty) => (
                        <TableRow key={novelty.id}>
                          <TableCell>{formatDate(novelty.fecha)}</TableCell>
                          <TableCell className="font-medium">{novelty.tipo}</TableCell>
                          <TableCell>
                            {novelty.dias ? `${novelty.dias} días` : formatCurrency(novelty.valor)}
                          </TableCell>
                          <TableCell>{novelty.aplicadoEn}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">
                              {novelty.estado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay novedades registradas
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Content: Cambios de contrato */}
          <TabsContent value="cambios">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <span>Cambios Contractuales</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contractChanges.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Evento</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Descripción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contractChanges.map((change) => (
                        <TableRow key={change.id}>
                          <TableCell className="font-medium">{change.evento}</TableCell>
                          <TableCell>{formatDate(change.fecha)}</TableCell>
                          <TableCell>
                            <div>
                              {change.descripcion}
                              {change.valorAnterior && change.valorNuevo && (
                                <div className="text-sm text-gray-600 mt-1">
                                  {change.valorAnterior} → {change.valorNuevo}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay cambios contractuales registrados
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Content: Comunicaciones */}
          <TabsContent value="comunicaciones">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-teal-600" />
                  <span>Comunicaciones</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {communications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Medio</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {communications.map((comm) => (
                        <TableRow key={comm.id}>
                          <TableCell>{formatDate(comm.fecha)}</TableCell>
                          <TableCell>{comm.medio}</TableCell>
                          <TableCell>{comm.documento}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {comm.resultado === 'Enviado' ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className={
                                comm.resultado === 'Enviado' ? 'text-green-600' : 'text-red-600'
                              }>
                                {comm.resultado}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay comunicaciones registradas
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
