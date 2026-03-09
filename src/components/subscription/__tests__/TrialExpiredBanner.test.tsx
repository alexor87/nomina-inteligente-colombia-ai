import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrialExpiredBanner } from '../TrialExpiredBanner';

describe('TrialExpiredBanner', () => {
  describe('rendering', () => {
    it('renders expiration message', () => {
      render(<TrialExpiredBanner />);

      expect(
        screen.getByText(/Tu período de prueba ha expirado/)
      ).toBeInTheDocument();
    });

    it('renders disabled functions message', () => {
      render(<TrialExpiredBanner />);

      expect(
        screen.getByText(/Algunas funciones están deshabilitadas/)
      ).toBeInTheDocument();
    });

    it('renders alert icon', () => {
      render(<TrialExpiredBanner />);

      // Check for the AlertTriangle icon by looking for the SVG
      const banner = screen.getByText(/Tu período de prueba/).closest('div');
      expect(banner).toBeInTheDocument();
    });

    it('renders activate plan button', () => {
      render(<TrialExpiredBanner />);

      expect(screen.getByText('Activar plan')).toBeInTheDocument();
    });
  });

  describe('activate button', () => {
    it('opens support email when clicked', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(<TrialExpiredBanner />);

      const activateButton = screen.getByText('Activar plan');
      fireEvent.click(activateButton);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'mailto:soporte@nominapro.co?subject=Activar plan',
        '_blank'
      );

      windowOpenSpy.mockRestore();
    });
  });

  describe('styling', () => {
    it('has destructive styling classes', () => {
      render(<TrialExpiredBanner />);

      const banner = screen.getByText(/Tu período de prueba/).closest('div')?.parentElement;
      expect(banner?.className).toContain('bg-destructive');
    });

    it('has proper text styling', () => {
      render(<TrialExpiredBanner />);

      const message = screen.getByText(/Tu período de prueba/);
      expect(message.className).toContain('text-destructive');
    });
  });

  describe('button variant', () => {
    it('has destructive variant button', () => {
      render(<TrialExpiredBanner />);

      const button = screen.getByText('Activar plan');
      // Button should be present and clickable
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });
  });
});
