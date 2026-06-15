import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, ExternalLink, Upload, ArrowLeft, ArrowRight, Loader2, Plus, Trash2, Shield, Wallet, Globe, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { TokenMetadata, DeployedToken } from "@/lib/blockchain/types";
import { activeConfig, getExplorerUrl } from "@/lib/blockchain/config";
import {
  type AuthorityType,
  AUTHORITY_LABELS,
} from "@/lib/blockchain/gplAuthority";
import { WebsiteTemplateGallery, generateTokenWebsite } from "@/components/WebsiteTemplateGallery";
import HostingTypeSelector, { type HostingType } from "@/components/HostingTypeSelector";

interface CreateTokenPageProps {
  isWalletConnected: boolean;
  walletAddress?: string | null;
  walletBalance?: string;
  onDeploy: (
    meta: TokenMetadata,
    gplOptions?: {
      revokedAuthorities?: Set<string>;
      enableMultisig?: boolean;
      multisigSigners?: string[];
      multisigThreshold?: number;
      multisigAuthorities?: string[];
    },
    websiteHtml?: string | null
  ) => Promise<DeployedToken>;
  isDeploying: boolean;
  onConnectWallet: () => void;
}

const STEPS = ["Token Info", "Details", "Website", "GPL Authority", "Multisig", "Preview", "Deploy"];
const REVOCABLE_AUTHORITIES: AuthorityType[] = ["mint", "freeze", "burn", "close", "update", "delegate"];

