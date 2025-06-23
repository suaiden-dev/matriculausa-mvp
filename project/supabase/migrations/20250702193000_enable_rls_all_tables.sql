-- Habilita RLS nas principais tabelas do projeto
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarship_fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE escolas_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own documents" ON student_documents
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid()); 