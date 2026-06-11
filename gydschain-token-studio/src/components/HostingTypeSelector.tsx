import { Globe, Server } from "lucide-react";

export type HostingType = "ipfs" | "local";

interface HostingTypeSelectorProps {
  value: HostingType;
  onChange: (type: HostingType) => void;
  compact?: boolean;
}

const options = [
  {
    id: "ipfs" as const,
    label: "IPFS (Decentralized)",
    description: "Host on IPFS for censorship-resistant, permanent storage. Accessible via any IPFS gateway worldwide.",
    icon: Globe,
    badge: "Recommended",
  },
  {
    id: "local" as const,
    label: "Local Server",
    description: "Host on your own server. You provide the server URL — full control over uptime and configuration.",
    icon: Server,
    badge: "Self-hosted",
  },
];

const HostingTypeSelector = ({ value, onChange, compact = false }: HostingTypeSelectorProps) => {
  return (
    <div className={compact ? "flex gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`text-left p-4 rounded-xl border transition-all ${
            value === opt.id
              ? "border-primary bg-primary/10 ring-1 ring-primary/30"
              : "border-border/50 bg-muted/20 hover:border-primary/30"
          } ${compact ? "flex-1" : ""}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <opt.icon className={`w-4 h-4 ${value === opt.id ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${value === opt.id ? "text-foreground" : "text-muted-foreground"}`}>
              {opt.label}
            </span>
            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
              value === opt.id ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
            }`}>
              {opt.badge}
            </span>
          </div>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{opt.description}</p>
          )}
        </button>
      ))}
    </div>
  );
};

export default HostingTypeSelector;
