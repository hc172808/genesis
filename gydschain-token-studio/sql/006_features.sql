-- ============================================================
-- 006: Staking, Governance, Notifications, Launchpad
-- ============================================================

-- ── Staking ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staking_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  staking_token_address text NOT NULL,
  reward_token_address text NOT NULL,
  contract_address text NOT NULL,
  network text NOT NULL DEFAULT 'devnet',
  apr numeric(6,2) DEFAULT 0,
  total_staked numeric(78,0) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staking_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid REFERENCES public.staking_pools(id) ON DELETE CASCADE,
  user_address text NOT NULL,
  amount_staked numeric(78,0) NOT NULL DEFAULT 0,
  rewards_claimed numeric(78,0) NOT NULL DEFAULT 0,
  last_action_tx text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (pool_id, user_address)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staking_pools TO authenticated;
GRANT SELECT ON public.staking_pools TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staking_positions TO authenticated;
GRANT ALL ON public.staking_pools, public.staking_positions TO service_role;

-- ── Governance ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_address text NOT NULL,
  title text NOT NULL,
  description text,
  snapshot_block bigint,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  quorum numeric(78,0) DEFAULT 0,
  for_votes numeric(78,0) DEFAULT 0,
  against_votes numeric(78,0) DEFAULT 0,
  abstain_votes numeric(78,0) DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  network text DEFAULT 'devnet',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proposal_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE CASCADE,
  voter_address text NOT NULL,
  choice text NOT NULL CHECK (choice IN ('for','against','abstain')),
  weight numeric(78,0) NOT NULL,
  tx_hash text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (proposal_id, voter_address)
);

GRANT SELECT, INSERT, UPDATE ON public.proposals TO authenticated;
GRANT SELECT ON public.proposals TO anon;
GRANT SELECT, INSERT ON public.proposal_votes TO authenticated;
GRANT SELECT ON public.proposal_votes TO anon;
GRANT ALL ON public.proposals, public.proposal_votes TO service_role;

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_address, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- ── Launchpad / Presale ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.presales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address text NOT NULL,
  owner_address text NOT NULL,
  contract_address text,
  soft_cap_gyds numeric(78,0) NOT NULL,
  hard_cap_gyds numeric(78,0) NOT NULL,
  price_per_token numeric(78,18) NOT NULL,
  total_raised numeric(78,0) DEFAULT 0,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  vesting_cliff_days int DEFAULT 0,
  vesting_duration_days int DEFAULT 0,
  whitelist_enabled boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  network text DEFAULT 'devnet',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.presale_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presale_id uuid REFERENCES public.presales(id) ON DELETE CASCADE,
  contributor_address text NOT NULL,
  amount_gyds numeric(78,0) NOT NULL,
  tokens_owed numeric(78,0) NOT NULL,
  tokens_claimed numeric(78,0) DEFAULT 0,
  tx_hash text,
  refunded boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.presales TO authenticated;
GRANT SELECT ON public.presales TO anon;
GRANT SELECT, INSERT, UPDATE ON public.presale_contributions TO authenticated;
GRANT ALL ON public.presales, public.presale_contributions TO service_role;
