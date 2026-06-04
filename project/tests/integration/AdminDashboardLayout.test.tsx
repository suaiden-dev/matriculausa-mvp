import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardLayout from '../../src/pages/AdminDashboard/AdminDashboardLayout';
import { describe, it, expect, vi } from 'vitest';

// Mock contexts
vi.mock('../../src/contexts/AdminNotificationsContext', () => ({
  useAdminNotifications: () => ({ unreadCount: 0 })
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({ logout: vi.fn() })
}));

vi.mock('../../src/components/AdminStudentChatNotifications', () => ({
  default: () => <div data-testid="chat-notifications" />
}));

// Mock simple hooks that might cause issues in test environment
vi.mock('../../src/hooks/useEnvironment', () => ({
  useEnvironment: () => ({ isDevelopment: true })
}));

// Mock simple components that might cause issues
vi.mock('../../src/components/AdminDashboardSkeleton', () => ({
  default: () => <div data-testid="skeleton" />
}));

// Mock icons if needed, though lucide usually works in jsdom
// vi.mock('lucide-react', () => ({ ... }));

// Mock AuthContext if needed, but here we pass user as prop
const adminUser = { id: 'u1', full_name: 'Admin User', email: 'admin@test.com', role: 'admin' as const };

describe('AdminDashboardLayout Sidebar', () => {
  it('1.1 mostra "Agencies" (não "Affiliate Management")', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AdminDashboardLayout user={adminUser} loading={false}>
          <div>Content</div>
        </AdminDashboardLayout>
      </MemoryRouter>
    );
    
    expect(screen.getByRole('link', { name: 'Agencies' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Affiliate Management' })).not.toBeInTheDocument();
  });

  it('1.2 mostra "Affiliate Program" separado', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AdminDashboardLayout user={adminUser} loading={false}>
          <div>Content</div>
        </AdminDashboardLayout>
      </MemoryRouter>
    );
    
    expect(screen.getByRole('link', { name: 'Affiliate Program' })).toBeInTheDocument();
  });

  it('post-sales NÃO vê "Agencies" no sidebar', () => {
    const postSalesUser = { ...adminUser, role: 'post_sales' as const };
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AdminDashboardLayout user={postSalesUser} loading={false}>
          <div>Content</div>
        </AdminDashboardLayout>
      </MemoryRouter>
    );
    
    expect(screen.queryByRole('link', { name: 'Agencies' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Payment Management' })).toBeInTheDocument();
  });
});
