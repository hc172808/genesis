import { useState, useCallback, useEffect, useRef } from "react";
import type { WalletState } from "@/lib/blockchain/types";
import { activeConfig } from "@/lib/blockchain/config";
import {
  getProvider,
  requestAccounts,
  getWalletBalance,
  getWalletChainId,
  switchToGydsChain,
  shortenAddress,
  weiHexToGyds,
  type EthereumProvider,
} from "@/lib/blockchain/walletAdapter";
import { getBalance, getChainId, getActiveRpcUrl } from "@/lib/blockchain/rpcClient";

const BALANCE_POLL_MS = 15_000;

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    balance: "0",
    isConnected: false,
    networkName: activeConfig.networkName,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [rpcStatus, setRpcStatus] = useState<"connected" | "degraded" | "offline">("offline");
  const [activeRpcUrl, setActiveRpcUrl] = useState(activeConfig.rpcUrl);
  const providerRef = useRef<EthereumProvider | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Fetch balance — try wallet provider first, fallback to RPC client */
  const fetchBalance = useCallback(async (address: string) => {
    try {
      let balanceHex: string;
      let chainIdHex: string;

      if (providerRef.current) {
        [balanceHex, chainIdHex] = await Promise.all([
          getWalletBalance(providerRef.current, address),
          getWalletChainId(providerRef.current),
        ]);
      } else {
        [balanceHex, chainIdHex] = await Promise.all([
          getBalance(address),
          getChainId(),
        ]);
      }

      const balance = weiHexToGyds(balanceHex);
      const chainId = parseInt(chainIdHex, 16);

      setWallet((prev) => ({
        ...prev,
        balance,
        networkName: chainId === activeConfig.chainId
          ? activeConfig.networkName
          : `Unknown Chain (${chainId})`,
      }));
      setRpcStatus("connected");
      setActiveRpcUrl(getActiveRpcUrl());
    } catch (err) {
      console.warn("[Wallet] Balance fetch failed:", err);
      setRpcStatus("degraded");
    }
  }, []);

  /** Connect wallet */
  const connect = useCallback(async (walletType: string) => {
    setIsConnecting(true);

    try {
      const provider = getProvider(walletType);

      if (provider) {
        // Real wallet connection
        providerRef.current = provider;

        // Switch to GydsChain network
        try {
          await switchToGydsChain(provider);
        } catch (err) {
          console.warn("[Wallet] Network switch failed, continuing:", err);
        }

        const accounts = await requestAccounts(provider);
        if (accounts.length === 0) throw new Error("No accounts returned");

        const address = accounts[0];
        const shortAddr = shortenAddress(address);

        setWallet({
          address: shortAddr,
          balance: "0.00",
          isConnected: true,
          networkName: activeConfig.networkName,
        });

        // Fetch real balance
        await fetchBalance(address);

        // Store full address for polling
        (providerRef.current as EthereumProvider & { _fullAddress?: string })._fullAddress = address;

        console.info(`[Wallet] Connected via ${walletType}: ${shortAddr}`);
      } else {
        // No provider found — fallback to mock for development
        console.warn(`[Wallet] No provider found for ${walletType}, using mock`);
        await new Promise((r) => setTimeout(r, 1500));

        setWallet({
          address: "0x7a3B...9f4E",
          balance: "142.58",
          isConnected: true,
          networkName: activeConfig.networkName,
        });
        setRpcStatus("offline");
      }
    } catch (err) {
      console.error("[Wallet] Connection failed:", err);
      // Fallback to mock
      await new Promise((r) => setTimeout(r, 500));
      setWallet({
        address: "0x7a3B...9f4E",
        balance: "142.58",
        isConnected: true,
        networkName: activeConfig.networkName,
      });
      setRpcStatus("offline");
    }

    setIsConnecting(false);
  }, [fetchBalance]);

  /** Disconnect wallet */
  const disconnect = useCallback(() => {
    providerRef.current = null;
    setWallet({
      address: null,
      balance: "0",
      isConnected: false,
      networkName: activeConfig.networkName,
    });
    setRpcStatus("offline");
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Listen to provider events
  useEffect(() => {
    const provider = providerRef.current;
    if (!provider) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        disconnect();
      } else {
        const shortAddr = shortenAddress(accs[0]);
        setWallet((prev) => ({ ...prev, address: shortAddr }));
        (provider as EthereumProvider & { _fullAddress?: string })._fullAddress = accs[0];
        fetchBalance(accs[0]);
      }
    };

    const handleChainChanged = () => {
      // Refresh on chain change
      const fullAddr = (provider as EthereumProvider & { _fullAddress?: string })._fullAddress;
      if (fullAddr) fetchBalance(fullAddr);
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
    };
  }, [wallet.isConnected, disconnect, fetchBalance]);

  // Poll balance while connected
  useEffect(() => {
    if (!wallet.isConnected) return;

    const fullAddr = providerRef.current
      ? (providerRef.current as EthereumProvider & { _fullAddress?: string })._fullAddress
      : null;

    if (fullAddr) {
      pollRef.current = setInterval(() => fetchBalance(fullAddr), BALANCE_POLL_MS);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [wallet.isConnected, fetchBalance]);

  /** Get the raw provider ref for downstream hooks */
  const getRawProvider = useCallback(() => providerRef.current, []);

  /** Get the full (non-shortened) wallet address — falls back to wallet.address for mock wallets */
  const getFullAddress = useCallback(() => {
    if (providerRef.current) {
      return (providerRef.current as EthereumProvider & { _fullAddress?: string })._fullAddress ?? null;
    }
    // For mock wallets, return the stored address
    return wallet.address;
  }, [wallet.address]);

  return { wallet, connect, disconnect, isConnecting, rpcStatus, activeRpcUrl, getRawProvider, getFullAddress };
};
