import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { isDexDeployed } from "@/lib/blockchain/dexConfig";

/**
 * Renders a warning banner when no DEX has been deployed/registered for the
 * active network. Returns `null` when the DEX is configured.
 */
export const DexNotDeployedGate = () => {
  if (isDexDeployed()) return null;
  return (
    <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
      <div className="flex gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-warning">DEX is not deployed on this network yet</p>
          <p className="text-muted-foreground text-xs">
            Liquidity pools and swaps require an on-chain Factory + Router. An admin
            can deploy or register the contracts from{" "}
            <Link to="/admin" className="text-primary underline">/admin → DEX tab</Link>.
            Solidity sources are bundled in <code className="text-foreground">contracts/</code>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DexNotDeployedGate;
