import { Home, ArrowUpRight, ArrowDownUp, Compass, Clock } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

const TABS = [
  { icon: Home, label: "Home", path: "/" },
  { icon: ArrowUpRight, label: "Send", path: "/send" },
  { icon: ArrowDownUp, label: "Swap", path: "/swap" },
  { icon: Compass, label: "Explore", path: "/prediction" },
  { icon: Clock, label: "History", path: "/history" },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-2">
        {TABS.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
};

export default BottomNav;
