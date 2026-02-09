"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { API_BASE_URL } from "./config";

interface FaucetState {
  status: "idle" | "checking" | "funding" | "done" | "error";
  balance: string;
  ethBalance: string;
  error: string | null;
}

export function useAutoFaucet() {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<FaucetState>({
    status: "idle",
    balance: "...",
    ethBalance: "...",
    error: null,
  });
  const [hasFauceted, setHasFauceted] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const isFunding = useRef(false); // prevent concurrent calls

  const checkAndFund = useCallback(async () => {
    if (!address || hasFauceted || isFunding.current) return;
    isFunding.current = true;

    setState(s => ({ ...s, status: "checking", error: null }));

    try {
      // Check balance
      const balanceRes = await fetch(`${API_BASE_URL}/api/faucet/balance/${address}`);
      if (!balanceRes.ok) throw new Error("Balance check failed");
      const balanceData = await balanceRes.json();

      // If needs anything (ETH or USDC), call mint
      if (balanceData.needsFunding) {
        setState(s => ({ ...s, status: "funding" }));

        const mintRes = await fetch(`${API_BASE_URL}/api/faucet/mint`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        const mintData = await mintRes.json();

        if (mintRes.ok && mintData.success) {
          setState({
            status: "done",
            balance: mintData.balance || "1000",
            ethBalance: mintData.ethSent && mintData.ethSent !== "0" ? "0.001" : balanceData.eth,
            error: null,
          });
          setHasFauceted(true);
          retryCount.current = 0;
        } else {
          throw new Error(mintData.message || mintData.error || "Faucet failed");
        }
      } else {
        // Already fully funded
        setState({ status: "done", balance: balanceData.usdc, ethBalance: balanceData.eth, error: null });
        setHasFauceted(true);
        retryCount.current = 0;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      console.error("[Faucet] Error:", msg, "retry:", retryCount.current);
      
      if (retryCount.current < maxRetries) {
        // Auto-retry after delay
        retryCount.current++;
        setState(s => ({ ...s, status: "idle", error: null }));
        // Will trigger useEffect again
      } else {
        setState(s => ({ ...s, status: "error", error: msg }));
      }
    } finally {
      isFunding.current = false;
    }
  }, [address, hasFauceted]);

  // Trigger on wallet connect + auto-retry
  useEffect(() => {
    if (isConnected && address && !hasFauceted && state.status === "idle") {
      const delay = retryCount.current > 0 ? retryCount.current * 2000 : 300;
      const timer = setTimeout(checkAndFund, delay);
      return () => clearTimeout(timer);
    }
  }, [isConnected, address, hasFauceted, state.status, checkAndFund]);

  return {
    ...state,
    isReady: state.status === "done" && parseFloat(state.balance) > 0,
    isLoading: state.status === "checking" || state.status === "funding",
    hasFauceted,
    refetch: checkAndFund,
  };
}
