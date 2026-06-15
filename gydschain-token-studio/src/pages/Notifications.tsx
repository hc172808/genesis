import { motion } from "framer-motion";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useNotifications } from "@/hooks/useNotifications";

interface Props { wallet: { address: string | null; isConnected: boolean }; onConnectWallet: () => void }

const NotificationsPage = ({ wallet, onConnectWallet }: Props) => {
  const { t } = useTranslation();
  const { items, unread, markRead, markAllRead } = useNotifications(wallet.address);

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md">
          <Bell className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold mb-3">{t("notifications.title")}</h2>
          <p className="text-muted-foreground mb-6">Connect your wallet to see notifications.</p>
          <Button onClick={onConnectWallet} className="btn-gradient">{t("common.connect")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-heading font-bold">{t("notifications.title")}</h1>
            {unread > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead}>
                <Check className="w-4 h-4 mr-1" /> {t("notifications.markAllRead")}
              </Button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground">{t("notifications.empty")}</div>
          ) : (
            <div className="space-y-2">
              {items.map((n) => (
                <div key={n.id} onClick={() => markRead(n.id)} className={`glass-card p-4 cursor-pointer ${!n.read_at ? "border-primary/50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{n.title}</p>
                      {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                      <p className="text-xs text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default NotificationsPage;
