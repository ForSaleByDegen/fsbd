# Switch to New GitHub Repository

## Step 1: Create New GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (can be private or public)
3. **DO NOT** initialize with README, .gitignore, or license
4. Copy the repository URL (e.g., `https://github.com/YOUR_USERNAME/NEW_REPO_NAME.git`)

## Step 2: Update Git Remote

Once you have the new repo URL, run:

```bash
cd c:\Users\dusti\OneDrive\Desktop\FSBD
git remote set-url origin https://github.com/YOUR_USERNAME/NEW_REPO_NAME.git
git push -u origin main
```

## Step 3: Update Vercel

1. Go to your Vercel project: https://vercel.com/fsbds-projects/fsbd-app
2. Go to **Settings** → **Git**
3. Click **"Disconnect"** next to the current GitHub repo
4. Click **"Connect Git Repository"**
5. Select your **NEW** GitHub repository
6. Vercel will automatically start a new build

---

**Share your new GitHub repository URL and I'll help you update the remote!**
