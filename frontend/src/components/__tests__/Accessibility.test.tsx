import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from '@jest/globals';
import {
  AccessibleButton,
  SkipToContent,
  AccessibleInput,
} from '../Accessibility';

describe('Accessibility Components', () => {
  describe('AccessibleButton', () => {
    it('renders with correct aria-label', () => {
      render(<AccessibleButton aria-label="Close dialog">×</AccessibleButton>);
      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
    });

    it('handles Enter key press', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<AccessibleButton onClick={handleClick}>Click me</AccessibleButton>);

      const button = screen.getByRole('button', { name: 'Click me' });
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalled();
    });

    it('handles Space key press', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<AccessibleButton onClick={handleClick}>Click me</AccessibleButton>);

      const button = screen.getByRole('button', { name: 'Click me' });
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalled();
    });

    it('renders with variant classes', () => {
      render(<AccessibleButton variant="outline">Outline Button</AccessibleButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-2', 'border-gray-300');
    });

    it('applies size classes correctly', () => {
      render(<AccessibleButton size="lg">Large Button</AccessibleButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-12');
    });
  });

  describe('SkipToContent', () => {
    it('renders skip link', () => {
      render(<SkipToContent />);
      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '#main-content');
    });

    it('has sr-only class initially', () => {
      render(<SkipToContent />);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('sr-only');
    });
  });

  describe('AccessibleInput', () => {
    it('renders with label', () => {
      render(<AccessibleInput label="Email Address" />);
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });

    it('displays error message when error prop is provided', () => {
      render(<AccessibleInput label="Email" error="Email is required" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
    });

    it('shows required asterisk when required', () => {
      render(<AccessibleInput label="Email" required />);
      expect(screen.getByLabelText(/email/i)).toBe('required');
    });

    it('associates help text with input', () => {
      render(
        <AccessibleInput
          label="Password"
          helpText="Must be at least 8 characters"
        />
      );
      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
    });

    it('applies error styling when error is present', () => {
      render(<AccessibleInput label="Email" error="Invalid email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
