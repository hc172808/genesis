-- ============================================================
-- GydsChain / Netlify Coin Tools — Full Database Schema
-- Compatible with PostgreSQL 14+
-- Upload this to your database to set up all required tables.
-- ============================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM types
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.tx_type AS ENUM ('create', 'mint', 'burn', 'transfer', 'pause', 'swap', 'add_liquidity', 'remove_liquidity');
CREATE TYPE public.tx_status AS ENUM ('success', 'pending', 'failed');
CREATE TYPE public.pool_type AS ENUM ('cpmm', 'amm_v4');
CREATE TYPE public.network_type AS ENUM ('devnet', 'mainnet');

-- ============================================================
-- 3. USERS table (wallet-based auth)
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_wallet ON public.users (wallet_address);

-- ============================================================
-- 4. USER ROLES table (separated per security best practices)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user ON public.user_roles (user_id);

-- ============================================================
-- 5. TOKENS table
-- ============================================================
CREATE TABLE public.tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 6,
  total_supply TEXT NOT NULL,
  current_supply TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  twitter TEXT,
  telegram TEXT,
  contract_address TEXT UNIQUE,
  transaction_hash TEXT,
  creator_address TEXT NOT NULL,
  creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  network network_type NOT NULL DEFAULT 'devnet',
  is_paused BOOLEAN DEFAULT false,
  freeze_revoked BOOLEAN DEFAULT false,
  mint_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tokens_creator ON public.tokens (creator_address);
CREATE INDEX idx_tokens_symbol ON public.tokens (symbol);
CREATE INDEX idx_tokens_network ON public.tokens (network);
CREATE INDEX idx_tokens_contract ON public.tokens (contract_address);

-- ============================================================
-- 6. TRANSACTIONS table
-- ============================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hash TEXT NOT NULL,
  type tx_type NOT NULL,
  token_id UUID REFERENCES public.tokens(id) ON DELETE SET NULL,
  token_symbol TEXT NOT NULL,
  amount TEXT,
  from_address TEXT,
  to_address TEXT,
  fee TEXT,
  block_number BIGINT,
  network network_type NOT NULL DEFAULT 'devnet',
  status tx_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_hash ON public.transactions (hash);
CREATE INDEX idx_transactions_token ON public.transactions (token_id);
CREATE INDEX idx_transactions_from ON public.transactions (from_address);
CREATE INDEX idx_transactions_status ON public.transactions (status);
CREATE INDEX idx_transactions_type ON public.transactions (type);
CREATE INDEX idx_transactions_created ON public.transactions (created_at DESC);

-- ============================================================
-- 7. LIQUIDITY POOLS table
-- ============================================================
CREATE TABLE public.liquidity_pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_address TEXT UNIQUE,
  token0_address TEXT NOT NULL,
  token1_address TEXT NOT NULL,
  token0_symbol TEXT NOT NULL,
  token1_symbol TEXT NOT NULL,
  reserve0 TEXT DEFAULT '0',
  reserve1 TEXT DEFAULT '0',
  total_lp_supply TEXT DEFAULT '0',
  fee_tier NUMERIC(5, 4) NOT NULL DEFAULT 0.0025,
  pool_type pool_type NOT NULL DEFAULT 'cpmm',
  creator_address TEXT NOT NULL,
  creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  network network_type NOT NULL DEFAULT 'devnet',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pools_pair ON public.liquidity_pools (pair_address);
CREATE INDEX idx_pools_tokens ON public.liquidity_pools (token0_address, token1_address);
CREATE INDEX idx_pools_creator ON public.liquidity_pools (creator_address);

-- ============================================================
-- 8. LP POSITIONS (user liquidity positions)
-- ============================================================
CREATE TABLE public.lp_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID REFERENCES public.liquidity_pools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  lp_token_balance TEXT NOT NULL DEFAULT '0',
  token0_deposited TEXT NOT NULL DEFAULT '0',
  token1_deposited TEXT NOT NULL DEFAULT '0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pool_id, user_id)
);

