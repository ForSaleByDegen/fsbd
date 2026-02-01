# Phantom Wallet "Malicious dApp" Warning — How to Fix

Phantom shows **"This dApp could be malicious"** for fsbd.fun. This happens when:

1. **Transaction simulation fails** — Phantom can't predict the outcome before signing
2. **Domain is new/unverified** — Phantom hasn't reviewed fsbd.fun yet
3. **Security blocklist** — Domain may be on Phantom/Blowfish blocklist (new domains often trigger caution)

## Action Plan (Do These)

### 1. Phantom Portal Domain Verification (Primary)

1. Go to [Phantom Portal](https://phantom.app/developers) and create/sign in
2. **Create an app** → add `fsbd.fun` as the Public URL
3. **Verify domain** → Phantom gives you a TXT record like `phantom-verification-XXXXX`
4. Add the TXT record to your domain DNS (Vercel Domains → fsbd.fun → DNS → Add TXT)
   - Host: `@` (or root)
   - Value: the verification code
5. Wait 15–60 min for DNS propagation, then click **Verify** in Phantom Portal

This helps Phantom recognize fsbd.fun as a legitimate dApp and can reduce warnings.

### 2. Phantom Domain Review (Required)

Phantom has a form to request domain review. Submit fsbd.fun:

**Form:** https://docs.google.com/forms/d/1JgIxdmolgh_80xMfQKBKx9-QPC7LRdN6LHpFFW8BlKM/viewform

Include:

- **Domain:** `fsbd.fun`
- **Project:** For Sale By Degen — P2P Solana marketplace
- **Description:** Decentralized listings, crypto payments. No custody of funds.

Response can take up to a week.

### 3. Blowfish (If Warnings Persist)

Phantom uses Blowfish for security scanning. If warnings continue after Portal verification:

- **Email:** security@blowfish.xyz
- **Subject:** Whitelist request — fsbd.fun
- **Include:** Short description of the project, link to the site, and that you've completed Phantom Portal verification

### 4. Code-Side (Already in Place)

The app already follows Phantom’s guidance:

- **Single signer** — Only the buyer signs the transfer
- **signTransaction** — We use `signTransaction` then `sendRawTransaction` (not `signAndSendTransaction`)
- **Simulation** — We simulate before sending; if RPC fails we offer retry with `skipPreflight`

If RPC simulation fails often (e.g. public RPC, network issues), Phantom may still show the warning because it can’t simulate. Using a stable RPC like Helius helps.

## User Workaround (Until Verified)

Until fsbd.fun is verified, users can:

1. Click **"Proceed anyway (unsafe)"** in Phantom (they accept the risk)
2. Or use another wallet (e.g. Solflare) that may have different warnings
3. Or use the Solana Pay link ("Having trouble? Pay via wallet link") to pay via a deep link instead of in-app signing

## Checklist

- [ ] Phantom Portal: create app, add fsbd.fun
- [ ] Add TXT record for domain verification
- [ ] Complete domain verification in Phantom Portal
- [ ] Submit Phantom domain review form
- [ ] (Optional) Contact Blowfish if warnings persist
- [ ] Ensure `NEXT_PUBLIC_RPC_URL` uses a reliable RPC (e.g. Helius) to reduce simulation failures
