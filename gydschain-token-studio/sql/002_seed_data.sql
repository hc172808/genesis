-- ============================================================
-- Seed data for development/testing
-- Run after 001_schema.sql
-- ============================================================

-- Seed user
INSERT INTO public.users (id, wallet_address, display_name) VALUES
  ('a0000000-0000-0000-0000-000000000001', '0x7a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F4e', 'GydsCreator'),
  ('a0000000-0000-0000-0000-000000000002', '0xDe4F1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e', 'TokenWhale'),
  ('a0000000-0000-0000-0000-000000000003', '0x9cE23d4F5a6B7c8D9e0F1a2B3c4D5e6F7a8B9c', 'BurnMaster');

-- Assign roles
INSERT INTO public.user_roles (user_id, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin'),
  ('a0000000-0000-0000-0000-000000000001', 'user'),
  ('a0000000-0000-0000-0000-000000000002', 'user'),
  ('a0000000-0000-0000-0000-000000000003', 'user');

-- Seed tokens
INSERT INTO public.tokens (id, name, symbol, decimals, total_supply, current_supply, description, contract_address, transaction_hash, creator_address, creator_id, network, freeze_revoked, mint_revoked) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'GydsGold', 'GGOLD', 9, '1000000000', '1000000000', 'The gold standard token on GydsChain', '0xAbC1dEf2a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7', '0xTx1HashAbC1dEf2a3B4', '0x7a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F4e', 'a0000000-0000-0000-0000-000000000001', 'devnet', true, false),
  ('b0000000-0000-0000-0000-000000000002', 'NetlifyCoin', 'NTFY', 9, '500000000', '500000000', 'Official token of NetlifyGY ecosystem', '0xDeF3gHi4a5B6c7D8e9F0a1B2c3D4e5F6a7B8c9', '0xTx2HashDeF3gHi4a5B6', '0x7a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F4e', 'a0000000-0000-0000-0000-000000000001', 'devnet', true, true);

-- Seed transactions
INSERT INTO public.transactions (hash, type, token_id, token_symbol, from_address, status, network) VALUES
  ('0xTx1HashAbC1dEf2a3B4', 'create', 'b0000000-0000-0000-0000-000000000001', 'GGOLD', '0x7a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F4e', 'success', 'devnet'),
  ('0xTx2HashDeF3gHi4a5B6', 'create', 'b0000000-0000-0000-0000-000000000002', 'NTFY', '0x7a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F4e', 'success', 'devnet'),
  ('0xTx3HashMintGGOLD001', 'mint', 'b0000000-0000-0000-0000-000000000001', 'GGOLD', '0x7a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F4e', 'success', 'devnet');

-- Seed liquidity pool
INSERT INTO public.liquidity_pools (id, pair_address, token0_address, token1_address, token0_symbol, token1_symbol, reserve0, reserve1, total_lp_supply, fee_tier, pool_type, creator_address, creator_id, network) VALUES
  ('c0000000-0000-0000-0000-000000000001', '0xPair1AbC1dEf2a3B4c5', '0xAbC1dEf2a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7', '0x0000000000000000000000000000000000000000', 'GGOLD', 'GYDS', '950000000', '50000000000000000000', '218000000', 0.0025, 'cpmm', '0x7a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F4e', 'a0000000-0000-0000-0000-000000000001', 'devnet');

-- Seed burns
INSERT INTO public.burns (token_id, token_symbol, amount, burner_address, burner_id, reward_amount, transaction_hash, network) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'GGOLD', '5000000', '0x9cE23d4F5a6B7c8D9e0F1a2B3c4D5e6F7a8B9c', 'a0000000-0000-0000-0000-000000000003', '250', '0xBurnTx1Hash', 'devnet');

-- Seed token holders
INSERT INTO public.token_holders (token_id, holder_address, balance, percentage) VALUES
  ('b0000000-0000-0000-0000-000000000001', '0x7a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F4e', '450000000', 45.0),
  ('b0000000-0000-0000-0000-000000000001', '0xDe4F1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e', '200000000', 20.0),
  ('b0000000-0000-0000-0000-000000000001', '0x9cE23d4F5a6B7c8D9e0F1a2B3c4D5e6F7a8B9c', '150000000', 15.0),
  ('b0000000-0000-0000-0000-000000000002', '0x7a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F4e', '500000000', 100.0);

-- Seed leaderboard
INSERT INTO public.leaderboard (wallet_address, display_name, tokens_created, score, category, network, rank) VALUES
  ('0x7a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F4e', 'GydsCreator', 2, 200, 'creators', 'devnet', 1),
  ('0x9cE23d4F5a6B7c8D9e0F1a2B3c4D5e6F7a8B9c', 'BurnMaster', 0, 5000, 'burners', 'devnet', 1);

-- Seed analytics snapshot
INSERT INTO public.analytics_snapshots (date, network, total_tokens, total_holders, total_transactions, active_users, new_tokens) VALUES
  (CURRENT_DATE, 'devnet', 2, 3, 3, 3, 2);
