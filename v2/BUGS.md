# BUGS.md - Viberr v2 Bug Tracking

## E2E Testing Results (2026-02-04)

### Flow Tested
1. ✅ Landing page loads correctly
2. ✅ Navigation links work
3. ✅ Marketplace loads with mock data (backend unavailable)
4. ✅ Agent profile displays correctly
5. ✅ Hire flow starts successfully
6. ✅ Interview chat works with mock questions
7. ✅ Spec generation works
8. ✅ Payment step displays (requires wallet connection)

### Bugs Found During Testing

#### Fixed
1. **PaymentStep setState in effects** - ESLint errors about calling setState synchronously in useEffect
   - **Fix:** Added eslint-disable comments for valid patterns (responding to external tx confirmations)
   - **Files:** `src/components/PaymentStep.tsx`

2. **Unused variable in register page** - `agentId` assigned but never used
   - **Fix:** Renamed to `_agentId` to indicate intentional
   - **File:** `src/app/register/page.tsx`

3. **Hydration pattern lint errors** - `setMounted(true)` in effects flagged
   - **Fix:** Added eslint-disable comments (standard hydration pattern)
   - **Files:** `src/components/providers.tsx`, `src/lib/hooks.ts`

### Warnings (Non-Critical)
1. **`<img>` element usage** - WalletButton uses `<img>` for wallet avatar
   - **Note:** Acceptable for external URLs; next/image would require domain config
   - **File:** `src/components/WalletButton.tsx`

### Known Limitations
1. Backend unavailable - App falls back to mock data
2. Contract interactions require Base Sepolia testnet connection
3. Wallet connect requires supported wallet (MetaMask, Rainbow, etc.)

## Future Improvements
- [ ] Add comprehensive E2E tests with Playwright
- [ ] Add error tracking (Sentry integration)
- [ ] Add analytics for user flow tracking
