# Push to GitHub - Copy These Commands

After you create your GitHub repository, run these commands:

## Commands to Run

```bash
cd c:\Users\dusti\OneDrive\Desktop\FSBD
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

**Replace:**
- `YOUR_USERNAME` = Your GitHub username
- `YOUR_REPO_NAME` = Your repository name

## Example

If your username is `dusti` and repo is `for-sale-by-degen`:

```bash
git remote add origin https://github.com/dusti/for-sale-by-degen.git
git push -u origin main
```

## Authentication

If GitHub asks for authentication:

**Option 1: Personal Access Token (Recommended)**
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (full control)
4. Copy the token
5. Use token as password when pushing

**Option 2: GitHub Desktop**
- Download GitHub Desktop app
- It handles authentication automatically

**Option 3: SSH Keys**
- Set up SSH keys (more complex)

---

After pushing, you'll see your code on GitHub! Then we'll deploy to Vercel.
