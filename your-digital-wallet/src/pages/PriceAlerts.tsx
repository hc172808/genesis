import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Bell, Trash2, Plus, BellOff, History, Settings as SettingsIcon,
  Download, Upload, Volume2, VolumeX, Vibrate, BellRing, Search, Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import BottomNav from "@/components/wallet/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  type PriceAlert, type AlertLogEntry, type AlertSettings,
  getAlerts, addAlert, removeAlert, toggleAlert, updateAlert,
  getLog, clearLog,
  getSettings, saveSettings,
  exportAlerts, importAlerts,
  registerSymbolMeta,
  requestNotificationPermission, canPushNotify,
  playAlertSound, vibrate,
} from "@/lib/price-alerts";
import {
  fetchPrices, formatPrice, type PriceData,
  validateSymbolWithCoinGecko,
} from "@/lib/price-fetcher";
import { usePriceAlertMonitor } from "@/hooks/use-price-alert-monitor";
import NotificationPermissionCard from "@/components/wallet/NotificationPermissionCard";
import CloudSyncCard from "@/components/wallet/CloudSyncCard";
import { syncStateToSW, bindSWMessageBridge } from "@/lib/alerts-sw-bridge";

const PriceAlerts = () => {
  // Snappier polling while on this page
  usePriceAlertMonitor(10_000);

  // Refresh UI when the background SW reports a trigger
  useEffect(() => bindSWMessageBridge(() => {
    setAlerts(getAlerts());
    setLog(getLog());
  }), []);

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [log, setLog] = useState<AlertLogEntry[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [settings, setSettings] = useState<AlertSettings>(getSettings());

  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // New-alert form
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState("");
  const [validating, setValidating] = useState(false);
  const [validatedName, setValidatedName] = useState<string | null>(null);

  const [importText, setImportText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setAlerts(getAlerts());
    setLog(getLog());
  };

  const refreshPrices = async () => {
    const list = getAlerts().map((a) => a.symbol.toUpperCase());
    const uniq = [...new Set(list)];
    if (uniq.length === 0) return;
    const p = await fetchPrices(uniq);
    setPrices((prev) => ({ ...prev, ...p }));
  };

  // Initial + frequent in-page refresh
  useEffect(() => {
    refresh();
    refreshPrices();
    const id = setInterval(() => {
      refresh();
      refreshPrices();
    }, 8000);
    return () => clearInterval(id);
  }, []);

  // Mirror current alerts/settings to the background service worker
  useEffect(() => { syncStateToSW(); }, [alerts, settings]);

  // Validate custom symbol against CoinGecko
  useEffect(() => {
    setValidatedName(null);
    const sym = symbol.trim();
    if (!sym) return;
    let cancelled = false;
    setValidating(true);
    const t = setTimeout(async () => {
      const res = await validateSymbolWithCoinGecko(sym);
      if (cancelled) return;
      setValidating(false);
      if (res) {
        setValidatedName(res.name);
        registerSymbolMeta(res.symbol, res.id, res.name);
        const p = await fetchPrices([res.symbol]);
        setPrices((prev) => ({ ...prev, ...p }));
      } else {
        setValidatedName(null);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [symbol]);

  const handleAdd = () => {
    const sym = symbol.trim().toUpperCase();
    const t = parseFloat(threshold);
    if (!sym) return toast.error("Enter a token symbol");
    if (!validatedName) return toast.error("Symbol not found on CoinGecko");
    if (isNaN(t) || t <= 0) return toast.error("Enter a valid threshold");
    addAlert({ symbol: sym, direction, threshold: t });
    toast.success(`Alert set: ${sym} ${direction} ${formatPrice(t)}`);
    setSymbol(""); setThreshold(""); setValidatedName(null);
    setOpen(false);
    refresh();
  };

  const handleSettings = (patch: Partial<AlertSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const handleEnablePush = async () => {
    const perm = await requestNotificationPermission();
    if (perm === "granted") {
      handleSettings({ push: true });
      toast.success("Push notifications enabled");
    } else {
      toast.error("Notifications blocked. Enable them in your browser settings.");
      handleSettings({ push: false });
    }
  };

  const handleExport = () => {
    const data = exportAlerts();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gyds-price-alerts-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const handleImport = (mode: "merge" | "replace") => {
    try {
      const res = importAlerts(importText, mode);
      toast.success(`Imported ${res.imported} alerts (${res.total} total)`);
      setImportText("");
      setImportOpen(false);
      setSettings(getSettings());
      refresh();
      refreshPrices();
    } catch (e: any) {
      toast.error(e?.message || "Invalid backup");
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((t) => setImportText(t));
  };

  const sortedAlerts = useMemo(
    () => [...alerts].sort((a, b) => Number(b.active) - Number(a.active) || b.createdAt - a.createdAt),
    [alerts]
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-display font-semibold">Price Alerts</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-10 h-10 rounded-full bg-card flex items-center justify-center"
              title="Settings"
            >
              <SettingsIcon size={18} />
            </button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Plus size={20} />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Price Alert</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Token symbol</label>
                    <div className="relative">
                      <Input
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        placeholder="e.g. BTC, ETH, PEPE"
                        autoFocus
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {validating ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      </div>
                    </div>
                    <p className={`text-xs mt-1 ${validatedName ? "text-success" : "text-muted-foreground"}`}>
                      {validating
                        ? "Checking CoinGecko…"
                        : validatedName
                          ? `✓ ${validatedName}${prices[symbol.toUpperCase()] ? ` · ${formatPrice(prices[symbol.toUpperCase()].usd)}` : ""}`
                          : symbol ? "Symbol not found" : "Validates against CoinGecko"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Direction</label>
                    <Select value={direction} onValueChange={(v) => setDirection(v as "above" | "below")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="above">Goes above</SelectItem>
                        <SelectItem value="below">Drops below</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Threshold (USD)</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 70000"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAdd} className="w-full" disabled={!validatedName}>
                    Create Alert
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <NotificationPermissionCard />
        <CloudSyncCard onPulled={() => { refresh(); refreshPrices(); setSettings(getSettings()); }} />

        {/* Backup row */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download size={14} className="mr-1" /> Export
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            <Upload size={14} className="mr-1" /> Import
          </Button>
        </div>

        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Active alerts</h2>
        {sortedAlerts.length === 0 ? (
          <div className="bg-card rounded-xl p-6 text-center text-muted-foreground text-sm">
            <Bell className="mx-auto mb-2 opacity-50" size={24} />
            No alerts yet. Tap + to create one.
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {sortedAlerts.map((a, i) => {
              const cur = prices[a.symbol.toUpperCase()]?.usd;
              const sound = a.sound ?? settings.sound;
              const vibeOn = a.vibration ?? settings.vibration;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">
                        {a.symbol}{" "}
                        <span className="text-muted-foreground font-normal text-sm">
                          {a.direction} {formatPrice(a.threshold)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.triggeredAt
                          ? `✓ Triggered at ${formatPrice(a.threshold)} · ${new Date(a.triggeredAt).toLocaleTimeString()}`
                          : cur
                            ? `Now ${formatPrice(cur)} · ${a.active ? "watching" : "paused"}`
                            : a.active ? "Watching…" : "Paused"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { updateAlert(a.id, { sound: !sound }); refresh(); }}
                        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                        title="Toggle sound"
                      >
                        {sound ? <Volume2 size={14} /> : <VolumeX size={14} className="text-muted-foreground" />}
                      </button>
                      <button
                        onClick={() => { updateAlert(a.id, { vibration: !vibeOn }); refresh(); }}
                        className={`w-8 h-8 rounded-full bg-secondary flex items-center justify-center ${vibeOn ? "" : "text-muted-foreground"}`}
                        title="Toggle vibration"
                      >
                        <Vibrate size={14} />
                      </button>
                      <button
                        onClick={() => { toggleAlert(a.id); refresh(); }}
                        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                        title={a.active ? "Pause" : "Resume"}
                      >
                        {a.active ? <Bell size={14} /> : <BellOff size={14} />}
                      </button>
                      <button
                        onClick={() => { removeAlert(a.id); refresh(); }}
                        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <History size={14} /> History
          </h2>
          {log.length > 0 && (
            <button
              onClick={() => { clearLog(); refresh(); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No triggers yet.</p>
        ) : (
          <div className="space-y-2">
            {log.map((e) => (
              <div key={e.id} className="bg-card rounded-xl p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {e.symbol} {e.direction} {formatPrice(e.threshold)}
                  </span>
                  <span className="text-success font-semibold">{formatPrice(e.price)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(e.triggeredAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alert Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Sensitivity</label>
              <Select
                value={settings.sensitivity}
                onValueChange={(v) => handleSettings({ sensitivity: v as AlertSettings["sensitivity"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — every 2 min (saves battery)</SelectItem>
                  <SelectItem value="normal">Normal — every 30 sec</SelectItem>
                  <SelectItem value="high">High — every 5 sec</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-muted-foreground" />
                <span className="text-sm">Sound</span>
              </div>
              <Switch
                checked={settings.sound}
                onCheckedChange={(v) => { handleSettings({ sound: v }); if (v) playAlertSound(); }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vibrate size={16} className="text-muted-foreground" />
                <span className="text-sm">Vibration</span>
              </div>
              <Switch
                checked={settings.vibration}
                onCheckedChange={(v) => { handleSettings({ vibration: v }); if (v) vibrate(); }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-sm">Push notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {canPushNotify() ? "Permission granted" : "Requires permission"}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.push && canPushNotify()}
                onCheckedChange={(v) => { v ? handleEnablePush() : handleSettings({ push: false }); }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Alerts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onPickFile} />
            <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()}>
              <Upload size={14} className="mr-2" /> Choose JSON file
            </Button>
            <p className="text-xs text-muted-foreground text-center">or paste JSON below</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"version":2,"alerts":[...]}'
              className="w-full h-32 bg-secondary rounded-lg p-3 text-xs font-mono outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" disabled={!importText} onClick={() => handleImport("merge")}>
              Merge
            </Button>
            <Button variant="destructive" disabled={!importText} onClick={() => handleImport("replace")}>
              Replace all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default PriceAlerts;
