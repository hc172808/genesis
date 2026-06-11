import btcLogo from "@/assets/coins/btc.png";
import ethLogo from "@/assets/coins/eth.png";
import solLogo from "@/assets/coins/sol.png";
import usdtLogo from "@/assets/coins/usdt.png";
import avaxLogo from "@/assets/coins/avax.png";
import maticLogo from "@/assets/coins/matic.png";
import gydsLogo from "@/assets/coins/gyds.png";
import gydLogo from "@/assets/coins/gyd.png";

const COIN_LOGOS: Record<string, string> = {
  BTC: btcLogo,
  ETH: ethLogo,
  SOL: solLogo,
  USDT: usdtLogo,
  AVAX: avaxLogo,
  MATIC: maticLogo,
  GYDS: gydsLogo,
  GYD: gydLogo,
};

export const getCoinLogo = (symbol: string): string | undefined => {
  return COIN_LOGOS[symbol.toUpperCase()];
};

export default COIN_LOGOS;
