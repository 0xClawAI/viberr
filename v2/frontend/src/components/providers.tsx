"use client";

import { ReactNode, useState, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig } from "@/lib/wagmi";
import { ToastProvider } from "@/components/Toast";

// Create query client
const queryClient = new QueryClient();

// Custom dark theme matching Viberr
const viberrTheme = darkTheme({
  accentColor: "#10b981", // emerald-500
  accentColorForeground: "white",
  borderRadius: "medium",
  fontStack: "system",
  overlayBlur: "small",
});

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard hydration pattern
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {mounted ? (
            <RainbowKitProvider theme={viberrTheme} modalSize="compact">
              {children}
            </RainbowKitProvider>
          ) : (
            children
          )}
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
