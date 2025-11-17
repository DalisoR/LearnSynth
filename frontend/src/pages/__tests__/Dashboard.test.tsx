import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import Dashboard from '../../pages/Dashboard';
import { AuthProvider } from '../../contexts/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard header', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/welcome to your dashboard/i)).toBeInTheDocument();
  });

  it('renders quick actions section', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
  });

  it('renders recent documents section', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/recent documents/i)).toBeInTheDocument();
  });

  it('renders study progress section', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/study progress/i)).toBeInTheDocument();
  });

  it('handles button clicks', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    const uploadButton = screen.getByRole('button', { name: /upload document/i });
    await user.click(uploadButton);
    expect(uploadButton).toBeEnabled();
  });

  it('displays statistics cards', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/total documents/i)).toBeInTheDocument();
    expect(screen.getByText(/study hours/i)).toBeInTheDocument();
    expect(screen.getByText(/knowledge base/i)).toBeInTheDocument();
  });
});
