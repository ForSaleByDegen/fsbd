# Private Key Security

## Policy

**Never expose private keys to the client.** If we interact with private keys at all, they are:

1. **Encrypted** when stored (e.g. env vars, keypair files)
2. **Used only server-side** (API routes, scripts)
3. **Never stored dangerously** (no localStorage, no NEXT_PUBLIC_*, no client bundle)

## Implementation

| Context | Safe | Never Do |
|---------|------|----------|
| User wallets | Users sign via Phantom/Solflare—we never see keys | Ask for private keys, store seed phrases |
| Dev wallet (auctions) | `NEXT_PUBLIC_DEV_WALLET_ADDRESS` (public key only) for 10% allocation | `NEXT_PUBLIC_DEV_WALLET_SECRET` (exposes key in bundle) |
| cNFT tree creator | `TREE_CREATOR_KEYPAIR` or `KEYPAIR_PATH` in server-only scripts | Run tree creation in client |
| Deploy scripts | `DEPLOYER_KEYPAIR_PATH`—file on server, not in repo | Commit keypair files to git |

## Env Vars

- **NEXT_PUBLIC_*** = Exposed to browser. Use only for public keys, URLs, non-secret config.
- **No NEXT_PUBLIC_ prefix** = Server-only. Safe for secrets, keypairs, API keys.
