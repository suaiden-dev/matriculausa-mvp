import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import AgencyManagement from '../../src/pages/AdminDashboard/AgencyManagement';
import { describe, it, expect, vi } from 'vitest';

// Mock simple hooks that might cause issues in test environment
vi.mock('../../hooks/useEnvironment', () => ({
  useEnvironment: () => ({ isDevelopment: true })
}));

// We need a QueryClient for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );

describe('AgencyManagement Integration Test', () => {
  it('2.2 renderiza título "Agency Management"', async () => {
    renderWithProviders(<AgencyManagement />);
    
    // We expect the text to be there eventually after loading
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Agency Management/i })).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('2.3 renderiza card "Total Agencies"', async () => {
    renderWithProviders(<AgencyManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Agencies')).toBeInTheDocument();
    });
  });

  it('2.4 input de busca tem placeholder correto', async () => {
    renderWithProviders(<AgencyManagement />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search agencies by name/i)).toBeInTheDocument();
    });
  });

  it('2.7 busca sem resultado mostra "No agencies found"', async () => {
    renderWithProviders(<AgencyManagement />);
    
    const input = await screen.findByPlaceholderText(/Search agencies by name/i);
    await userEvent.type(input, 'xyzimpossivel123');
    
    await waitFor(() => {
      expect(screen.getByText(/No agencies found/i)).toBeInTheDocument();
    });
  });
});