const CreateTokenPage = ({ isWalletConnected, walletAddress, walletBalance = "0", onDeploy, isDeploying, onConnectWallet }: CreateTokenPageProps) => {
  const [step, setStep] = useState(0);
  const [deployed, setDeployed] = useState<DeployedToken | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const [revokedAuthorities, setRevokedAuthorities] = useState<Set<AuthorityType>>(new Set(["freeze"]));
  const [enableMultisig, setEnableMultisig] = useState(false);
  const [multisigThreshold, setMultisigThreshold] = useState(2);
  const [multisigSigners, setMultisigSigners] = useState<string[]>([""]);
  const [multisigAuthorities, setMultisigAuthorities] = useState<Set<AuthorityType>>(new Set(["mint", "freeze", "update"]));

  // Website step state
  const [websiteOption, setWebsiteOption] = useState<"template" | "upload" | "skip">("template");
  const [websiteHtml, setWebsiteHtml] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showWebsitePreview, setShowWebsitePreview] = useState(false);
  const [hostingType, setHostingType] = useState<HostingType>("ipfs");

  const [form, setForm] = useState<TokenMetadata>({
    name: "",
    symbol: "",
    decimals: 6,
    totalSupply: "1000000000",
    description: "",
    logoUrl: "",
    website: "",
    twitter: "",
    telegram: "",
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { scanFile } = await import("@/lib/virusScanner");
    const scan = await scanFile(file, { category: "image" });
    if (!scan.safe) {
      toast.error(`Upload blocked: ${scan.threats.join("; ")}`);
      e.target.value = "";
      return;
    }
    if (scan.warnings.length) toast.warning(scan.warnings.join("; "));
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    updateField("logoUrl", url);
  };

  const updateField = (key: keyof TokenMetadata, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAuthority = (type: AuthorityType) => {
    setRevokedAuthorities((prev) => { const next = new Set(prev); if (next.has(type)) next.delete(type); else next.add(type); return next; });
  };

  const toggleMultisigAuthority = (type: AuthorityType) => {
    setMultisigAuthorities((prev) => { const next = new Set(prev); if (next.has(type)) next.delete(type); else next.add(type); return next; });
  };

  const addSigner = () => setMultisigSigners((prev) => [...prev, ""]);
  const removeSigner = (idx: number) => setMultisigSigners((prev) => prev.filter((_, i) => i !== idx));
  const updateSigner = (idx: number, value: string) => setMultisigSigners((prev) => prev.map((s, i) => (i === idx ? value : s)));

  const revokeCount = revokedAuthorities.size;
  const totalFee = activeConfig.fees.tokenCreation + revokeCount * 0.1 + (enableMultisig ? 0.2 : 0) + (websiteOption !== "skip" && websiteHtml ? 0.5 : 0);

  const handleUploadWebsiteHtml = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".html,.htm";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        setWebsiteHtml(text);
        setWebsiteOption("upload");
        setSelectedTemplateId(null);
        toast.success(`Loaded ${file.name}`);
      }
    };
    input.click();
  };

  const handleSelectTemplate = (html: string) => {
    setWebsiteHtml(html);
    setWebsiteOption("template");
    // Find template id
    const templates = ["token-landing", "portfolio", "blog", "landing"];
    for (const id of templates) {
      // Simple check - just set the first match
      setSelectedTemplateId(id);
      break;
    }
  };

  const canProceed = () => {
    if (step === 0) return form.name.trim().length >= 2 && form.symbol.trim().length >= 2 && form.symbol.trim().length <= 8;
    if (step === 1) return form.description.trim().length > 0 && Number(form.totalSupply) > 0;
    // Step 2 (website) always allows proceed (skip is valid)
    if (step === 4 && enableMultisig) {
      const validSigners = multisigSigners.filter((s) => s.startsWith("0x") && s.length >= 10);
      return validSigners.length >= 2 && multisigThreshold >= 1 && multisigThreshold <= validSigners.length;
    }
    return true;
  };

  const handleDeploy = async () => {
    if (!isWalletConnected) { onConnectWallet(); return; }
    if (Number(walletBalance) < totalFee) {
      toast.error(`Insufficient balance. You need at least ${totalFee.toFixed(1)} GYDS. Current: ${walletBalance} GYDS`);
      return;
    }
    try {
      const result = await onDeploy(form, {
        revokedAuthorities: revokedAuthorities as Set<string>,
        enableMultisig,
        multisigSigners: multisigSigners.filter((s) => s.startsWith("0x")),
        multisigThreshold,
        multisigAuthorities: Array.from(multisigAuthorities),
      }, websiteOption !== "skip" ? websiteHtml : null);

      setDeployed(result);
      setStep(6);
      toast.success("GPL Token deployed successfully! You are the first holder.");
    } catch {
      toast.error("Deployment failed. Please try again.");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  // Wallet guard
  if (!isWalletConnected) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 text-center max-w-md">
          <Wallet className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold mb-3">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">Connect your wallet with GYDS balance to create tokens.</p>
          <Button onClick={onConnectWallet} className="btn-gradient"><Wallet className="w-4 h-4 mr-2" /> Connect Wallet</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-heading font-bold mb-2">Create <span className="gradient-text">GPL Token</span></h1>
          <p className="text-muted-foreground mb-8">Deploy a GPL-standard token on {activeConfig.networkName}</p>

          {/* Progress */}
          <div className="flex items-center gap-1 mb-10 overflow-x-auto">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={`step-indicator shrink-0 ${i < step ? "step-indicator-completed" : i === step ? "step-indicator-active" : "step-indicator-pending"}`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs hidden md:block truncate ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-[hsl(var(--success))]" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 0: Token Info */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-6 space-y-5">
                <div>
                  <Label>Token Name *</Label>
                  <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. GydsGold" className="mt-1.5 bg-muted/50 border-border/50" maxLength={50} />
                </div>
                <div>
                  <Label>Token Symbol *</Label>
                  <Input value={form.symbol} onChange={(e) => updateField("symbol", e.target.value.toUpperCase())} placeholder="e.g. GGOLD" className="mt-1.5 bg-muted/50 border-border/50" maxLength={10} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Decimals</Label>
                    <Input type="number" value={form.decimals} onChange={(e) => updateField("decimals", parseInt(e.target.value) || 0)} className="mt-1.5 bg-muted/50 border-border/50" min={0} max={18} />
                  </div>
                  <div>
                    <Label>Total Supply *</Label>
                    <Input value={form.totalSupply} onChange={(e) => updateField("totalSupply", e.target.value)} className="mt-1.5 bg-muted/50 border-border/50" placeholder="1000000000" />
                  </div>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary shrink-0" />
                  This token follows the <strong className="text-foreground">GPL Token Program Standard</strong> with full authority model.
                </div>
              </motion.div>
            )}

            {/* Step 1: Details + Logo */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-6 space-y-5">
                <div>
                  <Label>Description *</Label>
                  <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Describe your token..." className="mt-1.5 bg-muted/50 border-border/50 min-h-[100px]" maxLength={500} />
                </div>
                <div>
                  <Label>Token Logo (PNG/JPG) *</Label>
                  <div className="mt-1.5">
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                    <label htmlFor="logo-upload" className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border/50 bg-muted/30 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Token logo" className="w-14 h-14 rounded-xl object-cover ring-2 ring-primary/30" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{logoFile ? logoFile.name : "Click to upload logo"}</p>
                        <p className="text-xs text-muted-foreground">{logoFile ? `${(logoFile.size / 1024).toFixed(1)} KB` : "PNG, JPG or WebP · Max 5MB"}</p>
                      </div>
                    </label>
                  </div>
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://..." className="mt-1.5 bg-muted/50 border-border/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Twitter / X</Label>
                    <Input value={form.twitter} onChange={(e) => updateField("twitter", e.target.value)} placeholder="@handle" className="mt-1.5 bg-muted/50 border-border/50" />
                  </div>
                  <div>
                    <Label>Telegram</Label>
                    <Input value={form.telegram} onChange={(e) => updateField("telegram", e.target.value)} placeholder="@group" className="mt-1.5 bg-muted/50 border-border/50" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Website */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-6 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-5 h-5 text-primary" />
                  <h3 className="font-heading font-semibold text-lg">Token Website</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Create a website for your token. Choose a template, upload your own HTML, or skip for now.
                </p>

                {/* Option tabs */}
                <div className="flex gap-2">
                  {([
                    { id: "template" as const, label: "Pick Template", icon: "🎨" },
                    { id: "upload" as const, label: "Upload HTML", icon: "📄" },
                    { id: "skip" as const, label: "Skip", icon: "⏭️" },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setWebsiteOption(opt.id);
                        if (opt.id === "skip") { setWebsiteHtml(null); setSelectedTemplateId(null); }
                        if (opt.id === "template" && !websiteHtml) {
                          const autoHtml = generateTokenWebsite(form.name || "My Token", form.symbol || "TKN", form.description || "");
                          setWebsiteHtml(autoHtml);
                          setSelectedTemplateId("token-landing");
                        }
                      }}
                      className={`flex-1 p-3 rounded-xl border text-center text-sm transition-all ${
                        websiteOption === opt.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <span className="text-lg block mb-1">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {websiteOption === "template" && (
                  <WebsiteTemplateGallery
                    onSelectTemplate={(html) => {
                      setWebsiteHtml(html);
                    }}
                    onUploadHtml={handleUploadWebsiteHtml}
                    selectedTemplateId={selectedTemplateId}
                    tokenName={form.name}
                    tokenSymbol={form.symbol}
                    tokenDescription={form.description}
                  />
                )}

                {websiteOption === "upload" && (
                  <div className="space-y-3">
                    <Button variant="outline" onClick={handleUploadWebsiteHtml} className="w-full border-dashed border-border/50 gap-2">
                      <Upload className="w-4 h-4" /> {websiteHtml ? "Replace HTML File" : "Upload HTML File"}
                    </Button>
                    {websiteHtml && (
                      <div className="bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/30 rounded-lg p-3 text-sm text-[hsl(var(--success))] flex items-center gap-2">
                        <Check className="w-4 h-4" /> HTML file loaded ({(new TextEncoder().encode(websiteHtml).length / 1024).toFixed(1)} KB)
                      </div>
                    )}
                  </div>
                )}

                {websiteOption === "skip" && (
                  <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground text-center">
                    <p>No website will be created. You can always add one later from the Hosting page.</p>
                  </div>
                )}

                {/* Preview */}
                {websiteHtml && websiteOption !== "skip" && (
                  <div>
                    <Button variant="ghost" size="sm" onClick={() => setShowWebsitePreview(!showWebsitePreview)} className="gap-1.5 text-xs mb-2">
                      <Eye className="w-3.5 h-3.5" /> {showWebsitePreview ? "Hide" : "Show"} Preview
                    </Button>
                    {showWebsitePreview && (
                      <div className="rounded-xl overflow-hidden border border-border/30">
                        <iframe
                          srcDoc={websiteHtml}
                          className="w-full h-[250px] bg-white"
                          sandbox="allow-scripts"
                          title="Website Preview"
                        />
                      </div>
                    )}
                  </div>
                )}

                {websiteOption !== "skip" && websiteHtml && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Where should your website be hosted?</p>
                      <HostingTypeSelector value={hostingType} onChange={setHostingType} compact />
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary shrink-0" />
                      {hostingType === "ipfs"
                        ? <>Website will be deployed to IPFS alongside your token. Additional fee: <strong className="text-foreground ml-1">0.5 GYDS</strong></>
                        : <>Website files will be downloaded for you to host on your own server. Additional fee: <strong className="text-foreground ml-1">0.5 GYDS</strong></>
                      }
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: GPL Authority */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <h3 className="font-heading font-semibold text-lg">GPL Authority Settings</h3>
                </div>
                <p className="text-sm text-muted-foreground">Configure which authorities to revoke at deployment. Revoked authorities are <strong>permanent</strong>.</p>
                <div className="space-y-3">
                  {REVOCABLE_AUTHORITIES.map((authType) => {
                    const info = AUTHORITY_LABELS[authType];
                    const isRevoked = revokedAuthorities.has(authType);
                    return (
                      <button key={authType} onClick={() => toggleAuthority(authType)} className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${isRevoked ? "border-primary bg-primary/10" : "border-border/50 bg-muted/30"}`}>
                        <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 ${isRevoked ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                          {isRevoked && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{info.icon}</span>
                            <p className="font-semibold text-sm">
                              Revoke {info.label}
                              {authType === "freeze" && <span className="text-xs text-[hsl(var(--warning))] ml-1">(Required for LP)</span>}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{info.description}. Cost: 0.1 GYDS</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-2">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Always Active</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{AUTHORITY_LABELS.owner.icon}</span>
                    <span><strong>{AUTHORITY_LABELS.owner.label}</strong> — {AUTHORITY_LABELS.owner.description}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{AUTHORITY_LABELS.program.icon}</span>
                    <span><strong>{AUTHORITY_LABELS.program.label}</strong> — {AUTHORITY_LABELS.program.description}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Multisig */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-6 space-y-5">
                <h3 className="font-heading font-semibold text-lg">Multisig Authority (Optional)</h3>
                <p className="text-sm text-muted-foreground">Transfer selected authorities to a multisig PDA requiring multiple signers.</p>
                <button onClick={() => setEnableMultisig(!enableMultisig)} className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${enableMultisig ? "border-primary bg-primary/10" : "border-border/50 bg-muted/30"}`}>
                  <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 ${enableMultisig ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                    {enableMultisig && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Enable Multisig Authority</p>
                    <p className="text-xs text-muted-foreground mt-1">Create a multisig PDA to control token authorities. Cost: 0.2 GYDS</p>
                  </div>
                </button>
                {enableMultisig && (
                  <div className="space-y-4 border-t border-border/30 pt-4">
                    <div>
                      <Label>Approval Threshold (m of n)</Label>
                      <Input type="number" value={multisigThreshold} onChange={(e) => setMultisigThreshold(Math.max(1, parseInt(e.target.value) || 1))} className="mt-1.5 bg-muted/50 border-border/50 w-24" min={1} max={multisigSigners.length} />
                      <p className="text-xs text-muted-foreground mt-1">{multisigThreshold} of {multisigSigners.filter((s) => s.length > 0).length} signers required</p>
                    </div>
                    <div>
                      <Label>Signer Addresses</Label>
                      <div className="space-y-2 mt-1.5">
                        {multisigSigners.map((signer, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input value={signer} onChange={(e) => updateSigner(idx, e.target.value)} placeholder="0x..." className="bg-muted/50 border-border/50 font-mono text-sm" />
                            {multisigSigners.length > 1 && (
                              <Button variant="ghost" size="icon" onClick={() => removeSigner(idx)} className="shrink-0"><Trash2 className="w-4 h-4 text-muted-foreground" /></Button>
                            )}
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addSigner} className="border-border/50 text-xs gap-1"><Plus className="w-3 h-3" /> Add Signer</Button>
                      </div>
                    </div>
                    <div>
                      <Label>Authorities Controlled by Multisig</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {(["mint", "freeze", "burn", "close", "update", "delegate"] as AuthorityType[]).map((authType) => {
                          const info = AUTHORITY_LABELS[authType];
                          const isSelected = multisigAuthorities.has(authType);
                          const isRevoked = revokedAuthorities.has(authType);
                          return (
                            <button key={authType} onClick={() => !isRevoked && toggleMultisigAuthority(authType)} disabled={isRevoked} className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all ${isRevoked ? "opacity-40 cursor-not-allowed border-border/30 bg-muted/20" : isSelected ? "border-primary bg-primary/10" : "border-border/50 bg-muted/30 hover:border-primary/30"}`}>
                              <span>{info.icon}</span>
                              <span className="font-medium">{info.label.replace(" Authority", "")}</span>
                              {isRevoked && <span className="text-[0.6rem] text-muted-foreground ml-auto">Revoked</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 5: Preview */}
            {step === 5 && !deployed && (
              <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-6 space-y-4">
                <h3 className="font-heading font-semibold text-lg mb-4">GPL Token Preview</h3>
                <div className="flex items-center gap-3 mb-4">
                  {logoPreview && <img src={logoPreview} alt="Logo" className="w-12 h-12 rounded-full ring-2 ring-primary/30" />}
                  <div>
                    <p className="font-heading font-bold text-lg">{form.name}</p>
                    <p className="text-primary font-mono text-sm">{form.symbol}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[["Decimals", String(form.decimals)], ["Total Supply", Number(form.totalSupply).toLocaleString()], ["Creator (1st Holder)", walletAddress || "—"]].map(([label, value]) => (
                    <div key={label} className="bg-muted/30 rounded-lg p-3">
                      <span className="text-muted-foreground text-xs">{label}</span>
                      <p className="font-medium mt-0.5 truncate">{value}</p>
                    </div>
                  ))}
                  {websiteHtml && websiteOption !== "skip" && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <span className="text-muted-foreground text-xs">Website</span>
                      <p className="font-medium mt-0.5 flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-primary" /> {hostingType === "ipfs" ? "IPFS Hosted" : "Local Server"}</p>
                    </div>
                  )}
                </div>
                {form.description && (
                  <div className="bg-muted/30 rounded-lg p-3 text-sm">
                    <span className="text-muted-foreground text-xs">Description</span>
                    <p className="mt-0.5">{form.description}</p>
                  </div>
                )}
                <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1.5">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-2">GPL Authorities</p>
                  {REVOCABLE_AUTHORITIES.map((authType) => {
                    const isRevoked = revokedAuthorities.has(authType);
                    const isMultisig = enableMultisig && multisigAuthorities.has(authType) && !isRevoked;
                    return (
                      <div key={authType} className="flex items-center gap-2 text-xs">
                        <span>{AUTHORITY_LABELS[authType].icon}</span>
                        <span className="flex-1">{AUTHORITY_LABELS[authType].label}</span>
                        {isRevoked ? <span className="text-destructive font-medium">🚫 Revoked</span> : isMultisig ? <span className="text-primary font-medium">🔐 Multisig</span> : <span className="text-[hsl(var(--success))] font-medium">✅ Creator</span>}
                      </div>
                    );
                  })}
                </div>
                {enableMultisig && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm space-y-1">
                    <p className="font-medium text-xs">🔐 Multisig: {multisigThreshold} of {multisigSigners.filter((s) => s.length > 0).length} signers</p>
                    {multisigSigners.filter((s) => s.length > 0).map((s, i) => (
                      <p key={i} className="font-mono text-xs text-muted-foreground truncate">Signer {i + 1}: {s}</p>
                    ))}
                  </div>
                )}
                <div className="bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 rounded-lg p-3 text-sm text-[hsl(var(--warning))]">
                  ⚠️ Total fee: {totalFee.toFixed(1)} GYDS | Your balance: {walletBalance} GYDS
                  {Number(walletBalance) < totalFee && (
                    <span className="block text-destructive text-xs mt-1">⛔ Insufficient balance!</span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 6: Deployed */}
            {step === 6 && deployed && (
              <motion.div key="s6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-6 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/20 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-[hsl(var(--success))]" />
                </div>
                <h3 className="font-heading font-bold text-2xl">GPL Token Deployed! 🎉</h3>
                <p className="text-sm text-muted-foreground">The entire supply has been minted to your wallet. You are the first holder.</p>
                <div className="space-y-3 text-left">
                  {[
                    ["Contract Address", deployed.contractAddress],
                    ["Transaction Hash", deployed.transactionHash],
                    ...(deployed.gplConfig ? [["PDA Address", deployed.gplConfig.pda.address]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                      <div className="text-sm min-w-0 flex-1">
                        <span className="text-muted-foreground text-xs">{label}</span>
                        <p className="font-mono text-sm mt-0.5 truncate">{value}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => copyToClipboard(value, label)} className="p-1.5 rounded-md hover:bg-muted/50"><Copy className="w-4 h-4 text-muted-foreground" /></button>
                        <a href={getExplorerUrl(label === "Contract Address" ? "token" : "tx", value)} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-muted/50"><ExternalLink className="w-4 h-4 text-muted-foreground" /></a>
                      </div>
                    </div>
                  ))}
                </div>
                {deployed.gplConfig && (
                  <div className="bg-muted/30 rounded-lg p-4 text-left space-y-2">
                    <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> GPL Authority Status</p>
                    {deployed.gplConfig.authorities.map((auth) => (
                      <div key={auth.type} className="flex items-center gap-2 text-xs">
                        <span>{AUTHORITY_LABELS[auth.type].icon}</span>
                        <span className="flex-1">{AUTHORITY_LABELS[auth.type].label}</span>
                        {auth.isRevoked ? <span className="text-destructive">Revoked</span> : <span className="font-mono text-muted-foreground truncate max-w-[120px]">{auth.address.slice(0, 8)}...</span>}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          {step < 6 && (
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="border-border/50">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              {step < 5 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="btn-gradient">
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleDeploy} disabled={isDeploying || Number(walletBalance) < totalFee} className="btn-gradient">
                  {isDeploying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deploying...</> : "Deploy GPL Token 🚀"}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CreateTokenPage;