CREATE INDEX idx_lp_positions_user ON public.lp_positions (user_id);
CREATE INDEX idx_lp_positions_pool ON public.lp_positions (pool_id);

-- ============================================================
-- 9. BURNS table (burn & earn tracking)
-- ============================================================
CREATE TABLE public.burns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID REFERENCES public.tokens(id) ON DELETE SET NULL,
  token_symbol TEXT NOT NULL,
  amount TEXT NOT NULL,
  burner_address TEXT NOT NULL,
  burner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reward_amount TEXT DEFAULT '0',
  reward_token TEXT DEFAULT 'GYDS',
  transaction_hash TEXT,
  network network_type NOT NULL DEFAULT 'devnet',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_burns_burner ON public.burns (burner_address);
CREATE INDEX idx_burns_token ON public.burns (token_id);
CREATE INDEX idx_burns_created ON public.burns (created_at DESC);

-- ============================================================
-- 10. LEADERBOARD table (materialized for performance)
-- ============================================================
CREATE TABLE public.leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  display_name TEXT,
  tokens_created INTEGER DEFAULT 0,
  total_burned TEXT DEFAULT '0',
  total_swaps INTEGER DEFAULT 0,
  total_liquidity_provided TEXT DEFAULT '0',
  rewards_earned TEXT DEFAULT '0',
  score BIGINT DEFAULT 0,
  rank INTEGER,
  category TEXT NOT NULL DEFAULT 'overall',  -- 'overall', 'creators', 'burners'
  network network_type NOT NULL DEFAULT 'devnet',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (wallet_address, category, network)
);

CREATE INDEX idx_leaderboard_score ON public.leaderboard (score DESC);
CREATE INDEX idx_leaderboard_category ON public.leaderboard (category, network);
CREATE INDEX idx_leaderboard_rank ON public.leaderboard (rank);

-- ============================================================
-- 11. PRICE HISTORY table (for charts)
-- ============================================================
CREATE TABLE public.price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE NOT NULL,
  price_in_gyds NUMERIC(30, 18) NOT NULL,
  volume TEXT DEFAULT '0',
  market_cap TEXT DEFAULT '0',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_history_token ON public.price_history (token_id, timestamp DESC);

-- ============================================================
-- 12. TOKEN HOLDERS table
-- ============================================================
CREATE TABLE public.token_holders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE NOT NULL,
  holder_address TEXT NOT NULL,
  balance TEXT NOT NULL DEFAULT '0',
  percentage NUMERIC(7, 4) DEFAULT 0,
  first_acquired TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (token_id, holder_address)
);

CREATE INDEX idx_holders_token ON public.token_holders (token_id);
CREATE INDEX idx_holders_address ON public.token_holders (holder_address);
CREATE INDEX idx_holders_balance ON public.token_holders (token_id, balance DESC);

-- ============================================================
-- 13. SWAP HISTORY table
-- ============================================================
CREATE TABLE public.swap_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID REFERENCES public.liquidity_pools(id) ON DELETE SET NULL,
  user_address TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  token_in_address TEXT NOT NULL,
  token_out_address TEXT NOT NULL,
  token_in_symbol TEXT NOT NULL,
  token_out_symbol TEXT NOT NULL,
  amount_in TEXT NOT NULL,
  amount_out TEXT NOT NULL,
  price_impact NUMERIC(10, 6) DEFAULT 0,
  fee_amount TEXT DEFAULT '0',
  transaction_hash TEXT,
  network network_type NOT NULL DEFAULT 'devnet',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_swaps_user ON public.swap_history (user_address);
CREATE INDEX idx_swaps_pool ON public.swap_history (pool_id);
CREATE INDEX idx_swaps_created ON public.swap_history (created_at DESC);

-- ============================================================
-- 14. ANALYTICS SNAPSHOTS (daily aggregations)
-- ============================================================
CREATE TABLE public.analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  network network_type NOT NULL DEFAULT 'devnet',
  total_tokens INTEGER DEFAULT 0,
  total_holders INTEGER DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  total_volume TEXT DEFAULT '0',
  total_tvl TEXT DEFAULT '0',
  active_users INTEGER DEFAULT 0,
  new_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, network)
);

