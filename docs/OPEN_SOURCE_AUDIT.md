# Open Source Readiness Audit — FSBD

Audit completed for making the repo public on GitHub.

---

## ✅ What's Already Good

| Item | Status | Notes |
|------|--------|------|
| **LICENSE** | ✅ MIT | Clear, permissive |
| **README** | ✅ Solid | Project description, setup, deployment |
| **CONTRIBUTING** | ✅ Present | Guidelines, PR process |
| **SECURITY** | ✅ Present | Vulnerability reporting, key handling |
| **Secrets** | ✅ Externalized | All via `process.env`, no hardcoded keys |
| **.gitignore** | ✅ Good | `.env`, `node_modules`, keypairs, `vanity-result.json` |
| **Placeholders** | ✅ Used | `FSBD_TOKEN_MINT_PLACEHOLDER`, `YOUR_WALLET_ADDRESS` checked in code |

---

## ⚠️ Actions Before Open Sourcing

### 1. Consolidate Internal Docs (Recommended)

These are internal deployment/troubleshooting notes. Consider moving to `docs/archive/` or deleting before going public:

**Vercel/Deploy (redundant):**
- `CRITICAL_VERCEL_FIX.md`, `VERCEL_BUILD_FIX.md`, `VERCEL_CHECKLIST.md`, `VERCEL_DEPLOY.md`, `VERCEL_DEPLOY_NOW.md`, `VERCEL_FINAL_FIX.md`, `VERCEL_FIX.md`, `FINAL_VERCEL_SOLUTION.md`

**Push/Git (internal):**
- `PUSH_FROM_CORRECT_ACCOUNT.md`, `PUSH_INSTRUCTIONS.md`, `PUSH_TO_GITHUB.md`, `READY_TO_PUSH.md`, `SWITCH_GITHUB_REPO.md`, `GITHUB_VERCEL_STEPS.md`

**Setup (keep 1–2, archive rest):**
- `CLEAN_SETUP.md`, `DEPLOY.md`, `DEPLOYMENT_READY.md`, `FIX_AUTH.md`, `FRESH_START.md`, `NEXT_STEPS.md`, `QUICK_START.md`, `QUICKSTART.md`, `SETUP_GUIDE.md`, `START_SERVER.md`

**Keep:**
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`, `HACKATHON.md`, `FEATURES.md`, `AUCTION_FEATURES.md`, `PROJECT_STRUCTURE.md`, `DEPLOY.md` (single deploy guide)

### 2. Environment Variables — Document Clearly

Ensure `.env.example` is the single source of truth. No real secrets should ever be committed. Current required/optional vars:

| Var | Required | Exposed to Client | Notes |
|-----|----------|-------------------|-------|
| `NEXT_PUBLIC_RPC_URL` | Yes (prod) | Yes | Use Helius/QuickNode; public RPC rate-limited |
| `NEXT_PUBLIC_APP_WALLET` | Yes | Yes | Receives fees |
| `NEXT_PUBLIC_FSBD_TOKEN_MINT` | Yes (for tiers) | Yes | Platform token |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Yes | For DB features |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Yes | For DB features |
| `SUPABASE_SERVICE_ROLE_KEY` | If using Supabase | **No** | Server-side only |
| `NEXT_PUBLIC_PINATA_JWT` | For IPFS uploads | Yes | Consider server-only proxy for production |
| `TOKEN_CHAT_KEY_SECRET` | For token-gated chat | **No** | Server-side only |
| `NEXT_PUBLIC_ENCRYPTION_KEY` | Yes | Yes | 32-char key for encrypted storage |
| `BITQUERY_API_KEY` | Optional | **No** | Balance verification fallback |
| `RESEND_API_KEY` | Optional | **No** | Bug report emails |

**Note:** `NEXT_PUBLIC_PINATA_JWT` is exposed to the client. For open source, document that deployers must use their own Pinata key; consider a server-side upload proxy to keep the key server-only.

### 3. Code Cleanup (Optional)

- Fix README typo: `FBSD` → `FSBD` in env var examples
- Update root `package.json` description to "For Sale By Degen" if desired
- Ensure `app/.env.example` matches all vars used in code (it does)

### 4. Backend / Legacy Code

- `backend/` uses MongoDB (`MONGODB_URI`). The main app uses **Supabase**. Document that `backend/` is legacy/optional or remove if unused.

### 5. Pre-Publish Checklist

- [ ] Run `git status` — ensure no `.env` or keypairs are staged
- [ ] Run `rg "sk_|pk_live|api_key.*=.*['\"]" --type-add 'code:*.{ts,tsx,js}' -t code` — no hardcoded secrets
- [ ] Verify `docs/OPEN_SOURCE_AUDIT.md` reviewed
- [ ] Decide: archive or delete internal docs
- [ ] Set repo to Public on GitHub
- [ ] Add repo URL to README
- [ ] Add topics: `solana`, `marketplace`, `web3`, `crypto`, `defi`, `phantom`, `ipfs`

---

## Summary

The codebase is **ready for open source** from a secrets and structure perspective. The main pre-publish tasks are:

1. **Consolidate or remove** internal deployment docs
2. **Document** env vars clearly in README and `.env.example`
3. **Run** the pre-publish checklist above
4. **Optionally** add a server-side IPFS upload proxy so Pinata JWT stays server-only
