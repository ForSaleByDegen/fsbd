# Security Policy

## Supported Versions

This is a demo/hackathon project. Security updates are provided on a best-effort basis.

## Security Features

### Implemented

- ✅ Wallet address hashing (SHA-256)
- ✅ Input validation and sanitization
- ✅ XSS prevention
- ✅ Rate limiting on API endpoints
- ✅ Data encryption at rest
- ✅ CORS protection
- ✅ Helmet.js security headers

### Known Limitations

- ⚠️ Escrow implementation is simplified - production should use a proper Solana program
- ⚠️ Token launching is basic - consider using established protocols
- ⚠️ No two-factor authentication (wallet-based only)
- ⚠️ No formal security audit has been conducted

## Reporting a Vulnerability

If you discover a security vulnerability, please:

1. **Do NOT** create a public issue
2. Email security concerns to the repository maintainer
3. Include details about the vulnerability
4. Allow time for a fix before public disclosure

## Private Key Handling (Critical)

**We never send, receive, or store user private keys.**

- **User wallets**: Users connect via Phantom, Solflare, etc. Private keys stay in the wallet extension. We only receive `publicKey` and `signTransaction` (the wallet signs; we never see the key).
- **No `NEXT_PUBLIC_*` secrets**: Never put private keys, API secrets, or signing keys in `NEXT_PUBLIC_*` env vars—they are bundled into client JavaScript and exposed.
- **Server-side only**: Any keypair (e.g. cNFT tree creator, deploy scripts) must use server-only env vars (`KEYPAIR_PATH`, `TREE_CREATOR_KEYPAIR`) and run only in API routes or Node scripts, never in client code.
- **Encryption**: If we ever need to handle sensitive data, it is encrypted before storage and keys are never stored insecurely.

## Best Practices for Users

1. **Never share your private keys** - this app never asks for them
2. **Verify transactions** - always review transactions before signing
3. **Use devnet for testing** - test thoroughly before using mainnet
4. **Start small** - test with small amounts first
5. **Keep wallets updated** - use the latest version of your wallet

## Disclaimer

This software is provided "as is" without warranty. Users are responsible for:
- Securing their own wallets and private keys
- Verifying all transactions
- Understanding the risks of cryptocurrency transactions
- Complying with local laws and regulations

**Use at your own risk.**
