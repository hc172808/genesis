import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Usb, Bluetooth, Smartphone, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/wallet/BottomNav";

const DEVICES = [
  { name: "Ledger Nano X", icon: Usb, connection: "USB / Bluetooth", supported: true },
  { name: "Ledger Nano S Plus", icon: Usb, connection: "USB", supported: true },
  { name: "Trezor Model T", icon: Usb, connection: "USB", supported: true },
  { name: "Trezor Safe 3", icon: Usb, connection: "USB", supported: true },
  { name: "Keystone Pro", icon: Smartphone, connection: "QR Code", supported: true },
  { name: "GridPlus Lattice1", icon: Bluetooth, connection: "Bluetooth", supported: false },
];

const HardwareWallet = () => {
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState<string | null>(null);

  const connect = async (name: string) => {
    setConnecting(name);
    // Simulate connection
    setTimeout(() => {
      setConnecting(null);
      setConnected(name);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Hardware Wallet</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Shield size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Enhanced Security</p>
            <p className="text-xs text-muted-foreground">
              Connect your hardware wallet to sign transactions with your physical device.
              Your private keys never leave the hardware wallet.
            </p>
          </div>
        </motion.div>

        <div className="space-y-3">
          {DEVICES.map((d, i) => (
            <motion.div
              key={d.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-card rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <d.icon size={22} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.connection}</p>
                </div>
                {connected === d.name ? (
                  <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
                    <CheckCircle size={14} /> Connected
                  </div>
                ) : !d.supported ? (
                  <span className="text-xs text-muted-foreground/50">Coming soon</span>
                ) : (
                  <button
                    onClick={() => connect(d.name)}
                    disabled={connecting === d.name}
                    className="px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                  >
                    {connecting === d.name ? "Connecting..." : "Connect"}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {connected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-green-500/10 rounded-2xl p-4 flex items-center gap-3"
          >
            <CheckCircle size={20} className="text-green-400" />
            <div>
              <p className="text-sm font-semibold text-green-400">{connected} connected</p>
              <p className="text-xs text-muted-foreground">Transactions will require device confirmation</p>
            </div>
          </motion.div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default HardwareWallet;
