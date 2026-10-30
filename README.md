# Maqsad (مقصد) — Goals, Tasks, Deep Schedule & Habits (PWA)

Offline-first personal productivity tracker. **100% Free Forever**, zero server costs, zero database bills, zero accounts required. All user data stays safely on the device (`localStorage`).

---

## 🚀 Live Deployment Guide (100% Free — No Monthly / Yearly Bills)

Because Maqsad is a 100% static client-side web application, you can host it **completely free of cost forever** on any of these platforms:

### Option 1: Cloudflare Pages (Recommended ⭐)
* **Cost:** $0.00 / Free forever.
* **Bandwidth:** **Unlimited** (no bandwidth cap, zero risk of surprise bills).
* **Speed:** Fastest global CDN with free automatic SSL.
* **How to deploy:**
  1. Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
  2. Go to **Workers & Pages** → **Create application** → **Pages**.
  3. You have two options:
     - **Direct Upload (No Git needed):** Choose **Upload assets**, drag and drop this entire `maqsad` folder, and click **Deploy site**.
     - **Connect Git:** Push this repository to GitHub, link your repository, set the build output directory to `/` (leave build command blank), and click **Deploy**.
  4. Your site will be live immediately at `https://your-app.pages.dev` with a free SSL certificate!

---

### Option 2: GitHub Pages
* **Cost:** $0.00 / Free forever.
* **Bandwidth:** 100 GB/month (supports millions of visits).
* **How to deploy:**
  1. Create a free repository on [GitHub](https://github.com) named `maqsad` (or `username.github.io`).
  2. Upload all files from this folder directly via GitHub website (**Add file** → **Upload files**) or push via Git:
     ```bash
     git init
     git add .
     git commit -m "Initial commit of Maqsad PWA"
     git branch -M main
     git remote add origin https://github.com/<your-username>/maqsad.git
     git push -u origin main
     ```
  3. In your GitHub repository:
     - Go to **Settings** → **Pages** (in left sidebar).
     - Under **Build and deployment** → **Source**, select **Deploy from a branch**.
     - Set branch to `main` and folder to `/(root)`, then click **Save**.
  4. In 1–2 minutes, your app will be live at `https://<your-username>.github.io/maqsad/`.

---

### Option 3: Firebase Hosting
* **Cost:** $0.00 on the Spark Plan (10 GB free storage, 10 GB/month free transfer).
* **How to deploy:**
  1. Install Firebase CLI once (if not already installed):
     ```bash
     npm install -g firebase-tools
     ```
  2. In this folder, log in and initialize Firebase:
     ```bash
     firebase login
     firebase init hosting
     ```
     - Select your Firebase project.
     - When asked for public directory, type `.` (dot) or press Enter (since `firebase.json` is already preconfigured).
     - Configure as a single-page app? Choose `Yes`.
     - Overwrite index.html? Choose `No`.
  3. Deploy anytime with one command:
     ```bash
     firebase deploy
     ```
  4. Your app is live at `https://<your-project-id>.web.app`.

---

## 💡 Why will this site stay 100% Free Forever?

| Feature | Typical Web Apps (Costly) | Maqsad Architecture (Zero Cost) |
|---|---|---|
| **Server / Backend** | Requires running server ($5–$20/mo) | **No server** — runs directly in the user's browser |
| **Database** | Cloud DB / Firestore (Bills grow with users) | **Client-side storage** (`localStorage` / offline-first) |
| **Bandwidth** | Heavy assets & frameworks (React, images) | **Ultra lightweight** (~40 KB total gzip size) |
| **SSL Certificate** | Often billed annually | **Included free** by Cloudflare, GitHub & Firebase |
| **Backups** | Paid cloud storage | **Native Share & Export** (WhatsApp / Google Drive) |

---

## 📱 How to Install on Mobile (PWA)
Once deployed on any HTTPS URL:
* **Android (Chrome/Brave/Edge):** Open your URL → Tap **Install** banner or Browser Menu (⋮) → **Install app / Add to Home Screen**.
* **iOS (Safari):** Open your URL → Tap **Share** button (box with upward arrow) → Scroll down and tap **Add to Home Screen**.

---

## 🛠 Local Development
To test locally on your computer:
```powershell
python -m http.server 8080
```
Then visit `http://localhost:8080` in your web browser.