CREATE INDEX idx_analytics_date ON public.analytics_snapshots (date DESC, network);

-- ============================================================
-- 15. Helper functions
-- ============================================================

-- Check user role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get or create user by wallet address
CREATE OR REPLACE FUNCTION public.get_or_create_user(_wallet_address TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  SELECT id INTO _user_id FROM public.users WHERE wallet_address = _wallet_address;
  
  IF _user_id IS NULL THEN
    INSERT INTO public.users (wallet_address)
    VALUES (_wallet_address)
    RETURNING id INTO _user_id;
    
    -- Assign default role
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'user');
  ELSE
    UPDATE public.users SET last_login = NOW() WHERE id = _user_id;
  END IF;
  
  RETURN _user_id;
END;
$$;

-- Update leaderboard scores
CREATE OR REPLACE FUNCTION public.refresh_leaderboard(_network network_type DEFAULT 'devnet')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert creator scores
  INSERT INTO public.leaderboard (wallet_address, display_name, tokens_created, score, category, network)
  SELECT
    u.wallet_address,
    u.display_name,
    COUNT(t.id)::INTEGER AS tokens_created,
    COUNT(t.id) * 100 AS score,
    'creators',
    _network
  FROM public.users u
  JOIN public.tokens t ON t.creator_id = u.id AND t.network = _network
  GROUP BY u.id, u.wallet_address, u.display_name
  ON CONFLICT (wallet_address, category, network) DO UPDATE SET
    tokens_created = EXCLUDED.tokens_created,
    score = EXCLUDED.score,
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

  -- Upsert burner scores
  INSERT INTO public.leaderboard (wallet_address, display_name, total_burned, rewards_earned, score, category, network)
  SELECT
    u.wallet_address,
    u.display_name,
    SUM(b.amount::NUMERIC)::TEXT AS total_burned,
    SUM(b.reward_amount::NUMERIC)::TEXT AS rewards_earned,
    SUM(b.amount::NUMERIC)::BIGINT / 1000 AS score,
    'burners',
    _network
  FROM public.users u
  JOIN public.burns b ON b.burner_id = u.id AND b.network = _network
  GROUP BY u.id, u.wallet_address, u.display_name
  ON CONFLICT (wallet_address, category, network) DO UPDATE SET
    total_burned = EXCLUDED.total_burned,
    rewards_earned = EXCLUDED.rewards_earned,
    score = EXCLUDED.score,
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

  -- Update ranks
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY category, network ORDER BY score DESC) AS new_rank
    FROM public.leaderboard
    WHERE network = _network
  )
  UPDATE public.leaderboard l SET rank = r.new_rank
  FROM ranked r WHERE l.id = r.id;
END;
$$;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_tokens_updated_at BEFORE UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_pools_updated_at BEFORE UPDATE ON public.liquidity_pools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_lp_positions_updated_at BEFORE UPDATE ON public.lp_positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_holders_updated_at BEFORE UPDATE ON public.token_holders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 16. Row Level Security (enable but leave policies for your setup)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidity_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lp_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.burns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 17. Sample RLS policies (customize for your auth system)
-- ============================================================

-- Public read for tokens, leaderboard, analytics
CREATE POLICY "Public read tokens" ON public.tokens FOR SELECT USING (true);
CREATE POLICY "Public read leaderboard" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "Public read analytics" ON public.analytics_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read price_history" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "Public read holders" ON public.token_holders FOR SELECT USING (true);

-- Users can read their own data
CREATE POLICY "Users read own profile" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users read own lp" ON public.lp_positions FOR SELECT USING (true);
CREATE POLICY "Public read pools" ON public.liquidity_pools FOR SELECT USING (true);
CREATE POLICY "Public read transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Public read burns" ON public.burns FOR SELECT USING (true);
CREATE POLICY "Public read swaps" ON public.swap_history FOR SELECT USING (true);

-- ============================================================
-- Done! Your database is ready.
-- ============================================================
