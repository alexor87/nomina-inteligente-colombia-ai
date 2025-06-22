
import { useState } from 'react';
import { PaymentEmployee, PaymentPeriod, PaymentFilters, BankFileGeneration, PaymentConfirmation } from '@/types/payments';
import { useToast } from '@/hooks/use-toast';

export const usePayments = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingFile, setIsGeneratingFile] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { toast } = useToast();

  const markEmployeeAsPaid = async (employeeId: string, confirmation: PaymentConfirmation) => {
    setIsProcessingPayment(true);
    try {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Pago confirmado",
        description: "El pago ha sido marcado como exitoso",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo confirmar el pago",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const markMultipleAsPaid = async (confirmations: PaymentConfirmation[]) => {
    setIsProcessingPayment(true);
    try {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Pagos confirmados",
        description: `${confirmations.length} pagos han sido marcados como exitosos`,
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron confirmar todos los pagos",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const generateBankFile = async (config: BankFileGeneration) => {
    setIsGeneratingFile(true);
    try {
      // Simular generación de archivo
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const fileName = `${config.bankName}_${new Date().toISOString().split('T')[0]}.${config.format}`;
      
      toast({
        title: "Archivo generado",
        description: `Archivo ${fileName} generado exitosamente`,
      });
      
      return {
        fileName,
        url: `/downloads/${fileName}`,
        success: true
      };
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el archivo bancario",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsGeneratingFile(false);
    }
  };

  const retryPayment = async (employeeId: string) => {
    setIsProcessingPayment(true);
    try {
      // Simular reintento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Pago reintentado",
        description: "El pago ha sido marcado para reintento",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo reintentar el pago",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const updateBankAccount = async (employeeId: string, accountData: { bankName: string; accountType: string; accountNumber: string }) => {
    setIsLoading(true);
    try {
      // Validar cuenta bancaria
      if (!validateBankAccount(accountData.accountNumber, accountData.bankName)) {
        throw new Error('Número de cuenta inválido');
      }

      // Simular actualización
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Cuenta actualizada",
        description: "Los datos bancarios han sido actualizados",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar la cuenta",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const validateBankAccount = (accountNumber: string, bankName: string): boolean => {
    // Validaciones básicas por banco
    const validations: Record<string, { minLength: number; maxLength: number; pattern?: RegExp }> = {
      'bancolombia': { minLength: 10, maxLength: 11, pattern: /^\d+$/ },
      'bogota': { minLength: 8, maxLength: 10, pattern: /^\d+$/ },
      'davivienda': { minLength: 9, maxLength: 10, pattern: /^\d+$/ },
      'nequi': { minLength: 10, maxLength: 10, pattern: /^\d+$/ }
    };

    const bankValidation = validations[bankName.toLowerCase()];
    if (!bankValidation) return true; // Si no hay validación específica, aceptar

    const length = accountNumber.length;
    if (length < bankValidation.minLength || length > bankValidation.maxLength) {
      return false;
    }

    if (bankValidation.pattern && !bankValidation.pattern.test(accountNumber)) {
      return false;
    }

    return true;
  };

  const downloadPaymentReport = async (periodId: string) => {
    setIsLoading(true);
    try {
      // Simular descarga
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Reporte descargado",
        description: "El reporte de pagos ha sido descargado",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el reporte",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    isGeneratingFile,
    isProcessingPayment,
    markEmployeeAsPaid,
    markMultipleAsPaid,
    generateBankFile,
    retryPayment,
    updateBankAccount,
    validateBankAccount,
    downloadPaymentReport
  };
};
