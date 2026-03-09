import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpgradePlanDialog } from '../UpgradePlanDialog';
import { PLANES_SAAS } from '@/constants';

describe('UpgradePlanDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    limitType: 'employees' as const,
    currentPlan: 'basico',
    suggestedPlan: PLANES_SAAS[1], // profesional
    currentCount: 10,
    maxAllowed: 10
  };

  describe('title rendering', () => {
    it('renders employee limit title when limitType is employees', () => {
      render(<UpgradePlanDialog {...defaultProps} />);

      expect(screen.getByText('Límite de empleados alcanzado')).toBeInTheDocument();
    });

    it('renders payroll limit title when limitType is payroll', () => {
      render(<UpgradePlanDialog {...defaultProps} limitType="payroll" />);

      expect(screen.getByText('Límite de nóminas alcanzado')).toBeInTheDocument();
    });
  });

  describe('plan display', () => {
    it('shows current plan name and price', () => {
      render(<UpgradePlanDialog {...defaultProps} />);

      expect(screen.getByText('Básico')).toBeInTheDocument();
      // Price is split across text nodes: "$ 15.000" and "/mes"
      expect(screen.getByText(/15\.000/)).toBeInTheDocument();
    });

    it('shows suggested plan name and price', () => {
      render(<UpgradePlanDialog {...defaultProps} />);

      expect(screen.getByText('Profesional')).toBeInTheDocument();
      // Price is split across text nodes: "$ 35.000" and "/mes"
      expect(screen.getByText(/35\.000/)).toBeInTheDocument();
    });

    it('shows employee limits for plans', () => {
      render(<UpgradePlanDialog {...defaultProps} />);

      expect(screen.getByText('10 empleados')).toBeInTheDocument();
      expect(screen.getByText('50 empleados')).toBeInTheDocument();
    });

    it('shows "Ilimitado" for empresarial plan', () => {
      render(
        <UpgradePlanDialog
          {...defaultProps}
          currentPlan="profesional"
          suggestedPlan={PLANES_SAAS[2]} // empresarial
        />
      );

      expect(screen.getByText('Ilimitado')).toBeInTheDocument();
    });
  });

  describe('description', () => {
    it('shows employee count message for employee limit', () => {
      render(<UpgradePlanDialog {...defaultProps} />);

      expect(
        screen.getByText(/Tu plan actual permite máximo 10 empleados/)
      ).toBeInTheDocument();
    });

    it('shows payroll message for payroll limit', () => {
      render(<UpgradePlanDialog {...defaultProps} limitType="payroll" />);

      expect(
        screen.getByText(/Has alcanzado el límite de nóminas/)
      ).toBeInTheDocument();
    });
  });

  describe('contact button', () => {
    it('opens email when clicked', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(<UpgradePlanDialog {...defaultProps} />);

      const contactButton = screen.getByText('Contactar para upgrade');
      fireEvent.click(contactButton);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'mailto:soporte@nominapro.co?subject=Upgrade de plan',
        '_blank'
      );

      windowOpenSpy.mockRestore();
    });

    it('calls onOpenChange with false after contact click', () => {
      const onOpenChange = vi.fn();
      vi.spyOn(window, 'open').mockImplementation(() => null);

      render(<UpgradePlanDialog {...defaultProps} onOpenChange={onOpenChange} />);

      fireEvent.click(screen.getByText('Contactar para upgrade'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('close button', () => {
    it('calls onOpenChange with false when clicked', () => {
      const onOpenChange = vi.fn();

      render(<UpgradePlanDialog {...defaultProps} onOpenChange={onOpenChange} />);

      fireEvent.click(screen.getByText('Cerrar'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('when dialog is closed', () => {
    it('does not render content when open is false', () => {
      render(<UpgradePlanDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Límite de empleados alcanzado')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles null suggestedPlan gracefully', () => {
      render(<UpgradePlanDialog {...defaultProps} suggestedPlan={null} />);

      // Should still show current plan
      expect(screen.getByText('Básico')).toBeInTheDocument();
      // Arrow should not appear without suggested plan
      expect(screen.queryByText('Profesional')).not.toBeInTheDocument();
    });

    it('handles null currentCount gracefully', () => {
      render(<UpgradePlanDialog {...defaultProps} currentCount={null} />);

      expect(screen.getByText(/Actualmente tienes \?/)).toBeInTheDocument();
    });
  });
});
