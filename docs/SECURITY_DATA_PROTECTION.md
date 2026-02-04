# Security & Data Protection — Private Keys & User Data

How we protect private keys, secrets, and user data from exposure in GitHub, on the site, and in transit.

---

## ✅ Private Keys — Never Stored or Exposed

| Item | Protection |
|------|------------|
| **User wallet private keys** | Never requested. Users sign with Phantom/Solflare; we only receive `publicKey` and `signTransaction`. Keys stay in the wallet. |
| **App wallet** | `NEXT_PUBLIC_APP_WALLET` is a **public key** only. Never use `NEXT_PUBLIC_*` for private keys. |
| **Vanity pool secret keys** | Encrypted with server-only `VANITY_POOL_ENCRYPTION_KEY` before storage. Decrypted only server-side when claiming. |
| **Token mint keypairs** | Generated client-side or in worker; used for signing, never sent to our servers except encrypted in vanity pool. |
| **Keypair files** | `*.keypair`, `*-mint-authority.json`, `*-authority.json`, `vanity-result.json` are in `.gitignore`. |

---

## ✅ Secrets — Server-Only Env Vars

These **must never** be in `NEXT_PUBLIC_*` (they would be bundled into client JS):

| Var | Purpose |
|-----|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS for admin operations |
| `TOKEN_CHAT_KEY_SECRET` | Derive encryption keys for token-gated chat |
| `VANITY_POOL_ENCRYPTION_KEY` | Encrypt vanity pool secret keys (or `ENCRYPTION_KEY`) |
| `BITQUERY_API_KEY` | Balance verification fallback |
| `RESEND_API_KEY` | Bug report emails |
| `PINATA_JWT` | Server-side IPFS uploads (preferred over `NEXT_PUBLIC_PINATA_JWT`) |

---

## ⚠️ Client-Exposed Config (Safe by Design)

| Var | Safe? | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_APP_WALLET` | Yes | Public key only |
| `NEXT_PUBLIC_FSBD_TOKEN_MINT` | Yes | Public token mint |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Designed to be public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | RLS protects data; anon key is meant to be public |
| `NEXT_PUBLIC_RPC_URL` | Caution | If it contains `?api-key=xxx`, the RPC API key is exposed. Consider a server-side RPC proxy for production. |
| `NEXT_PUBLIC_PINATA_JWT` | Caution | JWT is in client bundle; anyone can extract and use your Pinata account. Prefer server-side upload proxy. |
| `NEXT_PUBLIC_ENCRYPTION_KEY` | Legacy | Used for other features. Vanity pool now uses `VANITY_POOL_ENCRYPTION_KEY` (server-only). |

---

## ✅ User Data — Storage & Transit

| Data | Where | Protection |
|------|-------|------------|
| **Wallet address** | Supabase `listings`, `profiles` | Stored plaintext (addresses are public on-chain). Hashed as `wallet_address_hash` for lookups. |
| **Email** | Supabase `profiles` | Stored for shipping/escrow. RLS restricts access. |
| **Shipping address** | Not stored | Exchanged via encrypted chat; optionally saved in browser localStorage (client-side encrypted). |
| **Chat messages** | Supabase | Private DM: encrypted (TweetNaCl). Token-gated public: encrypted. Plain public: unencrypted. |
| **Bug reports** | Supabase, emailed | Contains user description; not exposed publicly. |

---

## ✅ Logging — No Sensitive Data

- `maskWallet(addr)` used in API route `console.error` to avoid logging full wallet addresses.
- No private keys, API keys, or secrets in logs.
- Transaction signatures are public on-chain; logging them is acceptable.

---

## ✅ GitHub / Repo

- `.env`, `*.keypair`, `vanity-result.json`, `*.pem`, `*.key` are in `.gitignore`.
- No hardcoded API keys or secrets in source.
- Before pushing: run `git status` and ensure no `.env` or key files are staged.
- If secrets were ever committed: rotate them immediately and consider `git filter-branch` or BFG to remove from history.

---

## ✅ Transit (Site ↔ Server)

- All production traffic must use **HTTPS**.
- Wallet addresses in URL params (e.g. `?wallet=xxx`) may appear in server logs; we mask them in our logs.
- Sensitive operations (e.g. vanity claim returning `secretKey`) go over HTTPS; ensure TLS is enforced.

---

## Checklist Before Deploy

- [ ] No `.env` or key files in `git status`
- [ ] `VANITY_POOL_ENCRYPTION_KEY` or `ENCRYPTION_KEY` set (32+ chars) for vanity pool
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set if using Supabase
- [ ] `NEXT_PUBLIC_RPC_URL` — avoid putting API key in client if possible; use proxy
- [ ] `NEXT_PUBLIC_PINATA_JWT` — consider server-side upload route to keep JWT server-only
