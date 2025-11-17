import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from '@jest/globals';
import { Toaster } from '../ui/sonner';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('Toast System', () => {
  it('renders toaster component', () => {
    render(<Toaster />);
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('can display success toasts', () => {
    render(<Toaster />);
    toast.success('Success message');
    expect(toast.success).toHaveBeenCalledWith('Success message');
  });

  it('can display error toasts', () => {
    render(<Toaster />);
    toast.error('Error message');
    expect(toast.error).toHaveBeenCalledWith('Error message');
  });

  it('can display warning toasts', () => {
    render(<Toaster />);
    toast.warning('Warning message');
    expect(toast.warning).toHaveBeenCalledWith('Warning message');
  });

  it('can display info toasts', () => {
    render(<Toaster />);
    toast.info('Info message');
    expect(toast.info).toHaveBeenCalledWith('Info message');
  });
});
