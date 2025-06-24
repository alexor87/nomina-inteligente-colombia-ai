import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, FileText, Users, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { PayrollHistoryPeriod } from '@/types/payroll-history';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PayrollHistoryDetailsProps {
  period: PayrollHistoryPeriod;
  onBack: () => void;
}

interface PeriodEmployee {
  id: string;
  name: string;
  position: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  paymentStatus: 'pagado' | 'pendiente';
  payslipUrl?: string;
}

interface GeneratedFile {
  type: 'desprendible' | 'pila' | 'certificado' | 'reporte';
  name: string;
  url: string;
  size?: string;
}

export const PayrollHistoryDetails = ({ period, onBack }: PayrollHistoryDetailsProps) => {
  const [employees, setEmployees] = useState<PeriodEmployee[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPeriodEmployees();
    loadGeneratedFiles();
  }, [period.id]);

  const getCurrentUserCompanyId = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return null;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error getting user profile:', error);
        return null;
      }

      console.log('User company_id:', profile?.company_id);
      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  };

  const loadPeriodEmployees = async () => {
    try {
      setIsLoadingEmployees(true);
      
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        console.error('No company ID found for user');
        setEmployees([]);
        return;
      }

      // Extraer el período sin la versión
      const periodWithoutVersion = period.period.split(' (')[0];
      console.log('Loading employees for period:', periodWithoutVersion, 'company:', companyId);
      
      // Cargar empleados del período desde la tabla payrolls
      const { data: payrollData, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees (
            id,
            nombre,
            apellido,
            cargo
          )
        `)
        .eq('periodo', periodWithoutVersion)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error loading period employees:', error);
        throw error;
      }

      console.log('Payroll data loaded:', payrollData?.length || 0, 'records');

      if (payrollData && payrollData.length > 0) {
        const periodEmployees: PeriodEmployee[] = payrollData.map(payroll => ({
          id: payroll.employee_id,
          name: payroll.employees ? `${payroll.employees.nombre} ${payroll.employees.apellido}` : 'Nombre no disponible',
          position: payroll.employees?.cargo || 'Cargo no especificado',
          grossPay: Number(payroll.total_devengado || 0),
          deductions: Number(payroll.total_deducciones || 0),
          netPay: Number(payroll.neto_pagado || 0),
          paymentStatus: payroll.estado === 'pagada' ? 'pagado' : 'pendiente',
          payslipUrl: undefined // Se cargará desde vouchers si existe
        }));

        console.log('Processed employees:', periodEmployees.length);
        setEmployees(periodEmployees);
      } else {
        console.log('No payroll data found, showing simulated employees');
        // Si no hay datos reales, mostrar empleados simulados basados en el período
        const simulatedEmployees: PeriodEmployee[] = Array.from({ length: period.employeesCount }, (_, index) => ({
          id: `emp-${period.id}-${index + 1}`,
          name: `Empleado ${index + 1}`,
          position: 'Cargo no especificado',
          grossPay: Math.round(period.totalGrossPay / period.employeesCount),
          deductions: Math.round(period.totalDeductions / period.employeesCount),
          netPay: Math.round(period.totalNetPay / period.employeesCount),
          paymentStatus: period.paymentStatus === 'pagado' ? 'pagado' : 'pendiente'
        }));
        
        setEmployees(simulatedEmployees);
      }
    } catch (error) {
      console.error('Error loading period employees:', error);
      toast({
        title: "Error al cargar empleados",
        description: "No se pudieron cargar los empleados del período",
        variant: "destructive"
      });
      setEmployees([]);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const loadGeneratedFiles = async () => {
    try {
      setIsLoadingFiles(true);
      
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        console.error('No company ID found for user');
        setGeneratedFiles([]);
        return;
      }

      // Extraer el período sin la versión
      const periodWithoutVersion = period.period.split(' (')[0];
      console.log('Loading files for period:', periodWithoutVersion, 'company:', companyId);
      
      // Cargar archivos generados (vouchers, reportes, etc.)
      const { data: vouchersData, error: vouchersError } = await supabase
        .from('payroll_vouchers')
        .select('*')
        .eq('periodo', periodWithoutVersion)
        .eq('company_id', companyId);

      if (vouchersError) {
        console.error('Error loading vouchers:', vouchersError);
      }

      console.log('Vouchers data loaded:', vouchersData?.length || 0, 'records');

      const files: GeneratedFile[] = [];

      // Agregar desprendibles de pago
      if (vouchersData && vouchersData.length > 0) {
        vouchersData.forEach(voucher => {
          if (voucher.pdf_url) {
            files.push({
              type: 'desprendible',
              name: `Desprendible - ${voucher.employee_id}`,
              url: voucher.pdf_url,
              size: 'PDF'
            });
          }
        });
      }

      // Agregar archivo PILA simulado
      if (period.pilaFileUrl) {
        files.push({
          type: 'pila',
          name: `PILA_${period.period.replace(/\s+/g, '_')}.txt`,
          url: period.pilaFileUrl,
          size: '15 KB'
        });
      } else {
        // Simular archivo PILA
        files.push({
          type: 'pila',
          name: `PILA_${period.period.replace(/\s+/g, '_')}.txt`,
          url: '#',
          size: '15 KB'
        });
      }

      // Agregar certificados simulados
      files.push({
        type: 'certificado',
        name: 'Certificados_Ingresos_Retenciones.pdf',
        url: '#',
        size: '2.1 MB'
      });

      // Agregar reportes simulados
      files.push({
        type: 'reporte',
        name: 'Resumen_Nomina.xlsx',
        url: '#',
        size: '890 KB'
      });

      files.push({
        type: 'reporte',
        name: 'Reporte_Costos_Laborales.pdf',
        url: '#',
        size: '1.2 MB'
      });

      console.log('Total files generated:', files.length);
      setGeneratedFiles(files);
    } catch (error) {
      console.error('Error loading generated files:', error);
      toast({
        title: "Error al cargar archivos",
        description: "No se pudieron cargar los archivos generados",
        variant: "destructive"
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: PayrollHistoryPeriod['status']) => {
    const statusConfig = {
      cerrado: { color: 'bg-green-100 text-green-800', text: 'Cerrado', icon: '✓' },
      con_errores: { color: 'bg-red-100 text-red-800', text: 'Con errores', icon: '✗' },
      revision: { color: 'bg-yellow-100 text-yellow-800', text: 'En revisión', icon: '⚠' },
      editado: { color: 'bg-blue-100 text-blue-800', text: 'Editado', icon: '✏' }
    };
    const config = statusConfig[status];
    return (
      <Badge className={`${config.color} text-xs`}>
        <span className="mr-1">{config.icon}</span>
        {config.text}
      </Badge>
    );
  };

  const handleDownloadFile = (file: GeneratedFile) => {
    if (file.url === '#') {
      toast({
        title: "Archivo no disponible",
        description: "Este archivo aún no ha sido generado",
        variant: "destructive"
      });
      return;
    }

    // Simular descarga
    toast({
      title: "Descarga iniciada",
      description: `Descargando ${file.name}`,
    });
  };

  const handleDownloadAllFiles = () => {
    toast({
      title: "Preparando descarga",
      description: "Se está generando el archivo ZIP con todos los documentos",
    });
  };

  const getFileTypeIcon = (type: GeneratedFile['type']) => {
    switch (type) {
      case 'desprendible':
        return '📄';
      case 'pila':
        return '📋';
      case 'certificado':
        return '🏆';
      case 'reporte':
        return '📊';
      default:
        return '📁';
    }
  };

  const getFileTypeLabel = (type: GeneratedFile['type']) => {
    switch (type) {
      case 'desprendible':
        return 'Desprendibles';
      case 'pila':
        return 'Archivo PILA';
      case 'certificado':
        return 'Certificados';
      case 'reporte':
        return 'Reportes';
      default:
        return 'Archivos';
    }
  };

  const groupedFiles = generatedFiles.reduce((acc, file) => {
    if (!acc[file.type]) {
      acc[file.type] = [];
    }
    acc[file.type].push(file);
    return acc;
  }, {} as Record<GeneratedFile['type'], GeneratedFile[]>);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack} className="p-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Detalle del Período</h1>
                <p className="text-gray-600 flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{period.period}</span>
                  {period.version > 1 && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">v{period.version}</Badge>
                  )}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleDownloadAllFiles}>
                <Download className="h-4 w-4 mr-2" />
                Descargar ZIP
              </Button>
            </div>
          </div>
        </div>

        {/* Resumen del período */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Resumen del Período</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Periodicidad</div>
                <div className="text-lg font-semibold capitalize">{period.type}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Empleados liquidados</div>
                <div className="text-lg font-semibold flex items-center">
                  <Users className="h-4 w-4 mr-1 text-blue-600" />
                  {period.employeesCount}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Estado del período</div>
                <div className="mt-1">{getStatusBadge(period.status)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Estado de pagos</div>
                <div className="mt-1">
                  <Badge className={
                    period.paymentStatus === 'pagado' ? 'bg-green-100 text-green-800' :
                    period.paymentStatus === 'parcial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {period.paymentStatus === 'pagado' ? '✓ Pagado' :
                     period.paymentStatus === 'parcial' ? '⚠ Parcial' : '⏳ Pendiente'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Totales generales */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span>Totales Generales</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(period.totalGrossPay)}</div>
                <div className="text-sm text-gray-600">Devengado Total</div>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{formatCurrency(period.totalDeductions)}</div>
                <div className="text-sm text-gray-600">Deducciones Totales</div>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(period.totalNetPay)}</div>
                <div className="text-sm text-gray-600">Neto Pagado</div>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(period.employerContributions)}</div>
                <div className="text-sm text-gray-600">Aportes Empleador</div>
              </div>
              <div className="text-center p-4 border-2 border-purple-300 rounded-lg bg-purple-50">
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(period.totalCost)}</div>
                <div className="text-sm text-gray-600">Costo Total Nómina</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de empleados mejorada */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Empleados del Período</span>
                {isLoadingEmployees && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <Button variant="outline" size="sm" disabled={employees.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Descargar Desprendibles ({employees.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingEmployees ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Cargando empleados...</span>
              </div>
            ) : employees.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Devengado</TableHead>
                    <TableHead>Deducciones</TableHead>
                    <TableHead>Neto Pagado</TableHead>
                    <TableHead>Estado Pago</TableHead>
                    <TableHead className="text-center">Desprendible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(employee.grossPay)}
                      </TableCell>
                      <TableCell className="font-semibold text-red-600">
                        {formatCurrency(employee.deductions)}
                      </TableCell>
                      <TableCell className="font-semibold text-blue-600">
                        {formatCurrency(employee.netPay)}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          employee.paymentStatus === 'pagado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }>
                          {employee.paymentStatus === 'pagado' ? '✓ Pagado' : '⏳ Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay empleados</h3>
                <p className="text-gray-600">No se encontraron empleados para este período.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Archivos generados mejorados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Archivos Generados</span>
              {isLoadingFiles && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Cargando archivos...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(groupedFiles).map(([type, files]) => (
                  <div key={type} className="p-4 border border-gray-200 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                      <span className="mr-2">{getFileTypeIcon(type as GeneratedFile['type'])}</span>
                      {getFileTypeLabel(type as GeneratedFile['type'])}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      {files.length} archivo{files.length !== 1 ? 's' : ''}
                    </div>
                    <div className="space-y-1 mb-3">
                      {files.map((file, index) => (
                        <div key={index} className="text-xs text-gray-500 truncate" title={file.name}>
                          {file.name} {file.size && `(${file.size})`}
                        </div>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => files.length === 1 ? handleDownloadFile(files[0]) : handleDownloadAllFiles()}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Descargar
                    </Button>
                  </div>
                ))}

                {generatedFiles.length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay archivos generados</h3>
                    <p className="text-gray-600">Los archivos aparecerán aquí una vez que se generen para este período.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
