import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';

export const handlers = [
  // Mock do endpoint de affiliate_admins (agências)
  http.get(`${SUPABASE_URL}/rest/v1/affiliate_admins`, () => {
    return HttpResponse.json([
      {
        id: 'test-agency-id-001',
        user_id: 'test-user-id-001',
        company_name: 'The Future of English',
        email: 'agency@test.com',
        is_active: true,
        onboarding_completed: true,
        system_type: 'simplified',
        created_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  // Mock de sellers
  http.get(`${SUPABASE_URL}/rest/v1/sellers`, () => {
    return HttpResponse.json([
      {
        id: 'seller-001',
        name: 'Test Seller',
        email: 'seller@test.com',
        referral_code: 'TFE001',
        affiliate_admin_id: 'test-agency-id-001',
        is_active: true,
      },
    ]);
  }),

  // Mock de user_profiles
  http.get(`${SUPABASE_URL}/rest/v1/user_profiles`, () => {
    return HttpResponse.json([]);
  }),

  // Mock de auth/user
  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json({
      id: 'admin-user-id',
      email: 'admin@matriculausa.com',
      user_metadata: { role: 'admin' },
    });
  }),
];
