/**
 * /pool-test — admin-gated end-to-end test harness for the DEX.
 *
 * Runs scripted scenarios:
 *   1. Verify DEX is configured
 *   2. Read network status (latest block)
 *   3. (optional) Deploy a fresh test ERC-20 to use as token-B
 *   4. Approve token to router
 *   5. Add liquidity (token + small amount of GYDS)
 *   6. Quote a swap, then execute swap
 *   7. Read updated pool reserves
 *   8. Remove a portion of liquidity
 *
 * Each step shows pass/fail + tx hash. Real transactions on the active network.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, Loader2, Play, AlertTriangle, ExternalLink, Beaker,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { isAdminWallet } from "@/lib/admin";
import { useWallet } from "@/hooks/useWallet";
import { activeConfig, getExplorerUrl } from "@/lib/blockchain/config";
import { getDexAddresses } from "@/lib/blockchain/dexConfig";
import { rpcCall } from "@/lib/blockchain/rpcClient";
import {
  toWei,
  fromWei,
  approveIfNeeded,
  addLiquidityNative,
  swapNativeForToken,
  removeLiquidity,
  getPairAddress,
} from "@/lib/blockchain/dexRouter";
import { getPoolInfo, calculateSwapOutput } from "@/lib/blockchain/indexer";

type StepStatus = "pending" | "running" | "passed" | "failed" | "skipped";

interface Step {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
  txHash?: string;
}

const initialSteps: Step[] = [
  { id: "config", label: "DEX configuration present", status: "pending" },
  { id: "rpc", label: "RPC connectivity (block number)", status: "pending" },
  { id: "wallet", label: "Wallet has GYDS for gas", status: "pending" },
  { id: "approve", label: "Approve token to router", status: "pending" },
  { id: "addLiq", label: "Add liquidity (token + GYDS)", status: "pending" },
  { id: "pair", label: "Pair address resolved", status: "pending" },
  { id: "reserves", label: "Read pool reserves", status: "pending" },
  { id: "quote", label: "Quote swap output (CPMM math)", status: "pending" },
  { id: "swap", label: "Execute swap (GYDS → token)", status: "pending" },
  { id: "reserves2", label: "Reserves updated after swap", status: "pending" },
  { id: "removeLiq", label: "Remove 25% liquidity", status: "pending" },
];

interface PoolTestProps {
  wallet: { address: string | null; isConnected: boolean };
  onConnectWallet: () => void;
}

const PoolTestPage = ({ wallet, onConnectWallet }: PoolTestProps) => {
  const { getRawProvider, getFullAddress } = useWallet();
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [running, setRunning] = useState(false);
  const [tokenAddr, setTokenAddr] = useState("");
  const [tokenAmount, setTokenAmount] = useState("100");
  const [gydsAmount, setGydsAmount] = useState("0.5");
  const [swapAmount, setSwapAmount] = useState("0.05");

  const isAdmin = wallet.isConnected && isAdminWallet(wallet.address);

  const update = (id: string, patch: Partial<Step>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const run = async () => {
    const provider = getRawProvider();
    const from = getFullAddress();
    if (!provider || !from) {
      toast.error("Connect your admin wallet first");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddr)) {
      toast.error("Enter a valid token contract address (token-B for the pair)");
      return;
    }

    setRunning(true);
    setSteps(initialSteps.map((s) => ({ ...s, status: "pending", detail: undefined, txHash: undefined })));

    // 1. DEX config
    update("config", { status: "running" });
    const dex = getDexAddresses();
    if (!dex) {
      update("config", { status: "failed", detail: "Deploy or register DEX in /admin first" });
      setRunning(false);
      return;
    }
    update("config", { status: "passed", detail: `Router ${dex.router.slice(0, 10)}…` });

    // 2. RPC
    update("rpc", { status: "running" });
    try {
      const block = await rpcCall<string>({ method: "eth_blockNumber" });
      update("rpc", { status: "passed", detail: `block #${parseInt(block, 16)}` });
    } catch (e) {
      update("rpc", { status: "failed", detail: (e as Error).message });
      setRunning(false);
      return;
    }

    // 3. Balance
    update("wallet", { status: "running" });
    try {
      const balHex = await rpcCall<string>({ method: "eth_getBalance", params: [from, "latest"] });
      const bal = BigInt(balHex);
      const need = toWei(gydsAmount) + toWei("0.01"); // liquidity + gas buffer
      if (bal < need) {
        update("wallet", {
          status: "failed",
          detail: `Need ≥ ${fromWei(need, 18, 4)} GYDS, have ${fromWei(bal, 18, 4)}`,
        });
        setRunning(false);
        return;
      }
      update("wallet", { status: "passed", detail: `${fromWei(bal, 18, 4)} GYDS` });
    } catch (e) {
      update("wallet", { status: "failed", detail: (e as Error).message });
      setRunning(false);
      return;
    }

    // 4. Approve
    update("approve", { status: "running" });
    let approveTx: string | null = null;
    try {
      approveTx = await approveIfNeeded({
        provider,
        from,
        token: tokenAddr,
        spender: dex.router,
        amount: toWei(tokenAmount),
      });
      update("approve", {
        status: "passed",
        detail: approveTx ? "Allowance set" : "Already approved",
        txHash: approveTx ?? undefined,
      });
    } catch (e) {
      update("approve", { status: "failed", detail: (e as Error).message });
      setRunning(false);
      return;
    }

    // 5. Add liquidity
    update("addLiq", { status: "running" });
    let addTx: string;
    try {
      addTx = await addLiquidityNative({
        provider,
        from,
        token: tokenAddr,
        tokenAmount: toWei(tokenAmount),
        gydsAmount: toWei(gydsAmount),
        slippageBps: 200, // 2% for first add
      });
      update("addLiq", { status: "passed", detail: "Liquidity submitted", txHash: addTx });
    } catch (e) {
      update("addLiq", { status: "failed", detail: (e as Error).message });
      setRunning(false);
      return;
    }

    // 6. Pair address (give chain a few seconds to mine)
    update("pair", { status: "running" });
    let pair: string | null = null;
    for (let i = 0; i < 15; i++) {
      pair = await getPairAddress(tokenAddr, dex.wgyds);
      if (pair) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!pair) {
      update("pair", { status: "failed", detail: "Pair not created within 30s" });
      setRunning(false);
      return;
    }
    update("pair", { status: "passed", detail: pair });

    // 7. Reserves
    update("reserves", { status: "running" });
    const pool = await getPoolInfo(pair);
    if (!pool) {
      update("reserves", { status: "failed", detail: "getReserves() failed" });
      setRunning(false);
      return;
    }
    update("reserves", {
      status: "passed",
      detail: `r0 ${fromWei(pool.reserve0, 18, 4)} / r1 ${fromWei(pool.reserve1, 18, 4)}`,
    });

    // 8. Quote
    update("quote", { status: "running" });
    const inWei = toWei(swapAmount).toString();
    const expectedOut = calculateSwapOutput(inWei, pool.reserve0, pool.reserve1);
    if (BigInt(expectedOut) === 0n) {
      update("quote", { status: "failed", detail: "Quote returned 0" });
      setRunning(false);
      return;
    }
    update("quote", { status: "passed", detail: `≈ ${fromWei(expectedOut, 18, 6)} token out` });

    // 9. Swap
    update("swap", { status: "running" });
    let swapTx: string;
    try {
      const minOut = (BigInt(expectedOut) * 95n) / 100n; // 5% slippage tolerance
      swapTx = await swapNativeForToken({
        provider,
        from,
        token: tokenAddr,
        gydsIn: toWei(swapAmount),
        minTokenOut: minOut,
      });
      update("swap", { status: "passed", detail: "Swap submitted", txHash: swapTx });
    } catch (e) {
      update("swap", { status: "failed", detail: (e as Error).message });
      setRunning(false);
      return;
    }

    // 10. Reserves after
    update("reserves2", { status: "running" });
    await new Promise((r) => setTimeout(r, 4000));
    const pool2 = await getPoolInfo(pair);
    if (!pool2) {
      update("reserves2", { status: "failed", detail: "Re-read failed" });
    } else {
      const changed =
        pool2.reserve0 !== pool.reserve0 || pool2.reserve1 !== pool.reserve1;
      update("reserves2", {
        status: changed ? "passed" : "failed",
        detail: changed
          ? `r0 ${fromWei(pool2.reserve0, 18, 4)} / r1 ${fromWei(pool2.reserve1, 18, 4)}`
          : "Reserves did not change — swap may not have settled",
      });
    }

    // 11. Remove 25%
    update("removeLiq", { status: "running" });
    try {
      // LP balance = balanceOf(pair, from)
      const data = "0x70a08231" + from.replace(/^0x/, "").padStart(64, "0");
      const lpHex = await rpcCall<string>({ method: "eth_call", params: [{ to: pair, data }, "latest"] });
      const lpBal = BigInt(lpHex);
      if (lpBal === 0n) {
        update("removeLiq", { status: "skipped", detail: "No LP tokens (skipped)" });
      } else {
        const removeAmount = lpBal / 4n;
        const tx = await removeLiquidity({
          provider,
          from,
          pairAddress: pair,
          tokenA: tokenAddr,
          tokenB: dex.wgyds,
          liquidity: removeAmount,
          minA: 1n,
          minB: 1n,
        });
        update("removeLiq", { status: "passed", detail: "Removed 25%", txHash: tx });
      }
    } catch (e) {
      update("removeLiq", { status: "failed", detail: (e as Error).message });
    }

    setRunning(false);
    toast.success("Test harness completed — review steps");
  };

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md">
          <Beaker className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold mb-3">Pool Test Harness</h2>
          <p className="text-muted-foreground mb-6">Connect your admin wallet to run pool tests.</p>
          <Button onClick={onConnectWallet} className="btn-gradient">Connect Wallet</Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold mb-3">Admin Only</h2>
          <p className="text-muted-foreground">
            Pool testing executes real transactions and is restricted to admin wallets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Beaker className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-heading font-bold">
              Pool <span className="gradient-text">Test Harness</span>
            </h1>
          </div>
          <p className="text-muted-foreground mb-6 text-sm">
            End-to-end live test on {activeConfig.networkName}. Real transactions, real gas.
          </p>

          <div className="glass-card p-5 space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <Label className="text-xs">Test token contract address</Label>
                <Input
                  value={tokenAddr}
                  onChange={(e) => setTokenAddr(e.target.value.trim())}
                  placeholder="0x… (an ERC-20 you own balance of)"
                  className="mt-1 font-mono text-sm bg-muted/40"
                />
              </div>
              <div>
                <Label className="text-xs">Token amount</Label>
                <Input
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  type="number"
                  className="mt-1 bg-muted/40"
                />
              </div>
              <div>
                <Label className="text-xs">GYDS to pair</Label>
                <Input
                  value={gydsAmount}
                  onChange={(e) => setGydsAmount(e.target.value)}
                  type="number"
                  step="0.01"
                  className="mt-1 bg-muted/40"
                />
              </div>
              <div>
                <Label className="text-xs">Swap amount (GYDS)</Label>
                <Input
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  type="number"
                  step="0.01"
                  className="mt-1 bg-muted/40"
                />
              </div>
            </div>
            <Button
              onClick={run}
              disabled={running || !tokenAddr}
              className="btn-gradient w-full"
            >
              {running ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running…</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Run all tests</>
              )}
            </Button>
          </div>

          <div className="glass-card divide-y divide-border/30">
            {steps.map((step, idx) => {
              const Icon =
                step.status === "passed" ? CheckCircle2 :
                step.status === "failed" ? XCircle :
                step.status === "running" ? Loader2 :
                step.status === "skipped" ? AlertTriangle :
                CheckCircle2;
              const color =
                step.status === "passed" ? "text-[hsl(var(--success))]" :
                step.status === "failed" ? "text-destructive" :
                step.status === "running" ? "text-primary" :
                step.status === "skipped" ? "text-[hsl(var(--warning))]" :
                "text-muted-foreground/30";
              return (
                <div key={step.id} className="p-4 flex items-start gap-3">
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${color} ${step.status === "running" ? "animate-spin" : ""}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">{idx + 1}.</span>
                      <p className="text-sm font-medium">{step.label}</p>
                    </div>
                    {step.detail && (
                      <p className={`text-xs mt-0.5 ${step.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
                        {step.detail}
                      </p>
                    )}
                    {step.txHash && (
                      <a
                        href={getExplorerUrl("tx", step.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 mt-1 font-mono"
                      >
                        {step.txHash.slice(0, 18)}… <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PoolTestPage;
