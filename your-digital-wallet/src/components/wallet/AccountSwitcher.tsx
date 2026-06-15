import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Check, User } from "lucide-react";
import { getAccounts, getActiveAccountIndex, setActiveAccount, addNewAccount, type DerivedAccount } from "@/lib/multi-account";
import { exportMnemonic } from "@/lib/wallet-core";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onSwitch?: () => void;
}

const AccountSwitcher = ({ onSwitch }: Props) => {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<DerivedAccount[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setAccounts(getAccounts());
    setActiveIndex(getActiveAccountIndex());
  }, []);

  const handleSwitch = (index: number) => {
    setActiveAccount(index);
    setActiveIndex(index);
    setOpen(false);
    toast({ title: `Switched to ${accounts.find((a) => a.index === index)?.name || "Account"}` });
    onSwitch?.();
    window.location.reload();
  };

  const handleAdd = async () => {
    setAdding(true);
    try {
      // Need password to get mnemonic — prompt user
      const password = prompt("Enter wallet password to derive new account:");
      if (!password) { setAdding(false); return; }
      const mnemonic = await exportMnemonic(password);
      if (!mnemonic) {
        toast({ title: "This wallet was imported via private key", description: "Multi-account requires a seed phrase wallet", variant: "destructive" });
        setAdding(false);
        return;
      }
      const newAcc = await addNewAccount(mnemonic);
      setAccounts(getAccounts());
      toast({ title: `${newAcc.name} created`, description: newAcc.address.slice(0, 10) + "..." });
    } catch (err: any) {
      toast({ title: "Failed to add account", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  if (accounts.length <= 1 && !open) {
    return null; // Don't show switcher for single account until they interact
  }

  const active = accounts.find((a) => a.index === activeIndex);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card hover:bg-secondary/50 transition-colors text-sm"
      >
        <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
          <User size={10} className="text-primary-foreground" />
        </div>
        <span className="text-foreground font-medium truncate max-w-[120px]">
          {active?.name || "Account 1"}
        </span>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {accounts.map((acc) => (
              <button
                key={acc.index}
                onClick={() => handleSwitch(acc.index)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                  {acc.index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{acc.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{acc.address}</p>
                </div>
                {acc.index === activeIndex && <Check size={16} className="text-primary shrink-0" />}
              </button>
            ))}
            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left border-t border-border"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus size={14} className="text-primary" />
              </div>
              <span className="text-sm font-medium text-primary">
                {adding ? "Creating..." : "Add Account"}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccountSwitcher;
