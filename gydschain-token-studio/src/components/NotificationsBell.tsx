import { Bell, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/useNotifications";
import { useTranslation } from "react-i18next";

interface Props { address: string | null }

export const NotificationsBell = ({ address }: Props) => {
  const { items, unread, markRead, markAllRead } = useNotifications(address);
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative h-9 w-9">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
          <span className="text-sm font-semibold">{t("notifications.title")}</span>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
              <Check className="w-3 h-3" /> {t("notifications.markAllRead")}
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">{t("notifications.empty")}</div>
        ) : (
          <div className="py-1">
            {items.slice(0, 10).map((n) => {
              const inner = (
                <div className={`px-3 py-2 hover:bg-muted/50 cursor-pointer ${!n.read_at ? "bg-primary/5" : ""}`} onClick={() => markRead(n.id)}>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              );
              return n.link ? <Link key={n.id} to={n.link}>{inner}</Link> : <div key={n.id}>{inner}</div>;
            })}
            <Link to="/notifications" className="block text-center text-xs text-primary py-2 border-t border-border/50 hover:underline">
              View all
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
