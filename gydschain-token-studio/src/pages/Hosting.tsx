import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Globe, Upload, Wand2, Wallet, HardDrive, Clock, CreditCard,
  FileCode, Plus, ExternalLink, Settings, Trash2, Server, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DomainManager, { type CustomDomain } from "@/components/DomainManager";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { WalletConfirmDialog } from "@/components/WalletConfirmDialog";
import type {
  HostingPlan,
  HostedSite,
} from "@/lib/hostingService";
import HostingTypeSelector, { type HostingType } from "@/components/HostingTypeSelector";
import {
  fetchHostingPlans,
  fetchUserSites,
  createSite,
  uploadToIPFS,
  generateWebsiteTemplate,
  createHostingPayment,
  renewSite,
  fetchSiteDomains,
  createSiteDomain,
  updateSiteDomain,
  deleteSiteDomain,
  setPrimaryDomain,
} from "@/lib/hostingService";
import { isDbConfigured } from "@/lib/dbService";

interface HostingPageProps {
  wallet: { address: string | null; balance: string; isConnected: boolean };
  onConnectWallet: () => void;
}

const HostingPage = ({ wallet, onConnectWallet }: HostingPageProps) => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [sites, setSites] = useState<HostedSite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<HostingPlan | null>(null);
  const [siteName, setSiteName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"create" | "upload" | "auto" | "renew">("create");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hostingType, setHostingType] = useState<HostingType>("ipfs");
  const [localServerUrl, setLocalServerUrl] = useState("");
  const [siteDomains, setSiteDomains] = useState<Record<string, CustomDomain[]>>({});
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [renewSiteTarget, setRenewSiteTarget] = useState<HostedSite | null>(null);

  const loadDomainsForSite = async (siteId: string) => {
    if (!isDbConfigured()) return;
    const dbDomains = await fetchSiteDomains(siteId);
    const mapped: CustomDomain[] = dbDomains.map((d) => ({
      id: d.id,
      domain: d.domain,
      status: d.status,
      isPrimary: d.is_primary,
      sslEnabled: d.ssl_enabled,
      addedAt: d.created_at,
      verifiedAt: d.verified_at ?? undefined,
    }));
    setSiteDomains((prev) => ({ ...prev, [siteId]: mapped }));
  };

  const handleToggleExpand = async (siteId: string) => {
    const next = expandedSite === siteId ? null : siteId;
    setExpandedSite(next);
    if (next && !siteDomains[siteId]) await loadDomainsForSite(siteId);
  };

  const handleAddDomain = async (siteId: string, domain: string) => {
    if (isDbConfigured()) {
      const created = await createSiteDomain(siteId, domain);
      if (created) {
        setSiteDomains((prev) => ({
          ...prev,
          [siteId]: [
            ...(prev[siteId] || []),
            {
              id: created.id,
              domain: created.domain,
              status: created.status,
              isPrimary: created.is_primary,
              sslEnabled: created.ssl_enabled,
              addedAt: created.created_at,
            },
          ],
        }));
        return;
      }
    }
    const newDomain: CustomDomain = {
      id: crypto.randomUUID(),
      domain,
      status: "pending",
      isPrimary: false,
      sslEnabled: false,
      addedAt: new Date().toISOString(),
    };
    setSiteDomains((prev) => ({ ...prev, [siteId]: [...(prev[siteId] || []), newDomain] }));
  };

  const handleRemoveDomain = async (siteId: string, domainId: string) => {
    if (isDbConfigured()) await deleteSiteDomain(domainId);
    setSiteDomains((prev) => ({
      ...prev,
      [siteId]: (prev[siteId] || []).filter((d) => d.id !== domainId),
    }));
    toast.success("Domain removed");
  };

  const handleSetPrimary = async (siteId: string, domainId: string) => {
    if (isDbConfigured()) await setPrimaryDomain(siteId, domainId);
    setSiteDomains((prev) => ({
      ...prev,
      [siteId]: (prev[siteId] || []).map((d) => ({ ...d, isPrimary: d.id === domainId })),
    }));
    toast.success("Primary domain updated");
  };

  const handleVerifyDomain = async (siteId: string, domainId: string) => {
    setSiteDomains((prev) => ({
      ...prev,
      [siteId]: (prev[siteId] || []).map((d) =>
        d.id === domainId ? { ...d, status: "verifying" as const } : d
      ),
    }));
    if (isDbConfigured()) await updateSiteDomain(domainId, { status: "verifying" });
    // Simulate verification (in production, poll DNS records server-side)
    setTimeout(async () => {
      const verifiedAt = new Date().toISOString();
      if (isDbConfigured()) {
        await updateSiteDomain(domainId, {
          status: "active",
          ssl_enabled: true,
          verified_at: verifiedAt,
        });
      }
      setSiteDomains((prev) => ({
        ...prev,
        [siteId]: (prev[siteId] || []).map((d) =>
          d.id === domainId ? { ...d, status: "active" as const, sslEnabled: true, verifiedAt } : d
        ),
      }));
      toast.success("Domain verified and SSL provisioned!");
    }, 3000);
  };

  const handleRenewClick = (site: HostedSite) => {
    if (Number(wallet.balance) < (selectedPlan?.price_gyds ?? 0.5)) {
      // Use the site's own plan price if available, otherwise fall back
      const plan = plans.find((p) => p.id === site.plan_id);
      const price = plan?.price_gyds ?? 0.5;
      if (Number(wallet.balance) < price) {
        toast.error(`Insufficient GYDS. Need ${price} GYDS to renew`);
        return;
      }
    }
    setRenewSiteTarget(site);
    setConfirmAction("renew");
    setShowConfirm(true);
  };

  const handleRenewConfirm = async () => {
    if (!renewSiteTarget) return;
    const plan = plans.find((p) => p.id === renewSiteTarget.plan_id);
    const price = plan?.price_gyds ?? 0.5;

    if (isDbConfigured()) {
      const updated = await renewSite(renewSiteTarget, wallet.address || "", price);
      if (updated) {
        setSites((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      }
    } else {
      // Local mock renewal
      const now = new Date();
      const base = renewSiteTarget.expires_at && new Date(renewSiteTarget.expires_at) > now
        ? new Date(renewSiteTarget.expires_at)
        : now;
      const newExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      setSites((prev) =>
        prev.map((s) =>
          s.id === renewSiteTarget.id ? { ...s, expires_at: newExpiry, is_active: true } : s
        )
      );
    }
    toast.success(`${renewSiteTarget.site_name} renewed for 30 days`);
    setRenewSiteTarget(null);
  };

  // Mock plans when DB not configured
  const defaultPlans: HostingPlan[] = [
    { id: "1", name: "Starter", storage_limit_mb: 1, price_gyds: 0.5, features: { custom_subdomain: true }, is_active: true },
    { id: "2", name: "Basic", storage_limit_mb: 3, price_gyds: 1.0, features: { custom_subdomain: true, analytics: true }, is_active: true },
    { id: "3", name: "Standard", storage_limit_mb: 5, price_gyds: 2.0, features: { custom_subdomain: true, analytics: true }, is_active: true },
    { id: "4", name: "Pro", storage_limit_mb: 10, price_gyds: 5.0, features: { custom_subdomain: true, analytics: true, custom_domain: true }, is_active: true },
  ];

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      if (isDbConfigured()) {
        const [p, s] = await Promise.all([
          fetchHostingPlans(),
          wallet.address ? fetchUserSites(wallet.address) : Promise.resolve([]),
        ]);
        setPlans(p.length > 0 ? p : defaultPlans);
        setSites(s);
      } else {
        setPlans(defaultPlans);
      }
      setIsLoading(false);
    };
    load();
  }, [wallet.address]);

  const handleCreateSite = () => {
    if (!wallet.isConnected) { onConnectWallet(); return; }
    if (!selectedPlan) { toast.error("Select a hosting plan"); return; }
    if (!siteName.trim()) { toast.error("Enter a site name"); return; }
    if (Number(wallet.balance) < selectedPlan.price_gyds) {
      toast.error(`Insufficient GYDS. Need ${selectedPlan.price_gyds} GYDS`);
      return;
    }
    setConfirmAction("create");
    setShowConfirm(true);
  };

  const handleAutoGenerate = () => {
    if (!wallet.isConnected) { onConnectWallet(); return; }
    if (!selectedPlan) { toast.error("Select a hosting plan first"); return; }
    if (Number(wallet.balance) < selectedPlan.price_gyds) {
      toast.error(`Insufficient GYDS. Need ${selectedPlan.price_gyds} GYDS`);
      return;
    }
    setSiteName(siteName || `mysite-${Date.now().toString(36)}`);
    setConfirmAction("auto");
    setShowConfirm(true);
  };

  const handleUploadSite = () => {
    if (!wallet.isConnected) { onConnectWallet(); return; }
    if (!selectedPlan) { toast.error("Select a hosting plan first"); return; }
    if (!uploadFile) { toast.error("Select an HTML file to upload"); return; }
    if (uploadFile.size > (selectedPlan.storage_limit_mb * 1024 * 1024)) {
      toast.error(`File exceeds ${selectedPlan.storage_limit_mb}MB limit`);
      return;
    }
    if (Number(wallet.balance) < selectedPlan.price_gyds) {
      toast.error(`Insufficient GYDS. Need ${selectedPlan.price_gyds} GYDS`);
      return;
    }
    setConfirmAction("upload");
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsProcessing(true);

    try {
      let content: string;
      const name = siteName.trim() || `site-${Date.now().toString(36)}`;
      const sub = subdomain.trim() || name.toLowerCase().replace(/[^a-z0-9-]/g, "-");

      if (confirmAction === "auto") {
        content = generateWebsiteTemplate(name, wallet.address || "0x0000");
      } else if (confirmAction === "upload" && uploadFile) {
        content = await uploadFile.text();
      } else {
        content = `<html><head><title>${name}</title></head><body><h1>${name}</h1></body></html>`;
      }

      let cid: string | null = null;

      if (hostingType === "ipfs") {
        // Upload to IPFS
        cid = await uploadToIPFS(content, "index.html");
      } else {
        // Local server — generate a download blob
        const blob = new Blob([content], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${name}.html`;
        a.click();
        URL.revokeObjectURL(url);
        cid = `local-${Date.now().toString(36)}`;
      }

      // Create site record
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      if (isDbConfigured()) {
        const site = await createSite({
          owner_address: wallet.address || "",
          plan_id: selectedPlan?.id,
          site_name: name,
          subdomain: sub,
          ipfs_cid: cid,
          current_size_bytes: new TextEncoder().encode(content).length,
          is_active: true,
          is_auto_generated: confirmAction === "auto",
          expires_at: expiresAt.toISOString(),
        });

        if (site) {
          await createHostingPayment({
            site_id: site.id,
            payer_address: wallet.address || "",
            amount_gyds: selectedPlan?.price_gyds || 0,
            period_start: now.toISOString(),
            period_end: expiresAt.toISOString(),
            status: "confirmed",
          });

          setSites((prev) => [site, ...prev]);
        }
      } else {
        // Mock site for demo
        const mockSite: HostedSite = {
          id: crypto.randomUUID(),
          owner_address: wallet.address || "",
          plan_id: selectedPlan?.id || "1",
          site_name: name,
          subdomain: sub,
          ipfs_cid: cid,
          current_size_bytes: new TextEncoder().encode(content).length,
          is_active: true,
          is_auto_generated: confirmAction === "auto",
          expires_at: expiresAt.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };
        setSites((prev) => [mockSite, ...prev]);
      }

      toast.success(
        hostingType === "ipfs"
          ? `Website "${name}" deployed to IPFS!`
          : `Website "${name}" ready for local hosting!`,
        {
          description: hostingType === "ipfs"
            ? `CID: ${cid?.slice(0, 16)}...`
            : "HTML file downloaded. Upload it to your server.",
        }
      );

      setSiteName("");
      setSubdomain("");
      setUploadFile(null);
    } catch (err) {
      toast.error("Failed to deploy website");
      console.error(err);
    }

    setIsProcessing(false);
  };

  const confirmDetails = () => {
    if (confirmAction === "renew" && renewSiteTarget) {
      const plan = plans.find((p) => p.id === renewSiteTarget.plan_id);
      const price = plan?.price_gyds ?? 0.5;
      const currentExpiry = renewSiteTarget.expires_at ? new Date(renewSiteTarget.expires_at) : new Date();
      const base = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
      return [
        { label: "Action", value: "Renew Subscription" },
        { label: "Site", value: renewSiteTarget.site_name },
        { label: "Plan", value: plan?.name ?? "—" },
        { label: "Extension", value: "+30 days" },
        { label: "New Expiry", value: newExpiry.toLocaleDateString() },
        { label: "Cost", value: `${price} GYDS` },
      ];
    }
    const action = confirmAction === "auto" ? "Auto-Generate Website" : confirmAction === "upload" ? "Upload Website" : "Create Website";
    return [
      { label: "Action", value: action },
      { label: "Hosting", value: hostingType === "ipfs" ? "IPFS (Decentralized)" : "Local Server" },
      { label: "Plan", value: selectedPlan?.name || "—" },
      { label: "Storage", value: `${selectedPlan?.storage_limit_mb || 0} MB` },
      { label: "Monthly Cost", value: `${selectedPlan?.price_gyds || 0} GYDS` },
      { label: "Site Name", value: siteName || "Auto-generated" },
      ...(hostingType === "local" && localServerUrl ? [{ label: "Server URL", value: localServerUrl }] : []),
    ];
  };

  const renewPrice = renewSiteTarget
    ? plans.find((p) => p.id === renewSiteTarget.plan_id)?.price_gyds ?? 0.5
    : 0;

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-heading font-bold mb-3">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">Connect your wallet to access web hosting.</p>
          <Button onClick={onConnectWallet} className="btn-gradient">
            <Wallet className="w-4 h-4 mr-2" /> Connect Wallet
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold gradient-text mb-3">
              Web Hosting
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Host your website on IPFS or your own server, paid with GYDS tokens.
            </p>
          </div>

          <Tabs defaultValue="deploy" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/30">
              <TabsTrigger value="deploy">Deploy Site</TabsTrigger>
              <TabsTrigger value="sites">My Sites ({sites.length})</TabsTrigger>
            </TabsList>

            {/* Deploy Tab */}
            <TabsContent value="deploy" className="mt-6 space-y-6">
              {/* Hosting Type */}
              <div>
                <h3 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  Hosting Type
                </h3>
                <HostingTypeSelector value={hostingType} onChange={setHostingType} />
                {hostingType === "local" && (
                  <div className="mt-4">
                    <label className="text-sm text-muted-foreground mb-1 block">Your Server URL</label>
                    <Input
                      placeholder="https://your-server.com"
                      value={localServerUrl}
                      onChange={(e) => setLocalServerUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your website files will be prepared for download. Deploy them to your server manually.
                    </p>
                  </div>
                )}
              </div>

              {/* Plan Selection */}
              <div>
                <h3 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Select a Plan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`glass-card p-4 text-left transition-all hover:border-primary/40 ${
                        selectedPlan?.id === plan.id ? "border-primary ring-1 ring-primary/30" : ""
                      }`}
                    >
                      <h4 className="font-heading font-bold text-lg">{plan.name}</h4>
                      <p className="text-2xl font-bold gradient-text my-2">
                        {plan.price_gyds} <span className="text-sm text-muted-foreground">GYDS/mo</span>
                      </p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <HardDrive className="w-3.5 h-3.5" />
                        {plan.storage_limit_mb} MB storage
                      </div>
                      <div className="mt-2 space-y-1">
                        {Object.entries(plan.features).map(([key, val]) =>
                          val ? (
                            <p key={key} className="text-xs text-muted-foreground">
                              ✓ {key.replace(/_/g, " ")}
                            </p>
                          ) : null
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Site Details */}
              {selectedPlan && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-4">
                  <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    Site Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Site Name</label>
                      <Input
                        placeholder="My Awesome Site"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Subdomain</label>
                      <div className="flex items-center">
                        <Input
                          placeholder="mysite"
                          value={subdomain}
                          onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                          className="rounded-r-none"
                        />
                        <span className="bg-muted/50 border border-l-0 border-input px-3 h-10 flex items-center text-sm text-muted-foreground rounded-r-md">
                          .gyds.host
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Upload HTML */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Upload HTML File</label>
                    <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/30 transition-colors">
                      <input
                        type="file"
                        accept=".html,.htm,.css,.js"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="html-upload"
                      />
                      <label htmlFor="html-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {uploadFile ? (
                            <span className="text-primary font-medium">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                          ) : (
                            "Click to upload HTML file"
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Max {selectedPlan.storage_limit_mb} MB • HTML, CSS, JS
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      onClick={handleUploadSite}
                      disabled={!uploadFile || isProcessing}
                      className="btn-gradient flex-1"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload & Deploy ({selectedPlan.price_gyds} GYDS)
                    </Button>
                    <Button
                      onClick={handleAutoGenerate}
                      disabled={isProcessing}
                      variant="outline"
                      className="flex-1 border-primary/30 hover:bg-primary/10"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Auto-Generate Site
                    </Button>
                    <Button
                      onClick={handleCreateSite}
                      disabled={isProcessing || !siteName.trim()}
                      variant="outline"
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Empty Site
                    </Button>
                  </div>
                </motion.div>
              )}
            </TabsContent>

            {/* My Sites Tab */}
            <TabsContent value="sites" className="mt-6">
              {sites.length === 0 ? (
                <div className="glass-card p-10 text-center">
                  <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-heading font-semibold mb-2">No Sites Yet</h3>
                  <p className="text-muted-foreground mb-4">Deploy your first website to IPFS.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sites.map((site) => {
                    const isExpired = site.expires_at ? new Date(site.expires_at) < new Date() : false;
                    const daysLeft = site.expires_at
                      ? Math.max(0, Math.ceil((new Date(site.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                      : 0;

                    return (
                      <motion.div
                        key={site.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`glass-card p-5 ${isExpired ? "opacity-60 border-destructive/30" : ""}`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              {site.is_auto_generated ? (
                                <Wand2 className="w-5 h-5 text-primary" />
                              ) : (
                                <FileCode className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium">{site.site_name}</h4>
                              <p className="text-xs text-muted-foreground font-mono">
                                {site.subdomain}.gyds.host
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <HardDrive className="w-3 h-3" />
                                {(site.current_size_bytes / 1024).toFixed(1)} KB
                              </div>
                              <div className={`flex items-center gap-1 text-xs ${isExpired ? "text-destructive" : daysLeft <= 5 ? "text-[hsl(var(--warning))]" : "text-muted-foreground"}`}>
                                <Clock className="w-3 h-3" />
                                {isExpired ? "Expired" : `${daysLeft} days left`}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {site.ipfs_cid && (
                                <a
                                  href={`https://ipfs.io/ipfs/${site.ipfs_cid}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="ghost" size="sm">
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </a>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/hosting/edit/${site.id}`)}>
                                <Settings className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {isExpired && (
                          <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <p className="text-xs text-destructive">
                              This site has expired. Renew your subscription to keep it active.
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() => handleRenewClick(site)}
                            >
                              <CreditCard className="w-3 h-3 mr-1" /> Renew
                            </Button>
                          </div>
                        )}

                        {/* Domain Management Toggle */}
                        <div className="mt-3 border-t border-border/20 pt-3">
                          <button
                            onClick={() => handleToggleExpand(site.id)}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Custom Domains ({(siteDomains[site.id] || []).length})</span>
                            {expandedSite === site.id ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                          </button>
                          {expandedSite === site.id && (
                            <div className="mt-3">
                              <DomainManager
                                siteId={site.id}
                                siteName={site.site_name}
                                subdomain={site.subdomain}
                                domains={siteDomains[site.id] || []}
                                onAddDomain={(domain) => handleAddDomain(site.id, domain)}
                                onRemoveDomain={(domainId) => handleRemoveDomain(site.id, domainId)}
                                onSetPrimary={(domainId) => handleSetPrimary(site.id, domainId)}
                                onVerifyDomain={(domainId) => handleVerifyDomain(site.id, domainId)}
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <WalletConfirmDialog
        open={showConfirm}
        onOpenChange={(o) => {
          setShowConfirm(o);
          if (!o) setRenewSiteTarget(null);
        }}
        title={
          confirmAction === "renew"
            ? "Renew Hosting Subscription"
            : confirmAction === "auto"
            ? "Auto-Generate Website"
            : confirmAction === "upload"
            ? "Deploy Website"
            : "Create Website"
        }
        description={
          confirmAction === "renew"
            ? "This will extend your hosting subscription by 30 days and charge the renewal fee in GYDS."
            : "This will deploy your website to IPFS and charge the monthly hosting fee."
        }
        details={confirmDetails()}
        fee={confirmAction === "renew" ? `${renewPrice} GYDS` : `${selectedPlan?.price_gyds || 0} GYDS`}
        onConfirm={confirmAction === "renew" ? handleRenewConfirm : handleConfirm}
      />
    </div>
  );
};

export default HostingPage;
