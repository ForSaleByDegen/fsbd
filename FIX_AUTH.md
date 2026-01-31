# Fix GitHub Authentication

You're getting a permission error because Git is using the wrong credentials.

## Solution: Use Personal Access Token

### Step 1: Create Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. **Note**: Name it something like "Vercel Deployment"
4. **Expiration**: Choose 90 days or No expiration
5. **Select scopes**: Check `repo` (full control of private repositories)
6. Click **"Generate token"**
7. **COPY THE TOKEN** (you won't see it again!)

### Step 2: Update Git Credentials

**Option A: Use Token in URL (Easiest)**

Update the remote URL to include your token:

```bash
cd c:\Users\dusti\OneDrive\Desktop\FSBD
git remote set-url origin https://YOUR_TOKEN@github.com/ForSaleByDegen/fsbd.git
git push -u origin main
```

Replace `YOUR_TOKEN` with the token you just created.

**Option B: Use Git Credential Manager**

When you push, Git will ask for username and password:
- **Username**: `ForSaleByDegen` (or your GitHub username)
- **Password**: Paste your Personal Access Token (not your GitHub password!)

### Step 3: Push Again

```bash
git push -u origin main
```

---

## Alternative: Check Repository Access

Make sure you have write access to the repository:

1. Go to: https://github.com/ForSaleByDegen/fsbd
2. Check if you're logged in as the right account
3. Verify you have write permissions

---

## If Still Having Issues

Try using SSH instead:

1. Generate SSH key (if you don't have one)
2. Add SSH key to GitHub
3. Change remote to SSH:
   ```bash
   git remote set-url origin git@github.com:ForSaleByDegen/fsbd.git
   git push -u origin main
   ```
