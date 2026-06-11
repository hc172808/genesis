import { useState } from "react";
import { Globe, Plus, Trash2, ExternalLink, Check, AlertCircle, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface CustomDomain {
  id: string;
  domain: string;
  status: "pending" | "verifying" | "active" | "failed";
  isPrimary: boolean;
  sslEnabled: boolean;
  addedAt: string;
  verifiedAt?: string;
}

interface DomainManagerProps {
  siteId: string;
  siteName: string;
  subdomain: string | null;
  domains: CustomDomain[];
  onAddDomain: (domain: string) => Promise<void>;
  onRemoveDomain: (domainId: string) => Promise<void>;
  onSetPrimary: (domainId: string) => Promise<void>;
  onVerifyDomain: (domainId: string) => Promise<void>;
}

const STATUS_CONFIG: Record<CustomDomain["status"], { label: string; color: string; icon: typeof Check }> = {
  pending: { label: "Pending DNS", color: "text-[hsl(var(--warning))]", icon: AlertCircle },
  verifying: { label: "Verifying", color: "text-primary", icon: Loader2 },
  active: { label: "Active", color: "text-[hsl(var(--success))]", icon: Check },
  failed: { label: "Failed", color: "text-destructive", icon: AlertCircle },
};

const DomainManager = ({
  siteId,
  siteName,
  subdomain,
  domains,
  onAddDomain,
  onRemoveDomain,
  onSetPrimary,
  onVerifyDomain,
}: DomainManagerProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showDnsDialog, setShowDnsDialog] = useState<CustomDomain | null>(null);

  const handleAdd = async () => {
    const d = newDomain.trim().toLowerCase();
    if (!d || !d.includes(".")) {
      toast.error("Enter a valid domain (e.g. example.com)");
      return;
    }
    if (domains.some((dm) => dm.domain === d)) {
      toast.error("Domain already added");
      return;
    }
    setIsAdding(true);
    try {
      await onAddDomain(d);
      setNewDomain("");
      setShowAddDialog(false);
      toast.success(`Domain ${d} added! Configure DNS to complete setup.`);
    } catch {
      toast.error("Failed to add domain");
    }
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-heading font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Custom Domains
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect your own domain to this site
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Domain
        </Button>
      </div>

      {/* Default subdomain */}
      {subdomain && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-mono">{subdomain}.gyds.host</p>
              <p className="text-[10px] text-muted-foreground">Default subdomain</p>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">Active</span>
        </div>
      )}

      {/* Custom domains list */}
      {domains.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No custom domains configured yet.
        </div>
      ) : (
        <div className="space-y-2">
          {domains.map((dm) => {
            const cfg = STATUS_CONFIG[dm.status];
            const StatusIcon = cfg.icon;
            return (
              <div key={dm.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <StatusIcon className={`w-4 h-4 shrink-0 ${cfg.color} ${dm.status === "verifying" ? "animate-spin" : ""}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-mono truncate">{dm.domain}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${cfg.color}`}>{cfg.label}</span>
                      {dm.isPrimary && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Primary</span>
                      )}
                      {dm.sslEnabled && (
                        <span className="text-[10px] text-muted-foreground">🔒 SSL</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {dm.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setShowDnsDialog(dm)}
                    >
                      DNS Setup
                    </Button>
                  )}
                  {dm.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => onVerifyDomain(dm.id)}
                    >
                      Verify
                    </Button>
                  )}
                  {dm.status === "active" && !dm.isPrimary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => onSetPrimary(dm.id)}
                    >
                      Set Primary
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onRemoveDomain(dm.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add domain dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
            <DialogDescription>
              Connect your own domain to {siteName}. You'll need to configure DNS records at your registrar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Domain Name</Label>
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
                placeholder="example.com"
                className="mt-1.5 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the root domain or subdomain you want to connect
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isAdding || !newDomain.trim()}>
              {isAdding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DNS setup dialog */}
      <Dialog open={!!showDnsDialog} onOpenChange={() => setShowDnsDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>DNS Configuration</DialogTitle>
            <DialogDescription>
              Add these records at your domain registrar for {showDnsDialog?.domain}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Required DNS Records</p>
              {[
                { type: "A", name: "@", value: "185.158.133.1", ttl: "3600" },
                { type: "A", name: "www", value: "185.158.133.1", ttl: "3600" },
                { type: "TXT", name: "_gyds", value: `gyds_verify=${siteId.slice(0, 12)}`, ttl: "3600" },
              ].map((record, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Type</span>
                    <p className="font-mono font-medium">{record.type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Name</span>
                    <p className="font-mono font-medium">{record.name}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Value</span>
                    <p className="font-mono font-medium truncate">{record.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-muted-foreground">
              <p>⏱ DNS propagation can take up to 72 hours. Click <strong>Verify</strong> once your records are configured.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDnsDialog(null)}>Close</Button>
            <Button onClick={() => {
              if (showDnsDialog) onVerifyDomain(showDnsDialog.id);
              setShowDnsDialog(null);
            }}>
              <Check className="w-4 h-4 mr-2" /> Verify Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DomainManager;
