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
