# Pre-Publish Checklist — Open Source

Run this before making the repo public **and before every push** (repo is now public).

## ✅ Verify Before Every Push

- [ ] **No secrets staged:** `git status` shows no `.env`, `*.keypair`, `*.pem`, `*.key`, or `vanity-result.json`
- [ ] **No secrets in history:** `git log -p` shows no `.env`, API keys, or keypairs ever committed
- [ ] **git status:** No `.env`, `*.keypair`, or `vanity-result.json` staged
- [ ] **Placeholders:** Code checks for `FSBD_TOKEN_MINT_PLACEHOLDER` and `YOUR_WALLET_ADDRESS` before use
- [ ] **Docs:** Review [docs/OPEN_SOURCE_AUDIT.md](docs/OPEN_SOURCE_AUDIT.md)
- [ ] **Internal docs:** Move/delete internal deployment notes (see audit)

## 📋 Optional Before Publish

- [ ] Consolidate `VERCEL_*.md`, `PUSH_*.md` into `docs/archive/` or remove
- [ ] Add repo URL to README after creating GitHub repo
- [ ] Add GitHub topics: `solana`, `marketplace`, `web3`, `crypto`, `defi`, `phantom`, `ipfs`

## 🚀 After Publish

- [ ] Set repo to Public
- [ ] Enable Issues (optional)
- [ ] Add description and website URL in GitHub repo settings
