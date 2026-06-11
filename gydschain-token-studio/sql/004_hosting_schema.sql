-- GydsChain Web Hosting Platform Schema
-- Users host websites via IPFS with GYDS token payments

-- Hosting plans set by admin
CREATE TABLE IF NOT EXISTS hosting_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    storage_limit_mb INTEGER NOT NULL DEFAULT 1, -- 1 to 10 MB
    price_gyds DECIMAL(18,8) NOT NULL DEFAULT 0.5, -- monthly price in GYDS
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User hosted websites
CREATE TABLE IF NOT EXISTS hosted_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_address VARCHAR(42) NOT NULL,
    plan_id UUID REFERENCES hosting_plans(id),
    site_name VARCHAR(100) NOT NULL,
    subdomain VARCHAR(63) UNIQUE, -- e.g., mysite.gyds.host
    ipfs_cid VARCHAR(100), -- IPFS content identifier
    current_size_bytes BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_auto_generated BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ, -- subscription expiry
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hosting payment records
CREATE TABLE IF NOT EXISTS hosting_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES hosted_sites(id) ON DELETE CASCADE,
    payer_address VARCHAR(42) NOT NULL,
    amount_gyds DECIMAL(18,8) NOT NULL,
    transaction_hash VARCHAR(66),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, failed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site file index (tracks files uploaded to IPFS)
CREATE TABLE IF NOT EXISTS site_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES hosted_sites(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL, -- relative path within site
    ipfs_cid VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, file_path)
);

-- Site edit history
CREATE TABLE IF NOT EXISTS site_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES hosted_sites(id) ON DELETE CASCADE,
    editor_address VARCHAR(42) NOT NULL,
    previous_cid VARCHAR(100),
    new_cid VARCHAR(100),
    edit_summary VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hosted_sites_owner ON hosted_sites(owner_address);
CREATE INDEX IF NOT EXISTS idx_hosted_sites_subdomain ON hosted_sites(subdomain);
CREATE INDEX IF NOT EXISTS idx_hosting_payments_site ON hosting_payments(site_id);
CREATE INDEX IF NOT EXISTS idx_site_files_site ON site_files(site_id);

-- Seed default hosting plans
INSERT INTO hosting_plans (name, storage_limit_mb, price_gyds, features) VALUES
    ('Starter', 1, 0.5, '{"custom_subdomain": true}'),
    ('Basic', 3, 1.0, '{"custom_subdomain": true, "analytics": true}'),
    ('Standard', 5, 2.0, '{"custom_subdomain": true, "analytics": true, "custom_domain": false}'),
    ('Pro', 10, 5.0, '{"custom_subdomain": true, "analytics": true, "custom_domain": true}')
ON CONFLICT DO NOTHING;
