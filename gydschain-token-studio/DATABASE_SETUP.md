# GydsChain Database Setup Guide

## 1. Set Up Your PostgreSQL Database

Use any PostgreSQL 14+ provider (Supabase, Neon, Railway, self-hosted, etc.)

### Upload Schema
Execute these SQL files in order on your database:

1. **`sql/001_schema.sql`** — Creates all tables, indexes, RLS policies, triggers, and helper functions
2. **`sql/002_seed_data.sql`** — Inserts sample development data

### Using psql:
```bash
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB -f sql/001_schema.sql
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB -f sql/002_seed_data.sql
```

### Using Supabase Dashboard:
1. Go to **SQL Editor**
2. Paste contents of `sql/001_schema.sql` → Run
3. Paste contents of `sql/002_seed_data.sql` → Run

### Using pgAdmin:
1. Connect to your PostgreSQL server in pgAdmin
2. Right-click your database → **Query Tool**
3. Open or paste contents of `sql/001_schema.sql` → Execute (F5)
4. Open or paste contents of `sql/002_seed_data.sql` → Execute (F5)
5. Optionally run `sql/003_insert_policies.sql` for write policies

#### pgAdmin Connection String Format

When adding a new server in pgAdmin, use these fields:

| Field | Example Value |
|-------|--------------|
| **Host** | `localhost` or `db.yourserver.com` |
| **Port** | `5432` (default PostgreSQL port) |
| **Database** | `gydschain_db` |
| **Username** | `postgres` or your db user |
| **Password** | Your database password |

Connection string format for reference:
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

Example:
```
postgresql://postgres:mypassword@localhost:5432/gydschain_db
postgresql://admin:secret@db.netlifegy.com:5432/gydschain_production
```

## 2. Configure Environment Variables

Create a `.env` file in the project root (or set in your hosting provider):

```env
VITE_DB_API_URL=https://your-api-server.com
VITE_DB_API_KEY=your-api-key
VITE_ADMIN_WALLETS=0xYourAdminWallet1,0xYourAdminWallet2
```

### For pgAdmin / Self-hosted PostgreSQL + PostgREST:
- Set up [PostgREST](https://postgrest.org) as a REST API layer on top of your PostgreSQL database
- `VITE_DB_API_URL` = Your PostgREST base URL (e.g., `http://localhost:3000` or `https://api.netlifegy.com`)
- `VITE_DB_API_KEY` = Your JWT token for PostgREST auth

### For Supabase:
- `VITE_DB_API_URL` = Your project URL (e.g., `https://abcdef.supabase.co`)
- `VITE_DB_API_KEY` = Your **anon/public** key (Settings → API → anon key)

### For custom REST API:
- `VITE_DB_API_URL` = Your API base URL
- `VITE_DB_API_KEY` = Your API key
- Ensure your API follows the PostgREST query format (e.g., `?column=eq.value`)

## 3. Verify Connection

Once configured, the app will automatically:
- Fetch tokens, transactions, and leaderboard data from the database
- Persist new token creations, burns, swaps, and liquidity operations
- Show real data instead of mock data

Check the browser console for `[DB]` prefixed messages to debug connectivity.

## 4. Admin Configuration

Configure admin wallet addresses via environment variable:

```env
VITE_ADMIN_WALLETS=0xFullAddress1,0xFullAddress2,0xFullAddress3
```

- Comma-separated list of full wallet addresses
- These wallets get access to the `/admin` dashboard
- If not set, falls back to the default dev mock address
- Supports both full hex addresses and shortened format (`0x1234...abcd`)

## 5. RLS Policies

The schema includes RLS with public read access for tokens, leaderboard, and analytics.
For write operations, you may need to add INSERT/UPDATE policies matching your auth setup.

### Example: Allow inserts with API key auth
```sql
CREATE POLICY "API inserts tokens" ON public.tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "API inserts transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "API inserts burns" ON public.burns FOR INSERT WITH CHECK (true);
CREATE POLICY "API inserts pools" ON public.liquidity_pools FOR INSERT WITH CHECK (true);
CREATE POLICY "API inserts swaps" ON public.swap_history FOR INSERT WITH CHECK (true);
CREATE POLICY "API inserts users" ON public.users FOR INSERT WITH CHECK (true);
```
