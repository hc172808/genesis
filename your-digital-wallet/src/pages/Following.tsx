import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, UserPlus, UserMinus, Copy, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getWalletAddress } from "@/lib/wallet-core";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/wallet/BottomNav";

interface Follow {
  id: string;
  following_address: string;
  created_at: string;
}

const Following = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const wallet = getWalletAddress();
  const [follows, setFollows] = useState<Follow[]>([]);
  const [newAddr, setNewAddr] = useState("");

  useEffect(() => {
    if (!wallet) return;
    supabase
      .from("wallet_follows")
      .select("*")
      .eq("follower_address", wallet.toLowerCase())
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setFollows(data);
      });
  }, [wallet]);

  const follow = async () => {
    const addr = newAddr.trim().toLowerCase();
    if (!addr || !wallet || addr.length < 10) return;
    const { data, error } = await supabase.from("wallet_follows").insert({
      follower_address: wallet.toLowerCase(),
      following_address: addr,
    }).select().single();
    if (!error && data) {
      setFollows([data, ...follows]);
      setNewAddr("");
      toast({ title: "Following wallet" });
    }
  };

  const unfollow = async (id: string) => {
    await supabase.from("wallet_follows").delete().eq("id", id);
    setFollows(follows.filter((f) => f.id !== id));
    toast({ title: "Unfollowed" });
  };

  const shortAddr = (a: string) => `${a.slice(0, 8)}...${a.slice(-6)}`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Following</h1>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{follows.length}</span>
        </div>

        {/* Add */}
        <div className="flex gap-2 mb-6">
          <input
            value={newAddr}
            onChange={(e) => setNewAddr(e.target.value)}
            placeholder="Enter wallet address..."
            className="flex-1 bg-card rounded-xl px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
          />
          <button onClick={follow} className="px-4 rounded-xl gradient-primary text-primary-foreground font-medium text-sm">
            <UserPlus size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {follows.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-3 bg-card rounded-xl"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {f.following_address.slice(2, 4).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-foreground">{shortAddr(f.following_address)}</p>
                <p className="text-[10px] text-muted-foreground">
                  Since {new Date(f.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(f.following_address); toast({ title: "Copied" }); }}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => unfollow(f.id)}
                className="p-2 text-red-400 hover:text-red-300"
              >
                <UserMinus size={14} />
              </button>
            </motion.div>
          ))}
        </div>

        {follows.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <UserPlus size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No wallets followed yet</p>
            <p className="text-xs mt-1">Add wallet addresses to track their activity</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Following;
