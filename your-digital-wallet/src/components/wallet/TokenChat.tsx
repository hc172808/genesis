import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, User, ChevronDown, ChevronUp, Circle } from "lucide-react";
import { getWalletAddress } from "@/lib/wallet-core";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
  wallet_address: string;
  message: string;
  created_at: string;
}

const MAX_MESSAGE_LENGTH = 280;

const formatTime = (ts: string): string => {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 60000) return "just now";
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
};

interface TokenChatProps {
  symbol: string;
  tokenName: string;
}

const TokenChat = ({ symbol, tokenName }: TokenChatProps) => {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [input, setInput] = useState("");
  const wallet = getWalletAddress();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const symbolLower = symbol.toLowerCase();

  // Load messages & subscribe to realtime
  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from("token_chat_messages")
        .select("*")
        .eq("token_symbol", symbolLower)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) setMessages(data);
    };
    loadMessages();

    const channel = supabase
      .channel(`chat-${symbolLower}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "token_chat_messages",
        filter: `token_symbol=eq.${symbolLower}`,
      }, (payload) => {
        setMessages((prev) => [...prev.slice(-99), payload.new as ChatMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [symbolLower]);

  // Presence: update heartbeat & count online users
  useEffect(() => {
    if (!wallet || !expanded) return;

    const upsertPresence = async () => {
      await supabase.from("token_chat_presence").upsert(
        { token_symbol: symbolLower, wallet_address: wallet.toLowerCase(), last_seen: new Date().toISOString() },
        { onConflict: "token_symbol,wallet_address" }
      );
    };
    upsertPresence();
    const interval = setInterval(upsertPresence, 15000);

    // Count online (seen in last 30s)
    const countOnline = async () => {
      const cutoff = new Date(Date.now() - 30000).toISOString();
      const { count } = await supabase
        .from("token_chat_presence")
        .select("*", { count: "exact", head: true })
        .eq("token_symbol", symbolLower)
        .gte("last_seen", cutoff);
      setOnlineCount(count ?? 0);
    };
    countOnline();
    const countInterval = setInterval(countOnline, 10000);

    return () => { clearInterval(interval); clearInterval(countInterval); };
  }, [wallet, expanded, symbolLower]);

  useEffect(() => {
    if (expanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, expanded]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !wallet) return;
    if (text.length > MAX_MESSAGE_LENGTH) return;

    setInput("");
    await supabase.from("token_chat_messages").insert({
      token_symbol: symbolLower,
      wallet_address: wallet.toLowerCase(),
      message: text,
    });
  };

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const isOwn = (addr: string) => wallet?.toLowerCase() === addr.toLowerCase();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-6">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{tokenName} Chat</h2>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{messages.length}</span>
          {expanded && onlineCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-green-400">
              <Circle size={6} fill="currentColor" /> {onlineCount} online
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-card rounded-2xl overflow-hidden">
              <div className="h-64 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <MessageCircle size={24} className="mb-2 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs">Be the first to talk about {symbol}!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwn(msg.wallet_address) ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] ${isOwn(msg.wallet_address) ? "order-2" : ""}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                            isOwn(msg.wallet_address) ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                          }`}>
                            <User size={10} />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {isOwn(msg.wallet_address) ? "You" : shortAddr(msg.wallet_address)}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50">{formatTime(msg.created_at)}</span>
                        </div>
                        <div className={`rounded-xl px-3 py-2 text-sm ${
                          isOwn(msg.wallet_address) ? "bg-primary/15 text-foreground" : "bg-secondary text-foreground"
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="border-t border-border p-3 flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={wallet ? `Message about ${symbol}...` : "Connect wallet to chat"}
                  disabled={!wallet}
                  className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 disabled:opacity-50"
                />
                <button onClick={handleSend} disabled={!input.trim() || !wallet}
                  className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 transition-opacity">
                  <Send size={16} />
                </button>
              </div>
              <div className="px-3 pb-2">
                <span className="text-[10px] text-muted-foreground/50">{input.length}/{MAX_MESSAGE_LENGTH}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TokenChat;
