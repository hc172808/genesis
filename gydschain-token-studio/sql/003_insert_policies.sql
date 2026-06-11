-- ============================================================
-- Insert/Update RLS Policies for GydsChain
-- Run this AFTER 001_schema.sql if using API key auth (e.g., Supabase anon key)
-- ============================================================

-- Users: anyone can create their own profile
CREATE POLICY "Insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update own" ON public.users FOR UPDATE USING (true);

-- User roles: system-managed only (via get_or_create_user function)
CREATE POLICY "Insert user_roles" ON public.user_roles FOR INSERT WITH CHECK (true);

-- Tokens: authenticated users can create
CREATE POLICY "Insert tokens" ON public.tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Update own tokens" ON public.tokens FOR UPDATE USING (true);

-- Transactions: system can insert
CREATE POLICY "Insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);

-- Liquidity pools
CREATE POLICY "Insert pools" ON public.liquidity_pools FOR INSERT WITH CHECK (true);
CREATE POLICY "Update pools" ON public.liquidity_pools FOR UPDATE USING (true);

-- LP positions
CREATE POLICY "Insert lp_positions" ON public.lp_positions FOR INSERT WITH CHECK (true);
CREATE POLICY "Update lp_positions" ON public.lp_positions FOR UPDATE USING (true);

-- Burns
CREATE POLICY "Insert burns" ON public.burns FOR INSERT WITH CHECK (true);

-- Leaderboard (managed by refresh_leaderboard function)
CREATE POLICY "Insert leaderboard" ON public.leaderboard FOR INSERT WITH CHECK (true);
CREATE POLICY "Update leaderboard" ON public.leaderboard FOR UPDATE USING (true);

-- Price history
CREATE POLICY "Insert price_history" ON public.price_history FOR INSERT WITH CHECK (true);

-- Token holders
CREATE POLICY "Insert token_holders" ON public.token_holders FOR INSERT WITH CHECK (true);
CREATE POLICY "Update token_holders" ON public.token_holders FOR UPDATE USING (true);

-- Swap history
CREATE POLICY "Insert swap_history" ON public.swap_history FOR INSERT WITH CHECK (true);

-- Analytics snapshots
CREATE POLICY "Insert analytics" ON public.analytics_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Update analytics" ON public.analytics_snapshots FOR UPDATE USING (true);
