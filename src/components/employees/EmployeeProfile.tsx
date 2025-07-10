import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, Calendar, DollarSign, FileText, Shield, Clock, 
  Mail, Download, Eye, Send, CheckCircle, XCircle,
  TrendingUp, Building, Phone, MapPin, X
} from 'lucide-react';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { TimeOffSection } from './form/TimeOffSection';

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
  const isMobile = useIsMobile();

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
        .eq('user_id', 'system')
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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header fijo */}
      <div className="flex-shrink-0 bg-white border-b p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <Avatar className="h-12 w-12 lg:h-20 lg:w-20 flex-shrink-0">
            <AvatarImage src={employee.avatar} alt={`${employee.nombre} ${employee.apellido}`} />
            <AvatarFallback className="bg-blue-600 text-white text-sm lg:text-2xl">
              {employee.nombre[0]}{employee.apellido[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2 lg:space-y-3 min-w-0 flex-1">
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900 truncate">
                {employee.nombre} {employee.apellido}
              </h1>
              <p className="text-sm lg:text-lg text-gray-600 truncate">{employee.cargo}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge(employee.estado)}
              <Badge variant="outline" className="text-xs lg:text-sm">
                {employee.cedula}
              </Badge>
            </div>
          </div>
          
          <Button variant="outline" onClick={onClose} size={isMobile ? "sm" : "default"}>
            <X className="h-4 w-4 lg:mr-2" />
            {!isMobile && "Cerrar"}
          </Button>
        </div>
        
        {/* KPIs responsivos */}
        <div className="mt-4 lg:mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-4">
          <div className="text-center p-2 lg:p-4 bg-gray-50 rounded-lg">
            <Calendar className="h-4 w-4 lg:h-5 lg:w-5 mx-auto mb-1 lg:mb-2 text-blue-600" />
            <div className="text-xs lg:text-sm text-gray-600">Ingreso</div>
            <div className="font-semibold text-xs lg:text-base">{formatDate(employee.fechaIngreso)}</div>
          </div>
          
          <div className="text-center p-2 lg:p-4 bg-gray-50 rounded-lg">
            <Building className="h-4 w-4 lg:h-5 lg:w-5 mx-auto mb-1 lg:mb-2 text-green-600" />
            <div className="text-xs lg:text-sm text-gray-600">Contrato</div>
            <div className="font-semibold text-xs lg:text-base capitalize">{employee.tipoContrato}</div>
          </div>
          
          <div className="text-center p-2 lg:p-4 bg-gray-50 rounded-lg">
            <DollarSign className="h-4 w-4 lg:h-5 lg:w-5 mx-auto mb-1 lg:mb-2 text-purple-600" />
            <div className="text-xs lg:text-sm text-gray-600">Salario Base</div>
            <div className="font-semibold text-xs lg:text-base">{formatCurrency(employee.salarioBase)}</div>
          </div>
          
          <div className="text-center p-2 lg:p-4 bg-gray-50 rounded-lg">
            <Calendar className="h-4 w-4 lg:h-5 lg:w-5 mx-auto mb-1 lg:mb-2 text-orange-600" />
            <div className="text-xs lg:text-sm text-gray-600">Último Período</div>
            <div className="font-semibold text-xs lg:text-base">{lastPayroll?.periodo || 'N/A'}</div>
          </div>
          
          <div className="text-center p-2 lg:p-4 bg-gray-50 rounded-lg">
            <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 mx-auto mb-1 lg:mb-2 text-green-600" />
            <div className="text-xs lg:text-sm text-gray-600">Último Neto</div>
            <div className="font-semibold text-xs lg:text-base">{lastPayroll ? formatCurrency(lastPayroll.netoPagado) : 'N/A'}</div>
          </div>
          
          <div className="text-center p-2 lg:p-4 bg-gray-50 rounded-lg">
            <FileText className="h-4 w-4 lg:h-5 lg:w-5 mx-auto mb-1 lg:mb-2 text-blue-600" />
            <div className="text-xs lg:text-sm text-gray-600">Comprobantes</div>
            <div className="font-semibold text-xs lg:text-base">{vouchers.length}</div>
          </div>
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
            {/* ✅ KISS: Sección de Tiempo Libre completamente autónoma */}
            <TimeOffSection 
              employeeId={employee.id} 
            />
            
            {/* Tabs principales */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="sticky top-0 bg-gray-50 pb-4 z-10">
                <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3' : 'grid-cols-6'} bg-white border shadow-sm`}>
                  <TabsTrigger value="nomina" className="flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
                    <DollarSign className="h-3 w-3 lg:h-4 lg:w-4" />
                    <span className={isMobile ? 'hidden' : 'block'}>Nómina</span>
                  </TabsTrigger>
                  <TabsTrigger value="comprobantes" className="flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
                    <FileText className="h-3 w-3 lg:h-4 lg:w-4" />
                    <span className={isMobile ? 'hidden' : 'block'}>Comprobantes</span>
                  </TabsTrigger>
                  <TabsTrigger value="aportes" className="flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
                    <Shield className="h-3 w-3 lg:h-4 lg:w-4" />
                    <span className={isMobile ? 'hidden' : 'block'}>Aportes</span>
                  </TabsTrigger>
                  {!isMobile && (
                    <>
                      <TabsTrigger value="novedades" className="flex items-center space-x-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>Novedades</span>
                      </TabsTrigger>
                      <TabsTrigger value="cambios" className="flex items-center space-x-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span>Cambios</span>
                      </TabsTrigger>
                      <TabsTrigger value="comunicaciones" className="flex items-center space-x-2 text-sm">
                        <Mail className="h-4 w-4" />
                        <span>Comunicaciones</span>
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>
              </div>

              {/* Tab Content: Historial de nómina */}
              <TabsContent value="nomina" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg lg:text-xl">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span>Historial de Nómina</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {payrollHistory.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs lg:text-sm">Período</TableHead>
                              <TableHead className="text-xs lg:text-sm">Devengado</TableHead>
                              <TableHead className="text-xs lg:text-sm">Deducciones</TableHead>
                              <TableHead className="text-xs lg:text-sm">Neto</TableHead>
                              <TableHead className="text-xs lg:text-sm">Estado</TableHead>
                              <TableHead className="text-center text-xs lg:text-sm">Ver</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payrollHistory.map((payroll) => (
                              <TableRow key={payroll.id}>
                                <TableCell className="font-medium text-xs lg:text-sm">{payroll.periodo}</TableCell>
                                <TableCell className="text-green-600 font-semibold text-xs lg:text-sm">
                                  {formatCurrency(payroll.totalDevengado)}
                                </TableCell>
                                <TableCell className="text-red-600 font-semibold text-xs lg:text-sm">
                                  {formatCurrency(payroll.totalDeducciones)}
                                </TableCell>
                                <TableCell className="text-blue-600 font-semibold text-xs lg:text-sm">
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
                                    <DrawerContent className="max-w-4xl mx-auto max-h-[90vh]">
                                      <DrawerHeader>
                                        <DrawerTitle>Detalle de Nómina - {payroll.periodo}</DrawerTitle>
                                      </DrawerHeader>
                                      <ScrollArea className="h-[60vh] p-6">
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                              <div className="text-xl lg:text-2xl font-bold text-green-600">
                                                {formatCurrency(payroll.totalDevengado)}
                                              </div>
                                              <div className="text-sm text-gray-600">Total Devengado</div>
                                            </div>
                                            <div className="text-center p-4 bg-red-50 rounded-lg">
                                              <div className="text-xl lg:text-2xl font-bold text-red-600">
                                                {formatCurrency(payroll.totalDeducciones)}
                                              </div>
                                              <div className="text-sm text-gray-600">Deducciones</div>
                                            </div>
                                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                              <div className="text-xl lg:text-2xl font-bold text-blue-600">
                                                {formatCurrency(payroll.netoPagado)}
                                              </div>
                                              <div className="text-sm text-gray-600">Neto Pagado</div>
                                            </div>
                                          </div>
                                        </div>
                                      </ScrollArea>
                                    </DrawerContent>
                                  </Drawer>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No hay historial de nómina disponible
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Content: Comprobantes */}
              <TabsContent value="comprobantes" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg lg:text-xl">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span>Comprobantes</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {vouchers.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs lg:text-sm">Tipo</TableHead>
                              <TableHead className="text-xs lg:text-sm">Período</TableHead>
                              <TableHead className="text-xs lg:text-sm">PDF</TableHead>
                              <TableHead className="text-xs lg:text-sm">XML</TableHead>
                              <TableHead className="text-xs lg:text-sm">Enviado</TableHead>
                              <TableHead className="text-center text-xs lg:text-sm">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vouchers.map((voucher) => (
                              <TableRow key={voucher.id}>
                                <TableCell className="font-medium text-xs lg:text-sm">{voucher.tipo}</TableCell>
                                <TableCell className="text-xs lg:text-sm">{voucher.periodo}</TableCell>
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
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No hay comprobantes disponibles
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Content: Aportes */}
              <TabsContent value="aportes" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg lg:text-xl">
                      <Shield className="h-5 w-5 text-purple-600" />
                      <span>Aportes a Seguridad Social</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs lg:text-sm">Mes</TableHead>
                            <TableHead className="text-xs lg:text-sm">EPS</TableHead>
                            <TableHead className="text-xs lg:text-sm">ARL</TableHead>
                            <TableHead className="text-xs lg:text-sm">Pensión</TableHead>
                            <TableHead className="text-xs lg:text-sm">Caja</TableHead>
                            <TableHead className="text-xs lg:text-sm">IBC</TableHead>
                            <TableHead className="text-center text-xs lg:text-sm">Ver</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contributions.map((contribution, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium text-xs lg:text-sm">{contribution.mes}</TableCell>
                              <TableCell className="text-xs lg:text-sm">{formatCurrency(contribution.eps)}</TableCell>
                              <TableCell className="text-xs lg:text-sm">{formatCurrency(contribution.arl)}</TableCell>
                              <TableCell className="text-xs lg:text-sm">{formatCurrency(contribution.pension)}</TableCell>
                              <TableCell className="text-xs lg:text-sm">{formatCurrency(contribution.cajaCompensacion)}</TableCell>
                              <TableCell className="font-semibold text-xs lg:text-sm">{formatCurrency(contribution.ibc)}</TableCell>
                              <TableCell className="text-center">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tabs adicionales solo en desktop */}
              {!isMobile && (
                <>
                  {/* Tab Content: Novedades */}
                  <TabsContent value="novedades" className="mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Clock className="h-5 w-5 text-orange-600" />
                          <span>Novedades Laborales</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
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
                  <TabsContent value="cambios" className="mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-indigo-600" />
                          <span>Cambios Contractuales</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
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
                  <TabsContent value="comunicaciones" className="mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Mail className="h-5 w-5 text-teal-600" />
                          <span>Comunicaciones</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
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
                </>
              )}
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
