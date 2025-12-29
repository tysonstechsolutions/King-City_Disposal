# 🚀 GET YOUR WEBSITE LIVE — Step by Step

**Time needed: ~20 minutes**
**Difficulty: Easy (just clicking buttons)**

---

## STEP 1: Buy Your Domain ✅
You said it's in your cart — go ahead and buy it!
- KingCityDisposal.com
- **Don't buy any add-ons** (privacy protection, email hosting, etc.) — you don't need them

---

## STEP 2: Create a GitHub Account (FREE)
**GitHub is where your website code lives**

1. Go to: **https://github.com**
2. Click **"Sign up"**
3. Use your email, create a password
4. Verify your email
5. Done! (Skip any tutorials it offers)

---

## STEP 3: Create a Vercel Account (FREE)
**Vercel is what makes your website work on the internet**

1. Go to: **https://vercel.com**
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"** (use the account you just made)
4. Authorize it when it asks
5. Done!

---

## STEP 4: Upload Your Code to GitHub

### Option A: Easy Way (Browser Upload)
1. Go to **https://github.com/new**
2. Repository name: `king-city-disposal`
3. Make sure **"Public"** is selected
4. Click **"Create repository"**
5. You'll see a page with instructions — look for **"uploading an existing file"** link and click it
6. **Unzip** the file I gave you on your computer
7. Drag the **entire folder contents** into the upload area
8. Click **"Commit changes"**

### Option B: If you have Claude Code
```bash
cd king-city-disposal
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/king-city-disposal.git
git push -u origin main
```

---

## STEP 5: Deploy on Vercel

1. Go to **https://vercel.com/new**
2. You'll see your GitHub repos — click **"Import"** next to `king-city-disposal`
3. Leave all settings as default
4. Click **"Deploy"**
5. Wait 1-2 minutes...
6. 🎉 **YOUR SITE IS LIVE!** (at a temporary URL like `king-city-disposal.vercel.app`)

---

## STEP 6: Connect Your Domain

### In Vercel:
1. Go to your project dashboard on Vercel
2. Click **"Settings"** tab
3. Click **"Domains"** in left sidebar
4. Type `kingcitydisposal.com` and click **"Add"**
5. It will show you **nameservers** or **DNS settings**

### In Your Domain Registrar (GoDaddy/Namecheap/wherever you bought it):
1. Find **DNS Settings** or **Nameservers**
2. Change nameservers to what Vercel tells you (usually):
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
3. Save

### Wait:
- Can take 15 minutes to 24 hours for the domain to connect
- Usually it's under 1 hour

---

## STEP 7: You're Done! 🎉

Your website will be live at **https://kingcitydisposal.com**

---

# ❓ TROUBLESHOOTING

### "I can't find the upload button on GitHub"
After creating the repo, look for text that says "uploading an existing file" — it's a small link.

### "Vercel deploy failed"
Take a screenshot of the error and send it to me. Usually it's a small typo somewhere.

### "Domain isn't working after 24 hours"
Double-check the nameservers are exactly what Vercel told you. No extra spaces, no typos.

### "I'm stuck"
Just tell me where you're stuck — I'll walk you through it!

---

# WHAT'S NEXT?

Once the basic site is live, we need to:
1. Set up Twilio (for text messages) — ~$5-10/month
2. Set up Stripe (for payments) — no monthly fee, just 2.9% per transaction
3. Set up the database (Supabase) — FREE

I'll help you with all of that once the main site is up!
