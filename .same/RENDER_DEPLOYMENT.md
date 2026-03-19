# Render Deployment Guide - Sonido Líquido Crew

## Step-by-Step Instructions

### Step 1: Create a Render Account
1. Go to **https://render.com**
2. Click **"Get Started for Free"**
3. Sign up with GitHub (recommended) or email

### Step 2: Connect Your Repository
1. Push this project to a GitHub repository (if not already)
2. In Render dashboard, click **"New +"** → **"Web Service"**
3. Connect your GitHub account if prompted
4. Select the repository containing this project

### Step 3: Configure the Web Service
Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `sonido-liquido-crew` |
| **Region** | Oregon (US West) or closest to you |
| **Branch** | `main` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | Free (or Starter for better performance) |

### Step 4: Add Environment Variables
Click **"Advanced"** and add these environment variables:

#### Required Variables:
| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `production` | Production mode |

#### Optional - Database (Turso):
| Key | Value | Description |
|-----|-------|-------------|
| `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` | Your Turso database URL |
| `TURSO_AUTH_TOKEN` | `your-token` | Your Turso auth token |

#### Optional - Spotify API:
| Key | Value | Description |
|-----|-------|-------------|
| `SPOTIFY_CLIENT_ID` | `your-client-id` | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | `your-client-secret` | From Spotify Developer Dashboard |

### Step 5: Deploy
1. Click **"Create Web Service"**
2. Wait for the build to complete (usually 2-5 minutes)
3. Your site will be live at `https://sonido-liquido-crew.onrender.com`

---

## After Deployment

### Initialize the Database
Visit these URLs to seed initial data:
```
https://your-site.onrender.com/api/seed
```

### Sync Spotify Data
1. Go to `/admin`
2. Login with: `sonidoliquido` / `lacremaynata`
3. Click **"Sync Now"** to pull artist data from Spotify

---

## Getting Spotify API Credentials

1. Go to https://developer.spotify.com/dashboard
2. Click **"Create App"**
3. Fill in:
   - App Name: `Sonido Liquido Crew`
   - App Description: `Music collective website`
   - Redirect URI: `http://localhost:3000/callback` (not actually used)
4. Click **"Create"**
5. Copy the **Client ID** and **Client Secret**

---

## Getting Turso Database (Optional)

For persistent data storage:

1. Go to https://turso.tech
2. Create a free account
3. Create a new database
4. Get your database URL and auth token
5. Add them to Render environment variables

---

## Troubleshooting

### Build Fails
- Check that all environment variables are set
- View build logs in Render dashboard

### Site Shows Errors
- Check runtime logs in Render dashboard
- Make sure database is initialized via `/api/seed`

### Cold Starts (Free Plan)
- Free plan spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Upgrade to Starter plan ($7/month) for always-on

---

## Custom Domain (Optional)

1. In Render dashboard, go to your service
2. Click **"Settings"** → **"Custom Domains"**
3. Add your domain (e.g., `sonidoliquido.com`)
4. Update your DNS with the provided CNAME record
