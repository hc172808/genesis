import { getCoinLogo } from "@/lib/coin-logos";

interface CoinIconProps {
  symbol: string;
  size?: number;
  className?: string;
  fallbackColor?: string;
}

const CoinIcon = ({ symbol, size = 32, className = "", fallbackColor }: CoinIconProps) => {
  const logo = getCoinLogo(symbol);

  if (logo) {
    return (
      <img
        src={logo}
        alt={`${symbol} logo`}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${fallbackColor || "from-muted to-secondary"} flex items-center justify-center text-xs font-bold text-foreground ${className}`}
      style={{ width: size, height: size }}
    >
      {symbol.charAt(0)}
    </div>
  );
};

export default CoinIcon;
