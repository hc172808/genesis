-- Custom domains for hosted sites
CREATE TABLE IF NOT EXISTS site_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES hosted_sites(id) ON DELETE CASCADE NOT NULL,
    domain VARCHAR(253) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, verifying, active, failed
    is_primary BOOLEAN DEFAULT false,
    ssl_enabled BOOLEAN DEFAULT false,
    verification_token VARCHAR(100),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(domain)
);

CREATE INDEX IF NOT EXISTS idx_site_domains_site ON site_domains(site_id);
CREATE INDEX IF NOT EXISTS idx_site_domains_domain ON site_domains(domain);

-- Ensure only one primary domain per site
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_domains_one_primary
    ON site_domains(site_id) WHERE is_primary = true;
