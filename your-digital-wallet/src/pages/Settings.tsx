import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, Bell, Moon, HelpCircle, LogOut, ChevronRight, ArrowLeft, Lock, Fingerprint, Key, Sun, Monitor, Mail, MessageSquare, FileText, Globe, Wallet, Download, Timer } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/wallet/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { APP_VERSION } from "@/lib/network-config";
import { getWalletAddress, deleteWallet } from "@/lib/wallet-core";
import { getAutoLockTimeout, setAutoLockTimeout, AUTO_LOCK_OPTIONS, lockSession } from "@/lib/session-lock";
import { isAdminWallet } from "@/lib/admin-auth";
import AppUpdateCard from "@/components/wallet/AppUpdateCard";

type SettingsPanel = null | "profile" | "security" | "notifications" | "appearance" | "help";

const Settings = () => {
  const [activePanel, setActivePanel] = useState<SettingsPanel>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [biometrics, setBiometrics] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [txAlerts, setTxAlerts] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const walletAddress = getWalletAddress();
  const showAdmin = isAdminWallet(walletAddress);

  const SETTINGS = [
    { icon: Wallet, label: "Wallet", desc: "Export, import, backup", panel: "profile" as SettingsPanel },
    { icon: Shield, label: "Security", desc: "2FA, biometrics, backup", panel: "security" as SettingsPanel },
    { icon: Bell, label: "Notifications", desc: "Alerts & push settings", panel: "notifications" as SettingsPanel },
    { icon: Moon, label: "Appearance", desc: "Theme & display", panel: "appearance" as SettingsPanel },
    { icon: HelpCircle, label: "Help & Support", desc: "FAQ & contact us", panel: "help" as SettingsPanel },
  ];

  const handleLogout = () => {
    deleteWallet();
    toast({ title: "Wallet removed from device" });
    navigate("/setup");
    window.location.reload();
  };

  const renderPanel = () => {
    switch (activePanel) {
      case "profile":
        return (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-display font-bold text-primary-foreground">
                  {walletAddress ? walletAddress.slice(2, 4).toUpperCase() : "W"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">My Wallet</p>
                  <p className="text-xs text-muted-foreground truncate">{walletAddress}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Link
                to="/wallet-export"
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card hover:bg-secondary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Download size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Export / Backup Wallet</p>
                  <p className="text-xs text-muted-foreground">View recovery phrase or private key</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Link>
            </div>
          </div>
        );
      case "security":
        return (
          <div className="space-y-1">
            {[
              { icon: Lock, label: "Two-Factor Authentication", desc: "Extra layer of security", toggle: true, value: twoFA, onChange: setTwoFA },
              { icon: Fingerprint, label: "Biometric Login", desc: "Use Face ID or fingerprint", toggle: true, value: biometrics, onChange: setBiometrics },
              { icon: Key, label: "Change Password", desc: "Update your password", toggle: false },
              { icon: Key, label: "Backup Phrase", desc: "View your recovery phrase", toggle: false, link: "/wallet-export" },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                {item.link ? (
                  <Link to={item.link} className="flex items-center gap-4 p-4 rounded-xl hover:bg-card transition-colors">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                      <item.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-card transition-colors">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                      <item.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    {item.toggle ? (
                      <Switch checked={item.value} onCheckedChange={item.onChange} />
                    ) : (
                      <ChevronRight size={16} className="text-muted-foreground" />
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {/* Auto-lock timer */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.24 }} className="pt-3">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-card">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                  <Timer size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Auto-Lock</p>
                  <p className="text-xs text-muted-foreground">Lock wallet after inactivity</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 px-4">
                {AUTO_LOCK_OPTIONS.map((opt) => (
                  <button key={opt.ms} onClick={() => { setAutoLockTimeout(opt.ms); toast({ title: `Auto-lock: ${opt.label}` }); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      getAutoLockTimeout() === opt.ms ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Lock now button */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <button onClick={() => { lockSession(); window.location.reload(); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-card transition-colors text-left mt-2">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                  <Lock size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">Lock Now</p>
                  <p className="text-xs text-muted-foreground">Immediately lock your wallet</p>
                </div>
              </button>
            </motion.div>
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-1">
            {[
              { icon: Bell, label: "Push Notifications", desc: "Receive push alerts", value: pushNotifications, onChange: setPushNotifications },
              { icon: Bell, label: "Price Alerts", desc: "Get notified on price changes", value: priceAlerts, onChange: setPriceAlerts },
              { icon: Bell, label: "Transaction Alerts", desc: "Alerts for sends & receives", value: txAlerts, onChange: setTxAlerts },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-4 p-4 rounded-xl hover:bg-card transition-colors">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                  <item.icon size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={item.value} onCheckedChange={item.onChange} />
              </motion.div>
            ))}
          </div>
        );
      case "appearance":
        return (
          <div className="space-y-1">
            {[
              { icon: Moon, label: "Dark Mode", desc: "Use dark theme", active: darkMode },
              { icon: Sun, label: "Light Mode", desc: "Use light theme", active: !darkMode },
              { icon: Monitor, label: "System Default", desc: "Follow device settings", active: false },
            ].map((item, i) => (
              <motion.button key={item.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                onClick={() => { if (item.label === "Dark Mode") setDarkMode(true); else if (item.label === "Light Mode") setDarkMode(false); toast({ title: `${item.label} selected` }); }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left ${item.active ? "bg-card glow-primary" : "hover:bg-card"}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.active ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  <item.icon size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                {item.active && <div className="w-2 h-2 rounded-full gradient-primary" />}
              </motion.button>
            ))}
          </div>
        );
      case "help":
        return (
          <div className="space-y-1">
            {[
              { icon: FileText, label: "FAQ", desc: "Frequently asked questions" },
              { icon: Mail, label: "Contact Support", desc: "Email our team" },
              { icon: MessageSquare, label: "Live Chat", desc: "Chat with an agent" },
            ].map((item, i) => (
              <motion.button key={item.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                onClick={() => toast({ title: item.label, description: "Coming soon!" })}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-card transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                  <item.icon size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </motion.button>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <AnimatePresence mode="wait">
          {activePanel ? (
            <motion.div key={activePanel} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }}>
              <button onClick={() => setActivePanel(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
                <ArrowLeft size={20} />
                <span className="font-medium">Back</span>
              </button>
              <h1 className="text-xl font-display font-bold text-foreground mb-6">
                {SETTINGS.find((s) => s.panel === activePanel)?.label}
              </h1>
              {renderPanel()}
            </motion.div>
          ) : (
            <motion.div key="main" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }}>
              <h1 className="text-xl font-display font-bold text-foreground mb-6">Settings</h1>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 mb-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-xl font-display font-bold text-primary-foreground">
                  {walletAddress ? walletAddress.slice(2, 4).toUpperCase() : "W"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">My Wallet</p>
                  <p className="text-xs text-muted-foreground truncate">{walletAddress || "No wallet"}</p>
                </div>
              </motion.div>

              <div className="space-y-1">
                {SETTINGS.map((item, i) => (
                  <motion.button key={item.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    onClick={() => setActivePanel(item.panel)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-card transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                      <item.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </motion.button>
                ))}
              </div>

              <div className="mt-6">
                <AppUpdateCard />
              </div>

              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} onClick={handleLogout}
                className="w-full mt-8 flex items-center justify-center gap-2 text-destructive hover:text-destructive/80 transition-colors py-3"
              >
                <LogOut size={18} />
                <span className="font-semibold">Remove Wallet</span>
              </motion.button>

              <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground px-2">
                <span>v{APP_VERSION}</span>
                <div className="flex items-center gap-3">
                  <Link to="/connected-apps" className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <Globe size={12} /> dApps
                  </Link>
                  <Link to="/network" className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <Globe size={12} /> Network
                  </Link>
                  {showAdmin && (
                    <Link to="/admin" className="flex items-center gap-1 hover:text-foreground transition-colors">
                      <Shield size={12} /> Admin
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
};

export default Settings;
