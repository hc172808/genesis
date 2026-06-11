import { useState, useEffect } from "react";
import { Globe, Plus, Edit2, Trash2, HardDrive, Users, DollarSign, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { HostingPlan, HostedSite } from "@/lib/hostingService";
import { fetchHostingPlans } from "@/lib/hostingService";
import { isDbConfigured } from "@/lib/dbService";

interface AdminHostingTabProps {
  wallet: { address: string | null };
}

interface EditingPlan {
  id?: string;
  name: string;
  storage_limit_mb: number;
  price_gyds: number;
  features: Record<string, boolean>;
  is_active: boolean;
}

const defaultPlans: HostingPlan[] = [
  { id: "1", name: "Starter", storage_limit_mb: 1, price_gyds: 0.5, features: { custom_subdomain: true }, is_active: true },
  { id: "2", name: "Basic", storage_limit_mb: 3, price_gyds: 1.0, features: { custom_subdomain: true, analytics: true }, is_active: true },
  { id: "3", name: "Standard", storage_limit_mb: 5, price_gyds: 2.0, features: { custom_subdomain: true, analytics: true }, is_active: true },
  { id: "4", name: "Pro", storage_limit_mb: 10, price_gyds: 5.0, features: { custom_subdomain: true, analytics: true, custom_domain: true }, is_active: true },
];

const mockSites: HostedSite[] = [
  {
    id: "s1", owner_address: "0x7a3B...9f4E", plan_id: "1", site_name: "Demo Site",
    subdomain: "demo", ipfs_cid: "QmXyz123...", current_size_bytes: 15360,
    is_active: true, is_auto_generated: true, expires_at: new Date(Date.now() + 20 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(), updated_at: new Date().toISOString(),
  },
];

const AdminHostingTab = ({ wallet }: AdminHostingTabProps) => {
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [sites, setSites] = useState<HostedSite[]>(mockSites);
  const [editingPlan, setEditingPlan] = useState<EditingPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (isDbConfigured()) {
        const p = await fetchHostingPlans();
        setPlans(p.length > 0 ? p : defaultPlans);
      } else {
        setPlans(defaultPlans);
      }
    };
    load();
  }, []);

  const startEdit = (plan: HostingPlan) => {
    setEditingPlan({ ...plan });
    setIsCreating(false);
  };

  const startCreate = () => {
    setEditingPlan({
      name: "",
      storage_limit_mb: 1,
      price_gyds: 0.5,
      features: { custom_subdomain: true },
      is_active: true,
    });
    setIsCreating(true);
  };

  const savePlan = () => {
    if (!editingPlan || !editingPlan.name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    if (isCreating) {
      const newPlan: HostingPlan = {
        ...editingPlan,
        id: crypto.randomUUID(),
        name: editingPlan.name,
        storage_limit_mb: editingPlan.storage_limit_mb,
        price_gyds: editingPlan.price_gyds,
        features: editingPlan.features,
        is_active: editingPlan.is_active,
      };
      setPlans((prev) => [...prev, newPlan]);
      toast.success(`Plan "${newPlan.name}" created`);
    } else {
      setPlans((prev) =>
        prev.map((p) => (p.id === editingPlan.id ? { ...p, ...editingPlan } as HostingPlan : p))
      );
      toast.success(`Plan "${editingPlan.name}" updated`);
    }
    setEditingPlan(null);
  };

  const deletePlan = (planId: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    toast.success("Plan deleted");
  };

  const toggleFeature = (key: string) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: { ...editingPlan.features, [key]: !editingPlan.features[key] },
    });
  };

  const totalSites = sites.length;
  const activeSites = sites.filter((s) => s.is_active).length;
  const totalStorage = sites.reduce((acc, s) => acc + s.current_size_bytes, 0);

  return (
    <div className="space-y-6">
      {/* Hosting Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <Globe className="w-5 h-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Total Sites</p>
          <p className="text-2xl font-heading font-bold">{totalSites}</p>
        </div>
        <div className="glass-card p-4">
          <Users className="w-5 h-5 text-[hsl(var(--success))] mb-2" />
          <p className="text-xs text-muted-foreground">Active Sites</p>
          <p className="text-2xl font-heading font-bold">{activeSites}</p>
        </div>
        <div className="glass-card p-4">
          <HardDrive className="w-5 h-5 text-[hsl(var(--warning))] mb-2" />
          <p className="text-xs text-muted-foreground">Total Storage</p>
          <p className="text-2xl font-heading font-bold">{(totalStorage / 1024).toFixed(1)} KB</p>
        </div>
      </div>

      {/* Plans Management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Hosting Plans
          </h3>
          <Button size="sm" className="btn-gradient" onClick={startCreate}>
            <Plus className="w-4 h-4 mr-1" /> New Plan
          </Button>
        </div>

        {/* Plan Editor */}
        {editingPlan && (
          <div className="glass-card p-5 mb-4 space-y-4 border-primary/30">
            <h4 className="font-heading font-semibold">
              {isCreating ? "Create New Plan" : `Edit: ${editingPlan.name}`}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Plan Name</Label>
                <Input
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="mt-1 bg-muted/50"
                  placeholder="e.g. Pro"
                />
              </div>
              <div>
                <Label>Storage (MB)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={editingPlan.storage_limit_mb}
                  onChange={(e) => setEditingPlan({ ...editingPlan, storage_limit_mb: Number(e.target.value) })}
                  className="mt-1 bg-muted/50"
                />
              </div>
              <div>
                <Label>Price (GYDS/mo)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={editingPlan.price_gyds}
                  onChange={(e) => setEditingPlan({ ...editingPlan, price_gyds: Number(e.target.value) })}
                  className="mt-1 bg-muted/50"
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Features</Label>
              <div className="flex flex-wrap gap-2">
                {["custom_subdomain", "analytics", "custom_domain", "ssl", "api_access"].map((feat) => (
                  <button
                    key={feat}
                    onClick={() => toggleFeature(feat)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      editingPlan.features[feat]
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "bg-muted/30 border-border/30 text-muted-foreground"
                    }`}
                  >
                    {editingPlan.features[feat] ? "✓" : "○"} {feat.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="btn-gradient" onClick={savePlan}>
                <Save className="w-4 h-4 mr-1" /> {isCreating ? "Create" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingPlan(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Plans Table */}
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left p-4 text-muted-foreground font-medium">Plan</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Storage</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Price</th>
                <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Features</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="p-4 font-medium">{plan.name}</td>
                  <td className="p-4">{plan.storage_limit_mb} MB</td>
                  <td className="p-4 text-primary font-mono">{plan.price_gyds} GYDS</td>
                  <td className="p-4 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(plan.features)
                        .filter(([, v]) => v)
                        .map(([k]) => (
                          <span key={k} className="px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">
                            {k.replace(/_/g, " ")}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(plan)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deletePlan(plan.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Hosted Sites */}
      <div>
        <h3 className="font-heading font-semibold text-lg flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-primary" /> All Hosted Sites
        </h3>
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left p-4 text-muted-foreground font-medium">Site</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Owner</th>
                <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Size</th>
                <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Expires</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => {
                const isExpired = site.expires_at ? new Date(site.expires_at) < new Date() : false;
                return (
                  <tr key={site.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="p-4">
                      <p className="font-medium">{site.site_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{site.subdomain}.gyds.host</p>
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{site.owner_address}</td>
                    <td className="p-4 hidden md:table-cell">{(site.current_size_bytes / 1024).toFixed(1)} KB</td>
                    <td className="p-4 text-xs text-muted-foreground hidden md:table-cell">
                      {site.expires_at ? new Date(site.expires_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        isExpired ? "bg-destructive/20 text-destructive" :
                        site.is_active ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" :
                        "bg-muted/30 text-muted-foreground"
                      }`}>
                        {isExpired ? "Expired" : site.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {sites.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No hosted sites yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminHostingTab;
