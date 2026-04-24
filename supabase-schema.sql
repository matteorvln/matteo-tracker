-- =============================================
-- MATTEO TRACKER — Supabase Schema
-- Exécute ce SQL dans Supabase > SQL Editor
-- =============================================

-- Table des transactions (revenus, dépenses, transferts)
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC NOT NULL,
  category TEXT,
  source TEXT,
  platform TEXT,
  platform_to TEXT,
  fee NUMERIC DEFAULT 0,
  note TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des soldes de plateformes
CREATE TABLE platforms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  balance NUMERIC DEFAULT 0
);

-- Table des abonnements
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  platform TEXT REFERENCES platforms(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer les plateformes par défaut
INSERT INTO platforms (id, name, icon, color, balance) VALUES
  ('binance', 'Binance', '🟡', '#F0B90B', 0),
  ('n26', 'N26', '🏦', '#48AC98', 0),
  ('bourso', 'Boursorama', '🔵', '#0078D4', 0),
  ('wise', 'Wise', '🌍', '#9FE870', 0),
  ('cash', 'Cash', '💵', '#85BB65', 0),
  ('paypal', 'PayPal', '🅿️', '#003087', 0);

-- Row Level Security (permet l'accès avec la clé anon)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies : accès total avec la clé anon (app perso, pas de multi-user)
CREATE POLICY "Allow all on transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on platforms" ON platforms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on subscriptions" ON subscriptions FOR ALL USING (true) WITH CHECK (true);
