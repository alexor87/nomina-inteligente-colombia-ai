import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PUCMappingEditor } from './PUCMappingEditor';
import { AccountingMappingService } from '@/services/AccountingMappingService';

// Mock the service
vi.mock('@/services/AccountingMappingService', () => ({
  AccountingMappingService: {
    getMappings: vi.fn(),
    initializeIfNeeded: vi.fn(),
    updateMappingsBatch: vi.fn(),
    createMapping: vi.fn(),
    deleteMapping: vi.fn(),
    restoreDefaults: vi.fn(),
    validatePucAccount: vi.fn((account: string) => /^\d{4,10}$/.test(account)),
    isPucAccountDuplicate: vi.fn(),
  },
  conceptLabels: {
    'salario_basico': 'Salario Básico',
    'auxilio_transporte': 'Auxilio de Transporte',
  },
  conceptTooltips: {
    'salario_basico': 'Remuneración básica mensual del empleado',
    'auxilio_transporte': 'Subsidio legal de transporte',
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockMappings = [
  {
    id: '1',
    company_id: 'company-1',
    concept: 'salario_basico',
    puc_account: '510506',
    puc_description: 'Sueldos',
    entry_type: 'debito',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    is_custom: false,
  },
  {
    id: '2',
    company_id: 'company-1',
    concept: 'custom_bonus',
    puc_account: '510595',
    puc_description: 'Bono Personalizado',
    entry_type: 'debito',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    is_custom: true,
  },
  {
    id: '3',
    company_id: 'company-1',
    concept: 'salud_empleado',
    puc_account: '237005',
    puc_description: 'Aportes a EPS',
    entry_type: 'credito',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    is_custom: false,
  },
];

describe('PUCMappingEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AccountingMappingService.getMappings).mockResolvedValue(mockMappings);
    vi.mocked(AccountingMappingService.initializeIfNeeded).mockResolvedValue(false);
    vi.mocked(AccountingMappingService.isPucAccountDuplicate).mockResolvedValue(false);
  });

  it('should render loading state initially', () => {
    render(<PUCMappingEditor />);
    expect(screen.getByText(/Cargando configuración/i)).toBeInTheDocument();
  });

  it('should render mappings after loading', async () => {
    render(<PUCMappingEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('📊 Configuración de Cuentas PUC')).toBeInTheDocument();
    });
    
    expect(screen.getByDisplayValue('510506')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sueldos')).toBeInTheDocument();
  });

  it('should show "Personalizado" badge for custom mappings', async () => {
    render(<PUCMappingEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Personalizado')).toBeInTheDocument();
    });
  });

  it('should open dialog when clicking "Agregar Cuenta"', async () => {
    const user = userEvent.setup();
    render(<PUCMappingEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Agregar Cuenta')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Agregar Cuenta'));
    
    expect(screen.getByText('Agregar Cuenta Personalizada')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre del Concepto')).toBeInTheDocument();
    expect(screen.getByLabelText('Cuenta PUC')).toBeInTheDocument();
    expect(screen.getByLabelText('Descripción')).toBeInTheDocument();
  });

  it('should validate PUC account format in new mapping form', async () => {
    const user = userEvent.setup();
    render(<PUCMappingEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Agregar Cuenta')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Agregar Cuenta'));
    
    const pucInput = screen.getByLabelText('Cuenta PUC');
    await user.type(pucInput, 'abc');
    
    await waitFor(() => {
      expect(screen.getByText('Solo números, 4-10 dígitos')).toBeInTheDocument();
    });
  });

  it('should validate concept name minimum length', async () => {
    const user = userEvent.setup();
    render(<PUCMappingEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Agregar Cuenta')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Agregar Cuenta'));
    
    const conceptInput = screen.getByLabelText('Nombre del Concepto');
    await user.type(conceptInput, 'ab');
    
    await waitFor(() => {
      expect(screen.getByText('Mínimo 3 caracteres')).toBeInTheDocument();
    });
  });

  it('should show delete button only for custom mappings', async () => {
    render(<PUCMappingEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('📊 Configuración de Cuentas PUC')).toBeInTheDocument();
    });

    // There should be exactly 1 delete button (for the custom mapping)
    const deleteButtons = screen.getAllByRole('button').filter(
      btn => btn.querySelector('svg.lucide-trash-2')
    );
    expect(deleteButtons.length).toBe(1);
  });

  it('should enable save button when mappings are edited', async () => {
    const user = userEvent.setup();
    render(<PUCMappingEditor />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('510506')).toBeInTheDocument();
    });

    const pucInput = screen.getByDisplayValue('510506');
    await user.clear(pucInput);
    await user.type(pucInput, '510507');
    
    const saveButton = screen.getByText('Guardar cambios').closest('button');
    expect(saveButton).not.toBeDisabled();
  });

  it('should group mappings by entry type (debito/credito)', async () => {
    render(<PUCMappingEditor />);
    
    await waitFor(() => {
      expect(screen.getByText(/Devengados y Aportes Patronales/i)).toBeInTheDocument();
      expect(screen.getByText(/Deducciones y Provisiones/i)).toBeInTheDocument();
    });
  });

  it('should call createMapping when form is valid and submitted', async () => {
    const user = userEvent.setup();
    vi.mocked(AccountingMappingService.createMapping).mockResolvedValue({
      id: '4',
      company_id: 'company-1',
      concept: 'nuevo_bono',
      puc_account: '510599',
      puc_description: 'Nuevo Bono',
      entry_type: 'debito',
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      is_custom: true,
    });

    render(<PUCMappingEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Agregar Cuenta')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Agregar Cuenta'));
    
    await user.type(screen.getByLabelText('Nombre del Concepto'), 'Nuevo Bono');
    await user.type(screen.getByLabelText('Cuenta PUC'), '510599');
    await user.type(screen.getByLabelText('Descripción'), 'Bono de prueba');
    
    await user.click(screen.getByText('Crear Cuenta'));
    
    await waitFor(() => {
      expect(AccountingMappingService.createMapping).toHaveBeenCalledWith(
        'nuevo_bono',
        '510599',
        'Bono de prueba',
        'debito'
      );
    });
  });

  it('should show restore defaults confirmation dialog', async () => {
    const user = userEvent.setup();
    render(<PUCMappingEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Restaurar por defecto')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Restaurar por defecto'));
    
    expect(screen.getByText('¿Restaurar valores por defecto?')).toBeInTheDocument();
  });
});
