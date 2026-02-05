# DONE-F-005 - Hire Flow - Payment

## What I Built

Complete wallet connection and escrow funding flow for the Viberr hire process:

1. **Wallet Integration** - RainbowKit + wagmi v2 + viem setup for Base Sepolia
2. **WalletButton Component** - Custom styled connect button matching Viberr dark theme
3. **PaymentStep Component** - Full payment UI with:
   - Wallet connection status
   - USDC balance display
   - Price breakdown (Service + 15% Platform Fee = Total)
   - Two-step transaction flow (Approve → Fund)
   - Transaction status UI with spinner/checkmark animations
   - Error states with retry option
   - Success redirect to dashboard

## Files Created/Modified

### Created
- `src/lib/wagmi.ts` - Wagmi config for Base Sepolia, contract addresses, ABIs
- `src/components/providers.tsx` - RainbowKit + Wagmi providers (SSR-safe)
- `src/components/WalletButton.tsx` - Custom connect button component
- `src/components/PaymentStep.tsx` - Full payment UI component

### Modified
- `src/app/layout.tsx` - Added Providers wrapper
- `src/app/marketplace/hire/page.tsx` - Replaced step 4 placeholder with PaymentStep
- `package.json` - Added wagmi, viem, @rainbow-me/rainbowkit, @tanstack/react-query

## Contract Info Used
- **ViberrEscrow:** `0xb8b8ED9d2F927A55772391B507BB978358310c9B`
- **MockUSDC:** `0xbBBA474Bb2c04bfe726e3A734bD9F63feaC0E0a6`
- **Chain ID:** 84532 (Base Sepolia)

## How to Test

1. Run `npm run dev` in the frontend folder
2. Navigate to `/marketplace/hire?agent=agent-1&service=s1`
3. Complete steps 1-3 (or skip by manually setting step to 4)
4. On step 4 (Payment):
   - ✅ **Wallet connects** - Click "Connect Wallet" and connect via MetaMask/WalletConnect
   - ✅ **Shows address when connected** - Address displays in green button after connection
   - ✅ **Price breakdown displays correctly** - Shows Service Price + Platform Fee (15%) = Total
   - ✅ **USDC balance displays** - Shows your USDC balance (red if insufficient, green if sufficient)
   - ✅ **Fund button exists and triggers transaction** - "Approve USDC" button → "Fund Escrow" button

### Manual Testing Steps
```
1. Connect wallet (Base Sepolia network)
2. Verify price breakdown shows:
   - Service Price: $299.00 (example)
   - Platform Fee (15%): $44.85
   - Total: $343.85 USDC
3. If insufficient balance, shows warning
4. If sufficient balance, click "Approve USDC"
5. After approval confirms, click "Fund Escrow"
6. On success, shows success message and redirects to dashboard
```

## Technical Decisions

1. **Used cookieStorage for SSR** - Prevents localStorage errors during static page generation
2. **RainbowKit conditional rendering** - Only renders provider after mount to prevent hydration issues
3. **Two-step approval flow** - Standard ERC20 approve→transfer pattern for escrow funding
4. **Simplified ABIs** - Only included necessary functions for USDC and Escrow contracts

## Discovered Tasks

- [feature] Dashboard page doesn't exist - need `/dashboard` route for post-payment redirect (suggested ID: F-006)
- [feature] WalletConnect Project ID needs to be configured via `NEXT_PUBLIC_WALLET_CONNECT_ID` env var (suggested ID: I-001)
- [test] E2E tests for payment flow with mocked wallet (suggested ID: T-001)
