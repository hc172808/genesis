import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Menu, X, Zap, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { NetworkSwitcher } from "@/components/NetworkSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useTranslation } from "react-i18next";

interface NavbarProps {
  wallet: { address: string | null; balance: string; isConnected: boolean };
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
}

export const Navbar = ({ wallet, onConnect, onDisconnect, isConnecting }: NavbarProps) => {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [defiOpen, setDefiOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: "/", label: t("nav.home") },
    { to: "/create", label: t("nav.create") },
    {
      label: t("nav.defi"),
      children: [
        { to: "/liquidity", label: t("nav.createLiquidity") },
        { to: "/swap", label: t("nav.swap") },
        { to: "/remove-liquidity", label: t("nav.removeLiquidity") },
        { to: "/burn", label: t("nav.burn") },
        { to: "/burn-and-earn", label: t("nav.burnAndEarn") },
        { to: "/staking", label: t("nav.staking") },
      ],
    },
    {
      label: "More",
      children: [
        { to: "/governance", label: t("nav.governance") },
        { to: "/launchpad", label: t("nav.launchpad") },
        { to: "/hosting", label: t("nav.hosting") },
        { to: "/leaderboard", label: t("nav.leaderboard") },
      ],
    },
    { to: "/dashboard", label: t("nav.dashboard") },
    { to: "/gallery", label: t("nav.gallery") },
    { to: "/analytics", label: t("nav.analytics") },
    { to: "/profile", label: t("nav.profile") },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card-strong border-b border-border/30">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center btn-gradient p-0">
            <Zap className="w-5 h-5" />
          </div>
          <span className="font-heading text-base sm:text-xl font-bold gradient-text whitespace-nowrap">Netlify Coin Tools</span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link, i) =>
            "children" in link ? (
              <div key={link.label} className="relative">
                <button
                  onClick={() => { if (i === 2) setDefiOpen(!defiOpen); else setMoreOpen(!moreOpen); }}
                  onBlur={() => setTimeout(() => { setDefiOpen(false); setMoreOpen(false); }, 200)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    link.children.some((c) => location.pathname === c.to)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {link.label} <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <AnimatePresence>
                  {((i === 2 && defiOpen) || (i === 3 && moreOpen)) && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                      className="absolute top-full ltr:left-0 rtl:right-0 mt-1 w-52 glass-card-strong border border-border/50 rounded-xl p-2 z-50"
                    >
                      {link.children.map((child) => (
                        <Link
                          key={child.to} to={child.to}
                          onClick={() => { setDefiOpen(false); setMoreOpen(false); }}
                          className={`block px-3 py-2 rounded-lg text-sm ${
                            location.pathname === child.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                key={link.to} to={link.to!}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {link.label}
              </Link>
            )
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden sm:block"><NetworkSwitcher /></div>
          <NetworkStatusIndicator />
          <NotificationsBell address={wallet.address} />
          <ThemeToggle />
          <LanguageSwitcher />
          {wallet.isConnected ? (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{wallet.balance} GYDS</span>
              <button
                onClick={onDisconnect}
                className="glass-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
                {wallet.address}
              </button>
            </div>
          ) : (
            <Button onClick={onConnect} disabled={isConnecting} className="btn-gradient text-sm hidden sm:flex">
              <Wallet className="w-4 h-4 mr-2" />
              {isConnecting ? t("common.connecting") : t("common.connect")}
            </Button>
          )}
          <button
            className="lg:hidden text-foreground p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="lg:hidden glass-card-strong border-t border-border/30 max-h-[80vh] overflow-y-auto"
          >
            <div className="p-4 flex flex-col gap-1">
              {navLinks.map((link) =>
                "children" in link ? (
                  <div key={link.label}>
                    <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{link.label}</p>
                    {link.children.map((child) => (
                      <Link
                        key={child.to} to={child.to}
                        onClick={() => setMobileOpen(false)}
                        className={`block px-6 py-3 rounded-lg text-sm min-h-[44px] ${
                          location.pathname === child.to ? "bg-primary/10 text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={link.to} to={link.to!}
                    onClick={() => setMobileOpen(false)}
                    className={`px-3 py-3 rounded-lg text-sm font-medium min-h-[44px] flex items-center ${
                      location.pathname === link.to ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              )}
              <div className="sm:hidden"><NetworkSwitcher /></div>
              {!wallet.isConnected && (
                <Button onClick={() => { onConnect(); setMobileOpen(false); }} className="btn-gradient mt-2">
                  <Wallet className="w-4 h-4 mr-2" /> {t("common.connect")}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
