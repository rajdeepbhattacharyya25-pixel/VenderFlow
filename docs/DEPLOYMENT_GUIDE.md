# VendorFlow Deployment & Rollback Guide

This guide outlines the standard operating procedure for deploying updates to VendorFlow and safely rolling them back in case of critical bugs. We utilize **Vercel** for our production infrastructure to ensure zero-downtime deployments and instant rollbacks.

## 🚀 1. The Development Workflow (Going from Code to Staging)

You should **never push code directly to the `main` branch**. Always use feature branches to build updates safely.

1. **Create your feature branch:**
    Before making any changes, branch off from the latest `main`.

    ```bash
    git checkout main
    git pull origin main
    git checkout -b feature/your-feature-name
    ```

2. **Develop and commit your work:**
    Write your code, commit it locally.

    ```bash
    git add .
    git commit -m "feat: added your-feature-name"
    ```

3. **Push the branch to generate a Vercel Preview:**

    ```bash
    git push origin feature/your-feature-name
    ```

**What Happens Next?**
As soon as you push your branch, Vercel detects the new branch and automatically builds a **Preview Deployment**.
Vercel assigns a unique, secure URL (e.g., `vendorflow-your-feature-name-1a2b3c.vercel.app`) to this build.

* **Action:** Go to your Vercel Dashboard or check the GitHub Pull Request for this URL. Test the update thoroughly on this Preview URL before it reaches any real users.

---

## 🌍 2. The Production Deployment (Going Live)

Once the Preview URL has been tested and verified to have zero glitches, you are ready to deploy the update to your live users.

1. **Merge the code into `main`:**
    You can do this via a Pull Request on GitHub or via your terminal.

    ```bash
    git checkout main
    git merge feature/your-feature-name
    git push origin main
    ```

**What Happens Next?**
Vercel automatically detects the update to the `main` branch. It pulls the new code, builds it, and quietly prepares it on the server.
Once the build is 100% complete, Vercel **instantly** points the live production domain (`vendorflow.com`) to the new deployment.

* **Zero Downtime:** Your users will experience no downtime.
* **Seamless Update:** The next time a user visits or refreshes the page, they will receive the new update automatically.

---

## 🚨 3. The Instant Rollback (Fixing a Disaster)

If a critical bug makes it into production (e.g., the storefront crashes, checkout fails, or users can't login), **do not try to write new code right away.** Use Vercel to rollback instantly to the last stable deployment.

### Step-by-Step Rollback

1. Open the [Vercel Dashboard](https://vercel.com/dashboard) and navigate to the **VendorFlow** project.
2. Click on the **Deployments** tab.
3. You will see a chronological list of all deployments. The top one is your current, broken production version.
4. Locate the **previous deployment** (the one just below it, which you know was stable and working).
5. Click the three dots (`...`) on the right side of that stable deployment.
6. Click **"Promote to Production"** or **"Instant Rollback"** (depending on the Vercel UI).

**What Happens Next?**
In a matter of milliseconds, Vercel points the main production domain back to the previous stable build.

* The production crisis is instantly averted.
* Users are safe again on the old version.

---

## 🔧 4. Fixing the Code After a Rollback

Now that the fire is out and users are safe, you have time to fix the actual code.

1. Go back to your local development environment.
2. Ensure you are on the `feature/your-feature-name` branch (or create a new bugfix branch off `main`).
3. Find the bug, fix it, and test it locally.
4. Commit and push the fix:

    ```bash
    git add .
    git commit -m "fix: resolved critical issue in your-feature-name"
    git push origin feature/your-feature-name
    ```

5. Wait for the new **Preview Deployment** and test it rigorously.
6. Once completely verified, merge it back into `main` to overwrite the bad code and go live with the fixed update.
